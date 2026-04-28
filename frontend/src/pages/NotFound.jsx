import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <p style={{ fontSize: '7rem', fontWeight: 900, lineHeight: 1, color: 'var(--border-strong)' }}>404</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Page not found</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>This route doesn't exist in the KaliteQA platform.</p>
            <Link to="/">
                <button style={{
                    background: 'var(--bg-panel)', color: 'var(--text-main)',
                    border: '1px solid var(--border-strong)', borderRadius: '8px',
                    padding: '0.65rem 1.5rem', fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                }}>
                    <ArrowLeft size={16} /> Back to Home
                </button>
            </Link>
        </motion.div>
    </div>
);

export default NotFound;
