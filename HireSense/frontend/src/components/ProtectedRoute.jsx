import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg)',
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        border: '2.5px solid var(--border)',
                        borderTopColor: 'var(--text)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{
                        fontSize: 11,
                        letterSpacing: '.15em',
                        color: 'var(--text3)',
                        fontFamily: 'var(--font)',
                        textTransform: 'uppercase',
                    }}>Authenticating</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
