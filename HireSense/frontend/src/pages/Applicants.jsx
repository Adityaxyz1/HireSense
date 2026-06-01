import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Activity, ChevronRight, Github, Star, Download } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBreakpoint } from '../hooks/useBreakpoint';

const STATUS_META = {
    applied:     { label: 'New', color: 'var(--text2)' },
    screening:   { label: 'Screened', color: '#3b82f6' },
    interview:   { label: 'Interview', color: '#5a7fa0' },
    shortlisted: { label: 'Shortlisted', color: '#22c55e' },
    rejected:    { label: 'Rejected', color: '#ef4444' },
    failed:      { label: 'Error', color: '#ef4444' },
};
// Recruiter triage (match_results.candidate_status) -> lifecycle status key.
// The recruiter's decision is authoritative and takes precedence over the
// applications.status lifecycle, so the board reflects approve/interview/reject
// immediately (and doesn't get stuck on "Screened" if propagation lagged).
const TRIAGE_STATUS = { approved: 'shortlisted', interview: 'interview', rejected: 'rejected' };

const pct = (v) => (v == null ? '—' : `${Math.round((v <= 1 ? v * 100 : v))}%`);
const riskColor = (r) => (r === 'Low' ? '#22c55e' : r === 'Medium' ? '#f59e0b' : r === 'High' ? '#ef4444' : 'var(--text3)');

export default function Applicants() {
    const [jobs, setJobs] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [exporting, setExporting] = useState(false);
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
        // the applicant's "My Applications" page reacts to.
        // Unfiltered table subscriptions (same pattern as the Candidates page,
        // which updates reliably). The refetch is already scoped to this job;
        // table-wide events avoid row-filter/replica-identity delivery quirks.
        // match_results uses '*' so recruiter triage (an UPDATE to
        // candidate_status) refetches the board — not just INSERTs.
        const channel = supabase
            .channel(`recruiter-job-${jobId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => refetch(jobId))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes' }, () => refetch(jobId))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, () => refetch(jobId))
            .subscribe();

        return () => { supabase.removeChannel(channel); clearTimeout(debounce.current); };
    }, [activeJob?.id, refetch]);

    const downloadApplicants = async () => {
        if (!activeJob?.id || exporting) return;
        setExporting(true);
        try {
            await api.downloadJobApplicationsExcel(activeJob.id, activeJob.title);
        } catch (err) {
            alert(err.message || 'Failed to download applicants.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="up" style={{ fontFamily: 'var(--font)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>Live Applicants</h2>
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Applicants stream in & get AI-screened in real time</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={downloadApplicants}
                        disabled={!activeJob?.id || exporting}
                        className="nb hover-lift-sm"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            borderRadius: 999,
                            border: '1.5px solid var(--border)',
                            background: 'var(--card)',
                            color: 'var(--text)',
                            padding: '9px 14px',
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '.08em',
                            textTransform: 'uppercase',
                            cursor: !activeJob?.id || exporting ? 'not-allowed' : 'pointer',
                            opacity: !activeJob?.id || exporting ? 0.55 : 1,
                        }}
                    >
                        <Download size={14} />
                        {exporting ? 'Preparing...' : 'Download Excel'}
                    </button>
                    <span className="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2.5s infinite' }} /> Live
                    </span>
                </div>
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
                                    // Recruiter's triage decision wins; fall back to the lifecycle status.
                                    const effStatus = TRIAGE_STATUS[a.candidate_status] || a.status;
                                    const meta = STATUS_META[effStatus] || STATUS_META.applied;
                                    const processing = a.resume_status === 'processing';
                                    return (
                                        <div key={a.id} className="hover-lift-sm" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', transition: 'all .15s' }}>
                                            <div style={{ minWidth: 160, flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{a.applicant_name || 'Candidate'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                                                    {[a.major, a.graduation_year, a.applicant_email].filter(Boolean).join(' · ') || '—'}
                                                </div>
                                                {a.github_url && (
                                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <a href={a.github_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--tag)' }}>
                                                            <Github size={12} /> GitHub
                                                        </a>
                                                        {a.github_data && (
                                                            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Star size={10} /> {a.github_data.total_stars}</span>
                                                                · {a.github_data.public_repos} repos
                                                                {a.github_data.top_languages?.length > 0 && ` · ${a.github_data.top_languages.slice(0, 3).map(l => l.lang).join(', ')}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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
