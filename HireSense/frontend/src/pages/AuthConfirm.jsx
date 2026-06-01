import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Landing page for emailed auth links (recruiter invite + password reset).
 *
 * The email template points here with `?token_hash=…&type=…` instead of the
 * default Supabase /verify link. We exchange the token hash for a session via
 * JS (`verifyOtp`). Because the token is only consumed when this code runs,
 * email scanners that merely GET the URL (Gmail/Outlook link preview) can't
 * burn the one-time token before the recruiter clicks — which is what made the
 * old emailed links fail with "auth session missing".
 *
 * Falls back gracefully to legacy hash-token links (#access_token=…), which the
 * supabase client auto-parses, so older links still work.
 */
export default function AuthConfirm() {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const run = async () => {
            const params = new URL(window.location.href).searchParams;
            const tokenHash = params.get('token_hash');
            const type = params.get('type');

            // Only allow same-app relative redirects (no open-redirect).
            const requested = params.get('next') || '/reset-password';
            const next = requested.startsWith('/') && !requested.startsWith('//')
                ? requested
                : '/reset-password';

            // Preferred, scanner-safe path: verify the token hash here.
            if (tokenHash && type) {
                const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
                if (verifyError) {
                    setError(verifyError.message || 'This link is invalid or has expired.');
                    setTimeout(() => navigate('/login', { replace: true }), 2800);
                    return;
                }
                navigate(next, { replace: true });
                return;
            }

            // Fallback: legacy links land here with the session already in the
            // URL hash; the client parses it on init, so just check for it.
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                navigate(next, { replace: true });
                return;
            }

            setError('This link is invalid or has expired.');
            setTimeout(() => navigate('/login', { replace: true }), 2800);
        };
        run();
    }, [navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
            color: 'var(--text2)',
            fontFamily: 'var(--font)',
            padding: 20,
        }}>
            <div style={{ textAlign: 'center' }}>
                {error ? (
                    <>
                        <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>{error}</p>
                        <p style={{ fontSize: 12, color: 'var(--text3)' }}>Redirecting to sign in…</p>
                    </>
                ) : (
                    <>
                        <div style={{
                            width: 22, height: 22,
                            border: '2px solid var(--text3)', borderTopColor: 'transparent',
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 14px',
                        }} />
                        <p style={{ fontSize: 13 }}>Verifying your link…</p>
                    </>
                )}
            </div>
        </div>
    );
}
