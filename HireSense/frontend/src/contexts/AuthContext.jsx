import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile from backend
    const fetchProfile = async (session) => {
        if (!session?.access_token) return;
        try {
            const res = await fetch(`${API_BASE}/profile?_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
            }
        } catch (error) {
            console.error('[AuthContext] fetchProfile error:', error);
        }
    };

    // Key used to carry the chosen persona across an OAuth redirect.
    const OAUTH_ROLE_KEY = 'hs_oauth_role';

    // After an OAuth redirect, ensure the user has a persona. The backend sets
    // the role ONLY for brand-new accounts (it never clobbers an existing one).
    const syncOAuthRole = async (session, role) => {
        if (!session?.access_token || !session.user) return;
        try {
            const meta = session.user.user_metadata || {};
            await fetch(`${API_BASE}/auth/oauth-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    user_id: session.user.id,
                    email: session.user.email,
                    role,
                    full_name: meta.full_name || meta.name || null,
                }),
            });
        } catch { /* non-critical — profile fetch will still resolve a role */ }
    };

    // Restore session on mount
    useEffect(() => {
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                if (session) {
                    // Returning from an OAuth redirect — assign the persona once
                    // before we read the profile so the persona gate routes right.
                    if (event === 'SIGNED_IN') {
                        let pendingRole = null;
                        try { pendingRole = localStorage.getItem(OAUTH_ROLE_KEY); } catch { /* ignore */ }
                        if (pendingRole) await syncOAuthRole(session, pendingRole);
                    }
                    await fetchProfile(session);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Social / OAuth sign-in (Google, GitHub, LinkedIn, Microsoft). The browser
    // redirects to the provider and back to /login, where AuthContext assigns the
    // persona (`role`) and Login.jsx routes the user to the right region.
    const signInWithOAuth = async (provider, role = 'applicant') => {
        try { localStorage.setItem(OAUTH_ROLE_KEY, role); } catch { /* ignore */ }
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/login`,
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) {
            try { localStorage.removeItem(OAUTH_ROLE_KEY); } catch { /* ignore */ }
            throw error;
        }
    };

    // Signup — `role` selects the persona ('recruiter' | 'applicant')
    const signup = async (email, password, role = 'recruiter') => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;

        // Log signup event + persist persona role to the backend
        // (audit trail only — never send password)
        try {
            if (data.user) {
                await fetch(`${API_BASE}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: data.user.id, email, role }),
                });
            }
        } catch { /* non-critical */ }

        return data;
    };

    // Login
    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        // Fetch profile after login
        if (data.session) {
            await fetchProfile(data.session);
        }

        // Log login event to backend (audit trail only — never send password)
        try {
            if (data.user) {
                await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: data.user.id, email }),
                });
            }
        } catch { /* non-critical */ }

        return data;
    };

    // Logout
    const logout = async () => {
        // Log to backend first
        if (user) {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        email: user.email,
                    }),
                });
            } catch { /* non-critical */ }
        }

        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    // Update profile
    const updateProfile = async (updates) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(updates),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to update profile');
        }
        const data = await res.json();
        setProfile(data.profile);
        return data;
    };

    // Upload avatar
    const uploadAvatar = async (file) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/profile/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to upload avatar');
        }
        const data = await res.json();
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
        return data;
    };

    // Change password — requires the current password for re-authentication
    const changePassword = async (currentPassword, newPassword) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/profile/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to change password');
        }
        return await res.json();
    };

    // Forgot password — send reset email via Supabase
    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
    };

    // Refresh profile data
    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchProfile(session);
    };

    return (
        <AuthContext.Provider value={{
            user, profile, loading,
            role: profile?.role || 'recruiter',
            login, signup, signInWithOAuth, logout, resetPassword,
            updateProfile, uploadAvatar, changePassword, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
