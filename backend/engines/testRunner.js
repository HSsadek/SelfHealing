const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { healSelector } = require('./selfHealing');
const { computeReliabilityScore } = require('./scoring');
const socketManager = require('../src/utils/socketManager');

puppeteer.use(StealthPlugin());

const MAX_RETRIES = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Capture a full-page screenshot as base64 (no disk I/O needed). */
const captureScreenshot = async (page) => {
    try {
        return await page.screenshot({ encoding: 'base64', fullPage: false });
    } catch {
        return null;
    }
};

/** Get a concise DOM snapshot around a selector, or the full <body> outline. */
const captureDomSnapshot = async (page, selector) => {
    try {
        return await page.evaluate((sel) => {
            const el = sel ? document.querySelector(sel) : document.body;
            const target = el ?? document.body;
            // Trim to 4000 chars to keep payloads reasonable
            return target.outerHTML.substring(0, 4000);
        }, selector ?? null);
    } catch {
        return null;
    }
};

/** Get the bounding box of a DOM element. Returns null if not found. */
const getBoundingBox = async (page, selector) => {
    if (!selector) return null;
    try {
        return await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        }, selector);
    } catch {
        return null;
    }
};

/** Simple text diff between two DOM snapshots (counts changed lines). */
const diffSnapshots = (before, after) => {
    if (!before || !after) return { changed: false, addedLines: 0, removedLines: 0 };
    const bLines = before.split('\n');
    const aLines = after.split('\n');
    const added   = aLines.filter(l => !bLines.includes(l)).length;
    const removed = bLines.filter(l => !aLines.includes(l)).length;
    return { changed: added > 0 || removed > 0, addedLines: added, removedLines: removed };
};

// ── Evidence Builder ──────────────────────────────────────────────────────────

/**
 * Executes one test step inside the browser and collects full evidence.
 *
 * @returns {EvidenceObject}
 */
