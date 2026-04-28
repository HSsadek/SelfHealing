import React, { useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle,
    ShieldAlert, Zap, BarChart3, Loader2, FileText, MousePointerClick,
} from 'lucide-react';
import { startAutonomousRun } from '../../services/api';
import { useTargetUrl } from '../../contexts/UrlContext';
import { useSocket } from '../../contexts/SocketContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PHASES = [
    { label: 'DOM Extraction & Analysis',        phase: 1 },
    { label: 'Functional Tests + Self-Healing',  phase: 2 },
    { label: 'Security Scan',                    phase: 3 },
    { label: 'AI Report Generation',             phase: 4 },
];

const EVENT_COLORS = {
    autonomous_started:      '#3b82f6',
    phase_started:           '#6366f1',
    analysis_completed:      '#10b981',
    dom_analysis_completed:  '#10b981',
    step_update:             '#94a3b8',
    test_completed:          '#10b981',
    security_scan_completed: '#f59e0b',
    report_generated:        '#10b981',
    autonomous_error:        '#ef4444',
    autonomous_timeout:      '#ef4444',
    default:                 '#64748b',
};

const PRIORITY_COLORS = {
    critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6',
};

const SEVERITY_COLORS = {
    high: '#ef4444', medium: '#f59e0b', low: '#3b82f6',
    High: '#ef4444', Medium: '#f59e0b', Low: '#3b82f6',
    Critical: '#ef4444',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Primitives
// ─────────────────────────────────────────────────────────────────────────────

const SectionTitle = ({ icon: Icon, label, color = 'var(--brand-accent)' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <Icon size={18} color={color} />
        <p style={{ fontWeight: 700, fontSize: '1rem' }}>{label}</p>
    </div>
);

const Badge = ({ label, color }) => (
    <span style={{
        background: `${color}18`, color, border: `1px solid ${color}44`,
        padding: '0.15rem 0.55rem', borderRadius: '4px',
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
        flexShrink: 0,
    }}>{label}</span>
);

const StatCard = memo(({ label, value, icon: Icon, color }) => (
    <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
        borderRadius: '12px', padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        flex: 1, minWidth: '130px',
    }}>
        <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} color={color} />
        </div>
        <div>
            <p style={{ fontSize: '1.7rem', fontWeight: 800, lineHeight: 1, color }}>{value ?? '—'}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</p>
        </div>
    </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// Score Ring (SVG)
// ─────────────────────────────────────────────────────────────────────────────

const ScoreRing = memo(({ score }) => {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ position: 'relative', width: 140, height: 140 }}>
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-dark)" strokeWidth="12" />
                <motion.circle
                    cx="70" cy="70" r={r} fill="none"
                    stroke={color} strokeWidth="12"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeLinecap="round"
                />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.9rem', fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase Tracker
// ─────────────────────────────────────────────────────────────────────────────

const PhaseTracker = memo(({ events, running }) => {
    const activePhase = useMemo(() => {
        const last = [...events].reverse().find(e => e.phase);
        return last?.phase ?? 0;
    }, [events]);

    const isDone = events.some(e => e.event === 'report_generated');
    const progress = isDone ? 100 : Math.min(95, Math.round((activePhase / PHASES.length) * 100));

    return (
        <div className="qa-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Execution Progress</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-accent)' }}>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-dark)', borderRadius: '99px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '99px' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PHASES.map(({ label, phase }) => {
                    const done   = isDone || phase < activePhase;
                    const active = phase === activePhase && running && !isDone;
                    return (
                        <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(99,102,241,0.2)' : 'var(--bg-dark)',
                                border: `2px solid ${done ? '#10b981' : active ? '#6366f1' : 'var(--border-light)'}`,
                                transition: 'all 0.3s',
                            }}>
                                {done ? <CheckCircle size={13} color="#10b981" /> :
                                 active ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={13} color="#6366f1" /></motion.div> :
                                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{phase}</span>}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: phase > activePhase && !isDone ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: active ? 600 : 400 }}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Timeline
// ─────────────────────────────────────────────────────────────────────────────

