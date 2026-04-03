import React from 'react';
import { LayoutDashboard, Settings, Activity, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardLayout = ({ children, onSearch, url, setUrl, isLoading }) => {
    return (
        <div className="layout-wrapper">
            {/* Sidebar */}
            <aside className="sidebar glass-border">
                <div className="sidebar-logo">
                    <Activity size={24} className="accent-color" />
                    <span>SeoXRay</span>
                </div>
                <nav className="sidebar-nav">
                    <button className="nav-item active">
                        <LayoutDashboard size={18} />
                        Dashboard
                    </button>
                    <button className="nav-item">
                        <Settings size={18} />
                        Settings
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <header className="topbar glass">
                    <form className="search-bar" onSubmit={(e) => { e.preventDefault(); onSearch(url); }}>
                        <Search size={18} className="search-icon" />
                        <input
                            type="url"
                            placeholder="Enter URL to analyze (e.g. https://example.com)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn-analyze" disabled={isLoading}>
                            {isLoading ? 'Scanning...' : 'Run Audit'}
                        </button>
                    </form>
                </header>

                <div className="content-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
