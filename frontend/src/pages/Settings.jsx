import React, { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: '1.75rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>{label}</label>
        {hint && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{hint}</p>}
        {children}
    </div>
);

const inputStyle = {
    width: '100%', maxWidth: '480px',
    background: 'var(--bg-dark)', border: '1px solid var(--border-strong)',
    borderRadius: '8px', padding: '0.65rem 1rem',
    color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none',
};

const Settings = () => {
    const [apiKey, setApiKey]         = useState('');
    const [threshold, setThreshold]   = useState(80);
    const [autoHeal, setAutoHeal]     = useState(true);
    const [saved, setSaved]           = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        // In production this would call an API — for now just visual feedback
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <SettingsIcon size={22} color="var(--brand-accent)" />
                <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Platform Settings</h2>
            </div>

            <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '2rem' }}
            >
                <Field label="Gemini API Key" hint="Used for all AI-powered analysis and self-healing.">
                    <input
                        type="password"
                        placeholder="AIza••••••••••••••••••••"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        style={inputStyle}
                    />
                </Field>

                <Field label="Confidence Threshold" hint={`AI fixes are only auto-applied above ${threshold}% confidence.`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input type="range" min={50} max={100} value={threshold} onChange={e => setThreshold(+e.target.value)}
                            style={{ flex: 1, accentColor: 'var(--brand-accent)' }} />
                        <span style={{ fontWeight: 700, minWidth: '42px', textAlign: 'right' }}>{threshold}%</span>
                    </div>
                </Field>

                <Field label="Auto-Healing Mode">
                    <button
                        type="button"
                        onClick={() => setAutoHeal(v => !v)}
                        style={{
                            background: autoHeal ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                            border: `1px solid ${autoHeal ? '#10b981' : '#ef4444'}`,
                            color: autoHeal ? '#10b981' : '#ef4444',
                            borderRadius: '8px', padding: '0.5rem 1.25rem',
                            fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        {autoHeal ? 'ON — Auto-apply fixes above threshold' : 'OFF — Manual confirmation required'}
                    </button>
                </Field>

                <button type="submit" className="btn-analyze"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Save size={16} />
                    {saved ? 'Saved ✓' : 'Save Settings'}
                </button>
            </motion.form>
        </div>
    );
};

export default Settings;
