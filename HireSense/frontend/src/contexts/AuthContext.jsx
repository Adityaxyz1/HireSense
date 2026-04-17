import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API_BASE = 'http://localhost:8000/api';

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

    // Restore session on mount
    useEffect(() => {
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null);
                if (session) {
                    await fetchProfile(session);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Signup
    const signup = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;

        // Log to backend
        try {
            await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
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

        // Log to backend
        try {
            await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
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

    // Upload avatar directly from frontend for secure RLS
    const uploadAvatar = async (file) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error('User not found');

        // Extract extension and define path
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${userData.user.id}/avatar.${ext}`;

        // Upload to Supabase Storage using the user's secure token
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message || 'Failed to upload avatar via Storage');

        // Get the public URL. Note: if bucket is made completely private, use createSignedUrl instead
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const avatarUrl = urlData.publicUrl;

        // Update the profile table via backend (PUT)
        await updateProfile({ avatar_url: avatarUrl });
        
        // Local state update
        setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
        return { avatar_url: avatarUrl };
    };

    // Change password
    const changePassword = async (newPassword) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE}/profile/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ new_password: newPassword }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to change password');
        }
        return await res.json();
    };

    // Refresh profile data
    const refreshProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchProfile(session);
    };

    return (
        <AuthContext.Provider value={{
            user, profile, loading,
            login, signup, logout,
            updateProfile, uploadAvatar, changePassword, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
