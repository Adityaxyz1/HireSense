import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Banknote, Briefcase, UploadCloud, X, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

const card = {
    padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--font)',
};
const chip = {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)',
    border: '1px solid var(--border)', borderRadius: 999, padding: '5px 11px', fontWeight: 600,
    background: 'var(--tag)', transition: 'all .15s',
};

export default function Browse() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [active, setActive] = useState(null);  // job selected for apply

    useEffect(() => {
        api.getJobFeed()
            .then(setJobs)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="up" style={{ fontFamily: 'var(--font)' }}>
            <div className="section-head" style={{ marginBottom: 24 }}>
                <h2 className="title" style={{ fontSize: 25, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>Open Positions</h2>
                <p className="subtitle" style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
                    Apply with your resume — get instantly screened by AI
                </p>
            </div>

            {loading && <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading roles…</p>}
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

            {!loading && !error && jobs.length === 0 && (
                <div className="card-modern" style={{ ...card, alignItems: 'center', textAlign: 'center', padding: 48 }}>
                    <Briefcase size={28} style={{ opacity: 0.3, color: 'var(--text2)' }} />
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 12 }}>No open positions right now. Check back soon.</p>
                </div>
            )}

            <div className="bento stagger" style={{ gap: 16 }}>
                {jobs.map((job, i) => (
                    <div key={job.id} className="card-modern hover-lift col-4" style={{ ...card, '--i': i }}>
                        <div>
                            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>{job.title || 'Untitled Role'}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                {job.location && <span style={chip}><MapPin size={12} />{job.location}</span>}
                                {job.salary_range && <span style={chip}><Banknote size={12} />{job.salary_range}</span>}
                            </div>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {job.job_text}
                        </p>
                        <button onClick={() => setActive(job)} className="nb btn-primary" style={{
                            marginTop: 'auto', alignSelf: 'flex-start', borderRadius: 999, padding: '10px 20px', fontSize: 11,
                            fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer',
                            transition: 'all .15s',
                        }}>Apply Now</button>
                    </div>
                ))}
            </div>

            {active && <ApplyModal job={active} onClose={() => setActive(null)} />}
        </div>
    );
}

function ApplyModal({ job, onClose }) {
    const [file, setFile] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | uploading | done | error
    const [msg, setMsg] = useState('');
    const inputRef = useRef(null);

    const submit = async () => {
        if (!file) { setMsg('Please select your resume (PDF).'); return; }
        setPhase('uploading'); setMsg('');
        try {
            await api.applyToJob(job.id, file);
            setPhase('done');
        } catch (e) {
            setPhase('error'); setMsg(e.message);
        }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 28, fontFamily: 'var(--font)', animation: 'up .25s cubic-bezier(.22,1,.36,1) both' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>{job.title}</h3>
                        <p style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 4 }}>Submit your application</p>
                    </div>
                    <button onClick={onClose} className="nb" style={{ color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                {phase === 'done' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle2 size={40} style={{ color: '#22c55e', margin: '0 auto' }} />
                        <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginTop: 16 }}>Application submitted!</p>
                        <p style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 8, lineHeight: 1.6 }}>
                            The AI screening engine is now analyzing your resume. Track live status in <strong style={{ color: 'var(--text)' }}>My Applications</strong> — the recruiter sees your match the moment it's scored.
                        </p>
                        <button onClick={onClose} className="nb btn-primary" style={{ marginTop: 20, borderRadius: 999, padding: '11px 26px', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s' }}>Done</button>
                    </div>
                ) : (
                    <>
                        <input ref={inputRef} type="file" accept=".pdf" className="hidden" style={{ display: 'none' }}
                            onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setMsg(''); } }} />
                        <div onClick={() => inputRef.current?.click()} style={{
                            border: '1.5px dashed var(--border2)', borderRadius: 10, padding: 28, textAlign: 'center',
                            cursor: 'pointer', background: file ? 'var(--bg3)' : 'transparent', marginBottom: 16,
                        }}>
                            <UploadCloud size={22} style={{ color: 'var(--text2)', margin: '0 auto' }} />
                            <p style={{ fontSize: 12.5, color: 'var(--text)', marginTop: 10 }}>{file ? file.name : 'Click to upload your resume (PDF)'}</p>
                            {!file && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Max 10MB</p>}
                        </div>

                        {msg && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{msg}</p>}

                        <button onClick={submit} disabled={phase === 'uploading'} className="nb btn-primary" style={{
                            width: '100%', borderRadius: 'var(--r-sm)',
                            padding: '13px 0', fontSize: 12, fontWeight: 700, letterSpacing: '.12em',
                            textTransform: 'uppercase', cursor: phase === 'uploading' ? 'not-allowed' : 'pointer', opacity: phase === 'uploading' ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .15s',
                        }}>
                            {phase === 'uploading' && <Loader2 size={15} className="animate-spin" style={{ animation: 'spin .8s linear infinite' }} />}
                            {phase === 'uploading' ? 'Submitting…' : 'Submit Application'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
