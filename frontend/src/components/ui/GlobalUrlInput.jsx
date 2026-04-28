import React, { useState, useCallback } from 'react';
import { Search, X, CheckCircle } from 'lucide-react';
import { useTargetUrl } from '../../contexts/UrlContext';

/**
 * GlobalUrlInput — lives in the DashboardLayout topbar.
 * Reads/writes the single shared URL across all dashboard pages.
 */
const GlobalUrlInput = () => {
    const { targetUrl, setTargetUrl, clearUrl } = useTargetUrl();

    // Local draft — only committed to global state on submit
    const [draft, setDraft] = useState(targetUrl);
    const [error, setError] = useState('');

    const validate = useCallback((url) => {
        try {
            new URL(url); // native browser validation
            return true;
        } catch {
            return false;
        }
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!draft.trim()) {
            setError('Please enter a URL.');
            return;
        }
        if (!validate(draft.trim())) {
            setError('Invalid URL — include https://');
            return;
        }
        setError('');
        setTargetUrl(draft.trim());
    }, [draft, validate, setTargetUrl]);

    const handleClear = useCallback(() => {
        setDraft('');
        setError('');
        clearUrl();
    }, [clearUrl]);

    const isSet = Boolean(targetUrl) && targetUrl === draft.trim();

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '640px' }}>
            <div style={{
                display: 'flex', alignItems: 'center', flex: 1,
                background: 'var(--bg-dark)', border: `1px solid ${error ? '#ef4444' : isSet ? '#10b981' : 'var(--border-strong)'}`,
                borderRadius: '8px', padding: '0.3rem 0.3rem 0.3rem 0.875rem',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isSet ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
            }}>
                <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '0.6rem' }} />
                <input
                    type="url"
                    placeholder="https://example.com — set target for all scans"
                    value={draft}
                    onChange={e => { setDraft(e.target.value); setError(''); }}
                    style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'var(--text-main)', fontSize: '0.88rem',
                    }}
                    aria-label="Target URL"
                />
                {/* Active indicator OR clear button */}
                {isSet ? (
                    <CheckCircle
                        size={16}
                        color="#10b981"
                        title="URL active"
                        style={{ margin: '0 0.5rem', flexShrink: 0 }}
                    />
                ) : draft ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem', color: 'var(--text-muted)', flexShrink: 0 }}
                        title="Clear"
                    >
                        <X size={14} />
                    </button>
                ) : null}

                <button
                    type="submit"
                    className="btn-analyze"
                    style={{ flexShrink: 0, fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                    Set Target
                </button>
            </div>

            {/* Inline error */}
            {error && (
                <span style={{ color: '#ef4444', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {error}
                </span>
            )}
        </form>
    );
};

export default GlobalUrlInput;
