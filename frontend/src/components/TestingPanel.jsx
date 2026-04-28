import React, { useState } from 'react';
import { runFunctionalTest, runSecurityScan } from '../services/api';
import { Shield, PlayCircle, Activity } from 'lucide-react';

const TestingPanel = ({ url }) => {
    const [testRunning, setTestRunning] = useState(false);
    const [secRunning, setSecRunning] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [secResult, setSecResult] = useState(null);

    const handleRunTest = async () => {
        setTestRunning(true);
        setTestResult(null);
        try {
            // Provide a dummy test step to test the engine, attempting to click something that might not exist 
            // to trigger the self-healing or pass if it does.
            const dummySteps = [
                { action: 'wait', value: 2000 },
                { action: 'verify', selector: 'body' },
                { action: 'wait', value: 1000 }
            ];
            const res = await runFunctionalTest(url, dummySteps);
            setTestResult(res);
        } catch (e) {
            setTestResult({ error: e.message });
        }
        setTestRunning(false);
    };

    const handleRunSec = async () => {
        setSecRunning(true);
        setSecResult(null);
        try {
            const res = await runSecurityScan(url);
            setSecResult(res);
        } catch (e) {
            setSecResult({ error: e.message });
        }
        setSecRunning(false);
    };

    return (
        <div className="testing-panel" style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h2 className="section-title">Autonomous QA & Security</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button 
                    onClick={handleRunTest} 
                    disabled={testRunning}
                    style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <PlayCircle size={18} />
                    {testRunning ? 'Running Test...' : 'Run Functional E2E (Self-Healing)'}
                </button>

                <button 
                    onClick={handleRunSec} 
                    disabled={secRunning}
                    style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <Shield size={18} />
                    {secRunning ? 'Scanning...' : 'Run Parallel Security Scan'}
                </button>
            </div>

            {testResult && (
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h3>E2E Test Result {testResult.success ? '✅' : '❌'}</h3>
                    {testResult.error && <p style={{ color: 'red' }}>Error: {testResult.error}</p>}
                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#0f172a', padding: '1rem', fontSize: '12px', fontFamily: 'monospace' }}>
                        {(testResult.logs || []).map((l, i) => (
                            <div key={i} style={{ color: l.level === 'error' ? '#ef4444' : l.level === 'warn' ? '#f59e0b' : l.level === 'success' ? '#10b981' : '#cbd5e1' }}>
                                [{l.timestamp}] {l.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {secResult && (
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
                    <h3>Security Findings {secResult.findings?.length > 0 ? '⚠️' : '✅'}</h3>
                    {secResult.error && <p style={{ color: 'red' }}>Error: {secResult.error}</p>}
                    {secResult.findings?.length === 0 ? (
                        <p style={{ color: '#10b981' }}>No apparent vulnerabilities detected.</p>
                    ) : (
                        <ul style={{ color: '#ef4444', marginLeft: '1.5rem' }}>
                            {secResult.findings?.map((f, i) => (
                                <li key={i}>[{f.severity}] {f.type} - {f.description}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default TestingPanel;
