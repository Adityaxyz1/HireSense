import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TwirlBackground from '../components/ui/TwirlBackground';

export default function Login() {
    const navigate = useNavigate();
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const toggleAdminMode = () => {
        setIsAdminMode(!isAdminMode);
        setIsSignup(false);
        setError('');
        setSuccess('');
        if (!isAdminMode) {
            setEmail('aditya.poddar3698@gmail.com');
        } else {
            setEmail('');
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
                await signup(email, password);
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
            padding: 20,
        }}>
            {/* Background effects */}
            <TwirlBackground />

            {/* Radial glow behind card */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
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
                {/* Admin Toggle Button (Absolute Top Right) */}
                <button
                    type="button"
                    onClick={toggleAdminMode}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 20,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 8,
                        borderRadius: '50%',
                        color: isAdminMode ? '#f59e0b' : 'var(--text3)',
                        transition: 'all 0.3s ease',
                    }}
                    title={isAdminMode ? "Switch to User Login" : "Admin Vault Access"}
                >
                    <Shield size={20} />
                </button>

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
                    padding: '40px 36px 36px',
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
                            marginBottom: 36,
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

                    {/* Title */}
                    <motion.div
                        key={isAdminMode ? 'admin' : (isSignup ? 'signup' : 'login')}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ textAlign: 'center', marginBottom: 28 }}
                    >
                        <h2 style={{
                            fontFamily: 'var(--font)',
                            fontWeight: 600,
                            fontSize: 18,
                            color: isAdminMode ? '#f59e0b' : 'var(--text)',
                            letterSpacing: '.05em',
                            marginBottom: 6,
                        }}>
                            {isAdminMode ? 'Admin Vault Access' : (isSignup ? 'Create Account' : 'Welcome Back')}
                        </h2>
                        <p style={{
                            fontSize: 12,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                        }}>
                            {isAdminMode
                                ? 'Restricted area for system owner'
                                : (isSignup ? 'Sign up to access the AI recruitment platform' : 'Sign in to your AI recruitment dashboard')
                            }
                        </p>
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
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

                        {/* Password */}
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
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete={isSignup ? 'new-password' : 'current-password'}
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
                            </div>
                        </motion.div>

                        {/* Remember me + Forgot */}
                        {!isSignup && (
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
                                {!isAdminMode && (
                                    <span style={{
                                        fontSize: 12,
                                        color: 'var(--text3)',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font)',
                                        transition: 'color .2s',
                                    }}
                                        onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text3)'}
                                    >
                                        Forgot password?
                                    </span>
                                )}
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
                                ? (isSignup ? 'Creating...' : (isAdminMode ? 'Authenticating...' : 'Signing in...'))
                                : (isSignup ? 'Create Account' : (isAdminMode ? 'Access Vault' : 'Sign In'))
                            }
                        </motion.button>
                    </form>

                    {/* Divider & Signup Toggle (Hidden in Admin Mode) */}
                    {!isAdminMode && (
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
                                    {isSignup ? 'Already have an account?' : 'New to HireSense?'}
                                </span>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            </div>

                            <motion.button
                                type="button"
                                onClick={() => {
                                    setIsSignup(!isSignup);
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
                                {isSignup ? 'Sign In Instead' : 'Create Account'}
                            </motion.button>
                        </>
                    )}

                    {/* Footer */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        style={{
                            textAlign: 'center',
                            marginTop: 20,
                            fontSize: 10,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        Powered by Supabase Auth · End-to-end encrypted
                    </motion.p>
                </div>
            </motion.div>
        </div>
    );
}
