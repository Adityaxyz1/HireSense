import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import TwirlBackground from '../components/ui/TwirlBackground';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('Please fill in both fields');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });
            if (updateError) throw updateError;
            setSuccess('Password updated successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
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
            <TwirlBackground />

            {/* Radial glow */}
            <div style={{
                position: 'absolute',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--border) 0%, transparent 70%)',
                opacity: 0.15,
                zIndex: 0,
            }} />

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
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
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
                            Set New Password
                        </h2>
                        <p style={{
                            fontSize: 12,
                            color: 'var(--text3)',
                            letterSpacing: '.08em',
                        }}>
                            Enter your new password below
                        </p>
                    </motion.div>

                    <form onSubmit={handleReset}>
                        {/* New Password */}
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
                            }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reset-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    style={{...inputStyle, padding: '13px 40px 13px 40px'}}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--text2)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}
                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: showPassword ? 'var(--text)' : 'var(--text3)', transition: 'color 0.2s ease' }}
                                    tabIndex={-1}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
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

                        {/* Confirm Password */}
                        <motion.div
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45, duration: 0.5 }}
                            style={{ marginBottom: 24 }}
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
                            }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="reset-confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    style={{...inputStyle, padding: '13px 40px 13px 40px'}}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--text2)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <svg style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }}
                                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: showConfirmPassword ? 'var(--text)' : 'var(--text3)', transition: 'color 0.2s ease' }}
                                    tabIndex={-1}
                                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    ) : (
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

                        {/* Submit */}
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
                            {loading ? 'Updating...' : 'Update Password'}
                        </motion.button>
                    </form>

                    {/* Back to login */}
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
                            Remember your password?
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <motion.button
                        type="button"
                        onClick={() => navigate('/login')}
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
                        Back to Sign In
                    </motion.button>

                    {/* Footer */}
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
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
