import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

/* ── Animated circuit-board background ── */
function CircuitBackground() {
    const lines = [
        // Horizontal lines
        { x1: 0, y1: '12%', x2: '35%', y2: '12%', delay: 0 },
        { x1: '65%', y1: '18%', x2: '100%', y2: '18%', delay: 0.3 },
        { x1: 0, y1: '45%', x2: '20%', y2: '45%', delay: 0.6 },
        { x1: '80%', y1: '52%', x2: '100%', y2: '52%', delay: 0.2 },
        { x1: 0, y1: '78%', x2: '25%', y2: '78%', delay: 0.8 },
        { x1: '70%', y1: '85%', x2: '100%', y2: '85%', delay: 0.5 },
        // Vertical lines
        { x1: '15%', y1: 0, x2: '15%', y2: '30%', delay: 0.4 },
        { x1: '85%', y1: '10%', x2: '85%', y2: '40%', delay: 0.7 },
        { x1: '25%', y1: '60%', x2: '25%', y2: '100%', delay: 0.1 },
        { x1: '75%', y1: '65%', x2: '75%', y2: '100%', delay: 0.9 },
        // Diagonal accents
        { x1: '30%', y1: '10%', x2: '38%', y2: '18%', delay: 1.0 },
        { x1: '62%', y1: '80%', x2: '70%', y2: '88%', delay: 1.1 },
    ];

    const nodes = [
        { cx: '15%', cy: '12%', delay: 0.2 },
        { cx: '85%', cy: '18%', delay: 0.5 },
        { cx: '25%', cy: '45%', delay: 0.8 },
        { cx: '75%', cy: '52%', delay: 0.3 },
        { cx: '35%', cy: '78%', delay: 1.0 },
        { cx: '70%', cy: '85%', delay: 0.7 },
        { cx: '38%', cy: '18%', delay: 1.1 },
        { cx: '62%', cy: '80%', delay: 0.9 },
        { cx: '50%', cy: '30%', delay: 0.4 },
        { cx: '50%', cy: '70%', delay: 0.6 },
    ];

    return (
        <svg
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                opacity: 0.25,
            }}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="var(--text3)" />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
            {lines.map((l, i) => (
                <motion.line
                    key={`line-${i}`}
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke="var(--border2)"
                    strokeWidth="1"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 0.6, 0.3] }}
                    transition={{
                        duration: 2.5,
                        delay: l.delay,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'reverse',
                        repeatDelay: 3,
                    }}
                />
            ))}
            {nodes.map((n, i) => (
                <motion.circle
                    key={`node-${i}`}
                    cx={n.cx} cy={n.cy} r="3"
                    fill="var(--border2)"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 0.8, 0.3], scale: [0, 1.2, 1] }}
                    transition={{
                        duration: 2,
                        delay: n.delay + 0.5,
                        ease: 'easeOut',
                        repeat: Infinity,
                        repeatType: 'reverse',
                        repeatDelay: 4,
                    }}
                />
            ))}
            {/* Corner brackets */}
            {[
                { d: 'M 30 10 L 10 10 L 10 30', origin: 'top-left' },
                { d: 'M -30 10 L -10 10 L -10 30', origin: 'top-right', transform: 'translate(100%, 0) scale(-1, 1)' },
                { d: 'M 30 -10 L 10 -10 L 10 -30', origin: 'bottom-left', transform: 'translate(0, 100%) scale(1, -1)' },
                { d: 'M -30 -10 L -10 -10 L -10 -30', origin: 'bottom-right', transform: 'translate(100%, 100%) scale(-1, -1)' },
            ].map((corner, i) => (
                <motion.path
                    key={`corner-${i}`}
                    d={corner.d}
                    fill="none"
                    stroke="var(--border2)"
                    strokeWidth="1.5"
                    transform={corner.transform}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.5, 0.2] }}
                    transition={{
                        duration: 3,
                        delay: i * 0.3,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        repeatDelay: 2,
                    }}
                />
            ))}
        </svg>
    );
}

/* ── Floating particles ── */
function FloatingParticles() {
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 6,
    }));

    return (
        <>
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: 'var(--border2)',
                        zIndex: 0,
                    }}
                    animate={{
                        y: [-20, 20, -20],
                        opacity: [0, 0.5, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </>
    );
}


export default function Login() {
    const navigate = useNavigate();
    const { login, signup } = useAuth();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
            if (isSignup) {
                await signup(email, password);
                setSuccess('Account created! Check your email for verification, or log in now.');
                setIsSignup(false);
            } else {
                await login(email, password);
                navigate('/');
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
            <CircuitBackground />
            <FloatingParticles />

            {/* Radial glow behind card */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--border) 0%, transparent 70%)',
                opacity: 0.15,
                zIndex: 0,
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
                    background: 'linear-gradient(135deg, var(--border2) 0%, transparent 50%, var(--border2) 100%)',
                    opacity: 0.5,
                    zIndex: -1,
                }} />

                <div style={{
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 16,
                    padding: '40px 36px 36px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px var(--border)',
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
                            border: '1.5px solid var(--border2)',
                            borderRadius: 8,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                background: 'var(--logo-bg)',
                                padding: '0 18px',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                                <span style={{
                                    fontFamily: 'var(--font)',
                                    fontWeight: 800,
                                    fontSize: 15,
                                    color: 'var(--logo-fg)',
                                    letterSpacing: '.14em',
                                }}>HIRE</span>
                            </div>
                            <div style={{
                                background: 'var(--surface)',
                                padding: '0 18px',
                                display: 'flex',
                                alignItems: 'center',
                                borderLeft: '1.5px solid var(--border)',
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        style={{ textAlign: 'center', marginBottom: 28 }}
                    >
                        <h2 style={{
                            fontFamily: 'var(--font)',
                            fontWeight: 600,
                            fontSize: 18,
                            color: 'var(--text)',
                            letterSpacing: '.05em',
                            marginBottom: 6,
                        }}>
                            {isSignup ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p style={{
                            fontSize: 12,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                        }}>
                            {isSignup
                                ? 'Sign up to access the AI recruitment platform'
                                : 'Sign in to your AI recruitment dashboard'
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
                                    color: 'var(--text2)',
                                    fontFamily: 'var(--font)',
                                }}>
                                    <div
                                        onClick={() => setRemember(!remember)}
                                        style={{
                                            width: 16,
                                            height: 16,
                                            border: '1.5px solid var(--border2)',
                                            borderRadius: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: remember ? 'var(--btn)' : 'transparent',
                                            transition: 'all .2s',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {remember && (
                                            <svg width="10" height="10" viewBox="0 0 24 24"
                                                fill="none" stroke="var(--btn-fg)" strokeWidth="3"
                                                strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span onClick={() => setRemember(!remember)}>Remember me</span>
                                </label>
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
                                background: 'var(--btn)',
                                color: 'var(--btn-fg)',
                                border: '1.5px solid var(--border2)',
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
                                    border: '2px solid var(--btn-fg)',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.7s linear infinite',
                                }} />
                            )}
                            {loading
                                ? (isSignup ? 'Creating...' : 'Signing in...')
                                : (isSignup ? 'Create Account' : 'Sign In')
                            }
                        </motion.button>
                    </form>

                    {/* Divider */}
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

                    {/* Toggle signup/login */}
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
