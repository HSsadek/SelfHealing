import React from 'react';
import { useSocket } from '../../contexts/SocketContext';
import SelfHealingPanel from '../../components/SelfHealingPanel';
import DomDiffViewer from '../../components/DomDiffViewer';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const StatPill = ({ label, value, color = '#3b82f6' }) => (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color, fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>{value}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{label}</p>
    </div>
);

const Healing = () => {
    const { healingEvents } = useSocket();
    const lastEvent = healingEvents.at(-1);

    const successCount = healingEvents.filter(e => e.type === 'success' || e.type === 'retry').length;
    const failCount    = healingEvents.filter(e => e.type === 'failed').length;

    return (
        <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatPill label="Total Events"   value={healingEvents.length} color="#3b82f6" />
                <StatPill label="Auto-Fixed"     value={successCount}         color="#10b981" />
                <StatPill label="Failed"         value={failCount}            color="#ef4444" />
            </div>

            {/* Panel */}
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <Zap size={20} color="#a855f7" />
                    <h3 style={{ fontWeight: 700 }}>Healing Events</h3>
                </div>
                <SelfHealingPanel events={healingEvents} />
            </div>

            {/* DOM diff for most recent healed event */}
            {lastEvent?.originalSelector && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <DomDiffViewer
                        oldSelector={lastEvent.originalSelector}
                        newSelector={lastEvent.newSelector}
                    />
                </motion.div>
            )}

            {healingEvents.length === 0 && (
                <div className="idle-state" style={{ marginTop: '5vh' }}>
                    <div className="idle-icon-wrapper">
                        <span className="pulse-circle" style={{ background: 'rgba(168,85,247,0.1)', border: '2px solid rgba(168,85,247,0.3)' }} />
                    </div>
                    <h2>No healing events yet</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Run a test on the Tests page and broken selectors will appear here in real-time.</p>
                </div>
            )}
        </>
    );
};

export default Healing;
