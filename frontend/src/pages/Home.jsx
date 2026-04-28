import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, Zap, ShieldAlert, FlaskConical } from 'lucide-react';

const FEATURES = [
    { icon: Activity,    color: '#3b82f6', title: 'DOM Analysis',     desc: 'Deep inspection of page structure, accessibility & SEO issues.' },
    { icon: FlaskConical, color: '#10b981', title: 'Test Runner',     desc: 'Step-by-step Puppeteer automation with retry logic.' },
    { icon: ShieldAlert, color: '#f59e0b', title: 'Security Scanner', desc: 'Active XSS & SQLi payload injection with real-time findings.' },
    { icon: Zap,         color: '#a855f7', title: 'Self-Healing AI',  desc: 'Gemini-powered broken selector detection and auto-fix.' },
];

const Home = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Activity size={40} color="var(--brand-accent)" />
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em' }}>
                    Kalite<span style={{ color: 'var(--brand-accent)' }}>QA</span>
                </h1>
            </div>

            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '560px', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                Autonomous web testing & self-healing QA platform powered by AI.
                Catch bugs before your users do.
            </p>

            <Link to="/dashboard/analysis">
                <button style={{
                    background: 'var(--brand-accent)', color: '#fff',
                    border: 'none', borderRadius: '10px',
                    padding: '0.85rem 2rem', fontSize: '1rem',
                    fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 24px rgba(59,130,246,0.4)',
                    transition: 'transform 0.2s',
                }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    Open Dashboard <ArrowRight size={18} />
                </button>
            </Link>
        </motion.div>

        {/* Feature grid */}
        <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '5rem', maxWidth: '900px', width: '100%' }}
        >
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
                <div key={title} style={{
                    background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
                    borderRadius: '12px', padding: '1.75rem', textAlign: 'left',
                    transition: 'border-color 0.2s',
                }}
                    onMouseOver={e => e.currentTarget.style.borderColor = color}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                        <Icon size={20} color={color} />
                    </div>
                    <h3 style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '1rem' }}>{title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>{desc}</p>
                </div>
            ))}
        </motion.div>
    </div>
);

export default Home;
