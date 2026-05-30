import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, GraduationCap, Briefcase, Github } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';
import AvatarUpload from '../components/ui/AvatarUpload';
import TwirlBackground from '../components/ui/TwirlBackground';

// Role switcher config — Applicant is the primary, default flow.
const ROLES = [
    { key: 'applicant', label: 'Applicant', icon: GraduationCap },
    { key: 'recruiter', label: 'Recruiter', icon: Briefcase },
    { key: 'admin', label: 'Admin', icon: Shield },
];

// Brand glyphs for the social buttons. GitHub/LinkedIn come from lucide; Google
// and Microsoft are inline so they keep their official multi-color marks.
const GoogleIcon = (props) => (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
);
// UI provider -> Supabase provider id.
const OAUTH_PROVIDERS = [
    { id: 'google', label: 'Google', icon: GoogleIcon },
    { id: 'github', label: 'GitHub', icon: Github },
];

export default function Login() {
    const navigate = useNavigate();
    const { login, signup, signInWithOAuth, resetPassword, user, loading: authLoading } = useAuth();
    const [loginRole, setLoginRole] = useState('applicant');   // applicant | recruiter | admin (Applicant default)
    const [oauthBusy, setOauthBusy] = useState('');            // provider id mid-redirect
    const isAdminMode = loginRole === 'admin';
    const [isSignup, setIsSignup] = useState(false);
    const [isForgot, setIsForgot] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);      // optional applicant signup photo
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { isMobile } = useBreakpoint();

    // Returning from an OAuth redirect: AuthContext has assigned the persona, so
    // route the user out of /login. The `hs_oauth_role` flag is only present on
    // an OAuth round-trip, so this never interferes with the password flow.
    useEffect(() => {
        if (authLoading || !user) return;
        let pending = null;
        try { pending = localStorage.getItem('hs_oauth_role'); } catch { /* ignore */ }
        if (!pending) return;
        try { localStorage.removeItem('hs_oauth_role'); } catch { /* ignore */ }
        // Admins land on the admin vault; everyone else hits '/' and the persona
        // gate forwards applicants to /student automatically.
        navigate(pending === 'admin' ? '/admin' : '/', { replace: true });
    }, [authLoading, user, navigate]);

    const handleOAuth = async (providerId) => {
        setError('');
        setSuccess('');
        setOauthBusy(providerId);
        try {
            await signInWithOAuth(providerId, loginRole);
            // On success the browser redirects to the provider — nothing else runs.
        } catch (err) {
            setOauthBusy('');
            setError(err.message || 'Could not start social sign-in. Please try again.');
        }
    };

    const selectRole = (role) => {
        setLoginRole(role);
        setIsSignup(false);
        setIsForgot(false);
        setError('');
        setSuccess('');
        setAvatarFile(null);
        // Prefill the known admin address; clear it otherwise.
        setEmail(role === 'admin' ? 'aditya.poddar3698@gmail.com' : '');
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email);
            setSuccess('Password reset link sent! Check your email inbox.');
        } catch (err) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            if (isSignup && !isAdminMode) {
                const data = await signup(email, password, loginRole);
                // If signup returned a live session (email confirmation disabled),
                // upload the applicant's optimized photo right away.
                if (loginRole === 'applicant' && avatarFile && data?.session?.access_token) {
                    try { await api.uploadApplicantAvatar(avatarFile, data.session.access_token); } catch { /* set later in profile */ }
                }
                setSuccess('Account created! Check your email for verification, or log in now.');
                setIsSignup(false);
            } else {
                await login(email, password);
                if (isAdminMode) {
                    if (email === 'aditya.poddar3698@gmail.com') {
                        navigate('/admin');
                    } else {
                        setError('⛔ Access Denied — You do not have admin privileges.');
                        return;
                    }
                } else {
                    // Land on the recruiter home; the persona gate redirects
                    // applicants to /student automatically once the role loads.
                    navigate('/');
                }
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            padding: isMobile ? 12 : 20,
        }}>
            {/* Background effects */}
            <TwirlBackground />

            {/* Radial glow behind card */}
            <div style={{
                position: 'absolute',
                width: isMobile ? 320 : 600,
                height: isMobile ? 320 : 600,
                borderRadius: '50%',
                background: isAdminMode ? 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)' : 'radial-gradient(circle, var(--border) 0%, transparent 70%)',
                opacity: isAdminMode ? 0.3 : 0.15,
                zIndex: 0,
                transition: 'background 0.5s ease',
            }} />

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: 420,
                }}
            >
                {/* Outer glow border */}
                <div style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 17,
                    background: isAdminMode 
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.5) 0%, transparent 50%, rgba(245,158,11,0.5) 100%)'
                        : 'linear-gradient(135deg, var(--border2) 0%, transparent 50%, var(--border2) 100%)',
                    opacity: 0.5,
                    zIndex: -1,
                    transition: 'background 0.5s ease',
                }} />

                <div style={{
                    background: 'var(--surface)',
                    border: isAdminMode ? '1.5px solid rgba(245,158,11,0.3)' : '1.5px solid var(--border)',
                    borderRadius: 16,
                    padding: isMobile ? '32px 20px 24px' : '40px 36px 36px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: isAdminMode 
                        ? '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.1)' 
                        : '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px var(--border)',
                    transition: 'border 0.5s ease, box-shadow 0.5s ease',
                }}>
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: isMobile ? 24 : 36,
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            height: 38,
                            border: isAdminMode ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid var(--border2)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            transition: 'border 0.5s ease',
                        }}>
                            <div style={{
                                background: isAdminMode ? 'linear-gradient(to right, #f59e0b, #d97706)' : 'var(--logo-bg)',
                                padding: '0 18px',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: isAdminMode ? '#fff' : 'var(--logo-fg)',
                                    letterSpacing: '.14em',
                                }}>HIRE</span>
                            </div>
                            <div style={{
                                background: 'var(--surface)',
                                padding: '0 18px',
                                display: 'flex',
                                alignItems: 'center',
                                borderLeft: isAdminMode ? '1.5px solid rgba(245,158,11,0.4)' : '1.5px solid var(--border)',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: 'var(--text)',
                                    letterSpacing: '.14em',
                                }}>SENSE</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Role switcher (Applicant is primary & default) ── */}
                    <div role="tablist" aria-label="Select login type" style={{
                        display: 'flex', gap: 6, padding: 5, marginBottom: isMobile ? 20 : 26,
                        background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 12,
                    }}>
                        {ROLES.map(r => {
                            const Icon = r.icon;
                            const sel = loginRole === r.key;
                            const isApplicant = r.key === 'applicant';
                            const accent = r.key === 'admin' ? '#f59e0b' : 'var(--btn)';
                            return (
                                <button
                                    key={r.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={sel}
                                    onClick={() => selectRole(r.key)}
                                    style={{
                                        flex: isApplicant ? 1.25 : 1, position: 'relative', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                        padding: '10px 6px', borderRadius: 9, border: 'none',
                                        background: sel ? (r.key === 'admin' ? '#f59e0b' : 'var(--btn)') : 'transparent',
                                        color: sel ? (r.key === 'admin' ? '#fff' : 'var(--btn-fg)') : 'var(--text2)',
                                        transition: 'all .25s cubic-bezier(.22,1,.36,1)', fontFamily: 'var(--font)',
                                    }}
                                >
                                    <Icon size={isApplicant ? 19 : 17} />
                                    <span style={{ fontSize: isApplicant ? 11.5 : 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{r.label}</span>
                                    {isApplicant && !sel && (
                                        <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 7.5, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>Primary</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Title */}
                    <motion.div
                        key={loginRole + (isForgot ? 'forgot' : (isSignup ? 'signup' : 'login'))}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ textAlign: 'center', marginBottom: isMobile ? 20 : 28 }}
                    >
                        <h2 style={{
                            fontFamily: 'var(--font)',
                            fontWeight: 600,
                            fontSize: 18,
                            color: isAdminMode ? '#f59e0b' : 'var(--text)',
                            letterSpacing: '.05em',
                            marginBottom: 6,
                        }}>
                            {isAdminMode ? 'Admin Vault Access' : (isForgot ? 'Reset Password' : (isSignup ? `Create ${loginRole === 'applicant' ? 'Applicant' : 'Recruiter'} Account` : (loginRole === 'applicant' ? 'Applicant Login' : 'Recruiter Login')))}
                        </h2>
                        <p style={{
                            fontSize: 12,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                        }}>
                            {isAdminMode
                                ? 'Restricted area for system owner'
                                : (isForgot ? 'Enter your email to receive a password reset link'
                                    : (isSignup
                                        ? (loginRole === 'applicant' ? 'Sign up to browse jobs and apply with AI screening' : 'Sign up to post jobs and screen candidates')
                                        : (loginRole === 'applicant' ? 'Sign in to find jobs and track your applications' : 'Sign in to your recruitment dashboard')))
                            }
                        </p>
                    </motion.div>

                    {/* Optional applicant profile photo (signup only) */}
                    {isSignup && loginRole === 'applicant' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{ marginBottom: 20, overflow: 'hidden' }}
                        >
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--font)' }}>
                                Profile Photo <span style={{ color: 'var(--text3)' }}>(optional)</span>
                            </label>
                            <AvatarUpload
                                initial={(email || 'S')[0]?.toUpperCase()}
                                size={84}
                                compact
                                onChange={(file) => setAvatarFile(file)}
                            />
                            <p style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
                                Auto-optimized to ≤200KB. You can also add or change it later in your profile.
                            </p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={isForgot ? handleForgotPassword : handleSubmit}>
                        {/* Email */}
                        <motion.div
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35, duration: 0.5 }}
                            style={{ marginBottom: 18 }}
                        >
                            <label style={{
                                display: 'block',
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text2)',
                                letterSpacing: '.1em',
                                textTransform: 'uppercase',
                                marginBottom: 8,
                                fontFamily: 'var(--font)',
                            }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                    style={{
                                        width: '100%',
                                        padding: '13px 14px 13px 40px',
                                        background: 'var(--input)',
                                        border: '1.5px solid var(--border)',
                                        borderRadius: 10,
                                        color: 'var(--text)',
                                        fontSize: 14,
                                        fontFamily: 'var(--font)',
                                        outline: 'none',
                                        transition: 'border-color .2s, box-shadow .2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--text2)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {/* Email icon */}
                                <svg
                                    style={{
                                        position: 'absolute',
                                        left: 13,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text3)',
                                        pointerEvents: 'none',
                                    }}
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                >
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                            </div>
                        </motion.div>

                        {/* Password (hidden in forgot mode) */}
                        {!isForgot && (
                        <motion.div
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45, duration: 0.5 }}
                            style={{ marginBottom: 20 }}
                        >
                            <label style={{
                                display: 'block',
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text2)',
                                letterSpacing: '.1em',
                                textTransform: 'uppercase',
                                marginBottom: 8,
                                fontFamily: 'var(--font)',
                            }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                                    style={{
                                        width: '100%',
                                        padding: '13px 40px 13px 40px',
                                        background: 'var(--input)',
                                        border: '1.5px solid var(--border)',
                                        borderRadius: 10,
                                        color: 'var(--text)',
                                        fontSize: 14,
                                        fontFamily: 'var(--font)',
                                        outline: 'none',
                                        transition: 'border-color .2s, box-shadow .2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--text2)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                {/* Lock icon */}
                                <svg
                                    style={{
                                        position: 'absolute',
                                        left: 13,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text3)',
                                        pointerEvents: 'none',
                                    }}
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                >
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                {/* Eye toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: showPassword ? 'var(--text)' : 'var(--text3)',
                                        transition: 'color 0.2s ease',
                                    }}
                                    tabIndex={-1}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        /* Eye open icon */
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
                                        /* Eye off icon */
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m6.18 6.18a10.75 10.75 0 0 0-4.118 5.472 1 1 0 0 0 0 .696 10.75 10.75 0 0 0 15.374 4.57" />
                                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                            <path d="M14.12 14.12 17.5 17.5" />
                                            <path d="m6.5 6.5 4.37 4.37" />
                                            <path d="M13.646 2.336a10.75 10.75 0 0 1 8.292 9.312 1 1 0 0 1 0 .696c-.285.846-.672 1.645-1.15 2.38" />
                                            <line x1="2" x2="22" y1="2" y2="22" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                        )}

                        {/* Remember me + Forgot */}
                        {!isSignup && !isForgot && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.55, duration: 0.5 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 24,
                                }}
                            >
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    color: isAdminMode ? 'rgba(245, 158, 11, 0.7)' : 'var(--text2)',
                                    fontFamily: 'var(--font)',
                                }}>
                                    <div
                                        onClick={() => setRemember(!remember)}
                                        style={{
                                            width: 16,
                                            height: 16,
                                            border: isAdminMode ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1.5px solid var(--border2)',
                                            borderRadius: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: remember ? (isAdminMode ? '#f59e0b' : 'var(--btn)') : 'transparent',
                                            transition: 'all .2s',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {remember && (
                                            <svg width="10" height="10" viewBox="0 0 24 24"
                                                fill="none" stroke={isAdminMode ? '#fff' : 'var(--btn-fg)'} strokeWidth="3"
                                                strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span onClick={() => setRemember(!remember)}>Remember me</span>
                                </label>
                                {/* Forgot password available for all roles */}
                                <span style={{
                                    fontSize: 12,
                                    color: 'var(--text3)',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font)',
                                    transition: 'color .2s',
                                }}
                                    onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                                    onClick={() => { setIsForgot(true); setError(''); setSuccess(''); }}
                                >
                                    Forgot password?
                                </span>
                            </motion.div>
                        )}

                        {/* Error / Success */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        color: '#ef4444',
                                        fontSize: 12,
                                        marginBottom: 16,
                                        fontFamily: 'var(--font)',
                                    }}
                                >
                                    {error}
                                </motion.div>
                            )}
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        background: 'rgba(34,197,94,0.08)',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        color: '#22c55e',
                                        fontSize: 12,
                                        marginBottom: 16,
                                        fontFamily: 'var(--font)',
                                    }}
                                >
                                    {success}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit button */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            whileHover={{ scale: loading ? 1 : 1.01 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            style={{
                                width: '100%',
                                padding: '14px 0',
                                background: isAdminMode ? '#f59e0b' : 'var(--btn)',
                                color: isAdminMode ? '#fff' : 'var(--btn-fg)',
                                border: isAdminMode ? '1.5px solid #d97706' : '1.5px solid var(--border2)',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 700,
                                fontFamily: 'var(--font)',
                                letterSpacing: '.12em',
                                textTransform: 'uppercase',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all .2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                            }}
                        >
                            {loading && (
                                <div style={{
                                    width: 16,
                                    height: 16,
                                    border: `2px solid ${isAdminMode ? '#fff' : 'var(--btn-fg)'}`,
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.7s linear infinite',
                                }} />
                            )}
                            {loading
                                ? (isForgot ? 'Sending...' : (isSignup ? 'Creating...' : (isAdminMode ? 'Authenticating...' : 'Signing in...')))
                                : (isForgot ? 'Send Reset Link' : (isSignup ? 'Create Account' : (isAdminMode ? 'Access Vault' : 'Sign In')))
                            }
                        </motion.button>
                    </form>

                    {/* ── Social / OAuth sign-in (Applicant only) ──
                        Recruiters are admin-provisioned and admins are a fixed
                        allowlist, so both personas sign in by email/password
                        only — social login is never offered to them. */}
                    {loginRole === 'applicant' && !isForgot && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0 18px' }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                <span style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'var(--font)' }}>
                                    Or continue with
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {OAUTH_PROVIDERS.map(({ id, label, icon: Icon }) => {
                                    const busy = oauthBusy === id;
                                    const disabled = loading || !!oauthBusy;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => handleOAuth(id)}
                                            disabled={disabled}
                                            aria-label={`Continue with ${label}`}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                                                padding: '11px 0', background: 'var(--input)',
                                                border: '1.5px solid var(--border)', borderRadius: 10,
                                                color: 'var(--text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font)',
                                                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !busy ? 0.55 : 1,
                                                transition: 'border-color .2s, background .2s',
                                            }}
                                            onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--bg3)'; } }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--input)'; }}
                                        >
                                            {busy ? (
                                                <div style={{ width: 15, height: 15, border: '2px solid var(--text2)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                            ) : (
                                                <Icon />
                                            )}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Divider & Toggle — registration is Applicant-only (recruiters
                        are created by admins). The block also appears in forgot
                        mode for any role so they can return to sign in. */}
                    {(loginRole === 'applicant' || isForgot) && (
                        <>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                margin: '24px 0',
                            }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                <span style={{
                                    fontSize: 10,
                                    color: 'var(--text3)',
                                    letterSpacing: '.15em',
                                    textTransform: 'uppercase',
                                    fontFamily: 'var(--font)',
                                }}>
                                    {isForgot ? 'Remembered your password?' : (isSignup ? 'Already have an account?' : 'New to HireSense?')}
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            </div>

                            <motion.button
                                type="button"
                                onClick={() => {
                                    if (isForgot) {
                                        setIsForgot(false);
                                    } else {
                                        setIsSignup(!isSignup);
                                    }
                                    setError('');
                                    setSuccess('');
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%',
                                    padding: '12px 0',
                                    background: 'transparent',
                                    color: 'var(--text2)',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontFamily: 'var(--font)',
                                    letterSpacing: '.1em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all .2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.borderColor = 'var(--border2)';
                                    e.target.style.background = 'var(--bg3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.borderColor = 'var(--border)';
                                    e.target.style.background = 'transparent';
                                }}
                            >
                                {isForgot ? 'Back to Sign In' : (isSignup ? 'Sign In Instead' : 'Create Account')}
                            </motion.button>
                        </>
                    )}

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        style={{
                            textAlign: 'center',
                            marginTop: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            alignItems: 'center',
                        }}
                    >
                        <p style={{
                            fontSize: 10,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                            fontFamily: 'var(--font)',
                            margin: 0,
                        }}>
                            Powered by Supabase Auth · End-to-end encrypted
                        </p>
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
                                width="14" 
                                height="14" 
                                fill="currentColor" 
                                style={{ transition: 'color 0.2s ease' }}
                            >
                                <title>Cloudflare</title>
                                <path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727" />
                            </svg>
                            <span className="cf-text" style={{ fontSize: 9, fontWeight: 500, transition: 'color 0.2s ease', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                                Secured by Cloudflare
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontSize: 10,
                            fontFamily: 'var(--font)',
                            letterSpacing: '.06em',
                        }}>
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
                            <span style={{ color: 'var(--text3)', opacity: 0.5 }}>•</span>
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
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
