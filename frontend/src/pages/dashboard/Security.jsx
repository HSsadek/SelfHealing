import React, { useState, useCallback, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Play } from 'lucide-react';
import { runSecurityScan } from '../../services/api';
import { useTargetUrl } from '../../contexts/UrlContext';
import { motion, AnimatePresence } from 'framer-motion';

const SeverityBadge = ({ severity }) => {
    const colors = {
        Critical: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
        High:     { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
        Medium:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        Low:      { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    };
    const s = colors[severity] ?? colors.Low;
    return (
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
            {severity}
        </span>
    );
};

const Security = () => {
    const { targetUrl } = useTargetUrl();
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);

    // Reset when global URL changes
    useEffect(() => {
        setStatus('idle');
        setResult(null);
    }, [targetUrl]);

    const handleScan = useCallback(async () => {
        if (!targetUrl) return;
        setStatus('scanning');
        setResult(null);
        try {
            const res = await runSecurityScan(targetUrl);
            setResult(res);
            setStatus('done');
        } catch (err) {
            setResult({ error: err.message });
            setStatus('error');
        }
    }, [targetUrl]);

    return (
        <>
            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    className="btn-analyze"
                    onClick={handleScan}
                    disabled={!targetUrl || status === 'scanning'}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: targetUrl ? '#ef4444' : undefined }}
                >
                    <Shield size={15} />
                    {status === 'scanning' ? 'Scanning…' : 'Launch Scan'}
                </button>
                {targetUrl && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {targetUrl}
                    </span>
                )}
                {!targetUrl && (
                    <span style={{ fontSize: '0.82rem', color: '#f59e0b' }}>
                        ⚠ Set a target URL in the toolbar first
                    </span>
                )}
            </div>

            {status === 'idle' && (
                <div className="idle-state">
                    <div className="idle-icon-wrapper">
                        <span className="pulse-circle" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }} />
                    </div>
                    <h2>Security Scanner Ready</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {targetUrl ? 'Click "Launch Scan" to run XSS and SQL injection detection.' : 'Set a target URL in the toolbar above.'}
                    </p>
                </div>
            )}

            {status === 'scanning' && (
                <div className="idle-state">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                        style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#ef4444', margin: '0 auto 1.5rem' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Injecting payloads and scanning for vulnerabilities…</p>
                </div>
            )}

            <AnimatePresence>
                {status === 'done' && result && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Summary bar */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Scanned URL', value: result.scannedUrl, icon: <Shield size={16} color="#3b82f6" /> },
                                { label: 'Findings',    value: result.findings?.length ?? 0, icon: <AlertTriangle size={16} color="#ef4444" /> },
                            ].map(({ label, value, icon }) => (
                                <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem 1.5rem', flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        {icon} {label}
                                    </div>
                                    <p style={{ fontWeight: 700, fontSize: '1.1rem', wordBreak: 'break-all' }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {result.findings?.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
                                <CheckCircle color="#10b981" />
                                <p style={{ color: '#10b981', fontWeight: 600 }}>No vulnerabilities detected — target appears clean.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {result.findings.map((f, i) => (
                                    <div key={i} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <strong>{f.type}</strong>
                                            <SeverityBadge severity={f.severity} />
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{f.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Security;
