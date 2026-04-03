import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';

const IssuesTable = ({ issues }) => {
    const [filter, setFilter] = useState('All');

    if (!issues || issues.length === 0) return null;

    const filteredIssues = filter === 'All' 
        ? issues 
        : issues.filter(i => i.severity.toLowerCase() === filter.toLowerCase());

    const getSeverityBadge = (severity) => {
        const s = severity.toLowerCase();
        if (s === 'high') return <span className="badge high">High</span>;
        if (s === 'medium') return <span className="badge medium">Medium</span>;
        return <span className="badge low">Low</span>;
    };

    return (
        <div className="issues-section">
            <div className="table-header-row">
                <h2 className="section-title">Raw Diagnostics Log</h2>
                <div className="filter-group">
                    <Filter size={16} className="filter-icon" />
                    {['All', 'High', 'Medium', 'Low'].map(f => (
                        <button 
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-container glass">
                <table className="issues-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Message / Audit Result</th>
                            <th>Severity</th>
                            <th>Node / Selector</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIssues.map((issue, index) => (
                            <motion.tr 
                                key={index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                            >
                                <td><span className="type-badge">{issue.type || 'DOM'}</span></td>
                                <td className="message-cell">{issue.message}</td>
                                <td>{getSeverityBadge(issue.severity || 'low')}</td>
                                <td className="code-cell">
                                    <code>{issue.element || issue.selector || 'Document Level'}</code>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                {filteredIssues.length === 0 && (
                    <div className="empty-state">No {filter} severity issues found matching this filter.</div>
                )}
            </div>
        </div>
    );
};

export default IssuesTable;
