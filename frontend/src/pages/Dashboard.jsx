import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import SummaryCards from '../components/SummaryCards';
import ScoreCard from '../components/ScoreCard';
import PriorityActions from '../components/PriorityActions';
import IssuesTable from '../components/IssuesTable';
import { analyzeUrl } from '../services/api';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [data, setData] = useState(null);

    const handleSearch = async (targetUrl) => {
        if (!targetUrl) return;
        setStatus('loading');
        setErrorMsg('');

        try {
            const result = await analyzeUrl(targetUrl);
            setData(result.analysis);
            setStatus('success');
        } catch (err) {
            setErrorMsg(err.message);
            setStatus('error');
        }
    };

    return (
        <DashboardLayout
            onSearch={handleSearch}
            url={url}
            setUrl={setUrl}
            isLoading={status === 'loading'}
        >
            {status === 'idle' && (
                <div className="idle-state">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="idle-icon-wrapper">
                            <span className="pulse-circle"></span>
                        </div>
                        <h2>Analyze any URL instantly</h2>
                        <p>Enter a valid URL above to spawn our scraper and audit engine.</p>
                    </motion.div>
                </div>
            )}

            {status === 'error' && (
                <div className="error-banner glass">
                    <p>⚠️ {errorMsg}</p>
                </div>
            )}

            {status === 'loading' && (
                <div className="skeleton-container animate-fade-in">
                    <div className="skeleton-cards">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton pulse-skel" style={{ height: '90px' }}></div>)}
                    </div>
                    <div className="skeleton-scores">
                        <div className="skeleton pulse-skel" style={{ height: '350px' }}></div>
                    </div>
                    <div className="skeleton-table">
                        <div className="skeleton pulse-skel" style={{ height: '400px', marginTop: '2rem' }}></div>
                    </div>
                </div>
            )}

            {status === 'success' && data && (
                <motion.div
                    className="dashboard-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <SummaryCards summary={data.summary} />

                    {data.aiInsights && (
                        <div className="score-section">
                            <h2 className="section-title">Engine Assessment</h2>
                            <div className="scores-grid">
                                <ScoreCard title="UX Metrics" data={data.aiInsights.ux} index={0} />
                                <ScoreCard title="SEO Optimization" data={data.aiInsights.seo} index={1} />
                                <ScoreCard title="Content Health" data={data.aiInsights.content} index={2} />
                            </div>
                        </div>
                    )}

                    {data.priorityActions && data.priorityActions.length > 0 && (
                        <PriorityActions actions={data.priorityActions} />
                    )}

                    {data.issues && data.issues.length > 0 && (
                        <IssuesTable issues={data.issues} />
                    )}
                </motion.div>
            )}
        </DashboardLayout>
    );
};

export default Dashboard;
