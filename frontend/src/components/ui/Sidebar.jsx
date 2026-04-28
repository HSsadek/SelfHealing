import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, FlaskConical, ShieldAlert, Activity, Settings, Zap, Bot, Fingerprint
} from 'lucide-react';

const NAV_LINKS = [
    { to: '/dashboard/analysis',   icon: LayoutDashboard, label: 'Analysis'      },
    { to: '/dashboard/tests',      icon: FlaskConical,    label: 'Tests'          },
    { to: '/dashboard/security',   icon: ShieldAlert,     label: 'Security'       },
    { to: '/dashboard/healing',    icon: Zap,             label: 'Self-Healing'   },
    {
        to: '/dashboard/autonomous',
        icon: Bot,
        label: 'Autonomous',
        highlight: true,
    },
    { to: '/dashboard/evidence',    icon: Fingerprint,     label: 'Evidence'       },
];

const Sidebar = memo(() => (
    <aside className="sidebar glass-border">
        {/* Logo */}
        <div className="sidebar-logo">
            <Activity size={22} className="accent-color" />
            <span>KaliteQA</span>
        </div>

        {/* Primary Navigation */}
        <nav className="sidebar-nav" style={{ flex: 1 }}>
            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                Platform
            </p>
        {NAV_LINKS.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                }
                style={({ isActive }) => ({
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    ...(highlight && !isActive ? {
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        color: '#a78bfa',
                    } : {}),
                })}
            >
                <Icon size={17} />
                {label}
            </NavLink>
        ))}
        </nav>

        {/* Footer Settings link */}
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '1rem' }}>
            <NavLink
                to="/settings"
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
                <Settings size={17} />
                Settings
            </NavLink>
        </div>
    </aside>
));

export default Sidebar;