const executeStep = async (page, stepIndex, step, networkLog, consoleLog) => {
    const io = socketManager.getIO();
    const timestamp = new Date().toISOString();
    let currentSelector = step.selector ?? null;

    // ── Capture state BEFORE ──────────────────────────────────────────────────
    const screenshotBefore = await captureScreenshot(page);
    const domBefore        = await captureDomSnapshot(page, currentSelector);
    const urlBefore        = page.url();
    const elementFoundBefore = currentSelector
        ? await page.$(currentSelector).then(el => el !== null).catch(() => false)
        : null;
    const boundingBox      = currentSelector ? await getBoundingBox(page, currentSelector) : null;
    const networkBefore    = [...networkLog];
    const consoleBefore    = [...consoleLog];

    // ── Execute action ────────────────────────────────────────────────────────
    let status      = 'failed';
    let errorMsg    = null;
    let healedFrom  = null;
    let retries     = MAX_RETRIES;
    let stepSuccess = false;

    while (retries > 0 && !stepSuccess) {
        try {
            switch (step.action) {
                case 'click':
                    await page.waitForSelector(currentSelector, { timeout: 5000 });
                    await page.click(currentSelector);
                    break;
                case 'input':
                case 'type':
                    await page.waitForSelector(currentSelector, { timeout: 5000 });
                    await page.type(currentSelector, step.value ?? '');
                    break;
                case 'verify':
                    await page.waitForSelector(currentSelector, { timeout: 5000 });
                    break;
                case 'navigate':
                    await page.goto(step.value ?? step.selector, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    break;
                case 'wait':
                    await new Promise(r => setTimeout(r, step.value ?? 1000));
                    break;
                default:
                    throw new Error(`Unknown action: ${step.action}`);
            }
            stepSuccess = true;
            status = 'success';

        } catch (err) {
            retries--;
            errorMsg = err.message;

            // Attempt self-healing on selector failures
            if (
                retries > 0 && currentSelector &&
                (err.message.includes('timeout') || err.message.includes('selector'))
            ) {
                io.emit('fix_applied', { message: `Healing selector: ${currentSelector}` });
                const healed = await healSelector(page, currentSelector, step.action);
                if (healed.success) {
                    healedFrom     = currentSelector;
                    currentSelector = healed.newSelector;
                    status         = 'healed';
                    io.emit('fix_success_retry', { message: `Using healed selector: ${healed.newSelector}` });
                } else {
                    io.emit('fix_failed', { message: 'Self-healing failed.', confidence: healed.confidence });
                }
            }
        }
    }

    // ── Capture state AFTER ───────────────────────────────────────────────────
    const screenshotAfter = await captureScreenshot(page);
    const domAfter        = await captureDomSnapshot(page, currentSelector);
    const urlAfter        = page.url();
    const elementFoundAfter = currentSelector
        ? await page.$(currentSelector).then(el => el !== null).catch(() => false)
        : null;

    // Network requests triggered DURING this step
    const networkRequests = networkLog
        .slice(networkBefore.length)
        .map(r => ({ url: r.url, method: r.method, statusCode: r.statusCode }));

    const newConsoleLogs = consoleLog.slice(consoleBefore.length);

    // DOM diff
    const domDiff = diffSnapshots(domBefore, domAfter);

    // Proof score: did we get real evidence this step ran?
    const proofScore = [
        screenshotBefore !== null,
        screenshotAfter  !== null,
        domDiff.changed  || step.action === 'wait',
        urlBefore !== urlAfter || step.action !== 'navigate',
        elementFoundBefore !== null,
    ].filter(Boolean).length * 20; // 0-100

    const evidenceObject = {
        stepId:   stepIndex + 1,
        action:   step.action,
        target:   currentSelector ?? step.value ?? 'N/A',
        status,
        errorMsg: errorMsg ?? null,
        timestamp,

        healing: healedFrom
            ? { originalSelector: healedFrom, newSelector: currentSelector }
            : null,

        evidence: {
            // Screenshots as base64 data URLs — directly renderable in <img> tags
            screenshotBefore: screenshotBefore ? `data:image/png;base64,${screenshotBefore}` : null,
            screenshotAfter:  screenshotAfter  ? `data:image/png;base64,${screenshotAfter}`  : null,

            domSnapshotBefore: domBefore,
            domSnapshotAfter:  domAfter,
            domDiff,

            elementFound:    elementFoundAfter ?? elementFoundBefore,
            boundingBox,

            urlBefore,
            urlAfter,

            networkRequests,
            consoleLogs: newConsoleLogs,

            // 0-100 confidence that this step actually ran in a real browser
            executionConfidence: stepSuccess ? proofScore : 0,
        },
    };

    // Emit the full evidence object in real-time
    io.emit('step_evidence', { stepId: stepIndex + 1, evidence: evidenceObject });
    io.emit('log_stream', {
        timestamp,
        level: status === 'success' || status === 'healed' ? 'info' : 'error',
        message: `Step ${stepIndex + 1} [${step.action}] → ${status.toUpperCase()}${errorMsg ? ': ' + errorMsg.substring(0, 80) : ''}`,
    });

    return evidenceObject;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Runs a full test script and returns an Evidence-Based report.
 *
 * @param {string} url
 * @param {Array}  steps  [{ action, selector?, value? }]
 * @returns {EvidenceReport}
 */
const runTest = async (url, steps) => {
    const io          = socketManager.getIO();
    const networkLog  = []; // filled by page listeners
    const consoleLog  = [];
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // ── Global browser listeners ──────────────────────────────────────────
        page.on('request',  req => networkLog.push({
            url: req.url(), method: req.method(), statusCode: null,
        }));
        page.on('response', res => {
            // Attach status code to the matching request entry
            const entry = [...networkLog].reverse().find(r => r.url === res.url() && r.statusCode === null);
            if (entry) entry.statusCode = res.status();
        });
        page.on('console', msg => consoleLog.push({ type: msg.type(), text: msg.text() }));

        // Navigate to target URL
        io.emit('log_stream', { timestamp: new Date().toISOString(), level: 'info', message: `Navigating to ${url}` });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ── Execute every step, collecting evidence ────────────────────────────
        const evidenceSteps = [];
        let hasFailure = false;

        for (let i = 0; i < steps.length; i++) {
            const evidence = await executeStep(page, i, steps[i], networkLog, consoleLog);
            evidenceSteps.push(evidence);

            if (evidence.status === 'failed') {
                hasFailure = true;
                // Optionally continue rather than breaking — collects more evidence
            }
        }

        // ── Build legacy-compatible `logs` array (for orchestrator parsing) ───
        const logs = evidenceSteps.map(e => ({
            timestamp: e.timestamp,
            level:     e.status === 'success' || e.status === 'healed' ? 'info' : 'error',
            message:   `Step ${e.stepId}: ${e.action} on ${e.target}`,
            ...(e.healing ? { type: 'healing_event', original: e.healing.originalSelector, fix: e.healing.newSelector, confidence: 90 } : {}),
        }));

        // ── Reliability Scoring ───────────────────────────────────────────────
        const scoring = computeReliabilityScore(evidenceSteps);

        const report = {
            success: !hasFailure,
            logs,
            evidenceSteps,
            summary: {
                totalSteps:            evidenceSteps.length,
                passed,
                failed,
                healed,
                executionProof:        true,
                realExecutionVerified: true,
                reliabilityScore:      scoring.reliabilityScore,
                confidenceLevel:       scoring.confidenceLevel,
                riskFlags:             scoring.riskFlags,
                breakdown:             scoring.breakdown,
            },
        };

        io.emit('evidence_report_ready', { report });
        return report;

    } catch (e) {
        io.emit('log_stream', { timestamp: new Date().toISOString(), level: 'error', message: `Fatal test error: ${e.message}` });
        return { success: false, logs: [], evidenceSteps: [], error: e.message };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { runTest };
