import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Activity, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBreakpoint } from '../hooks/useBreakpoint';

const STATUS_META = {
    applied:     { label: 'New', color: 'var(--text2)' },
    screening:   { label: 'Screened', color: '#3b82f6' },
    shortlisted: { label: 'Shortlisted', color: '#22c55e' },
    rejected:    { label: 'Rejected', color: '#ef4444' },
    failed:      { label: 'Error', color: '#ef4444' },
};
const pct = (v) => (v == null ? '—' : `${Math.round((v <= 1 ? v * 100 : v))}%`);
const riskColor = (r) => (r === 'Low' ? '#22c55e' : r === 'Medium' ? '#f59e0b' : r === 'High' ? '#ef4444' : 'var(--text3)');

export default function Applicants() {
    const [jobs, setJobs] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const debounce = useRef(null);
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        api.getJobs()
            .then(js => {
                setJobs(js);
                if (js.length) setActiveJob(js[0]);
            })
            .catch(console.error)
            .finally(() => setLoadingJobs(false));
    }, []);

    const refetch = useCallback((jobId) => {
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            api.getJobApplications(jobId).then(setApplicants).catch(console.error);
        }, 200);
    }, []);

    useEffect(() => {
        if (!activeJob?.id) { setApplicants([]); return; }
        const jobId = activeJob.id;
        api.getJobApplications(jobId).then(setApplicants).catch(console.error);

        // Live: new applicants stream in and self-populate as the screening
        // engine writes resume scores + match results — the exact same events
        // the student's "My Applications" page reacts to.
        const channel = supabase
            .channel(`recruiter-job-${jobId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `job_id=eq.${jobId}` }, () => refetch(jobId))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes' }, () => refetch(jobId))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_results', filter: `job_id=eq.${jobId}` }, () => refetch(jobId))
            .subscribe();

        return () => { supabase.removeChannel(channel); clearTimeout(debounce.current); };
    }, [activeJob?.id, refetch]);

    return (
        <div className="up" style={{ fontFamily: 'var(--font)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>Live Applicants</h2>
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Applicants stream in & get AI-screened in real time</p>
                </div>
                <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2.5s infinite' }} /> Live
                </span>
            </div>

            {loadingJobs && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</p>}
            {!loadingJobs && jobs.length === 0 && (
                <div className="card-modern" style={{ padding: 48, textAlign: 'center' }}>
                    <Users size={28} style={{ opacity: 0.3, color: 'var(--text2)', margin: '0 auto' }} />
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 12 }}>Create a job and set it to <strong>Published</strong> so applicants can apply.</p>
                </div>
            )}

            {jobs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 240px) 1fr', gap: 18, alignItems: 'start' }}>
                    {/* Job selector — vertical list on desktop/tablet, horizontal
                        scroll strip on mobile so it doesn't eat vertical space. */}
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        gap: 8,
                        overflowX: isMobile ? 'auto' : 'visible',
                        paddingBottom: isMobile ? 4 : 0,
                        WebkitOverflowScrolling: 'touch',
                    }}>
                        {jobs.map(j => {
                            const active = activeJob?.id === j.id;
                            return (
                                <button key={j.id} onClick={() => setActiveJob(j)} className="nb hover-lift-sm" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left',
                                    padding: '11px 13px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                                    transition: 'all .15s',
                                    border: '1.5px solid var(--border)', background: active ? 'var(--nav-on)' : 'var(--card)',
                                    color: active ? 'var(--nav-on-fg)' : 'var(--text2)',
                                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                                    flexShrink: isMobile ? 0 : undefined,
                                    maxWidth: isMobile ? 200 : undefined,
                                }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title || 'Untitled'}</span>
                                    <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Applicant board */}
                    <div className="card-modern" style={{ overflow: 'hidden', padding: 0 }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text)', fontWeight: 600 }}>{activeJob?.title}</span>
                            <span className="pill" style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{applicants.length} applicants</span>
                        </div>

                        {applicants.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No applicants yet — they'll appear here live.</div>
                        ) : (
                            <div>
                                {applicants.map(a => {
                                    const meta = STATUS_META[a.status] || STATUS_META.applied;
                                    const processing = a.resume_status === 'processing';
                                    return (
                                        <div key={a.id} className="hover-lift-sm" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', transition: 'all .15s' }}>
                                            <div style={{ minWidth: 160, flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.student_name || 'Candidate'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                                                    {[a.major, a.graduation_year, a.student_email].filter(Boolean).join(' · ') || '—'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                                <Metric label="ATS" value={pct(a.ats_score)} dim={processing} />
                                                <Metric label="Match" value={pct(a.match_score)} dim={processing && a.match_score == null} />
                                                <div style={{ textAlign: 'center', minWidth: 56 }}>
                                                    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Risk</div>
                                                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4, color: riskColor(a.risk_level) }}>{a.risk_level || '—'}</div>
                                                </div>
                                                <div style={{ textAlign: 'center', minWidth: 90 }}>
                                                    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Status</div>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                                                        {processing && <Activity size={12} style={{ animation: 'spin 1.2s linear infinite' }} />}
                                                        {processing ? 'Processing…' : meta.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({ label, value, dim }) {
    return (
        <div style={{ textAlign: 'center', minWidth: 50 }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: dim ? 'var(--text3)' : 'var(--text)', marginTop: 4 }}>{dim ? '…' : value}</div>
        </div>
    );
}
