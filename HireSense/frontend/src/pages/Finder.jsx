import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { useBreakpoint } from '../hooks/useBreakpoint';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';
const AVC = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];
const SUGG = ['Aditya', 'ML engineers PyTorch', 'React architects', 'DevOps Kubernetes', 'Data scientists'];

const ICONS = {
    search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

export default function Finder() {
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const { isMobile } = useBreakpoint();
    const [allResumes, setAllResumes] = useState([]);
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState(false);
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);

    useEffect(() => {
        api.getCandidates().then(r => setAllResumes(r || [])).catch(() => {});
    }, []);

    const doSearch = (q) => {
        const raw = (q || query).trim();
        if (!raw) return;
        const term = raw.toLowerCase();
        setSearched(true);
        setSearching(true);
        setTimeout(() => {
            const kws = term.split(' ');

            const found = allResumes
                .filter(r => {
                    const blob = `${r.candidate_name || ''} ${r.file_url || ''} ${r.raw_text || ''}`.toLowerCase();
                    return kws.some(k => blob.includes(k));
                })
                .sort((a, b) => ((b.match_score || b.ats_score || 0) - (a.match_score || a.ats_score || 0)));

            setResults(found);
            setSearching(false);
        }, 500);
    };

    const stM = (s) => ({
        approved: { bg: isDark ? '#052e16' : '#f0fdf4', c: isDark ? '#4ade80' : '#15803d' },
        pending:  { bg: isDark ? '#1c1400' : '#fffbeb', c: isDark ? '#fbbf24' : '#b45309' },
        rejected: { bg: isDark ? '#2d0a0a' : '#fff1f2', c: isDark ? '#f87171' : '#be123c' },
    }[s] || { bg: isDark ? '#1a1a1a' : '#f8fafc', c: isDark ? '#94a3b8' : '#64748b' });

    return (
        <div style={{ maxWidth: 700 }}>
            {/* Page header */}
            <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>Candidate Finder</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Search your local talent pool by name, role, or skill</p>
            </div>

            {/* Search bar */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 10,
                marginBottom: 16,
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>
                        {ICONS.search}
                    </span>
                    <input value={query} onChange={e => setQuery(e.target.value)}
                        className="focusable"
                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                        placeholder="Search by name, role, or skill…"
                        style={{
                            width: '100%',
                            padding: isMobile ? '13px 16px 13px 40px' : '13px 120px 13px 40px',
                            background: 'var(--input)', border: '1.5px solid var(--border)',
                            borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 13,
                            outline: 'none', fontFamily: 'var(--font)', fontWeight: 400,
                        }} />
                    {!isMobile && (
                        <button onClick={() => doSearch()} style={{
                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                            padding: '7px 18px', borderRadius: 999, border: 'none',
                            background: 'var(--btn)', color: 'var(--btn-fg)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'var(--font)', letterSpacing: '.04em',
                            boxShadow: 'var(--shadow-sm)', transition: 'all .15s',
                        }}>Search</button>
                    )}
                </div>
                {isMobile && (
                    <button onClick={() => doSearch()} style={{
                        padding: '12px 16px', borderRadius: 999, border: 'none',
                        background: 'var(--btn)', color: 'var(--btn-fg)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font)', letterSpacing: '.04em',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-sm)', transition: 'all .15s',
                    }}>Search</button>
                )}
            </div>

            {/* Suggestion chips */}
            {!searched && (
                <>
                    <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>
                        Try searching for
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {SUGG.map(s => (
                            <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                                className="hover-lift-sm"
                                style={{
                                    padding: '7px 14px', borderRadius: 999,
                                    border: '1.5px solid var(--border)', background: 'var(--card)',
                                    color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                                    fontFamily: 'var(--font)', fontWeight: 600,
                                    transition: 'all .15s',
                                }}>{s}</button>
                        ))}
                    </div>
                </>
            )}

            {/* Searching spinner */}
            {searched && searching && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
                    <div style={{
                        width: 16, height: 16, border: '2px solid var(--border)',
                        borderTopColor: 'var(--text)', borderRadius: '50%',
                        animation: 'spin .75s linear infinite',
                    }} />
                    Searching local database…
                </div>
            )}

            {/* Results */}
            {searched && !searching && (
                <>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, fontWeight: 500 }}>
                        {results.length} candidate{results.length !== 1 ? 's' : ''} found
                    </div>

                    {results.length === 0 && (
                        <div className="card-modern" style={{
                            padding: 36, textAlign: 'center',
                        }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                            <div style={{ fontSize: 13, color: 'var(--text3)' }}>No candidates match your search</div>
                        </div>
                    )}

                    {results.map((c, i) => {
                        const name = c.candidate_name || (c.resume_file ? c.resume_file.split('/').pop() : 'Candidate');
                        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                        const status = c.candidate_status || 'pending';
                        const m = stM(status);
                        const candId = c.resume_id || c.id;
                        const hasScore = c.match_score != null || c.ats_score != null;
                        const score = c.match_score != null ? c.match_score : (c.ats_score != null ? c.ats_score : 0);
                        return (
                            <div key={c.id || i} className="up rh card-modern hover-lift"
                                onClick={() => navigate(`/candidates?highlight=${candId}`)}
                                title="Click to view in Candidates"
                                style={{
                                padding: '16px 18px',
                                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
                                animationDelay: `${i * 40}ms`, cursor: 'pointer',
                            }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 13,
                                    background: AVC[i % 5] + '22', border: `1.5px solid ${AVC[i % 5]}44`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700, color: AVC[i % 5], flexShrink: 0,
                                }}>{initials}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.match_score ? 'JD Matched' : c.ats_score ? 'ATS Scanned' : 'Uploaded'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 24, fontWeight: 700, color: scC(score) }}>
                                                {hasScore ? (
                                                    Math.round(score)
                                                ) : c.status === 'processing' ? (
                                                    <div style={{ width: 30, height: 22, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s infinite', marginLeft: 'auto' }} />
                                                ) : (
                                                    0
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.08em', marginTop: 2 }}>
                                                {c.match_score ? 'JD MATCH' : 'ATS SCAN'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 5, marginTop: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1 }} />
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '3px 9px', borderRadius: 6, background: m.bg,
                                            color: m.c, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.c }} />
                                            {status[0].toUpperCase() + status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}
