import React from 'react';
import { Activity } from 'lucide-react';

/**
 * PageLoader — full-screen spinner shown during lazy route loading.
 */
const PageLoader = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        background: 'var(--bg-dark)',
        color: 'var(--text-muted)',
    }}>
        <Activity size={32} color="var(--brand-accent)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>LOADING</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default PageLoader;
