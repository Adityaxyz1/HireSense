import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const ICONS = {
    dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    candidates: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    jobs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    pipeline: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>,
    ats: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>,
    finder: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#fbbf24' }}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
    moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0, color: '#6366f1' }}><circle cx="12" cy="12" r="8" /></svg>,
    chevronLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
    chevronRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
    profile: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    applicants: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>,
    logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

const NAV = [
    { id: '/', icon: ICONS.dashboard, label: 'Dashboard' },
    { id: '/candidates', icon: ICONS.candidates, label: 'Candidates' },
    { id: '/jobs', icon: ICONS.jobs, label: 'Job Roles' },
    { id: '/pipeline', icon: ICONS.pipeline, label: 'Pipeline' },
    { id: '/applicants', icon: ICONS.applicants, label: 'Applicants' },
    { id: '/ats-check', icon: ICONS.ats, label: 'ATS Checker' },
    { id: '/finder', icon: ICONS.finder, label: 'AI Finder' },
];

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, profile, logout } = useAuth();
    const [sbOpen, setSbOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Shared, rAF-debounced breakpoint hook (same one StudentLayout uses).
    const { isMobile, isTablet } = useBreakpoint();
    const actualSbOpen = isMobile ? false : (isTablet ? false : sbOpen);

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
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* ══════ SIDEBAR (Desktop / Tablet) ══════ */}
                <aside style={{
                    width: actualSbOpen ? 220 : 54,
                    flexShrink: 0,
                    background: 'var(--surface)',
                    borderRight: '1.5px solid var(--border)',
                    display: isMobile ? 'none' : 'flex',
                    flexDirection: 'column',
                    transition: 'width .28s cubic-bezier(.22,1,.36,1), background .2s, border-color .2s',
                    overflow: 'hidden',
                    position: 'relative', zIndex: 10,
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    {/* Logo */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottom: '1.5px solid var(--border)', height: 54,
                        flexShrink: 0, overflow: 'hidden', padding: '0 10px',
                    }}>
                        {actualSbOpen ? (
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
                                <Link key={n.id} to={n.id} className={`nb navlink ${isActive ? 'is-active' : ''}`} style={{
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: actualSbOpen ? 'flex-start' : 'center',
                                    gap: actualSbOpen ? 10 : 0,
                                    padding: actualSbOpen ? '10px 12px' : '10px 0',
                                    borderRadius: 10, width: '100%',
                                    textDecoration: 'none',
                                    background: isActive ? 'var(--nav-on)' : undefined,
                                    color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)',
                                    fontFamily: 'var(--font)',
                                }}>
                                    <span className="navicon" style={{
                                        fontSize: 14, flexShrink: 0, opacity: isActive ? 1 : 0.65,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{n.icon}</span>
                                    {actualSbOpen && (
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
                            display: 'flex', alignItems: 'center', justifyContent: actualSbOpen ? 'flex-start' : 'center', gap: 9,
                            cursor: 'pointer', width: '100%',
                            color: 'var(--text2)', fontFamily: 'var(--font)',
                            background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
                            transition: 'all .15s',
                        }}>
                            {isDark ? ICONS.sun : ICONS.moon}
                            {actualSbOpen && (
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
                            {actualSbOpen && (
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
                            fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: actualSbOpen ? 'flex-start' : 'center', gap: 8,
                            fontWeight: 500, letterSpacing: '.04em', width: '100%',
                            fontFamily: 'var(--font)',
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {actualSbOpen ? ICONS.chevronLeft : ICONS.chevronRight}
                            </span>
                            {actualSbOpen && <span>Collapse</span>}
                        </button>
                    </div>
                </aside>

                {/* ══════ MAIN ══════ */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* Topbar */}
                    <header className="glass-soft" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: isMobile ? '0 14px' : '0 24px', height: 54,
                        borderBottom: '1.5px solid var(--border)',
                        flexShrink: 0, position: 'relative', zIndex: 5,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
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
                                fontFamily: 'var(--font)', fontWeight: 700, fontSize: isMobile ? 14 : 16,
                                color: 'var(--text)', letterSpacing: '.01em',
                            }}>{currentPage}</h1>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
                            <button onClick={toggleTheme} className="nb" style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 10px', border: '1.5px solid var(--border)',
                                borderRadius: 8, color: 'var(--text2)', fontSize: 11,
                                fontWeight: 500, letterSpacing: '.05em', fontFamily: 'var(--font)',
                            }}>
                                {isDark ? ICONS.sun : ICONS.moon}
                                {!isMobile && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
                            </button>

                            <div style={{ width: 1, height: 22, background: 'var(--border)' }} />

                            {/* User avatar with dropdown */}
                            <div ref={menuRef} style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="rh"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 10,
                                        cursor: 'pointer', padding: '4px 6px',
                                        borderRadius: 10,
                                        transition: 'background .15s',
                                    }}
                                >
                                    <div style={{
                                        width: 32, height: 32,
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
                                    {!isMobile && (
                                        <span style={{
                                            fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12,
                                            color: 'var(--text)', letterSpacing: '.02em',
                                            whiteSpace: 'nowrap',
                                        }}>{displayName}</span>
                                    )}
                                </div>

                                {/* Dropdown menu */}
                                {showUserMenu && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                                        width: 'min(240px, calc(100vw - 24px))',
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
                        flex: 1, overflowY: 'auto',
                        padding: isMobile ? '14px 14px 80px' : (isTablet ? '18px 20px' : '22px 26px'),
                        background: 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Outlet />
                        </div>
                        <footer style={{
                            marginTop: 40,
                            paddingTop: 16,
                            borderTop: '1.5px solid var(--border)',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: isMobile ? 12 : 0,
                            fontSize: 11,
                            color: 'var(--text3)',
                            fontFamily: 'var(--font)',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                            textAlign: 'center',
                        }}>
                            <div>
                                © {new Date().getFullYear()} HireSense. All rights reserved.
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                color: 'var(--text3)',
                                transition: 'color 0.2s ease',
                                cursor: 'default',
                            }}
                                onMouseEnter={(e) => {
                                    const textSpan = e.currentTarget.querySelector('.cf-text');
                                    const svgElement = e.currentTarget.querySelector('.cf-svg');
                                    if (textSpan) textSpan.style.color = 'var(--text2)';
                                    if (svgElement) svgElement.style.color = '#F4811F';
                                }}
                                onMouseLeave={(e) => {
                                    const textSpan = e.currentTarget.querySelector('.cf-text');
                                    const svgElement = e.currentTarget.querySelector('.cf-svg');
                                    if (textSpan) textSpan.style.color = 'var(--text3)';
                                    if (svgElement) svgElement.style.color = 'currentColor';
                                }}
                            >
                                <svg
                                    className="cf-svg"
                                    role="img"
                                    viewBox="0 0 24 24"
                                    width="15"
                                    height="15"
                                    fill="currentColor"
                                    style={{ transition: 'color 0.2s ease' }}
                                >
                                    <title>Cloudflare</title>
                                    <path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727" />
                                </svg>
                                <span className="cf-text" style={{ fontSize: 10, fontWeight: 500, transition: 'color 0.2s ease' }}>
                                    Protected by Cloudflare
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <Link to="/privacy" style={{
                                    color: 'var(--text3)',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease',
                                }}
                                    onMouseEnter={(e) => e.target.style.color = 'var(--text2)'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                                >
                                    Privacy Policy
                                </Link>
                                <span style={{ color: 'var(--border)', fontSize: 10 }}>|</span>
                                <Link to="/terms" style={{
                                    color: 'var(--text3)',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease',
                                }}
                                    onMouseEnter={(e) => e.target.style.color = 'var(--text2)'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                                >
                                    Terms & Conditions
                                </Link>
                            </div>
                        </footer>
                    </div>
                </main>
            </div>

            {/* ══════ MOBILE BOTTOM TAB BAR ══════ */}
            {isMobile && (
                <nav className="glass-soft" style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
                    borderTop: '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '0 6px',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    zIndex: 999,
                    boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
                }}>
                    {NAV.map(n => {
                        const isActive = location.pathname === n.id;
                        return (
                            <Link key={n.id} to={n.id} className={`nb navlink ${isActive ? 'is-active' : ''}`} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                textDecoration: 'none',
                                color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)',
                                background: isActive ? 'var(--nav-on)' : undefined,
                                padding: '6px 4px',
                                borderRadius: 10,
                                flex: 1,
                                minWidth: 0,
                            }}>
                                <span style={{
                                    fontSize: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isActive ? 1 : 0.7,
                                    color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)',
                                }}>{n.icon}</span>
                                <span style={{
                                    fontSize: 9,
                                    fontWeight: isActive ? 700 : 500,
                                    letterSpacing: '.01em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%',
                                    color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)',
                                }}>
                                    {n.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
