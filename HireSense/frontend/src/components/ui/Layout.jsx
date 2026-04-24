import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const ICONS = {
    dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    candidates: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    jobs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    pipeline: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>,
    ats: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>,
    finder: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#fbbf24' }}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0, color: '#6366f1' }}><circle cx="12" cy="12" r="8"/></svg>,
    chevronLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
    chevronRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
    profile: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

const NAV = [
    { id: '/',          icon: ICONS.dashboard, label: 'Dashboard' },
    { id: '/candidates', icon: ICONS.candidates, label: 'Candidates' },
    { id: '/jobs',       icon: ICONS.jobs, label: 'Job Roles' },
    { id: '/pipeline',   icon: ICONS.pipeline, label: 'Pipeline' },
    { id: '/ats-check',  icon: ICONS.ats, label: 'ATS Checker' },
    { id: '/finder',     icon: ICONS.finder, label: 'AI Finder' },
];

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, profile, logout } = useAuth();
    const [sbOpen, setSbOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    const currentPage = location.pathname === '/profile'
        ? 'Profile'
        : (NAV.find(n => n.id === location.pathname)?.label || 'Dashboard');

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        setShowUserMenu(false);
        await logout();
        navigate('/login');
    };

    /* ── Avatar display helper ── */
    const avatarUrl = profile?.avatar_url;
    const userInitial = (profile?.display_name || user?.email || 'U')[0].toUpperCase();
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

            {/* ══════ SIDEBAR ══════ */}
            <aside style={{
                width: sbOpen ? 220 : 54,
                flexShrink: 0,
                background: 'var(--surface)',
                borderRight: '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width .28s cubic-bezier(.22,1,.36,1), background .2s, border-color .2s',
                overflow: 'hidden',
            }}>
                {/* Logo */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1.5px solid var(--border)', height: 54,
                    flexShrink: 0, overflow: 'hidden', padding: '0 10px',
                }}>
                    {sbOpen ? (
                        <div style={{
                            display: 'flex', alignItems: 'stretch', height: 30,
                            border: '1.5px solid var(--border2)', borderRadius: 6,
                            overflow: 'hidden', width: '100%',
                        }}>
                            <div style={{
                                background: 'var(--logo-bg)', padding: '0 12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: 12,
                                    color: 'var(--logo-fg)', letterSpacing: '.14em',
                                }}>HIRE</span>
                            </div>
                            <div style={{
                                background: 'var(--surface)', padding: '0 12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderLeft: '1.5px solid var(--border)', flex: 1,
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: 12,
                                    color: 'var(--text)', letterSpacing: '.14em',
                                }}>SENSE</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', flexDirection: 'column', height: 32, width: 32,
                            border: '1.5px solid var(--border2)', borderRadius: 7, overflow: 'hidden',
                            flexShrink: 0,
                        }}>
                            <div style={{ flex: 1, background: 'var(--logo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--logo-fg)', fontFamily: 'var(--font)' }}>H</span>
                            </div>
                            <div style={{ flex: 1, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font)' }}>S</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                    {NAV.map(n => {
                        const isActive = location.pathname === n.id;
                        return (
                            <Link key={n.id} to={n.id} className="nb" style={{
                                display: 'flex', alignItems: 'center', 
                                justifyContent: sbOpen ? 'flex-start' : 'center',
                                gap: sbOpen ? 10 : 0,
                                padding: sbOpen ? '9px 11px' : '9px 0', 
                                borderRadius: 8, width: '100%',
                                textDecoration: 'none',
                                background: isActive ? 'var(--nav-on)' : 'transparent',
                                color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)',
                                transition: 'all .15s', fontFamily: 'var(--font)',
                            }}>
                                <span style={{ 
                                    fontSize: 14, flexShrink: 0, opacity: 0.7,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{n.icon}</span>
                                {sbOpen && (
                                    <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
                                        {n.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div style={{
                    padding: '12px 10px',
                    borderTop: '1.5px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                    {/* Theme toggle button */}
                    <button onClick={toggleTheme} className="nb" style={{
                        padding: '9px 11px', borderRadius: 8,
                        border: '1.5px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: sbOpen ? 'flex-start' : 'center', gap: 9,
                        cursor: 'pointer', width: '100%',
                        color: 'var(--text2)', fontFamily: 'var(--font)',
                        background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
                        transition: 'all .15s',
                    }}>
                        {isDark ? ICONS.sun : ICONS.moon}
                        {sbOpen && (
                            <span style={{
                                fontSize: 11, letterSpacing: '.06em',
                                fontWeight: 500, whiteSpace: 'nowrap',
                            }}>
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </span>
                        )}
                    </button>

                    {/* DB status */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 11px', borderRadius: 8,
                        border: '1.5px solid var(--border)',
                        background: isDark ? 'rgba(34,197,94,.04)' : 'rgba(34,197,94,.03)',
                    }}>
                        <span style={{
                            width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                            flexShrink: 0, animation: 'pulse-dot 2.5s infinite',
                            boxShadow: '0 0 6px #22c55e55',
                        }} />
                        {sbOpen && (
                            <span style={{
                                fontSize: 11, color: 'var(--text3)', letterSpacing: '.06em',
                                fontWeight: 500, whiteSpace: 'nowrap',
                            }}>Supabase · Live</span>
                        )}
                    </div>

                    {/* Collapse */}
                    <button onClick={() => setSbOpen(!sbOpen)} className="nb" style={{
                        padding: '9px 11px', borderRadius: 8,
                        border: '1.5px solid var(--border)', color: 'var(--text3)',
                        fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: sbOpen ? 'flex-start' : 'center', gap: 8,
                        fontWeight: 500, letterSpacing: '.04em', width: '100%',
                        fontFamily: 'var(--font)',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sbOpen ? ICONS.chevronLeft : ICONS.chevronRight}
                        </span>
                        {sbOpen && <span>Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* ══════ MAIN ══════ */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Topbar */}
                <header style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px', height: 54,
                    borderBottom: '1.5px solid var(--border)',
                    background: 'var(--surface)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {/* Mini logo */}
                        <div style={{
                            display: 'flex', alignItems: 'stretch', height: 26,
                            border: '1.5px solid var(--border2)', borderRadius: 4, overflow: 'hidden',
                        }}>
                            <div style={{
                                background: 'var(--logo-bg)', padding: '0 7px',
                                display: 'flex', alignItems: 'center',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: 9,
                                    color: 'var(--logo-fg)', letterSpacing: '.12em',
                                }}>H</span>
                            </div>
                            <div style={{
                                background: 'var(--surface)', padding: '0 7px',
                                display: 'flex', alignItems: 'center',
                                borderLeft: '1.5px solid var(--border)',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)', fontWeight: 800, fontSize: 9,
                                    color: 'var(--text)', letterSpacing: '.12em',
                                }}>S</span>
                            </div>
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font)', fontWeight: 700, fontSize: 16,
                            color: 'var(--text)', letterSpacing: '.01em',
                        }}>{currentPage}</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={toggleTheme} className="nb" style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '6px 12px', border: '1.5px solid var(--border)',
                            borderRadius: 8, color: 'var(--text2)', fontSize: 11,
                            fontWeight: 500, letterSpacing: '.05em', fontFamily: 'var(--font)',
                        }}>
                            {isDark ? ICONS.sun : ICONS.moon}
                            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                        </button>

                        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />

                        {/* User avatar with dropdown */}
                        <div ref={menuRef} style={{ position: 'relative' }}>
                            <div
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    cursor: 'pointer', padding: '4px 6px',
                                    borderRadius: 10,
                                    transition: 'background .15s',
                                }}
                            >
                                <div style={{
                                    width: 34, height: 34,
                                    border: `1.5px solid ${showUserMenu ? 'var(--text2)' : 'var(--border2)'}`,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'border-color .2s',
                                    background: 'var(--bg2)',
                                    flexShrink: 0,
                                }}>
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Profile"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13,
                                            color: 'var(--text2)',
                                        }}>{userInitial}</span>
                                    )}
                                </div>
                                <span style={{
                                    fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12,
                                    color: 'var(--text)', letterSpacing: '.02em',
                                    whiteSpace: 'nowrap',
                                }}>{displayName}</span>
                            </div>

                            {/* Dropdown menu */}
                            {showUserMenu && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                    width: 220,
                                    background: 'var(--surface)',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: 12,
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                    animation: 'up .2s cubic-bezier(.22,1,.36,1) both',
                                }}>
                                    {/* User info header */}
                                    <div style={{
                                        padding: '16px 16px 12px',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 8,
                                                overflow: 'hidden',
                                                border: '1.5px solid var(--border)',
                                                background: 'var(--bg2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{
                                                        fontFamily: 'var(--font)', fontWeight: 800, fontSize: 14,
                                                        color: 'var(--text2)',
                                                    }}>{userInitial}</span>
                                                )}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: 600, color: 'var(--text)',
                                                    fontFamily: 'var(--font)', letterSpacing: '.02em',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>{displayName}</div>
                                                <div style={{
                                                    fontSize: 11, color: 'var(--text3)',
                                                    fontFamily: 'var(--font)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>{user?.email}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div style={{ padding: '6px' }}>
                                        <button
                                            onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                                            className="nb rh"
                                            style={{
                                                width: '100%', padding: '10px 12px',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                borderRadius: 8, color: 'var(--text2)',
                                                fontSize: 13, fontWeight: 500,
                                                fontFamily: 'var(--font)',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {ICONS.profile}
                                            <span>Profile Settings</span>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="nb rh"
                                            style={{
                                                width: '100%', padding: '10px 12px',
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                borderRadius: 8, color: '#ef4444',
                                                fontSize: 13, fontWeight: 500,
                                                fontFamily: 'var(--font)',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {ICONS.logout}
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '22px 26px',
                    background: 'var(--bg)',
                }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
