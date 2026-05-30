import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, FileText, RefreshCw, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../lib/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';

// Score gauge — mirrors the recruiter ATS report ring.
function ScoreRing({ score, isDark }) {
    const R = 42, cx = 54, cy = 54, sw = 10, circ = 2 * Math.PI * R;
    const col = scC(score);
    const track = isDark ? '#22222a' : '#e5e3dc';
    return (
        <svg width="108" height="108">
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={track} strokeWidth={sw} />
            <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth={sw}
                strokeDasharray={`${(score / 100) * circ} ${(1 - score / 100) * circ}`}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1s' }} />
            <text x={cx} y={cy - 3} textAnchor="middle" fill={col} fontSize="20" fontWeight="700" fontFamily="var(--font)">{score}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" fontSize="10" fontFamily="var(--font)">ATS score</text>
        </svg>
    );
}

export default function ApplicantAtsCheck() {
    const { isDark } = useTheme();
    const { isMobile } = useBreakpoint();

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');

    const [history, setHistory] = useState([]);
    const [busyId, setBusyId] = useState(null);

    const fileInput = useRef(null);
    const replaceInput = useRef(null);
    const replaceTarget = useRef(null);

    const loadHistory = useCallback(() => {
        api.getApplicantResumes().then(r => setHistory(r || [])).catch(() => {});
    }, []);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const runScan = async () => {
        if (!file) { setError('Please select your resume (PDF).'); return; }
        setLoading(true); setError(''); setReport(null);
        try {
            const res = await api.applicantAtsCheck(file);
            setReport(res.report);
            setFile(null);
            loadHistory();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const onReplacePick = (id) => {
        replaceTarget.current = id;
        replaceInput.current?.click();
    };

    const doReplace = async (newFile) => {
        const id = replaceTarget.current;
        if (!id || !newFile) return;
        setBusyId(id); setError('');
        try {
            const res = await api.replaceApplicantResume(id, newFile);
            setReport(res.report);
            loadHistory();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusyId(null);
            replaceTarget.current = null;
        }
    };

    const doRemove = async (id) => {
        setBusyId(id); setError('');
        try {
            await api.deleteApplicantResume(id);
            setHistory(prev => prev.filter(h => h.id !== id));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusyId(null);
        }
    };

    const score = report?.score || 0;

    return (
        <div className="up" style={{ fontFamily: 'var(--font)', maxWidth: 960 }}>
            <div className="section-head" style={{ marginBottom: 18 }}>
                <h2 className="title" style={{ fontSize: 25, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>ATS Resume Check</h2>
                <p className="subtitle" style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
                    Scan your resume's ATS readiness before you apply. Your uploads are saved below — update or remove them anytime.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
                {/* Upload */}
                <div className="card-modern" style={{ padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Upload Resume</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, marginBottom: 14 }}>PDF only · max 10MB</div>

                    <input ref={fileInput} type="file" accept=".pdf,.PDF" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(''); } }} />
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(''); } }}
                        onClick={() => fileInput.current?.click()}
                        className="hover-lift-sm"
                        style={{
                            border: '1.5px dashed var(--border2)', borderRadius: 'var(--r-sm)',
                            padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                            background: file ? 'var(--bg3)' : 'var(--bg)', transition: 'all .15s',
                        }}
                    >
                        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                            <UploadCloud size={22} style={{ color: 'var(--text2)' }} />
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>{file ? file.name : 'Drop PDF here or click to browse'}</div>
                    </div>

                    {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>{error}</p>}

                    <button onClick={runScan} disabled={loading || !file} style={{
                        width: '100%', marginTop: 14, padding: 12, borderRadius: 'var(--r-sm)',
                        background: 'var(--btn)', border: 'none', color: 'var(--btn-fg)',
                        fontSize: 13, fontWeight: 700, cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                        letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'var(--font)',
                        boxShadow: 'var(--shadow-sm)', opacity: (loading || !file) ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    }}>
                        {loading && <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} />}
                        {loading ? 'Analyzing…' : 'Analyze Resume'}
                    </button>
                </div>

                {/* Report */}
                <div className="card-modern sheen" style={{ padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>ATS Readiness Report</div>
                    {!report ? (
                        <div style={{ padding: 36, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                            Upload a resume and click Analyze to see your score.
                        </div>
                    ) : (
                        <>
                            <div style={{
                                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                                alignItems: 'center', gap: 18, marginBottom: 16,
                                textAlign: isMobile ? 'center' : 'left',
                            }}>
                                <ScoreRing score={score} isDark={isDark} />
                                <div>
                                    {report.candidate_name && (
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{report.candidate_name}</div>
                                    )}
                                    <div style={{ fontSize: 30, fontWeight: 700, color: scC(score) }}>{score}%</div>
                                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Overall readiness score</div>
                                    <div style={{
                                        marginTop: 10, padding: '6px 12px',
                                        background: score >= 70 ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#2d0a0a' : '#fff1f2'),
                                        border: `1.5px solid ${score >= 70 ? '#22c55e33' : '#ef444433'}`,
                                        borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                    }}>
                                        <span style={{ color: score >= 70 ? '#22c55e' : '#ef4444', display: 'flex' }}>
                                            {score >= 70 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                        </span>
                                        <span style={{ fontSize: 12, color: score >= 70 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                                            {score >= 85 ? 'Excellent' : score >= 70 ? 'Good — minor fixes' : 'Needs improvement'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {report.breakdown?.length > 0 && (
                                <>
                                    <div style={{ height: 1.5, background: 'var(--border)', margin: '14px 0' }} />
                                    <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>Diagnostics</div>
                                    {report.breakdown.map((d, i) => {
                                        const c = d.type === 'success' ? '#22c55e' : d.type === 'warning' ? '#f59e0b' : '#ef4444';
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                                padding: '10px 12px', background: 'var(--bg3)',
                                                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', marginBottom: 6,
                                            }}>
                                                <span style={{ color: c, flexShrink: 0, display: 'flex', marginTop: 1 }}>
                                                    {d.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                                </span>
                                                <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{d.message}</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Past checks */}
            <input ref={replaceInput} type="file" accept=".pdf,.PDF" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) { doReplace(e.target.files[0]); e.target.value = ''; } }} />

            <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '.02em' }}>Past checks</div>
                {history.length === 0 ? (
                    <div className="card-modern" style={{ padding: 28, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                        No resumes saved yet. Analyze a resume above to start your history.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {history.map(h => {
                            const busy = busyId === h.id;
                            const s = h.ats_score ?? 0;
                            return (
                                <div key={h.id} className="card-modern" style={{
                                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                                    opacity: busy ? 0.6 : 1, transition: 'opacity .2s',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                        background: scC(s) + '1a', border: `1.5px solid ${scC(s)}44`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 700, color: scC(s),
                                    }}>{Math.round(s)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {h.candidate_name || h.filename || 'Resume'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FileText size={11} />
                                            {h.filename || 'resume.pdf'} · {h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button onClick={() => !busy && onReplacePick(h.id)} disabled={busy} title="Replace with a new resume"
                                            className="nb" style={{
                                                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                                border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg3)',
                                                color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                                            }}>
                                            {busy ? <Loader2 size={13} style={{ animation: 'spin .8s linear infinite' }} /> : <RefreshCw size={13} />}
                                            {!isMobile && <span>Replace</span>}
                                        </button>
                                        <button onClick={() => !busy && doRemove(h.id)} disabled={busy} title="Remove resume"
                                            className="nb" style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px',
                                                border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg3)',
                                                color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                                            }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
