import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/ui/Sidebar';
import GlobalUrlInput from '../components/ui/GlobalUrlInput';

const PAGE_TITLES = {
    analysis:   'Analysis',
    tests:      'Test Runner',
    security:   'Security Scanner',
    healing:    'Self-Healing Engine',
    autonomous: '🤖 Autonomous Mode',
    evidence:   '🔍 Evidence Inspector',
};

const DashboardLayout = () => {
    const location = useLocation();
    const segment = location.pathname.split('/').filter(Boolean).pop();
    const pageTitle = PAGE_TITLES[segment] ?? 'Dashboard';

    return (
        <div className="layout-wrapper">
            <Sidebar />

            <main className="main-content">
                {/* Sticky Topbar — hosts the shared GlobalUrlInput */}
                <header className="topbar glass" style={{ justifyContent: 'space-between', gap: '1.5rem', height: 'auto', minHeight: '64px', padding: '0.75rem 2rem' }}>
                    {/* Page title — left side */}
                    <div style={{ flexShrink: 0 }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            {pageTitle}
                        </h2>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {location.pathname}
                        </p>
                    </div>

                    {/* Global URL Input — right side, flex-grows to fill space */}
                    <GlobalUrlInput />
                </header>

                <div className="content-container">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
