import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Activity, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Maps an application's lifecycle to a label + colour, mirroring the recruiter view.
const STATUS_META = {
    applied:     { label: 'Applied',      color: 'var(--text2)' },
    screening:   { label: 'Under Review', color: '#9a7b4a' },
    interview:   { label: 'Interview',    color: '#5a7fa0' },
    shortlisted: { label: 'Shortlisted',  color: '#7f9153' },
    rejected:    { label: 'Not Selected', color: '#c0563a' },
    failed:      { label: 'Error',        color: '#c0563a' },
};

const pct = (v) => (v == null ? '—' : `${Math.round((v <= 1 ? v * 100 : v))}%`);

export default function Applications() {
    const { user } = useAuth();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState(null);   // application whose JD is expanded
    const debounce = useRef(null);

    const refetch = useCallback(() => {
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            api.getMyApplications().then(setApps).catch(console.error);
        }, 250);
    }, []);

    useEffect(() => {
        api.getMyApplications().then(setApps).catch(console.error).finally(() => setLoading(false));

        if (!user?.id) return;
        // Live sync: any change to my applications / their resumes / match scores
        // re-pulls the joined view, so status flips from "Applied" -> "AI Screened"
        // the instant the recruiter-side engine finishes — same event stream the
        // recruiter dashboard listens to.
        const channel = supabase
            .channel(`my-applications-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `applicant_id=eq.${user.id}` }, refetch)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes' }, refetch)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_results' }, refetch)
            .subscribe();

        return () => { supabase.removeChannel(channel); clearTimeout(debounce.current); };
    }, [user?.id, refetch]);

    return (
        <div className="up" style={{ fontFamily: 'var(--font)' }}>
            <div className="section-head" style={{ marginBottom: 24 }}>
                <h2 className="title" style={{ fontSize: 25, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>My Applications</h2>
                <p className="subtitle" style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Status updates live as recruiters screen you</p>
            </div>

            {loading && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</p>}

            {!loading && apps.length === 0 && (
                <div className="card-modern" style={{ padding: 48, textAlign: 'center' }}>
                    <FileText size={28} style={{ opacity: 0.3, color: 'var(--text2)', margin: '0 auto' }} />
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 12 }}>You haven't applied to any jobs yet.</p>
                </div>
            )}

            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {apps.map((app, i) => {
                    const meta = STATUS_META[app.status] || STATUS_META.applied;
                    const processing = app.resume_status === 'processing';
                    return (
                        <div key={app.id} className="card-modern hover-lift-sm" style={{ '--i': i, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 200, flex: 1 }}>
                                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>{app.job_title || 'Role'}</h3>
                                <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 4 }}>
                                    {app.location || 'Remote'}{app.salary_range ? ` · ${app.salary_range}` : ''}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                                <Metric label="ATS" value={pct(app.ats_score)} processing={processing} />
                                <Metric label="Match" value={pct(app.match_score)} processing={processing && app.match_score == null} />
                                <div style={{ textAlign: 'center', minWidth: 92 }}>
                                    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Status</div>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11.5, fontWeight: 600, color: meta.color }}>
                                        {processing && <Activity size={12} className="animate-spin" style={{ animation: 'spin 1.2s linear infinite' }} />}
                                        {processing ? 'Processing…' : meta.label}
                                    </span>
                                </div>
                            </div>

                            {/* Full-width: view the job description this application was for */}
                            <div style={{ flexBasis: '100%' }}>
                                <button onClick={() => setOpenId(openId === app.id ? null : app.id)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600,
                                    color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 6,
                                }}>
                                    {openId === app.id ? 'Hide job description' : 'View job description'}
                                    <span style={{ display: 'inline-flex', transform: openId === app.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                                        <ChevronDown size={14} />
                                    </span>
                                </button>
                                {openId === app.id && (
                                    <div style={{
                                        marginTop: 10, padding: 14, background: 'var(--bg2)',
                                        border: '1px solid var(--border)', borderRadius: 10,
                                        maxHeight: 320, overflowY: 'auto', whiteSpace: 'pre-wrap',
                                        fontSize: 12.5, lineHeight: 1.6, color: 'var(--text2)',
                                    }}>
                                        {app.job_text || 'No description available for this role.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Metric({ label, value, processing }) {
    return (
        <div style={{ textAlign: 'center', minWidth: 56 }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: processing ? 'var(--text3)' : 'var(--text)', marginTop: 4 }}>{processing ? '…' : value}</div>
        </div>
    );
}
