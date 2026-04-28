import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MainLayout — wraps public-facing pages (e.g. home, 404).
 * No sidebar; just full-width content with a minimal header.
 */
const MainLayout = () => (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
            >
                <Outlet />
            </motion.div>
        </AnimatePresence>
    </div>
);

export default MainLayout;
