const { extractHtml } = require('../src/services/scraper.service');
const { analyzeDOM } = require('../src/services/domAnalyzer');
const { runTest } = require('./testRunner');
const { runSecurityScan } = require('./securityScanner');
const socketManager = require('../src/utils/socketManager');

const MAX_EXECUTION_MS = 8 * 60 * 1000;

// Standard steps used in autonomous mode
const AUTONOMOUS_STEPS = [
    { action: 'wait',   value: 1000 },
    { action: 'verify', selector: 'body' },
    { action: 'verify', selector: 'main, #main, [role="main"], .main' },
    { action: 'click',  selector: 'a:not([href^="http"]):not([href^="mailto"]):first-of-type' },
];

// ── Emit helpers ─────────────────────────────────────────────────────────────

/**
 * Emit a typed event on the shared 'autonomous_event' channel.
 * Every subscriber receives every orchestration event here.
 */
const emit = (io, event, payload = {}) => {
    const data = { event, timestamp: new Date().toISOString(), ...payload };
    io.emit('autonomous_event', data);
    console.log(`[Orchestrator] ${event}:`, payload.message ?? '');
};

// ── Score computation ─────────────────────────────────────────────────────────

const computeScore = (ctx) => {
    const penalty =
        (ctx.domSummary?.high    ?? 0) * 10 +
        (ctx.domSummary?.medium  ?? 0) * 5  +
        (ctx.totals.securityIssues * 15)    +
        (ctx.totals.failed * 5);
    return Math.max(0, 100 - penalty);
};

const securityRisk = (findings) => {
    if (findings.some(f => f.severity === 'Critical' || f.severity === 'High')) return 'high';
    if (findings.some(f => f.severity === 'Medium')) return 'medium';
    return 'low';
};

// ── Recommendation engine ─────────────────────────────────────────────────────

const generateRecommendations = (ctx) => {
    const recs = [];
    const { domSummary, securityFindings, totals } = ctx;

    if (securityFindings.some(f => f.type === 'XSS'))
        recs.push({ priority: 'critical', text: 'Sanitize all user inputs — reflected XSS payload was detected.' });
    if (securityFindings.some(f => f.type === 'SQLi'))
        recs.push({ priority: 'critical', text: 'Use parameterized queries — SQL error was exposed to the frontend.' });
    if (domSummary?.high > 0)
        recs.push({ priority: 'high', text: `Fix ${domSummary.high} high-severity accessibility/DOM issues.` });
    if (totals.failed > 0 && totals.healed === 0)
        recs.push({ priority: 'medium', text: `${totals.failed} test step(s) failed and could not be self-healed — check your selectors.` });
    if (totals.healed > 0)
        recs.push({ priority: 'low', text: `${totals.healed} broken selector(s) were auto-healed — update the test suite to use the new selectors.` });
    if (domSummary?.medium > 0)
        recs.push({ priority: 'medium', text: `Resolve ${domSummary.medium} medium-severity issues (missing alt text, unlabelled inputs).` });
    if (recs.length === 0)
        recs.push({ priority: 'low', text: 'No critical issues found. Maintain current test coverage.' });

    return recs;
};

// ── Main orchestrator ─────────────────────────────────────────────────────────

