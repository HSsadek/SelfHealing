import React, { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'kaliteqa_target_url';

const UrlContext = createContext(null);

/**
 * UrlProvider — stores the single global target URL.
 * Persists to localStorage and restores on page load.
 */
export const UrlProvider = ({ children }) => {
    const [targetUrl, setTargetUrlState] = useState(
        () => localStorage.getItem(STORAGE_KEY) || ''
    );

    const setTargetUrl = useCallback((url) => {
        const trimmed = url.trim();
        setTargetUrlState(trimmed);
        if (trimmed) {
            localStorage.setItem(STORAGE_KEY, trimmed);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    const clearUrl = useCallback(() => {
        setTargetUrlState('');
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <UrlContext.Provider value={{ targetUrl, setTargetUrl, clearUrl }}>
            {children}
        </UrlContext.Provider>
    );
};

/**
 * useTargetUrl — hook to consume the global URL in any component.
 * Throws a clear error if used outside <UrlProvider>.
 */
export const useTargetUrl = () => {
    const ctx = useContext(UrlContext);
    if (!ctx) throw new Error('useTargetUrl must be used inside <UrlProvider>');
    return ctx;
};
