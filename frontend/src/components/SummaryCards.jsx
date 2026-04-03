import React from 'react';
import { motion } from 'framer-motion';
import { FileWarning, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const SummaryCards = ({ summary }) => {
    if (!summary) return null;

    const cards = [
        { title: 'Total Issues', value: summary.totalIssues || 0, icon: FileWarning, color: 'var(--text-main)', bg: 'rgba(255,255,255,0.05)' },
        { title: 'High Impact', value: summary.high || 0, icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        { title: 'Medium Impact', value: summary.medium || 0, icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        { title: 'Low Impact', value: summary.low || 0, icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    ];

    return (
        <div className="summary-grid">
            {cards.map((card, i) => (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, ease: 'easeOut' }}
                    key={i} 
                    className="summary-card glass"
                >
                    <div className="summary-icon" style={{ background: card.bg, color: card.color }}>
                        <card.icon size={26} />
                    </div>
                    <div className="summary-data">
                        <h3>{card.title}</h3>
                        <p>{card.value}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default SummaryCards;