const runAutonomous = async (url) => {
    const io        = socketManager.getIO();
    const runId     = `run_${Date.now()}`;
    const startTime = Date.now();

    // ── Shared Execution Context (single source of truth for this run) ────────
    const ctx = {
        runId,
        url,
        startedAt: new Date().toISOString(),
        completedAt: null,
        durationMs: 0,

        // Phase results
        domSummary:       null,
        domIssues:        [],         // [{ type, message, severity, selector }]
        testSteps:        [],         // structured per-step results
        healingEvents:    [],         // [{ original, fix, confidence }]
        securityFindings: [],         // [{ type, severity, description }]
        aiRecommendations: [],

        // Totals
        totals: { tests: 0, passed: 0, failed: 0, healed: 0, securityIssues: 0 },

        // Execution log (for the phase step tracker UI)
        phaseSteps: [],
    };

    const logPhaseStep = (name, status, detail = '', durationMs = 0) => {
        const entry = { name, status, detail, durationMs };
        ctx.phaseSteps.push(entry);
        emit(io, 'step_update', { message: name, status, detail, runId });
    };

    // Timeout guard
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
        timedOut = true;
        emit(io, 'autonomous_timeout', { message: 'Execution exceeded maximum allowed time.', runId });
    }, MAX_EXECUTION_MS);

    const guardTimeout = () => { if (timedOut) throw new Error('Autonomous run timed out'); };

    try {
        emit(io, 'autonomous_started', { message: `Autonomous run started for: ${url}`, runId });

        // ════════════════════════════════════════════════════════════════════
        // PHASE 1 — HTML Extraction + DOM Analysis
        // ════════════════════════════════════════════════════════════════════
        guardTimeout();
        const p1Start = Date.now();
        emit(io, 'phase_started', { message: 'Phase 1: Extracting HTML and analyzing DOM…', phase: 1, runId });

        let html;
        try {
            html = await extractHtml(url, 2);
        } catch (e) {
            logPhaseStep('DOM Extraction', 'failed', e.message, Date.now() - p1Start);
            throw new Error(`Could not reach target URL: ${e.message}`);
        }

        const domResult = analyzeDOM(html);

        // Write into context
        ctx.domSummary = domResult.summary;
        ctx.domIssues  = domResult.issues; // fully structured array

        logPhaseStep(
            'DOM Analysis', 'success',
            `${domResult.summary.totalIssues} issues: ${domResult.summary.high} high, ${domResult.summary.medium} medium, ${domResult.summary.low} low`,
            Date.now() - p1Start
        );
        emit(io, 'dom_analysis_completed', {
            message: `DOM analysis complete — ${domResult.summary.totalIssues} issue(s) detected.`,
            summary: domResult.summary,
            issues:  domResult.issues, // send full list for live UI
            runId,
        });

        // ════════════════════════════════════════════════════════════════════
        // PHASE 2 — Functional Tests + Self-Healing
        // ════════════════════════════════════════════════════════════════════
        guardTimeout();
        const p2Start = Date.now();
        emit(io, 'phase_started', { message: 'Phase 2: Running functional tests with self-healing…', phase: 2, runId });

        const testResult = await runTest(url, AUTONOMOUS_STEPS);

        // Extract healing events
        const rawHealingLogs = (testResult.logs || []).filter(l => l.type === 'healing_event');
        ctx.healingEvents = rawHealingLogs.map(h => ({
            originalSelector: h.original,
            newSelector:      h.fix,
            confidence:       h.confidence,
        }));
        ctx.totals.healed = ctx.healingEvents.length;

        // Build structured per-step results
        const stepLogs = (testResult.logs || []).filter(l => l.message?.startsWith('Step'));
        ctx.testSteps = AUTONOMOUS_STEPS.map((s, i) => {
            const matched = stepLogs.find(l => l.message?.includes(`Step ${i + 1}`));
            return {
                step:     i + 1,
                action:   s.action,
                selector: s.selector ?? null,
                status:   matched ? (matched.level === 'error' ? 'failed' : 'passed') : 'skipped',
                message:  matched?.message ?? '',
            };
        });
        ctx.totals.tests  = ctx.testSteps.filter(s => s.status !== 'skipped').length;
        ctx.totals.passed = ctx.testSteps.filter(s => s.status === 'passed').length;
        ctx.totals.failed = ctx.testSteps.filter(s => s.status === 'failed').length;

        logPhaseStep(
            'Functional Tests', testResult.success ? 'success' : 'partial',
            `${ctx.totals.passed} passed, ${ctx.totals.failed} failed, ${ctx.totals.healed} auto-healed`,
            Date.now() - p2Start
        );
        emit(io, 'test_completed', {
            message: `Tests complete — ${ctx.totals.passed} passed, ${ctx.totals.failed} failed, ${ctx.totals.healed} healed.`,
            testSteps:     ctx.testSteps,
            healingEvents: ctx.healingEvents,
            runId,
        });

        // ════════════════════════════════════════════════════════════════════
        // PHASE 3 — Security Scan
        // ════════════════════════════════════════════════════════════════════
        guardTimeout();
        const p3Start = Date.now();
        emit(io, 'phase_started', { message: 'Phase 3: Running security scan…', phase: 3, runId });

        const secResult = await runSecurityScan(url);
        ctx.securityFindings  = secResult.findings || [];
        ctx.totals.securityIssues = ctx.securityFindings.length;

        logPhaseStep(
            'Security Scan', 'success',
            `${ctx.totals.securityIssues} finding(s)`,
            Date.now() - p3Start
        );
        emit(io, 'security_scan_completed', {
            message: `Security scan done — ${ctx.totals.securityIssues} finding(s).`,
            findings: ctx.securityFindings,
            runId,
        });

        // ════════════════════════════════════════════════════════════════════
        // PHASE 4 — AI Recommendations
        // ════════════════════════════════════════════════════════════════════
        guardTimeout();
        emit(io, 'phase_started', { message: 'Phase 4: Generating AI recommendations…', phase: 4, runId });

        ctx.aiRecommendations = generateRecommendations(ctx);
        logPhaseStep('AI Recommendations', 'success', `${ctx.aiRecommendations.length} action item(s) generated`);

        // ════════════════════════════════════════════════════════════════════
        // FINAL REPORT — build from context, emit on dedicated channel
        // ════════════════════════════════════════════════════════════════════
        const totalMs = Date.now() - startTime;
        ctx.completedAt = new Date().toISOString();
        ctx.durationMs  = totalMs;

        const overallScore = computeScore(ctx);

        /** Structured Final Report JSON — this is the single source of truth */
        const finalReport = {
            runId,
            url,
            timestamp:     ctx.completedAt,
            durationMs:    totalMs,
            overallScore,
            summary: {
                score:        overallScore,
                totalIssues:  ctx.domSummary?.totalIssues ?? 0,
                testsPassed:  ctx.totals.passed,
                testsFailed:  ctx.totals.failed,
                testsHealed:  ctx.totals.healed,
                securityRisk: securityRisk(ctx.securityFindings),
            },
            domSummary:       ctx.domSummary,
            domIssues:        ctx.domIssues,
            testSteps:        ctx.testSteps,
            healingEvents:    ctx.healingEvents,
            securityFindings: ctx.securityFindings,
            aiRecommendations: ctx.aiRecommendations,
            phaseSteps:       ctx.phaseSteps,
            totals:           ctx.totals,
        };

        logPhaseStep(
            'Final Report', 'success',
            `Score: ${overallScore}/100 — Duration: ${(totalMs / 1000).toFixed(1)}s`
        );

        // Emit on both channels:
        // 1. 'autonomous_report_generated' — dedicated reliable channel for the report
        // 2. 'autonomous_event' — for the timeline (via emit helper)
        io.emit('autonomous_report_generated', { report: finalReport, runId });
        emit(io, 'report_generated', {
            message: `✅ Autonomous run complete. Score: ${overallScore}/100`,
            runId,
        });

        return { success: true, report: finalReport };

    } catch (err) {
        const errorReport = {
            runId, url,
            timestamp: new Date().toISOString(),
            error: err.message,
            overallScore: 0,
            summary: { score: 0, securityRisk: 'high', testsPassed: 0, testsFailed: 0 },
            domIssues: ctx.domIssues,
            testSteps: ctx.testSteps,
            securityFindings: ctx.securityFindings,
            aiRecommendations: ctx.aiRecommendations,
            phaseSteps: ctx.phaseSteps,
        };
        emit(io, 'autonomous_error', { message: `Fatal error: ${err.message}`, runId });
        io.emit('autonomous_report_generated', { report: errorReport, runId });
        return { success: false, report: errorReport, error: err.message };

    } finally {
        clearTimeout(timeoutHandle);
    }
};

module.exports = { runAutonomous };
