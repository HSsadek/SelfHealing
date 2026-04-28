import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket]               = useState(null);
    const [logs, setLogs]                   = useState([]);
    const [healingEvents, setHealingEvents] = useState([]);
    const [evidenceSteps, setEvidenceSteps] = useState([]);

    // ── Autonomous Mode State ─────────────────────────────────────────────
    const [autonomousEvents, setAutonomousEvents] = useState([]);
    const [autonomousReport, setAutonomousReport] = useState(null);
    const [autonomousRunning, setAutonomousRunning] = useState(false);

    useEffect(() => {
        const newSocket = io('http://localhost:3000');
        setSocket(newSocket);

        newSocket.on('connect', () => console.log('[Socket] Connected to backend'));

        // ── Existing event streams ────────────────────────────────────────
        newSocket.on('log_stream', (data) => {
            setLogs(prev => [...prev, data]);
        });

        // Evidence-Based runner: per-step full evidence object
        newSocket.on('step_evidence', (data) => {
            if (data?.evidence) {
                setEvidenceSteps(prev => {
                    const next = [...prev];
                    const idx = next.findIndex(s => s.stepId === data.evidence.stepId);
                    if (idx >= 0) next[idx] = data.evidence;
                    else next.push(data.evidence);
                    return next;
                });
            }
        });

        newSocket.on('issue_detected',   (data) => setHealingEvents(prev => [...prev, { type: 'issue',     ...data, timestamp: new Date().toISOString() }]));
        newSocket.on('fix_generated',    (data) => setHealingEvents(prev => [...prev, { type: 'generated', ...data, timestamp: new Date().toISOString() }]));
        newSocket.on('fix_applied',      (data) => setHealingEvents(prev => [...prev, { type: 'applied',   ...data, timestamp: new Date().toISOString() }]));
        newSocket.on('fix_success',      (data) => setHealingEvents(prev => [...prev, { type: 'success',   ...data, timestamp: new Date().toISOString() }]));
        newSocket.on('fix_success_retry',(data) => setHealingEvents(prev => [...prev, { type: 'retry',     ...data, timestamp: new Date().toISOString() }]));
        newSocket.on('fix_failed',       (data) => setHealingEvents(prev => [...prev, { type: 'failed',    ...data, timestamp: new Date().toISOString() }]));

        // ── Autonomous orchestrator events ────────────────────────────────
        newSocket.on('autonomous_started', (data) => {
            setAutonomousRunning(true);
            setAutonomousReport(null);
            setAutonomousEvents([{ ...data, timestamp: new Date().toISOString() }]);
        });

        newSocket.on('autonomous_event', (data) => {
            setAutonomousEvents(prev => [...prev, { ...data, timestamp: new Date().toISOString() }]);
        });

        // These are also emitted as autonomous_event but we alias them for clarity
        const autonomousPassthrough = [
            'phase_started', 'step_update', 'analysis_completed',
            'dom_analysis_completed', 'test_completed', 'security_scan_completed',
            'autonomous_timeout', 'autonomous_error',
        ];
        autonomousPassthrough.forEach(evt => {
            newSocket.on(evt, (data) => {
                setAutonomousEvents(prev => [...prev, { event: evt, ...data, timestamp: new Date().toISOString() }]);
            });
        });

        // Dedicated channel — receives the full structured JSON report
        newSocket.on('autonomous_report_generated', (data) => {
            setAutonomousReport(data.report ?? null);
            setAutonomousRunning(false);
            // Also push a synthetic entry into the event timeline
            setAutonomousEvents(prev => [...prev, {
                event: 'report_generated',
                message: data.report?.error
                    ? `Run failed: ${data.report.error}`
                    : `✅ Report ready — Score: ${data.report?.overallScore}/100`,
                timestamp: new Date().toISOString(),
            }]);
        });

        return () => newSocket.close();
    }, []);

    const clearLogs              = useCallback(() => setLogs([]), []);
    const clearHealingEvents     = useCallback(() => setHealingEvents([]), []);
    const clearEvidenceSteps     = useCallback(() => setEvidenceSteps([]), []);
    const clearAutonomousSession = useCallback(() => {
        setAutonomousEvents([]);
        setAutonomousReport(null);
        setAutonomousRunning(false);
    }, []);

    return (
        <SocketContext.Provider value={{
            socket,
            logs, healingEvents, evidenceSteps,
            clearLogs, clearHealingEvents, clearEvidenceSteps,
            // autonomous
            autonomousEvents, autonomousReport, autonomousRunning,
            clearAutonomousSession,
        }}>
            {children}
        </SocketContext.Provider>
    );
};
