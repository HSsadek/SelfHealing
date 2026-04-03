import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const PriorityActions = ({ actions }) => {
    if (!actions || actions.length === 0) return null;

    // Filter and sort by impact (High -> Medium -> Low)
    const sortedActions = [...actions].sort((a, b) => {
        const value = { high: 3, medium: 2, low: 1 };
        return (value[b.impact] || 0) - (value[a.impact] || 0);
    });

    return (
        <div className="priority-section">
            <h2 className="section-title">Priority Actions</h2>
            <div className="priority-grid">
                {sortedActions.map((action, i) => (
                    <motion.div 
                        key={i}
                        className={`action-card glass border-${action.impact}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="action-header">
                            <span className={`impact-badge ${action.impact}`}>
                                <Zap size={12} fill="currentColor" className="zap-icon" />
                                {action.impact} impact
                            </span>
                            <h4>{action.issue}</h4>
                        </div>
                        <div className="action-body">
                            <strong>Fix:</strong>
                            <p className="fix-text">{action.fix}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default PriorityActions;
