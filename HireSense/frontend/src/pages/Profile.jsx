import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

/* ── SVG Icons ── */
const CameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

const UserIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);


/* ── Toast notification ── */
function Toast({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
                position: 'fixed', top: 24, right: 24, zIndex: 9999,
                padding: '14px 22px', borderRadius: 12,
                background: type === 'success'
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
                border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: type === 'success' ? '#22c55e' : '#ef4444',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                letterSpacing: '.03em',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}
        >
            {type === 'success' && <CheckIcon />}
            {message}
        </motion.div>
    );
}


export default function Profile() {
    const { user, profile, updateProfile, uploadAvatar, changePassword } = useAuth();

    const { isMobile } = useBreakpoint();

    /* ── State ── */
    const [displayName, setDisplayName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [savingName, setSavingName] = useState(false);

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);

    const fileInputRef = useRef(null);

    /* ── Sync profile into local state ── */
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.display_name || '');
        }
    }, [profile]);

    /* ── Handlers ── */
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview immediately
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            await uploadAvatar(file);
            showToast('Profile picture updated!');
        } catch (err) {
            showToast(err.message || 'Failed to upload avatar', 'error');
            setAvatarPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveName = async () => {
        if (!displayName.trim()) return;
        setSavingName(true);
        try {
            await updateProfile({ display_name: displayName.trim() });
            setIsEditingName(false);
            showToast('Name updated successfully!');
        } catch (err) {
            showToast(err.message || 'Failed to update name', 'error');
        } finally {
            setSavingName(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            showToast('Please enter your current password', 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setChangingPassword(true);
        try {
            await changePassword(currentPassword, newPassword);
            showToast('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
        } catch (err) {
            showToast(err.message || 'Failed to change password', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    /* ── Derived values ── */
    const avatarSrc = avatarPreview || profile?.avatar_url;
    const userInitial = (profile?.display_name || user?.email || 'U')[0].toUpperCase();
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';

    /* ── Input style helper ── */
    const inputStyle = {
        width: '100%',
        padding: '13px 14px 13px 42px',
        background: 'var(--input)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        color: 'var(--text)',
        fontSize: 14,
        fontFamily: 'var(--font)',
        outline: 'none',
        transition: 'border-color .2s, box-shadow .2s',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 0' }}>
            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── Header Section ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ marginBottom: 32 }}
            >
                <h1 style={{
                    fontFamily: 'var(--font)', fontWeight: 700, fontSize: 25,
                    color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 6,
                }}>Profile Settings</h1>
                <p style={{
                    fontSize: 13, color: 'var(--text3)', letterSpacing: '.04em',
                    fontFamily: 'var(--font)',
                }}>Personalize your account and manage your security settings</p>
            </motion.div>

            {/* ── Profile Card ── */}
            <motion.div
                className="card-modern sheen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                    padding: isMobile ? '24px 16px' : '36px 32px',
                    marginBottom: 20,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative gradient bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, var(--border2), var(--text3), var(--border2))',
                    opacity: 0.6,
                }} />

                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    gap: isMobile ? 20 : 28,
                }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <motion.div
                            whileHover={{ scale: 1.04 }}
                            style={{
                                width: 100, height: 100, borderRadius: 'var(--r)',
                                overflow: 'hidden',
                                border: '2px solid var(--border2)',
                                background: 'var(--bg2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', position: 'relative',
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt="Profile"
                                    style={{
                                        width: '100%', height: '100%', objectFit: 'cover',
                                        filter: uploading ? 'brightness(0.5)' : 'none',
                                        transition: 'filter .3s',
                                    }}
                                />
                            ) : (
                                <span style={{
                                    fontSize: 36, fontWeight: 800,
                                    color: 'var(--text3)', fontFamily: 'var(--font)',
                                }}>{userInitial}</span>
                            )}

                            {/* Overlay on hover */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                <CameraIcon />
                            </motion.div>

                            {uploading && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{
                                        width: 24, height: 24,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                </div>
                            )}
                        </motion.div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />

                        {/* Camera badge */}
                        <motion.div
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: 'absolute', bottom: -4, right: -4,
                                width: 30, height: 30, borderRadius: 8,
                                background: 'var(--btn)', color: 'var(--btn-fg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                border: '2px solid var(--surface)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}
                        >
                            <CameraIcon />
                        </motion.div>
                    </div>

                    {/* User info */}
                    <div style={{
                        flex: 1,
                        minWidth: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMobile ? 'center' : 'flex-start',
                        textAlign: isMobile ? 'center' : 'left',
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            gap: isMobile ? 8 : 10,
                            marginBottom: 10,
                            width: '100%',
                            justifyContent: isMobile ? 'center' : 'flex-start',
                        }}>
                            {isEditingName ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: 'stretch',
                                    gap: 8,
                                    width: '100%',
                                }}>
                                    <input
                                        className="focusable"
                                        id="profile-display-name"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Enter your name"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                                        style={{
                                            ...inputStyle,
                                            padding: '8px 12px',
                                            fontSize: 16,
                                            fontWeight: 700,
                                            flex: 1,
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
                                    <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleSaveName}
                                            disabled={savingName}
                                            style={{
                                                padding: '8px 16px', borderRadius: 8,
                                                background: 'var(--btn)', color: 'var(--btn-fg)',
                                                border: 'none', cursor: 'pointer',
                                                fontSize: 12, fontWeight: 600,
                                                fontFamily: 'var(--font)',
                                                letterSpacing: '.06em',
                                                opacity: savingName ? 0.6 : 1,
                                            }}
                                        >
                                            {savingName ? '...' : 'Save'}
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setDisplayName(profile?.display_name || '');
                                                setIsEditingName(false);
                                            }}
                                            style={{
                                                padding: '8px 12px', borderRadius: 8,
                                                background: 'transparent', color: 'var(--text3)',
                                                border: '1.5px solid var(--border)', cursor: 'pointer',
                                                fontSize: 12, fontWeight: 500,
                                                fontFamily: 'var(--font)',
                                            }}
                                        >
                                            Cancel
                                        </motion.button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 style={{
                                        fontFamily: 'var(--font)', fontWeight: 700, fontSize: 20,
                                        color: 'var(--text)', letterSpacing: '.01em',
                                    }}>
                                        {profile?.display_name || 'Set your name'}
                                    </h2>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsEditingName(true)}
                                        style={{
                                            background: 'transparent', border: 'none',
                                            color: 'var(--text3)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', padding: 4,
                                        }}
                                    >
                                        <EditIcon />
                                    </motion.button>
                                </>
                            )}
                        </div>
                        <p style={{
                            fontSize: 13, color: 'var(--text2)',
                            fontFamily: 'var(--font)', letterSpacing: '.03em',
                            display: 'flex', alignItems: 'center', gap: 6,
                            justifyContent: isMobile ? 'center' : 'flex-start',
                        }}>
                            <MailIcon />
                            {user?.email}
                        </p>
                        {memberSince && (
                            <p style={{
                                fontSize: 11, color: 'var(--text3)', marginTop: 6,
                                fontFamily: 'var(--font)', letterSpacing: '.06em',
                                textTransform: 'uppercase',
                            }}>
                                Member since {memberSince}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Account Details Card ── */}
            <motion.div
                className="card-modern"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                    padding: isMobile ? '20px 16px' : '28px 32px',
                    marginBottom: 20,
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'var(--bg3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text2)',
                    }}>
                        <UserIcon />
                    </div>
                    <h3 style={{
                        fontFamily: 'var(--font)', fontWeight: 600, fontSize: 15,
                        color: 'var(--text)', letterSpacing: '.03em',
                    }}>Account Details</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Email row */}
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: isMobile ? 12 : 18,
                        padding: '14px 18px', borderRadius: 10,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                        <div>
                            <span style={{
                                fontSize: 11, color: 'var(--text3)',
                                letterSpacing: '.08em', textTransform: 'uppercase',
                                fontFamily: 'var(--font)', fontWeight: 600,
                                display: 'block', marginBottom: 4,
                            }}>Email Address</span>
                            <span style={{
                                fontSize: 14, color: 'var(--text)',
                                fontFamily: 'var(--font)',
                                wordBreak: 'break-all',
                            }}>{user?.email}</span>
                        </div>
                        <div style={{
                            padding: '4px 10px', borderRadius: 6,
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            color: '#22c55e', fontSize: 10,
                            fontWeight: 600, letterSpacing: '.06em',
                            textTransform: 'uppercase', fontFamily: 'var(--font)',
                            alignSelf: isMobile ? 'flex-start' : 'center',
                        }}>Verified</div>
                    </div>

                    {/* Display name row */}
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? 12 : 18,
                        padding: '14px 18px', borderRadius: 10,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                        <div>
                            <span style={{
                                fontSize: 11, color: 'var(--text3)',
                                letterSpacing: '.08em', textTransform: 'uppercase',
                                fontFamily: 'var(--font)', fontWeight: 600,
                                display: 'block', marginBottom: 4,
                            }}>Display Name</span>
                            <span style={{
                                fontSize: 14, color: 'var(--text)',
                                fontFamily: 'var(--font)',
                            }}>{profile?.display_name || 'Not set'}</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditingName(true)}
                            style={{
                                padding: '6px 14px', borderRadius: 8,
                                background: 'transparent', color: 'var(--text2)',
                                border: '1.5px solid var(--border)', cursor: 'pointer',
                                fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)',
                                letterSpacing: '.05em',
                                display: 'flex', alignItems: 'center', gap: 6,
                                justifyContent: 'center',
                            }}
                        >
                            <EditIcon /> Edit
                        </motion.button>
                    </div>

                    {/* User ID row */}
                    <div style={{
                        padding: '14px 18px', borderRadius: 10,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                        <span style={{
                            fontSize: 11, color: 'var(--text3)',
                            letterSpacing: '.08em', textTransform: 'uppercase',
                            fontFamily: 'var(--font)', fontWeight: 600,
                            display: 'block', marginBottom: 4,
                        }}>User ID</span>
                        <span style={{
                            fontSize: 12, color: 'var(--text2)',
                            fontFamily: 'monospace', letterSpacing: '.02em',
                            wordBreak: 'break-all',
                        }}>{user?.id}</span>
                    </div>
                </div>
            </motion.div>

            {/* ── Security Card ── */}
            <motion.div
                className="card-modern"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{
                    padding: isMobile ? '20px 16px' : '28px 32px',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'var(--bg3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text2)',
                    }}>
                        <ShieldIcon />
                    </div>
                    <h3 style={{
                        fontFamily: 'var(--font)', fontWeight: 600, fontSize: 15,
                        color: 'var(--text)', letterSpacing: '.03em',
                    }}>Security</h3>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 12 : 18,
                    padding: '14px 18px', borderRadius: 10,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    marginBottom: showPasswordForm ? 20 : 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <LockIcon />
                        <div>
                            <span style={{
                                fontSize: 14, color: 'var(--text)',
                                fontFamily: 'var(--font)', fontWeight: 500,
                                display: 'block',
                            }}>Password</span>
                            <span style={{
                                fontSize: 11, color: 'var(--text3)',
                                fontFamily: 'var(--font)',
                            }}>Last changed: Unknown</span>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        style={{
                            padding: '8px 18px', borderRadius: 8,
                            background: showPasswordForm ? 'transparent' : 'var(--btn)',
                            color: showPasswordForm ? 'var(--text2)' : 'var(--btn-fg)',
                            border: showPasswordForm ? '1.5px solid var(--border)' : 'none',
                            cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
                            letterSpacing: '.06em',
                            display: 'flex', justifyContent: 'center',
                        }}
                    >
                        {showPasswordForm ? 'Cancel' : 'Change Password'}
                    </motion.button>
                </div>

                {/* Password change form */}
                <AnimatePresence>
                    {showPasswordForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{
                                padding: '24px',
                                borderRadius: 12,
                                background: 'var(--bg2)',
                                border: '1px solid var(--border)',
                            }}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{
                                        display: 'block', fontSize: 11, fontWeight: 600,
                                        color: 'var(--text2)', letterSpacing: '.1em',
                                        textTransform: 'uppercase', marginBottom: 8,
                                        fontFamily: 'var(--font)',
                                    }}>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="focusable"
                                            id="current-password"
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--text2)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', left: 13, top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--text3)',
                                            pointerEvents: 'none',
                                        }}>
                                            <LockIcon />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{
                                        display: 'block', fontSize: 11, fontWeight: 600,
                                        color: 'var(--text2)', letterSpacing: '.1em',
                                        textTransform: 'uppercase', marginBottom: 8,
                                        fontFamily: 'var(--font)',
                                    }}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="focusable"
                                            id="new-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--text2)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', left: 13, top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--text3)',
                                            pointerEvents: 'none',
                                        }}>
                                            <LockIcon />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{
                                        display: 'block', fontSize: 11, fontWeight: 600,
                                        color: 'var(--text2)', letterSpacing: '.1em',
                                        textTransform: 'uppercase', marginBottom: 8,
                                        fontFamily: 'var(--font)',
                                    }}>Confirm New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="focusable"
                                            id="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--text2)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(160,160,176,0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'var(--border)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', left: 13, top: '50%',
                                            transform: 'translateY(-50%)', color: 'var(--text3)',
                                            pointerEvents: 'none',
                                        }}>
                                            <LockIcon />
                                        </div>
                                    </div>
                                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                        <p style={{
                                            fontSize: 11, color: '#ef4444', marginTop: 6,
                                            fontFamily: 'var(--font)',
                                        }}>Passwords do not match</p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleChangePassword}
                                    disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                                    style={{
                                        width: '100%', padding: '13px 0',
                                        background: 'var(--btn)', color: 'var(--btn-fg)',
                                        border: 'none', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700,
                                        fontFamily: 'var(--font)',
                                        letterSpacing: '.1em', textTransform: 'uppercase',
                                        cursor: changingPassword ? 'not-allowed' : 'pointer',
                                        opacity: (changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword) ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    }}
                                >
                                    {changingPassword && (
                                        <div style={{
                                            width: 16, height: 16,
                                            border: '2px solid var(--btn-fg)',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 0.7s linear infinite',
                                        }} />
                                    )}
                                    {changingPassword ? 'Updating...' : 'Update Password'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