const EventTimeline = memo(({ events }) => (
    <div className="qa-card" style={{ padding: '1.5rem', flex: 1 }}>
        <SectionTitle icon={BarChart3} label="Event Stream" />
        <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {events.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', paddingTop: '2rem' }}>
                    Waiting for events…
                </p>
            ) : (
                <AnimatePresence initial={false}>
                    {events.map((ev, i) => {
                        const color = EVENT_COLORS[ev.event] ?? EVENT_COLORS.default;
                        const isError = ev.event?.includes('error') || ev.event?.includes('timeout');
                        return (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.82rem' }}>
                                <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace', marginTop: '0.05rem' }}>
                                    {ev.timestamp?.substring(11, 19)}
                                </span>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.35rem' }} />
                                <span style={{ color: isError ? '#ef4444' : 'var(--text-main)', lineHeight: 1.5 }}>
                                    {ev.message ?? ev.event}
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            )}
        </div>
    </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// DOM Issues Table
// ─────────────────────────────────────────────────────────────────────────────

const DomIssuesTable = memo(({ issues }) => {
    if (!issues?.length) return null;
    return (
        <div className="qa-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <SectionTitle icon={AlertTriangle} label={`DOM Issues (${issues.length})`} color="#f59e0b" />
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                            {['Type', 'Message', 'Selector', 'Severity'].map(h => (
                                <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {issues.map((issue, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <span style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#a5b4fc' }}>{issue.type}</span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', color: '#f1f5f9', maxWidth: '280px' }}>{issue.message}</td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: '#94a3b8', wordBreak: 'break-all' }}>{issue.selector}</code>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <Badge label={issue.severity} color={SEVERITY_COLORS[issue.severity] ?? '#64748b'} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Steps Table
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_ICON = {
    passed:  <CheckCircle size={14} color="#10b981" />,
    failed:  <XCircle    size={14} color="#ef4444" />,
    skipped: <span style={{ color: '#64748b', fontSize: '0.75rem' }}>—</span>,
};

const TestStepsTable = memo(({ steps, healingEvents }) => {
    if (!steps?.length) return null;
    return (
        <div className="qa-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <SectionTitle icon={MousePointerClick} label={`Test Steps (${steps.length})`} color="#6366f1" />
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                            {['#', 'Action', 'Target Selector', 'Status', 'Healed'].map(h => (
                                <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {steps.map((s) => {
                            const healed = healingEvents?.find(h => h.originalSelector === s.selector);
                            return (
                                <tr key={s.step} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{s.step}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <code style={{ background: 'rgba(99,102,241,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#a5b4fc', fontSize: '0.78rem' }}>{s.action}</code>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', maxWidth: '220px' }}>
                                        {s.selector
                                            ? <code style={{ fontSize: '0.75rem', color: '#94a3b8', wordBreak: 'break-all' }}>{s.selector}</code>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {STATUS_ICON[s.status] ?? STATUS_ICON.skipped}
                                            <span style={{ color: s.status === 'passed' ? '#10b981' : s.status === 'failed' ? '#ef4444' : '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                                                {s.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        {healed
                                            ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Zap size={13} color="#a855f7" />
                                                <code style={{ fontSize: '0.72rem', color: '#a78bfa', wordBreak: 'break-all' }}>{healed.newSelector}</code>
                                              </div>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Final Report
// ─────────────────────────────────────────────────────────────────────────────

const FinalReport = memo(({ report }) => {
    if (!report) return null;

    const score       = report.overallScore ?? 0;
    const scoreColor  = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const durationSec = report.durationMs ? (report.durationMs / 1000).toFixed(1) : '—';
    const riskColor   = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }[report.summary?.securityRisk] ?? '#64748b';

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* ── Score hero ─────────────────────────────────────────────── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem',
                background: 'var(--bg-panel)', border: `1px solid ${scoreColor}44`,
                borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem',
                boxShadow: `0 0 40px ${scoreColor}12`, alignItems: 'center',
            }}>
                <ScoreRing score={score} />
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Autonomous Run Report</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                        {score >= 80 ? 'Excellent' : score >= 50 ? 'Needs Improvement' : 'Critical Issues Found'}
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>⏱ {durationSec}s</span>
                        <span>🌐 {report.url}</span>
                        <span style={{ color: riskColor, fontWeight: 600 }}>
                            Security Risk: {report.summary?.securityRisk?.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Stat cards ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <StatCard label="Total DOM Issues"    value={report.summary?.totalIssues}  icon={FileText}    color="#6366f1" />
                <StatCard label="Tests Passed"        value={report.summary?.testsPassed}  icon={CheckCircle} color="#10b981" />
                <StatCard label="Tests Failed"        value={report.summary?.testsFailed}  icon={XCircle}     color="#ef4444" />
                <StatCard label="Auto-Healed"         value={report.summary?.testsHealed}  icon={Zap}         color="#a855f7" />
                <StatCard label="Security Findings"   value={report.totals?.securityIssues ?? report.securityFindings?.length} icon={ShieldAlert} color="#f59e0b" />
            </div>

            {/* ── AI Recommendations ────────────────────────────────────── */}
            {report.aiRecommendations?.length > 0 && (
                <div className="qa-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <SectionTitle icon={Bot} label="AI Recommendations" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {report.aiRecommendations.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--bg-dark)' }}>
                                <Badge label={r.priority} color={PRIORITY_COLORS[r.priority] ?? '#64748b'} />
                                <span style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>{r.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── DOM Issues Table ──────────────────────────────────────── */}
            <DomIssuesTable issues={report.domIssues} />

            {/* ── Test Steps Table ──────────────────────────────────────── */}
            <TestStepsTable steps={report.testSteps} healingEvents={report.healingEvents} />

            {/* ── Security Findings ─────────────────────────────────────── */}
            {report.securityFindings?.length > 0 && (
                <div className="qa-card" style={{ padding: '1.5rem' }}>
                    <SectionTitle icon={ShieldAlert} label={`Security Findings (${report.securityFindings.length})`} color="#f59e0b" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {report.securityFindings.map((f, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-dark)', borderRadius: '8px', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.2rem' }}>{f.type}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{f.description}</p>
                                </div>
                                <Badge label={f.severity} color={SEVERITY_COLORS[f.severity] ?? '#64748b'} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── No issues at all ─────────────────────────────────────── */}
            {!report.domIssues?.length && !report.securityFindings?.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
                    <CheckCircle color="#10b981" />
                    <p style={{ color: '#10b981', fontWeight: 600 }}>No critical issues detected — target appears healthy.</p>
                </div>
            )}
        </motion.div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const Autonomous = () => {
    const { targetUrl } = useTargetUrl();
    const { autonomousEvents, autonomousReport, autonomousRunning, clearAutonomousSession } = useSocket();

    const handleStart = useCallback(async () => {
        if (!targetUrl || autonomousRunning) return;
        clearAutonomousSession();
        try {
            await startAutonomousRun(targetUrl);
        } catch (e) {
            console.error('Failed to start autonomous run:', e);
        }
    }, [targetUrl, autonomousRunning, clearAutonomousSession]);

    const hasResult = Boolean(autonomousReport);

    return (
        <>
            {/* ── Action Bar ─────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '1.25rem',
                background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
                borderRadius: '14px', padding: '1.5rem 2rem', marginBottom: '2rem',
                flexWrap: 'wrap',
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                        <Bot size={22} color="var(--brand-accent)" />
                        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Autonomous Mode</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        One click — the AI agent audits, tests, heals, and generates a full structured report.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                    {hasResult && !autonomousRunning && (
                        <button onClick={clearAutonomousSession} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', borderRadius: '8px', padding: '0.65rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600 }}>
                            <RefreshCw size={15} /> New Run
                        </button>
                    )}
                    <button
                        onClick={handleStart}
                        disabled={!targetUrl || autonomousRunning}
                        style={{
                            background: autonomousRunning ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '0.75rem 1.75rem',
                            cursor: !targetUrl || autonomousRunning ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontWeight: 700, fontSize: '0.95rem',
                            boxShadow: autonomousRunning ? 'none' : '0 4px 20px rgba(139,92,246,0.4)',
                            opacity: !targetUrl ? 0.5 : 1, transition: 'all 0.2s',
                        }}
                    >
                        {autonomousRunning
                            ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={18} /></motion.span> Running Agent…</>
                            : <><Play size={18} /> Start Autonomous Testing</>}
                    </button>
                </div>

                {!targetUrl && (
                    <p style={{ width: '100%', color: '#f59e0b', fontSize: '0.8rem' }}>
                        ⚠ No target URL is set — use the toolbar above to set one first.
                    </p>
                )}
            </div>

            {/* ── Progress + Live Events ──────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <PhaseTracker events={autonomousEvents} running={autonomousRunning} />
                <EventTimeline events={autonomousEvents} />
            </div>

            {/* ── Structured Report ──────────────────────────────────────── */}
            {hasResult && <FinalReport report={autonomousReport} />}
        </>
    );
};

export default Autonomous;
