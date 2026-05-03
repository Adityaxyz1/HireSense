import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';

const ICONS = {
    upload: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
    check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
};

export default function AtsCheck() {
    const { isDark } = useTheme();
    const [resumes, setResumes] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [candidateName, setCandidateName] = useState('');

    // JD Match state
    const [jdTitle, setJdTitle] = useState('');
    const [jdText, setJdText] = useState('');
    const [matchLoading, setMatchLoading] = useState(false);
    const [matchReport, setMatchReport] = useState(null);
    const [activeTab, setActiveTab] = useState('ats'); // 'ats' | 'match'

    useEffect(() => {
        api.getResumes().then(r => { setResumes(r || []); }).catch(() => {});
    }, []);

    const handleScan = async () => {
        let rid = selectedId;

        if (uploadFile && !rid) {
            setLoading(true);
            try {
                const uploaded = await api.uploadResume(uploadFile, '', candidateName);
                rid = uploaded.resume_id || uploaded.id;
                const newRes = { ...uploaded, id: rid };
                setResumes(prev => [...prev, newRes]);
                setSelectedId(String(rid));
                // Wait briefly for background processing to start
                await new Promise(r => setTimeout(r, 1500));
            } catch (e) {
                setReport({ score: 0, breakdown: [{ type: 'critical', message: 'Upload failed: ' + e.message }] });
                setLoading(false);
                return;
            }
        }

        if (!rid) return;
        setLoading(true);
        
        // Retry logic: try up to 2 times (helps when resume is still processing)
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const data = await api.getAtsScore(rid);
                if (data && data.score !== undefined) {
                    setReport(data);
                    setLoading(false);
                    return;
                }
            } catch (e) {
                lastError = e;
                // On first failure, wait a moment and retry (resume might still be processing)
                if (attempt === 0) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        setReport({ score: 0, breakdown: [{ type: 'critical', message: lastError?.message || 'Analysis failed. Please try again.' }] });
        setLoading(false);
    };

    const handleMatch = async () => {
        let rid = selectedId;

        if (uploadFile && !rid) {
            setMatchLoading(true);
            try {
                const uploaded = await api.uploadResume(uploadFile, '', candidateName);
                rid = uploaded.resume_id || uploaded.id;
                const newRes = { ...uploaded, id: rid };
                setResumes(prev => [...prev, newRes]);
                setSelectedId(String(rid));
            } catch (e) {
                setMatchReport({ final_score: 0, error: 'Upload failed: ' + e.message });
                setMatchLoading(false);
                return;
            }
        }

        if (!rid || !jdText.trim()) return;
        setMatchLoading(true);
        try {
            const data = await api.matchResume(rid, jdText, jdTitle);
            setMatchReport(data);
        } catch (e) {
            setMatchReport({ final_score: 0, error: e.message });
        }
        setMatchLoading(false);
    };

    const R = 42, cx = 54, cy = 54, sw = 10, circ = 2 * Math.PI * R;
    const score = report?.score || 0;
    const col = scC(score);
    const track = isDark ? '#22222a' : '#e5e3dc';

    // Derive ATS breakdown bar scores from the 5 fixed breakdown items returned by AI
    // The AI always returns exactly 5 items in order:
    // 0: Contact Info, 1: Section Headers, 2: Action Metrics, 3: Word Count, 4: Formatting
    const getBreakdownItemScore = (index) => {
        if (!report || !report.breakdown || report.breakdown.length === 0) return 0;
        const item = report.breakdown[index];
        if (!item) return score; // fallback to overall
        if (item.type === 'success') return Math.min(100, Math.max(60, score + 5));
        if (item.type === 'warning') return Math.min(100, Math.max(30, score - 15));
        return Math.min(100, Math.max(0, score - 30)); // critical
    };

    const totalFindings = report?.breakdown?.length || 0;
    const successCount = report?.breakdown?.filter(b => b.type === 'success').length || 0;

    const ATS_B = [
        { l: 'Contact Info',    s: report ? getBreakdownItemScore(0) : 0 },
        { l: 'Section Headers', s: report ? getBreakdownItemScore(1) : 0 },
        { l: 'Action Metrics',  s: report ? getBreakdownItemScore(2) : 0 },
        { l: 'Word Count',      s: report ? getBreakdownItemScore(3) : 0 },
        { l: 'Formatting',      s: report ? getBreakdownItemScore(4) : 0 },
    ];

    const tabStyle = (t) => ({
        padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        border: '1.5px solid var(--border)', borderRadius: 8,
        background: activeTab === t ? 'var(--btn)' : 'transparent',
        color: activeTab === t ? 'var(--btn-fg)' : 'var(--text2)',
        transition: 'all .2s', letterSpacing: '.04em',
        fontFamily: 'var(--font)',
    });

    return (
        <div style={{ maxWidth: 960 }}>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <button style={tabStyle('ats')} onClick={() => setActiveTab('ats')}>ATS Readiness</button>
                <button style={tabStyle('match')} onClick={() => setActiveTab('match')}>JD Precision Match</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* Left panel — Upload + Inputs */}
                <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                            {activeTab === 'ats' ? 'Upload Resume' : 'Match Against JD'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                            {activeTab === 'ats' ? 'Drag and drop or select from existing' : 'Paste a job description to compare'}
                        </div>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setSelectedId(''); setCandidateName(''); } }}
                        onClick={() => document.getElementById('ats-file-input')?.click()}
                        style={{
                            border: '1.5px dashed var(--border)', borderRadius: 9,
                            padding: '24px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)',
                        }}
                    >
                        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{ICONS.upload}</div>
                        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                            {uploadFile ? uploadFile.name : 'Drop PDF here'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', opacity: .6, marginTop: 4 }}>or click to browse</div>
                    </div>
                    <input id="ats-file-input" type="file" accept=".pdf,.PDF" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) { setUploadFile(e.target.files[0]); setSelectedId(''); } }} />

                    {uploadFile && !selectedId && (
                        <input 
                            type="text" 
                            placeholder="Candidate Name (Optional)"
                            value={candidateName}
                            onChange={e => setCandidateName(e.target.value)}
                            style={{
                                width: '100%', marginTop: 10, padding: '9px 12px',
                                background: 'transparent', border: '1.5px solid var(--border)',
                                borderRadius: 8, color: 'var(--text)', fontSize: 13,
                                fontFamily: 'var(--font)', outline: 'none',
                            }}
                        />
                    )}

                    {/* Resume selector */}
                    {resumes.length > 0 && (
                        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setUploadFile(null); setCandidateName(''); }}
                            style={{
                                width: '100%', marginTop: 10, padding: '9px 12px',
                                background: 'var(--input)', border: '1.5px solid var(--border)',
                                borderRadius: 8, color: 'var(--text)', fontSize: 12,
                                fontFamily: 'var(--font)', outline: 'none',
                            }}>
                            <option value="">Select existing resume…</option>
                            {resumes.map(r => (
                                <option key={r.id} value={r.id}>{r.candidate_name || r.filename || r.name || `Resume #${r.id}`}</option>
                            ))}
                        </select>
                    )}

                    {/* JD Text Area (visible only in match tab) */}
                    {activeTab === 'match' && (
                        <>
                            <input
                                type="text"
                                value={jdTitle}
                                onChange={e => setJdTitle(e.target.value)}
                                placeholder="Job Title (e.g. Senior Frontend Developer)"
                                style={{
                                    width: '100%', marginTop: 10, padding: '9px 12px',
                                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                                    borderRadius: 8, color: 'var(--text)', fontSize: 13,
                                    fontFamily: 'var(--font)', outline: 'none',
                                }}
                            />
                            <textarea
                                value={jdText}
                                onChange={e => setJdText(e.target.value)}
                                placeholder="Paste the job description here…"
                                style={{
                                    width: '100%', marginTop: 10, padding: '10px 12px', minHeight: 100,
                                    background: 'var(--bg)', border: '1.5px solid var(--border)',
                                    borderRadius: 8, color: 'var(--text)', fontSize: 12,
                                    fontFamily: 'var(--font)', outline: 'none', resize: 'vertical',
                                }}
                            />
                        </>
                    )}

                    <button
                        onClick={activeTab === 'ats' ? handleScan : handleMatch}
                        disabled={activeTab === 'ats' ? (loading || (!selectedId && !uploadFile)) : (matchLoading || (!selectedId && !uploadFile) || !jdText.trim())}
                        style={{
                            width: '100%', marginTop: 12, padding: 11, borderRadius: 9,
                            background: 'var(--btn)', border: 'none', color: 'var(--btn-fg)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            letterSpacing: '.05em', fontFamily: 'var(--font)',
                            opacity: (activeTab === 'ats' ? loading : matchLoading) ? 0.6 : 1,
                        }}>
                        {activeTab === 'ats'
                            ? (loading ? 'Analyzing…' : 'Analyze Resume')
                            : (matchLoading ? 'Matching…' : 'Run Precision Match')
                        }
                    </button>

                    {/* Diagnostics (ATS tab only) */}
                    {activeTab === 'ats' && report?.breakdown && (
                        <>
                            <div style={{ height: 1.5, background: 'var(--border)', margin: '14px 0' }} />
                            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>Diagnostics</div>
                            {report.breakdown.map((d, i) => {
                                const c = d.type === 'success' ? '#22c55e' : d.type === 'warning' ? '#f59e0b' : '#ef4444';
                                return (
                                    <div key={i} style={{
                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                        padding: '9px 11px', background: 'var(--bg3)',
                                        borderRadius: 8, border: '1px solid var(--border)', marginBottom: 5,
                                    }}>
                                        <span style={{ color: c, flexShrink: 0, display: 'flex', alignItems: 'center', marginTop: 1 }}>
                                            {d.type === 'success' ? ICONS.check : ICONS.alert}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{d.message}</span>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Keyword lists (Match tab only) */}
                    {activeTab === 'match' && matchReport && !matchReport.error && (
                        <>
                            <div style={{ height: 1.5, background: 'var(--border)', margin: '14px 0' }} />
                            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>Matched Keywords</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                                {(matchReport.matched_keywords || []).map(k => (
                                    <span key={k} style={{
                                        padding: '3px 9px', borderRadius: 6, fontSize: 11,
                                        background: isDark ? '#052e16' : '#f0fdf4',
                                        border: '1px solid #22c55e33', color: '#22c55e', fontWeight: 500,
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}>
                                        {ICONS.check} {k}
                                    </span>
                                ))}
                                {!(matchReport.matched_keywords?.length) && <span style={{ fontSize: 11, color: 'var(--text3)' }}>None found</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>Missing Keywords</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {(matchReport.missing_keywords || []).map(k => (
                                    <span key={k} style={{
                                        padding: '3px 9px', borderRadius: 6, fontSize: 11,
                                        background: isDark ? '#2d0a0a' : '#fff1f2',
                                        border: '1px solid #ef444433', color: '#ef4444', fontWeight: 500,
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}>
                                        {ICONS.alert} {k}
                                    </span>
                                ))}
                                {!(matchReport.missing_keywords?.length) && <span style={{ fontSize: 11, color: 'var(--text3)' }}>All covered!</span>}
                            </div>
                        </>
                    )}
                </div>

                {/* Right panel — Score Report */}
                <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                            {activeTab === 'ats' ? 'ATS Readiness Report' : 'Precision Match Report'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                            {activeTab === 'ats' ? 'Based on parsed resume content' : 'spaCy NER + Semantic Similarity'}
                        </div>
                    </div>

                    {activeTab === 'ats' ? (
                        /* ── ATS REPORT ── */
                        !report ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                                Upload or select a resume and click Analyze to see the report.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                                    <svg width="108" height="108">
                                        <circle cx={cx} cy={cy} r={R} fill="none" stroke={track} strokeWidth={sw} />
                                        <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth={sw}
                                            strokeDasharray={`${(score / 100) * circ} ${(1 - score / 100) * circ}`}
                                            strokeLinecap="round"
                                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1s' }} />
                                        <text x={cx} y={cy - 3} textAnchor="middle" fill={col} fontSize="20" fontWeight="700" fontFamily="var(--font)">{score}</text>
                                        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" fontSize="10" fontFamily="var(--font)">ATS score</text>
                                    </svg>
                                    <div>
                                        {report.candidate_name && (
                                            <div style={{
                                                fontSize: 16, fontWeight: 700, color: 'var(--text)',
                                                marginBottom: 6, letterSpacing: '.02em',
                                            }}>{report.candidate_name}</div>
                                        )}
                                        <div style={{ fontSize: 30, fontWeight: 700, color: col }}>{score}%</div>
                                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Overall readiness score</div>
                                        <div style={{
                                            marginTop: 10, padding: '6px 12px',
                                            background: score >= 70 ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#2d0a0a' : '#fff1f2'),
                                            border: `1.5px solid ${score >= 70 ? '#22c55e33' : '#ef444433'}`,
                                            borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                        }}>
                                            <span style={{ color: score >= 70 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                {score >= 70 ? ICONS.check : ICONS.alert}
                                            </span>
                                            <span style={{ fontSize: 12, color: score >= 70 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                                                {score >= 85 ? 'Excellent' : score >= 70 ? 'Good — minor fixes needed' : 'Needs improvement'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: 1.5, background: 'var(--border)', margin: '14px 0' }} />

                                {ATS_B.map(a => {
                                    const c = scC(a.s);
                                    return (
                                        <div key={a.l} style={{ marginBottom: 13 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{a.l}</span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{a.s}%</span>
                                            </div>
                                            <div style={{ height: 5, background: 'var(--track)', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${a.s}%`, background: c, borderRadius: 99, transition: 'width 1s' }} />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                                    {[['Candidate', report.candidate_name || 'Unknown'],
                                      ['Sections found', `${report.breakdown?.filter(b => b.type === 'success').length || 0} / ${report.breakdown?.length || 0}`],
                                      ['Overall', `${score}%`],
                                      ['File format', <div key="format" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{ICONS.check} PDF</div>],
                                    ].map(([l, v]) => (
                                        <div key={l} style={{
                                            padding: '10px 13px', background: 'var(--bg3)',
                                            borderRadius: 8, border: '1.5px solid var(--border)',
                                        }}>
                                            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{l}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    ) : (
                        /* ── PRECISION MATCH REPORT ── */
                        !matchReport ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                                Select a resume, paste a job description, and click Run Precision Match.
                            </div>
                        ) : matchReport.error ? (
                            <div style={{ padding: 20, color: '#ef4444', fontSize: 13 }}>Error: {matchReport.error}</div>
                        ) : (
                            (() => {
                                const ms = Math.round(Math.min(100, Math.max(0, matchReport.final_score || 0)));
                                const mc = scC(ms);
                                const sem = Math.round(Math.min(100, Math.max(0, matchReport.semantic_score || 0)));
                                const kc = Math.round(Math.min(100, Math.max(0, matchReport.keyword_coverage || 0)));
                                return (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                                            <svg width="108" height="108">
                                                <circle cx={cx} cy={cy} r={R} fill="none" stroke={track} strokeWidth={sw} />
                                                <circle cx={cx} cy={cy} r={R} fill="none" stroke={mc} strokeWidth={sw}
                                                    strokeDasharray={`${(ms / 100) * circ} ${(1 - ms / 100) * circ}`}
                                                    strokeLinecap="round"
                                                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1s' }} />
                                                <text x={cx} y={cy - 3} textAnchor="middle" fill={mc} fontSize="20" fontWeight="700" fontFamily="var(--font)">{ms}</text>
                                                <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" fontSize="10" fontFamily="var(--font)">Match</text>
                                            </svg>
                                            <div>
                                                <div style={{ fontSize: 30, fontWeight: 700, color: mc }}>{ms}%</div>
                                                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Blended match score</div>
                                                <div style={{
                                                    marginTop: 10, padding: '6px 12px',
                                                    background: ms >= 70 ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#2d0a0a' : '#fff1f2'),
                                                    border: `1.5px solid ${ms >= 70 ? '#22c55e33' : '#ef444433'}`,
                                                    borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                                                }}>
                                                    <span style={{ color: ms >= 70 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center' }}>
                                                        {ms >= 70 ? ICONS.check : ICONS.alert}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: ms >= 70 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                                                        {ms >= 85 ? 'Strong match' : ms >= 70 ? 'Good match' : 'Weak match'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ height: 1.5, background: 'var(--border)', margin: '14px 0' }} />

                                        {/* Breakdown bars */}
                                        {[
                                            { l: 'Semantic Similarity', s: sem },
                                            { l: 'Keyword Coverage', s: kc },
                                        ].map(a => {
                                            const c = scC(a.s);
                                            return (
                                                <div key={a.l} style={{ marginBottom: 13 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{a.l}</span>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{a.s}%</span>
                                                    </div>
                                                    <div style={{ height: 5, background: 'var(--track)', borderRadius: 99, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${a.s}%`, background: c, borderRadius: 99, transition: 'width 1s' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Summary grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                                            {[['Final Score', `${ms}%`],
                                              ['Semantic', `${sem}%`],
                                              ['Keyword Coverage', `${kc}%`],
                                              ['Keywords Matched', `${matchReport.matched_keywords?.length || 0}`],
                                            ].map(([l, v]) => (
                                                <div key={l} style={{
                                                    padding: '10px 13px', background: 'var(--bg3)',
                                                    borderRadius: 8, border: '1.5px solid var(--border)',
                                                }}>
                                                    <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{l}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{v}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
