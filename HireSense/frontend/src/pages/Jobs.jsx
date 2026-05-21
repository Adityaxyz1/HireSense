import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

function CountUp({ target }) {
    const ref = useRef(null);
    useEffect(() => {
        let n = 0; const st = target / 55;
        const iv = setInterval(() => {
            n += st;
            if (n >= target) { if (ref.current) ref.current.textContent = target; clearInterval(iv); }
            else if (ref.current) ref.current.textContent = Math.floor(n);
        }, 16);
        return () => clearInterval(iv);
    }, [target]);
    return <span ref={ref}>0</span>;
}

export default function Jobs() {
    const { isDark } = useTheme();
    const [jobs, setJobs] = useState([]);
    const [deletingId, setDeletingId] = useState(null);

    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = width <= 640;

    useEffect(() => {
        api.getJobs().then(r => setJobs(r || [])).catch(() => {});
    }, []);

    const handleDelete = async (jobId) => {
        setDeletingId(jobId);
        try {
            await api.deleteJob(jobId);
            setJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (e) {
            console.error('Job deletion failed:', e);
        }
        setDeletingId(null);
    };

    const totalOpenings = jobs.length;

    return (
        <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                    { color: 'var(--text)', label: 'Job Descriptions', value: totalOpenings, delta: 2 },
                    { color: '#8b5cf6', label: 'Total Loaded', value: totalOpenings, delta: 4 },
                    { color: '#f59e0b', label: 'Ready to Match', value: totalOpenings, delta: 0 },
                ].map((s, i) => (
                    <div key={i} className="up" style={{
                        display: 'flex', alignItems: 'stretch',
                        border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                    }}>
                        <div style={{ width: 5, background: s.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: '16px 18px', background: 'var(--card)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>{s.label}</div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}><CountUp target={s.value} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Job list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobs.length === 0 && (
                    <div style={{
                        background: 'var(--card)', border: '1.5px solid var(--border)',
                        borderRadius: 10, padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13,
                    }}>No job descriptions loaded yet. Go to Analyze → paste a job description to get started.</div>
                )}

                {jobs.map((j, i) => {
                    const isDeleting = deletingId === j.id;
                    return (
                        <div key={j.id || i} className="up rh" style={{
                            background: 'var(--card)', border: '1.5px solid var(--border)',
                            borderRadius: 10, padding: '16px 20px',
                            display: 'flex', alignItems: 'center', gap: 14, cursor: 'default',
                            animationDelay: `${i * 45}ms`,
                            opacity: isDeleting ? 0.5 : 1, transition: 'opacity .2s',
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
                                    {j.title || `Job Description #${i + 1}`}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 'calc(100vw - 160px)' : 500 }}>
                                    {(j.text || j.job_text || '').slice(0, 120)}…
                                </div>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'stretch', height: 24,
                                border: '1.5px solid #22c55e44', borderRadius: 5, overflow: 'hidden',
                            }}>
                                <div style={{ width: 5, background: '#22c55e' }} />
                                <div style={{
                                    padding: '0 8px', display: 'flex', alignItems: 'center',
                                    background: isDark ? '#052e16' : '#f0fdf4',
                                }}>
                                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Active</span>
                                </div>
                            </div>
                            <button
                                onClick={() => !isDeleting && handleDelete(j.id)}
                                title="Delete Job Description"
                                disabled={isDeleting}
                                style={{
                                    width: 28, height: 28, borderRadius: 7, border: 'none',
                                    cursor: isDeleting ? 'default' : 'pointer',
                                    background: 'var(--bg3)',
                                    outline: '1.5px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444',
                                    fontWeight: 700, transition: 'all .15s', opacity: 0.7,
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
