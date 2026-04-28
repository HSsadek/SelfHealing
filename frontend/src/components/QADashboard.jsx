import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { PlayCircle, ShieldAlert, Bug, Cpu, Activity, AlertTriangle, Settings, XCircle, CheckCircle } from 'lucide-react';
import { runFunctionalTest } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useTargetUrl } from '../contexts/UrlContext';
import SelfHealingPanel from './SelfHealingPanel';
import DomDiffViewer from './DomDiffViewer';
import './QADashboard.css';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTS (Memoized for Performance) ---

const LiveConsole = memo(({ logs }) => {
    const consoleEndRef = useRef(null);

    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    return (
        <div className="qa-card" style={{ height: '400px' }}>
            <div className="qa-card-title">
                <Cpu size={20} className="accent-color" />
                Live Execution Console
            </div>
            <div className="live-console">
                <div style={{ color: '#64748b', marginBottom: '1rem' }}>
                    [System] Worker Node Initialized... Waiting for target payload.
                </div>
                {logs.length === 0 ? (
                    <div className="skeleton-line" style={{ width: '60%', height: '14px', background: '#334155', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                ) : (
                    logs.map((L, i) => (
                        <div key={i} className={`log-line ${L.level}`}>
                            <span style={{ color: '#64748b' }}>{L.timestamp?.substring(11, 23)}</span>
                            <span style={{ margin: '0 0.5rem' }}>|</span>
                            {L.message}
                        </div>
                    ))
                )}
                <div ref={consoleEndRef} />
            </div>
        </div>
    );
});

const ExecutionTimeline = memo(({ logs }) => {
    // Heavy filtering is memoized to avoid recalculating on every parent render
    const filteredLogs = useMemo(() => {
        return logs.filter(l => l.message && l.message.startsWith('Step'));
    }, [logs]);

    return (
        <div className="qa-card">
            <div className="qa-card-title">
                <Bug size={20} className="accent-color" />
                Test Execution Timeline
            </div>
            <div style={{ marginTop: '1rem' }}>
                <AnimatePresence>
                    {filteredLogs.map((l, i) => {
                        const isErr = l.level === 'error';
                        const isWarn = l.level === 'warn';
                        return (
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                key={i}
                                className="timeline-item"
                                layout
                            >
                                <div className="timeline-icon">
                                    {isErr ? <XCircle size={16} color="#ef4444" /> :
                                        isWarn ? <AlertTriangle size={16} color="#f59e0b" /> :
                                            <CheckCircle size={16} color="#10b981" />}
                                </div>
                                <div className={`timeline-content ${l.level}`}>
                                    {l.message}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {filteredLogs.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: '40px', background: 'rgba(51, 65, 85, 0.4)', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

const HeaderControl = memo(({ autoHeal, confidence, isTestRunning, onRun, noUrl }) => (
    <header className="qa-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Activity size={28} className="accent-color" />
            <h1 style={{ margin: 0, fontWeight: 700 }}>QA Automation Hub</h1>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.85rem', color: '#94a3b8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Settings size={14} /> Auto-Heal: <strong style={{ color: autoHeal ? '#10b981' : '#ef4444' }}>{autoHeal ? 'ON' : 'OFF'}</strong>
                </span>
                <span>Confidence Threshold: <strong style={{ color: '#f8fafc' }}>{confidence}%</strong></span>
            </div>
            {noUrl && (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>
                    ⚠ No target URL — set one in the toolbar
                </span>
            )}
            <button
                className="btn-primary"
                onClick={onRun}
                disabled={isTestRunning || noUrl}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: noUrl ? 'none' : '0 4px 14px 0 rgba(59,130,246,0.39)' }}
            >
                <PlayCircle size={18} />
                {isTestRunning ? 'Executing Pipeline...' : 'Deploy Execution'}
            </button>
        </div>

    </header>
));

// --- MAIN DASHBOARD (Controller) ---

const QADashboard = () => {
    // Read the global target URL — no local state duplicate
    const { targetUrl } = useTargetUrl();
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [autoHeal] = useState(true);
    const [confidence] = useState(80);

    // Global WebSocket State Context
    const { logs, healingEvents, evidenceSteps, clearLogs, clearHealingEvents, clearEvidenceSteps } = useSocket();

    // Derived State
    const activeHealingEvent = useMemo(() => {
        return healingEvents.length > 0 ? healingEvents[healingEvents.length - 1] : null;
    }, [healingEvents]);

    // Callbacks
    const handleRunE2E = useCallback(async () => {
        if (!targetUrl) return;
        setIsTestRunning(true);
        clearLogs();
        clearHealingEvents();
        clearEvidenceSteps();
        try {
            const testSteps = [
                { action: 'wait', value: 500 },
                { action: 'click', selector: '.non-existent-button-for-testing' },
                { action: 'verify', selector: 'body' }
            ];
            await runFunctionalTest(targetUrl, testSteps);
        } catch (e) {
            console.error("Test execution error:", e);
        } finally {
            setIsTestRunning(false);
        }
    }, [targetUrl, clearLogs, clearHealingEvents, clearEvidenceSteps]);

    return (
        <div className="qa-dashboard animate-fade-in">
            <HeaderControl
                autoHeal={autoHeal}
                confidence={confidence}
                isTestRunning={isTestRunning}
                onRun={handleRunE2E}
                noUrl={!targetUrl}
            />

            <div className="qa-grid">
                {/* Left Column - Logs and Timelines */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <LiveConsole logs={logs} />
                    <ExecutionTimeline logs={logs} />
                </div>

                {/* Right Column - AI Insights and Visualizations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="qa-card" style={{ flex: 1, minHeight: '400px' }}>
                        <div className="qa-card-title" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldAlert size={20} className="accent-color" />
                                Autonomous Healing Engine
                            </div>
                            {isTestRunning && healingEvents.length > 0 && (
                                <span className="pulse-circle" style={{ width: '10px', height: '10px', background: '#34d399', borderRadius: '50%' }}></span>
                            )}
                        </div>
                        <SelfHealingPanel events={healingEvents} />
                    </div>

                    <DomDiffViewer
                        oldSelector={activeHealingEvent?.originalSelector}
                        newSelector={activeHealingEvent?.newSelector}
                    />
                </div>
            </div>
        </div>
    );
};

export default QADashboard;
