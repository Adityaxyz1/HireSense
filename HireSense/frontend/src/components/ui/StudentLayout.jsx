import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, FileText, User, Sun, Moon, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const NAV = [
    { id: '/student', icon: <Search size={18} />, label: 'Browse Jobs' },
    { id: '/student/applications', icon: <FileText size={18} />, label: 'My Applications' },
    { id: '/student/profile', icon: <User size={18} />, label: 'Profile' },
];

export default function StudentLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const { user, profile, logout } = useAuth();
    const [sbOpen, setSbOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);
    const { isMobile, isTablet } = useBreakpoint();
    const actualSbOpen = isMobile ? false : (isTablet ? false : sbOpen);

    const currentPage = NAV.find(n => n.id === location.pathname)?.label || 'Applicant Portal';

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        setShowUserMenu(false);
        await logout();
        navigate('/login');
    };

    const avatarUrl = profile?.avatar_url;
    const userInitial = (profile?.display_name || user?.email || 'S')[0].toUpperCase();
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Applicant';

    const Logo = ({ size = 30, fs = 12 }) => (
        <div style={{ display: 'flex', alignItems: 'stretch', height: size, border: '1.5px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: 'var(--logo-bg)', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: fs, color: 'var(--logo-fg)', letterSpacing: '.14em' }}>HIRE</span>
            </div>
            <div style={{ background: 'var(--surface)', padding: '0 12px', display: 'flex', alignItems: 'center', borderLeft: '1.5px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: fs, color: 'var(--text)', letterSpacing: '.14em' }}>SENSE</span>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* ══════ SIDEBAR ══════ */}
                <aside style={{
                    width: actualSbOpen ? 220 : 54, flexShrink: 0, background: 'var(--surface)',
                    borderRight: '1.5px solid var(--border)', display: isMobile ? 'none' : 'flex',
                    flexDirection: 'column', transition: 'width .28s cubic-bezier(.22,1,.36,1)', overflow: 'hidden',
                    position: 'relative', zIndex: 10, boxShadow: 'var(--shadow-sm)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1.5px solid var(--border)', height: 54, flexShrink: 0, padding: '0 10px' }}>
                        {actualSbOpen ? <Logo /> : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: 32, width: 32, border: '1.5px solid var(--border2)', borderRadius: 7, overflow: 'hidden' }}>
                                <div style={{ flex: 1, background: 'var(--logo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 900, color: 'var(--logo-fg)' }}>H</span></div>
                                <div style={{ flex: 1, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text)' }}>S</span></div>
                            </div>
                        )}
                    </div>

                    {/* Persona tag */}
                    {actualSbOpen && (
                        <div style={{ padding: '12px 14px 0' }}>
                            <span style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font)' }}>Applicant Portal</span>
                        </div>
                    )}

                    <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {NAV.map(n => {
                            const isActive = location.pathname === n.id;
                            return (
                                <Link key={n.id} to={n.id} className={`nb navlink ${isActive ? 'is-active' : ''}`} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: actualSbOpen ? 'flex-start' : 'center',
                                    gap: actualSbOpen ? 10 : 0, padding: actualSbOpen ? '10px 12px' : '10px 0', borderRadius: 10,
                                    textDecoration: 'none', background: isActive ? 'var(--nav-on)' : undefined,
                                    color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)', fontFamily: 'var(--font)',
                                }}>
                                    <span className="navicon" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.65, display: 'flex' }}>{n.icon}</span>
                                    {actualSbOpen && <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>{n.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div style={{ padding: '12px 10px', borderTop: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button onClick={toggleTheme} className="nb" style={{
                            padding: '9px 11px', borderRadius: 8, border: '1.5px solid var(--border)', display: 'flex',
                            alignItems: 'center', justifyContent: actualSbOpen ? 'flex-start' : 'center', gap: 9, width: '100%',
                            color: 'var(--text2)', background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
                        }}>
                            {isDark ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
                            {actualSbOpen && <span style={{ fontSize: 11, letterSpacing: '.06em', fontWeight: 500 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>
                        <button onClick={() => setSbOpen(!sbOpen)} className="nb" style={{
                            padding: '9px 11px', borderRadius: 8, border: '1.5px solid var(--border)', color: 'var(--text3)',
                            fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: actualSbOpen ? 'flex-start' : 'center',
                            gap: 8, fontWeight: 500, width: '100%', fontFamily: 'var(--font)',
                        }}>
                            {actualSbOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                            {actualSbOpen && <span>Collapse</span>}
                        </button>
                    </div>
                </aside>

                {/* ══════ MAIN ══════ */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <header className="glass-soft" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: isMobile ? '0 14px' : '0 24px', height: 54, borderBottom: '1.5px solid var(--border)',
                        flexShrink: 0, position: 'relative', zIndex: 5,
                    }}>
                        <h1 style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: isMobile ? 14 : 16, color: 'var(--text)' }}>{currentPage}</h1>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div ref={menuRef} style={{ position: 'relative' }}>
                                <div onClick={() => setShowUserMenu(!showUserMenu)} className="rh" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 10, cursor: 'pointer', padding: '4px 6px', borderRadius: 10 }}>
                                    <div style={{ width: 32, height: 32, border: '1.5px solid var(--border2)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', flexShrink: 0 }}>
                                        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13, color: 'var(--text2)' }}>{userInitial}</span>}
                                    </div>
                                    {!isMobile && <span style={{ fontFamily: 'var(--font)', fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>{displayName}</span>}
                                </div>
                                {showUserMenu && (
                                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 'min(240px, calc(100vw - 24px))', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 100, overflow: 'hidden', animation: 'up .2s cubic-bezier(.22,1,.36,1) both' }}>
                                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font)' }}>{displayName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font)' }}>{user?.email}</div>
                                        </div>
                                        <div style={{ padding: '6px' }}>
                                            <button onClick={handleLogout} className="nb rh" style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)', textAlign: 'left' }}>
                                                <LogOut size={18} /><span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 80px' : '24px 28px', background: 'var(--bg)' }}>
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* ══════ MOBILE TAB BAR ══════ */}
            {isMobile && (
                <nav className="glass-soft" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(60px + env(safe-area-inset-bottom, 0px))', borderTop: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 999, boxShadow: '0 -6px 24px rgba(0,0,0,0.12)' }}>
                    {NAV.map(n => {
                        const isActive = location.pathname === n.id;
                        return (
                            <Link key={n.id} to={n.id} className={`nb navlink ${isActive ? 'is-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: isActive ? 'var(--nav-on-fg)' : 'var(--text2)', background: isActive ? 'var(--nav-on)' : undefined, padding: '6px 10px', borderRadius: 10, flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'flex' }}>{n.icon}</span>
                                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500 }}>{n.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
