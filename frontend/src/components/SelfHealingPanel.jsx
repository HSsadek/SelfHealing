import React, { useState } from 'react';
import { ShieldAlert, Zap, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SelfHealingPanel = ({ events }) => {
    // Process events to group them by the original issue
    // E.g., issue -> generated -> applied -> success/failed
    const getGroupedIssues = () => {
        const groups = {};
        events.forEach(ev => {
            const key = ev.originalSelector || ev.message; 
            if (!groups[key]) groups[key] = { logs: [], status: 'pending' };
            groups[key].logs.push(ev);
            if (ev.type === 'success' || ev.type === 'retry') groups[key].status = 'success';
            if (ev.type === 'failed') groups[key].status = 'failed';
            
            // Extract core data for UI
            if (ev.originalSelector) groups[key].oldSel = ev.originalSelector;
            if (ev.newSelector) groups[key].newSel = ev.newSelector;
            if (ev.confidence) groups[key].conf = ev.confidence;
        });
        return Object.values(groups);
    };

    const issues = getGroupedIssues();

    return (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {issues.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                    No healing events detected yet.
                </div>
            ) : (
                <AnimatePresence>
                    {issues.map((iss, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="healing-item"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {iss.status === 'success' ? <CheckCircle color="#10b981" size={20} /> :
                                     iss.status === 'failed' ? <XCircle color="#ef4444" size={20} /> :
                                     <Zap color="#f59e0b" size={20} className="pulse-icon" />}
                                    <h4 style={{ margin: 0 }}>Healing Event</h4>
                                </div>
                                <span style={{ fontSize: '0.8rem', background: '#334155', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                    {iss.status.toUpperCase()}
                                </span>
                            </div>
                            
                            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.2rem' }}>❌ Broken Target</div>
                                    <code style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#fca5a5' }}>
                                        {iss.oldSel || 'Unknown'}
                                    </code>
                                </div>
                                <div>
                                    <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '0.2rem' }}>🔍 Detected Alternative</div>
                                    <code style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#6ee7b7' }}>
                                        {iss.newSel || 'Searching...'}
                                    </code>
                                </div>
                            </div>
                            
                            <div className="healing-stats">
                                <span>Confidence: <strong>{iss.conf !== undefined ? `${iss.conf}%` : '--'}</strong></span>
                                <span>Engine: <strong>Gemini 2.5 Flash / Memory</strong></span>
                            </div>
                            
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
    );
};

export default SelfHealingPanel;
