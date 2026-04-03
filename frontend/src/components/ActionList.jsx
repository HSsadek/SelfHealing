import React from 'react';
import '../index.css';

const ActionList = ({ actions }) => {
    if (!actions || actions.length === 0) return null;

    return (
        <div className="card action-card glass">
            <h3>Priority Actions</h3>
            <ul className="action-list">
                {actions.map((action, index) => (
                    <li key={index} className="action-item">
                        <div className={`impact-badge ${action.impact}`}>
                            {action.impact} impact
                        </div>
                        <div className="action-text">
                            <strong>Issue:</strong> {action.issue}
                            <br />
                            <strong>Fix:</strong> {action.fix}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActionList;
