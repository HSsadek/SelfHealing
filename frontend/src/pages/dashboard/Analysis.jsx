import React, { useState, useCallback, useEffect } from 'react';
import SummaryCards from '../../components/SummaryCards';
import ScoreCard from '../../components/ScoreCard';
import PriorityActions from '../../components/PriorityActions';
import IssuesTable from '../../components/IssuesTable';
import { analyzeUrl } from '../../services/api';
import { useTargetUrl } from '../../contexts/UrlContext';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const AnalysisSkeleton = () => (
    <div className="animate-fade-in">
        <div className="skeleton-cards">
            {[1,2,3,4].map(i => <div key={i} className="skeleton pulse-skel" style={{ height: '90px' }} />)}
        </div>
        <div className="skeleton pulse-skel" style={{ height: '350px', marginBottom: '2rem' }} />
        <div className="skeleton pulse-skel" style={{ height: '400px' }} />
    </div>
);

const EmptyState = ({ hasUrl }) => (
    <div className="idle-state">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="idle-icon-wrapper">
                <span className="pulse-circle" />
            </div>
            <h2>{hasUrl ? 'Ready to analyze' : 'No target URL set'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>
                {hasUrl
                    ? 'Click "Run Audit" to start the DOM & AI analysis.'
                    : 'Set a target URL in the toolbar above, then run the audit.'}
            </p>
        </motion.div>
    </div>
);

const Analysis = () => {
    const { targetUrl } = useTargetUrl();
    const [status, setStatus] = useState('idle');
    const [errorMsg, setError] = useState('');
    const [data, setData]     = useState(null);

    // Reset result when the global URL changes
    useEffect(() => {
        setStatus('idle');
        setData(null);
        setError('');
    }, [targetUrl]);

    const handleRun = useCallback(async () => {
        if (!targetUrl) return;
        setStatus('loading');
        setError('');
        try {
            const result = await analyzeUrl(targetUrl);
            setData(result.analysis);
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    }, [targetUrl]);

    return (
        <>
            {/* Action bar — no URL input here, just the trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    className="btn-analyze"
                    onClick={handleRun}
                    disabled={!targetUrl || status === 'loading'}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Play size={15} />
                    {status === 'loading' ? 'Scanning…' : 'Run Audit'}
                </button>
                {targetUrl && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {targetUrl}
                    </span>
                )}
            </div>

            {status === 'idle'    && <EmptyState hasUrl={Boolean(targetUrl)} />}
            {status === 'loading' && <AnalysisSkeleton />}

            {status === 'error' && (
                <div className="error-banner glass" style={{ marginBottom: '1.5rem' }}>
                    <p>⚠️ {errorMsg}</p>
                </div>
            )}

            {status === 'success' && data && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <SummaryCards summary={data.summary} />
                    {data.aiInsights && (
                        <div className="score-section">
                            <h2 className="section-title">Engine Assessment</h2>
                            <div className="scores-grid">
                                <ScoreCard title="UX Metrics"       data={data.aiInsights.ux}      index={0} />
                                <ScoreCard title="SEO Optimization"  data={data.aiInsights.seo}     index={1} />
                                <ScoreCard title="Content Health"    data={data.aiInsights.content}  index={2} />
                            </div>
                        </div>
                    )}
                    {data.priorityActions?.length > 0 && <PriorityActions actions={data.priorityActions} />}
                    {data.issues?.length > 0            && <IssuesTable    issues={data.issues} />}
                </motion.div>
            )}
        </>
    );
};

export default Analysis;
