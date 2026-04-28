import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, Zap, Camera, Globe, Code2, Network, AlertTriangle,
    ChevronDown, ChevronUp, ShieldCheck, Eye, Play, Pause, SkipForward,
    SkipBack, BarChart3, Fingerprint, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
    success: { color: '#10b981', icon: CheckCircle, label: 'Passed' },
    healed:  { color: '#a855f7', icon: Zap,         label: 'Healed' },
    failed:  { color: '#ef4444', icon: XCircle,      label: 'Failed' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared Primitives
// ─────────────────────────────────────────────────────────────────────────────

const ProofBadge = memo(({ confidence }) => {
    const color = confidence >= 80 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444';
    const label = confidence >= 80 ? 'Verified' : confidence >= 40 ? 'Partial' : 'Unverified';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: `${color}14`, color, border: `1px solid ${color}44`,
            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
        }}>
            <ShieldCheck size={12} /> {label} ({confidence}%)
        </span>
    );
});

const MiniStat = memo(({ label, value, color }) => (
    <div style={{ flex: 1, minWidth: '100px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem 1.15rem' }}>
        <p style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</p>
    </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Breakdown Radar
// ─────────────────────────────────────────────────────────────────────────────

const ScoreBreakdown = memo(({ breakdown, score, level, riskFlags }) => {
    if (!breakdown) return null;
    const metrics = [
        { label: 'DOM Accuracy',    value: breakdown.domAccuracy,        color: '#6366f1' },
        { label: 'Network',         value: breakdown.networkSuccess,     color: '#3b82f6' },
        { label: 'Visual Conf.',    value: breakdown.visualConfidence,   color: '#10b981' },
        { label: 'Exec Stability',  value: breakdown.executionStability, color: '#f59e0b' },
        { label: 'Healing Penalty', value: breakdown.healingPenalty,     color: '#ef4444', inverted: true },
    ];

    const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const levelLabel = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }[level] ?? 'N/A';

    return (
        <div className="qa-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Fingerprint size={18} color="var(--brand-accent)" />
                <span style={{ fontWeight: 700 }}>Reliability Score</span>
                <span style={{ marginLeft: 'auto', fontSize: '2rem', fontWeight: 900, color: scoreColor }}>{score}</span>
                <span style={{ color: scoreColor, fontSize: '0.75rem', fontWeight: 700, background: `${scoreColor}14`, border: `1px solid ${scoreColor}44`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {levelLabel}
                </span>
            </div>

            {/* Bar breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {metrics.map(({ label, value, color, inverted }) => (
                    <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>
                                {inverted ? `−${value}%` : `${value}%`}
                            </span>
                        </div>
                        <div style={{ height: '5px', background: 'var(--bg-dark)', borderRadius: '99px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${value}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{ height: '100%', background: color, borderRadius: '99px' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Risk flags */}
            {riskFlags?.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {riskFlags.map((flag, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#f59e0b' }}>
                            <AlertTriangle size={12} /> {flag}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Screenshot Panel
// ─────────────────────────────────────────────────────────────────────────────

const ScreenshotPanel = memo(({ before, after }) => {
    const [mode, setMode] = useState('side'); // 'side' | 'slider'
    const [sliderPos, setSliderPos] = useState(50);

    if (!before && !after) return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No screenshots captured.</p>;

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {['side', 'slider'].map(m => (
                    <button key={m} onClick={() => setMode(m)} style={{
                        background: mode === m ? 'var(--brand-accent)' : 'var(--bg-dark)',
                        color: mode === m ? '#fff' : 'var(--text-muted)',
                        border: '1px solid var(--border-strong)', borderRadius: '4px',
                        padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                    }}>{m === 'side' ? 'Side by Side' : 'Slider'}</button>
                ))}
            </div>

            {mode === 'side' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[{ l: 'Before', s: before }, { l: 'After', s: after }].map(({ l, s }) => (
                        <div key={l}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{l}</p>
                            {s ? <img src={s} alt={l} style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-light)' }} loading="lazy" />
                                : <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</div>}
                        </div>
                    ))}
                </div>
            ) : (
                /* Comparison slider */
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    {after && <img src={after} alt="After" style={{ width: '100%', display: 'block' }} />}
                    {before && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: `${sliderPos}%`, height: '100%', overflow: 'hidden' }}>
                            <img src={before} alt="Before" style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none', display: 'block' }} />
                        </div>
                    )}
                    <input type="range" min="0" max="100" value={sliderPos} onChange={e => setSliderPos(Number(e.target.value))}
                        style={{ position: 'absolute', bottom: '0.5rem', left: '10%', width: '80%', zIndex: 10 }} />
                    <div style={{ position: 'absolute', top: 0, left: `${sliderPos}%`, width: '2px', height: '100%', background: '#a855f7', zIndex: 5 }} />
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// DOM Diff
// ─────────────────────────────────────────────────────────────────────────────

const DomDiffCard = memo(({ diff, domBefore, domAfter }) => {
    const [showRaw, setShowRaw] = useState(false);
    if (!diff) return null;
    return (
        <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Code2 size={14} color="#6366f1" />
                <span style={{ fontSize: '0.85rem' }}>DOM Diff:</span>
                {diff.changed ? <span style={{ color: '#f59e0b', fontSize: '0.82rem' }}>+{diff.addedLines} / −{diff.removedLines} lines</span>
                    : <span style={{ color: '#64748b', fontSize: '0.82rem' }}>No Changes</span>}
                {(domBefore || domAfter) && (
                    <button onClick={() => setShowRaw(!showRaw)} style={{ background: 'none', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', borderRadius: '4px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showRaw ? 'Hide' : 'Show'}
                    </button>
                )}
            </div>
            {showRaw && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[{ l: 'Before', h: domBefore }, { l: 'After', h: domAfter }].map(({ l, h }) => (
                        <div key={l}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{l}</p>
                            <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '0.6rem', fontSize: '0.7rem', color: '#94a3b8', overflow: 'auto', maxHeight: '180px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--border-light)' }}>{h ?? '—'}</pre>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Network Panel
// ─────────────────────────────────────────────────────────────────────────────

const NetworkPanel = memo(({ requests }) => {
    if (!requests?.length) return <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>No network activity.</p>;
    return (
        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    {['Method', 'URL', 'Status'].map(h => <th key={h} style={{ padding: '0.35rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.66rem', textTransform: 'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {requests.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.3rem 0.5rem' }}><span style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 700, fontSize: '0.66rem' }}>{r.method}</span></td>
                            <td style={{ padding: '0.3rem 0.5rem', color: '#94a3b8', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</td>
                            <td style={{ padding: '0.3rem 0.5rem', fontWeight: 700, color: r.statusCode >= 400 ? '#ef4444' : r.statusCode ? '#10b981' : '#64748b' }}>{r.statusCode ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Row (Expandable)
// ─────────────────────────────────────────────────────────────────────────────

const EvidenceRow = memo(({ step, isReplayActive }) => {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CFG[step.status] ?? STATUS_CFG.failed;
    const Icon = cfg.icon;
    const ev = step.evidence ?? {};

    // Auto-expand when replay lands on this step
    useEffect(() => {
        if (isReplayActive) setExpanded(true);
    }, [isReplayActive]);

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'var(--bg-panel)',
                border: `1px solid ${isReplayActive ? '#6366f1' : 'var(--border-light)'}`,
                borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem',
                boxShadow: isReplayActive ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
            <button onClick={() => setExpanded(!expanded)} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: '1rem 1.25rem', color: 'var(--text-main)', textAlign: 'left',
            }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: `${cfg.color}18`, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color={cfg.color} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        Step {step.stepId}
                        <code style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontSize: '0.75rem' }}>{step.action}</code>
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.target}</p>
                </div>
                <ProofBadge confidence={ev.executionConfidence ?? 0} />
                {step.healing && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#a855f7', fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}><Zap size={12} /> Healed</span>}
                {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* URL change */}
                            {(ev.urlBefore || ev.urlAfter) && (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.82rem' }}>
                                    <Globe size={14} color="#3b82f6" />
                                    <span style={{ color: 'var(--text-muted)' }}>{ev.urlBefore}</span>
                                    {ev.urlBefore !== ev.urlAfter && <><span style={{ color: '#64748b' }}>→</span><span style={{ color: '#10b981' }}>{ev.urlAfter}</span></>}
                                </div>
                            )}
                            {/* Element info */}
                            {ev.boundingBox && (
                                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', alignItems: 'center' }}>
                                    <Eye size={14} color="#6366f1" />
                                    <span>Element: <strong style={{ color: ev.elementFound ? '#10b981' : '#ef4444' }}>{ev.elementFound ? 'Found' : 'Not Found'}</strong></span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        ({ev.boundingBox.x}, {ev.boundingBox.y}) {ev.boundingBox.width}×{ev.boundingBox.height}
                                    </span>
                                </div>
                            )}
                            {/* Healing info */}
                            {step.healing && (
                                <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '8px', padding: '0.7rem 1rem', fontSize: '0.82rem' }}>
                                    <p style={{ color: '#a855f7', fontWeight: 600, marginBottom: '0.25rem' }}>🩹 Self-Healing Applied</p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>From:</span> <code style={{ color: '#ef4444' }}>{step.healing.originalSelector}</code></p>
                                    <p><span style={{ color: 'var(--text-muted)' }}>To:</span> <code style={{ color: '#10b981' }}>{step.healing.newSelector}</code></p>
                                </div>
                            )}
                            {/* Screenshots */}
                            <div>
                                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Camera size={12} /> Screenshots</p>
                                <ScreenshotPanel before={ev.screenshotBefore} after={ev.screenshotAfter} />
                            </div>
                            <DomDiffCard diff={ev.domDiff} domBefore={ev.domSnapshotBefore} domAfter={ev.domSnapshotAfter} />
                            <div>
                                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Network size={12} /> Network ({ev.networkRequests?.length ?? 0})</p>
                                <NetworkPanel requests={ev.networkRequests} />
                            </div>
                            {ev.consoleLogs?.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Console ({ev.consoleLogs.length})</p>
                                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '0.5rem', maxHeight: '100px', overflowY: 'auto', fontSize: '0.72rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                                        {ev.consoleLogs.map((c, j) => <div key={j} style={{ color: c.type === 'error' ? '#ef4444' : c.type === 'warning' ? '#f59e0b' : '#94a3b8' }}>[{c.type}] {c.text}</div>)}
                                    </div>
                                </div>
                            )}
                            {step.errorMsg && (
                                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.7rem 1rem', fontSize: '0.82rem', color: '#ef4444' }}>
                                    <AlertTriangle size={13} style={{ marginRight: '0.3rem' }} /> {step.errorMsg}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Replay Controls
// ─────────────────────────────────────────────────────────────────────────────

const ReplayControls = memo(({ total, current, playing, onPlay, onPause, onNext, onPrev, onSeek }) => (
    <div className="qa-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={onPrev} disabled={current <= 0} style={btnStyle}><SkipBack size={16} /></button>
            {playing
                ? <button onClick={onPause} style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}><Pause size={16} /></button>
                : <button onClick={onPlay} disabled={total === 0} style={{ ...btnStyle, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981' }}><Play size={16} /></button>}
            <button onClick={onNext} disabled={current >= total - 1} style={btnStyle}><SkipForward size={16} /></button>
        </div>
        {/* Timeline scrubber */}
        <input type="range" min="0" max={Math.max(0, total - 1)} value={current} onChange={e => onSeek(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#6366f1' }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
            Step {total > 0 ? current + 1 : 0} / {total}
        </span>
    </div>
));

const btnStyle = { background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' };

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const Evidence = () => {
    const { evidenceSteps } = useSocket();

    // ── Replay state ──────────────────────────────────────────────────────────
    const [replayIndex, setReplayIndex] = useState(0);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const intervalRef = useRef(null);

    const playReplay = useCallback(() => {
        if (!evidenceSteps.length) return;
        setReplayPlaying(true);
    }, [evidenceSteps.length]);

    const pauseReplay = useCallback(() => {
        setReplayPlaying(false);
    }, []);

    useEffect(() => {
        if (replayPlaying) {
            intervalRef.current = setInterval(() => {
                setReplayIndex(prev => {
                    if (prev >= evidenceSteps.length - 1) {
                        setReplayPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 2000);
        }
        return () => clearInterval(intervalRef.current);
    }, [replayPlaying, evidenceSteps.length]);

    // ── Derived summary ───────────────────────────────────────────────────────
    const summary = useMemo(() => {
        const passed = evidenceSteps.filter(s => s.status === 'success').length;
        const failed = evidenceSteps.filter(s => s.status === 'failed').length;
        const healed = evidenceSteps.filter(s => s.status === 'healed').length;
        const avgConf = evidenceSteps.length
            ? Math.round(evidenceSteps.reduce((a, s) => a + (s.evidence?.executionConfidence ?? 0), 0) / evidenceSteps.length)
            : 0;
        return { total: evidenceSteps.length, passed, failed, healed, avgConf };
    }, [evidenceSteps]);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!evidenceSteps.length) {
        return (
            <div className="idle-state" style={{ marginTop: '4rem' }}>
                <div className="idle-icon-wrapper"><span className="pulse-circle" /></div>
                <h2>No Evidence Yet</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto' }}>
                    Run a test from the <strong>Tests</strong> page or an <strong>Autonomous</strong> run.
                    Every step will stream live evidence here.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <MiniStat label="Steps"      value={summary.total}    color="#3b82f6" />
                <MiniStat label="Passed"     value={summary.passed}   color="#10b981" />
                <MiniStat label="Failed"     value={summary.failed}   color="#ef4444" />
                <MiniStat label="Healed"     value={summary.healed}   color="#a855f7" />
                <MiniStat label="Confidence" value={`${summary.avgConf}%`} color={summary.avgConf >= 80 ? '#10b981' : '#f59e0b'} />
            </div>

            {/* ── Scoring Breakdown (if available) ────────────────────────── */}
            <ScoreBreakdown
                breakdown={{
                    domAccuracy: evidenceSteps.filter(s => s.evidence?.elementFound).length / Math.max(1, evidenceSteps.filter(s => s.evidence?.elementFound !== null && s.evidence?.elementFound !== undefined).length) * 100 | 0,
                    networkSuccess: (() => { const all = evidenceSteps.flatMap(s => s.evidence?.networkRequests ?? []); const ok = all.filter(r => r.statusCode && r.statusCode < 400); return all.length ? Math.round(ok.length / all.length * 100) : 100; })(),
                    visualConfidence: summary.avgConf,
                    executionStability: Math.round(((summary.passed + summary.healed) / Math.max(1, summary.total)) * 100),
                    healingPenalty: Math.round((summary.healed / Math.max(1, summary.total)) * 100),
                }}
                score={summary.avgConf}
                level={summary.avgConf >= 80 ? 'high' : summary.avgConf >= 50 ? 'medium' : 'low'}
                riskFlags={
                    [
                        summary.failed > 0 && `${summary.failed} step(s) failed`,
                        summary.healed > summary.total * 0.3 && 'High healing reliance — update selectors',
                        summary.avgConf < 50 && 'Low overall execution confidence',
                    ].filter(Boolean)
                }
            />

            {/* ── Replay Controls ─────────────────────────────────────────── */}
            <ReplayControls
                total={evidenceSteps.length}
                current={replayIndex}
                playing={replayPlaying}
                onPlay={playReplay}
                onPause={pauseReplay}
                onNext={() => setReplayIndex(i => Math.min(i + 1, evidenceSteps.length - 1))}
                onPrev={() => setReplayIndex(i => Math.max(i - 1, 0))}
                onSeek={setReplayIndex}
            />

            {/* ── Replay Screenshot Preview ───────────────────────────────── */}
            {evidenceSteps[replayIndex]?.evidence?.screenshotAfter && (
                <div className="qa-card" style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
                        Replay Preview — Step {replayIndex + 1}
                    </p>
                    <img
                        src={evidenceSteps[replayIndex].evidence.screenshotAfter}
                        alt={`Step ${replayIndex + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                    />
                </div>
            )}

            {/* ── Evidence Rows ────────────────────────────────────────────── */}
            {evidenceSteps.map((step, i) => (
                <EvidenceRow key={step.stepId} step={step} isReplayActive={i === replayIndex} />
            ))}
        </>
    );
};

export default Evidence;
