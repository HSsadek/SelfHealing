import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const ScoreCard = ({ title, data, index }) => {
    if (!data) return null;

    const score = data.score || 0;
    
    // Determine color
    const getColor = (s) => {
        if (s >= 90) return '#10b981'; // Green
        if (s >= 70) return '#f59e0b'; // Yellow
        return '#ef4444';              // Red
    };
    
    const color = getColor(score);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <motion.div 
            className="score-card glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
        >
            <div className="score-header">
                <h3>{title}</h3>
                <div className="circular-progress">
                    <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} className="bg-circle" />
                        <motion.circle 
                            cx="50" cy="50" r={radius} 
                            className="progress-circle"
                            stroke={color}
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="score-text" style={{ color }}>{score}</div>
                </div>
            </div>
            
            <div className="score-details">
                {data.problems && data.problems.length > 0 && (
                    <div className="problem-list">
                        <h4>Issues Detected</h4>
                        <ul>
                            {data.problems.map((prob, i) => (
                                <li key={i}><X size={14} className="icon-red"/> <span>{prob}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {data.suggestions && data.suggestions.length > 0 && (
                    <div className="suggestion-list">
                        <h4>Recommendations</h4>
                        <ul>
                            {data.suggestions.map((sug, i) => (
                                <li key={i}><Check size={14} className="icon-green"/> <span>{sug}</span></li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ScoreCard;
