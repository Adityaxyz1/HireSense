import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { ListSkeleton } from '../components/ui/Skeletons';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';
const AVC = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];

const STATUS_META = {
    approved: { label: 'Approved', color: '#22c55e', bg_dark: '#052e16', bg_light: '#f0fdf4' },
    pending: { label: 'Pending', color: '#f59e0b', bg_dark: '#1c1400', bg_light: '#fffbeb' },
    rejected: { label: 'Rejected', color: '#ef4444', bg_dark: '#2d0a0a', bg_light: '#fff1f2' },
};

const ICONS = {
    search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    empty: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
    up: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>,
    down: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
    check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    sync: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
    circle: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>,
    trash: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    report: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="16" y2="13.01"></line><line x1="16" y1="17" x2="16" y2="17.01"></line><line x1="12" y1="13" x2="12" y2="13.01"></line><line x1="12" y1="17" x2="12" y2="17.01"></line><line x1="8" y1="13" x2="8" y2="13.01"></line><line x1="8" y1="17" x2="8" y2="17.01"></line></svg>,
    target: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    alert: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
};

const getStatusStyle = (status, isDark) => {
    const s = STATUS_META[status] || STATUS_META.pending;
    return { color: s.color, bg: isDark ? s.bg_dark : s.bg_light };
};

export default function Candidates() {
    const { isDark } = useTheme();
    const [searchParams] = useSearchParams();
    
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = width <= 640;
    const isTablet = width > 640 && width <= 1024;

    const [candidates, setCandidates] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('recent');
    const [updatingId, setUpdatingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const resumes = await api.getCandidates();
            setCandidates(resumes || []);
        } catch (e) {
            console.error('Failed to load candidates:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-expand highlighted candidate from Finder
    useEffect(() => {
        const hl = searchParams.get('highlight');
        if (hl) setExpandedId(hl);
    }, [searchParams]);

    const updateStatus = async (resumeId, status) => {
        setUpdatingId(resumeId);
        try {
            await api.updateResumeStatus(resumeId, status);
            setCandidates(prev => prev.map(c =>
                c.id === resumeId ? { ...c, candidate_status: status } : c
            ));
        } catch (e) {
            console.error('Status update failed:', e);
        }
        setUpdatingId(null);
    };

    const handleDelete = async (resumeId) => {
        setUpdatingId(resumeId);
        try {
            await api.deleteResume(resumeId);
            setCandidates(prev => prev.filter(c => c.id !== resumeId));
        } catch (e) {
            console.error('Deletion failed:', e);
            alert("Delete failed: " + e.message); // Fallback to alert if needed, but not block execution
        }
        setUpdatingId(null);
    };

    const cnts = {
        all: candidates.length,
        pending: candidates.filter(c => (c.candidate_status || 'pending') === 'pending').length,
        approved: candidates.filter(c => c.candidate_status === 'approved').length,
        rejected: candidates.filter(c => c.candidate_status === 'rejected').length,
    };

    let list = candidates
        .filter(c => filter === 'all' || (c.candidate_status || 'pending') === filter)
        .filter(c => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (c.candidate_name || '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sort === 'name') return (a.candidate_name || '').localeCompare(b.candidate_name || '');
            // recent: newest first (default)
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

    const inp = {
        background: 'var(--input)', border: '1.5px solid var(--border)',
        borderRadius: 8, padding: '7px 12px', color: 'var(--text)',
        fontSize: 12, outline: 'none', fontFamily: 'var(--font)',
    };

    return (
        <>
            {/* Filter bar */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                gap: 12, 
                alignItems: isMobile ? 'stretch' : 'center', 
                marginBottom: 16 
            }}>
                <div style={{ 
                    display: 'flex', 
                    gap: 6, 
                    overflowX: isMobile ? 'auto' : 'visible',
                    paddingBottom: isMobile ? 6 : 0,
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {['all', 'pending', 'approved', 'rejected'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: '6px 12px', borderRadius: 7,
                            border: `1.5px solid ${f === filter ? 'var(--border2)' : 'var(--border)'}`,
                            background: f === filter ? 'var(--btn)' : 'transparent',
                            color: f === filter ? 'var(--btn-fg)' : 'var(--text2)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            letterSpacing: '.03em', textTransform: 'capitalize',
                            fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 7,
                            flexShrink: 0,
                        }}>
                            {f}
                            <span style={{
                                padding: '1px 6px', borderRadius: 4,
                                background: 'var(--bg3)', fontSize: 10, color: 'var(--text3)',
                            }}>{cnts[f]}</span>
                        </button>
                    ))}
                </div>
                {!isMobile && <div style={{ flex: 1 }} />}
                <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    width: isMobile ? '100%' : 'auto',
                }}>
                    <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>{ICONS.search}</span>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search candidates…"
                            style={{ ...inp, paddingLeft: 30, width: '100%', minWidth: isMobile ? 0 : 180 }} />
                    </div>
                    <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...inp, cursor: 'pointer', flex: isMobile ? 1 : 'none' }}>
                        <option value="recent">Newest</option>
                        <option value="name">Name</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: isMobile ? 10 : 18 }}>
                {/* Header */}
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: isMobile 
                        ? '1.2fr 50px 105px' 
                        : isTablet 
                            ? '1.8fr 60px 100px 150px' 
                            : '2.2fr 60px 80px 100px 180px',
                    gap: 12, padding: '6px 10px 10px',
                    borderBottom: '1.5px solid var(--border)', marginBottom: 4,
                }}>
                    {(isMobile 
                        ? ['Candidate', 'Score', 'Actions'] 
                        : isTablet 
                            ? ['Candidate', 'Score', 'Status', 'Actions'] 
                            : ['Candidate', 'Score', 'File', 'Status', 'Actions']
                    ).map(h => (
                        <span key={h} style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</span>
                    ))}
                </div>

                {loading ? (
                    <ListSkeleton rows={4} />
                ) : list.length === 0 ? (
                    <div style={{ padding: 50, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{ICONS.empty}</div>
                        {candidates.length === 0
                            ? 'No candidates yet. Upload a resume from the ATS Checker page.'
                            : 'No candidates match this filter.'}
                    </div>
                ) : (
                    list.map((c, i) => {
                    const name = c.candidate_name || c.file_url?.split('/').pop()?.replace('.pdf', '') || `Candidate #${i + 1}`;
                    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const candStatus = c.candidate_status || 'pending';
                    const sm = getStatusStyle(candStatus, isDark);
                    const procStatus = c.status || 'processing';
                    const uploading = updatingId === c.id;
                    const isExpanded = expandedId === c.id;
                    const isHighlighted = searchParams.get('highlight') === c.id;
                    const score = c.match_score || c.ats_score || 0;

                    // Parse stored breakdown data
                    let atsBreakdown = [];
                    try { atsBreakdown = typeof c.ats_breakdown === 'string' ? JSON.parse(c.ats_breakdown) : (c.ats_breakdown || []); } catch {}
                    let matchBreakdown = {};
                    try { matchBreakdown = typeof c.match_breakdown === 'string' ? JSON.parse(c.match_breakdown) : (c.match_breakdown || {}); } catch {}

                    return (
                        <React.Fragment key={c.id || i}>
                        <div className="up rh" 
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            style={{
                            display: 'grid', 
                            gridTemplateColumns: isMobile 
                                ? '1.2fr 50px 105px' 
                                : isTablet 
                                    ? '1.8fr 60px 100px 150px' 
                                    : '2.2fr 60px 80px 100px 180px',
                            gap: 12, alignItems: 'center', padding: '12px 10px',
                            borderBottom: (!isExpanded && i < list.length - 1) ? '1.5px solid var(--border)' : 'none',
                            borderRadius: 8, animationDelay: `${i * 28}ms`,
                            opacity: uploading ? 0.6 : 1, transition: 'all .2s',
                            cursor: 'pointer',
                            outline: isHighlighted ? '2px solid #6366f1' : 'none',
                            background: isHighlighted ? (isDark ? '#6366f110' : '#6366f108') : 'transparent',
                        }}>
                            {/* Name + avatar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0 }}>
                                {(() => {
                                    const seed = encodeURIComponent(name || initials || 'user');
                                    const avatarSrc = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf`;
                                    return (
                                        <div style={{
                                            width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: 10,
                                            overflow: 'hidden', flexShrink: 0,
                                            border: `1.5px solid ${AVC[i % 5]}44`,
                                        }}>
                                            <img
                                                src={avatarSrc}
                                                alt={name}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.background = AVC[i % 5] + '22';
                                                    e.target.parentElement.style.display = 'flex';
                                                    e.target.parentElement.style.alignItems = 'center';
                                                    e.target.parentElement.style.justifyContent = 'center';
                                                    e.target.parentElement.innerHTML = `<span style="font-size:${isMobile ? '10px' : '12px'};font-weight:700;color:${AVC[i % 5]}">${initials}</span>`;
                                                }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        </div>
                                    );
                                })()}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                                    <div style={{ fontSize: isMobile ? 9 : 11, color: 'var(--text3)', marginTop: 1 }}>
                                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                                    </div>
                                </div>
                                <span style={{ color: 'var(--text3)', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                                    {isExpanded ? ICONS.up : ICONS.down}
                                </span>
                            </div>

                            {/* Score Display */}
                            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: scC(score) }}>
                                {procStatus === 'processing' ? (
                                    <div style={{ width: 24, height: 18, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                ) : (
                                    Math.round(score)
                                )}
                            </div>

                            {/* Upload date / file */}
                            {!isMobile && !isTablet && (
                                <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {c.file_url ? <>{ICONS.check} PDF</> : '—'}
                                </span>
                            )}

                            {/* Processing status */}
                            {!isMobile && (
                                <span style={{
                                    fontSize: 11, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    color: procStatus === 'completed' ? '#22c55e'
                                        : procStatus === 'failed' ? '#ef4444'
                                            : '#f59e0b',
                                    textTransform: 'uppercase', letterSpacing: '.05em',
                                }}>
                                    {procStatus === 'completed' ? 'Active' : procStatus === 'failed' ? 'Error' : 'Scanning'}
                                </span>
                            )}

                            {/* Actions / Status badges */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'flex-start', gap: 6 }} onClick={e => e.stopPropagation()}>
                                {isMobile ? (
                                    // Mobile view: compact status badge + delete button
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                            padding: '2px 6px', borderRadius: 6,
                                            background: sm.bg, color: sm.color,
                                            fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                                        }}>
                                            {STATUS_META[candStatus]?.label || 'Pending'}
                                        </span>
                                        <button
                                            onClick={() => !uploading && handleDelete(c.id)}
                                            title="Delete Candidate"
                                            disabled={uploading}
                                            style={{
                                                width: 22, height: 22, borderRadius: 6, border: 'none',
                                                cursor: uploading ? 'default' : 'pointer',
                                                background: 'var(--bg3)',
                                                outline: '1.5px solid var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, color: '#ef4444',
                                                fontWeight: 700, transition: 'all .15s',
                                            }}
                                        >{ICONS.trash}</button>
                                    </div>
                                ) : isTablet ? (
                                    // Tablet view: status badge + check / x / trash buttons
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                            {[
                                                { v: 'approved', icon: ICONS.check, title: 'Approve' },
                                                { v: 'rejected', icon: ICONS.x, title: 'Reject' },
                                            ].map(({ v, icon, title }) => {
                                                const active = candStatus === v;
                                                const meta = STATUS_META[v];
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => !uploading && updateStatus(c.id, v)}
                                                        title={title}
                                                        disabled={uploading}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: 6, border: 'none',
                                                            cursor: uploading ? 'default' : 'pointer',
                                                            background: active ? (isDark ? meta.bg_dark : meta.bg_light) : 'var(--bg3)',
                                                            outline: `1.5px solid ${active ? meta.color + '55' : 'var(--border)'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 10, color: active ? meta.color : 'var(--text3)',
                                                            fontWeight: 700, transition: 'all .15s',
                                                        }}
                                                    >{icon}</button>
                                                );
                                            })}
                                            <button
                                                onClick={() => !uploading && handleDelete(c.id)}
                                                title="Delete Candidate"
                                                disabled={uploading}
                                                style={{
                                                    width: 22, height: 22, borderRadius: 6, border: 'none',
                                                    cursor: uploading ? 'default' : 'pointer',
                                                    background: 'var(--bg3)',
                                                    outline: '1.5px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 10, color: '#ef4444',
                                                    fontWeight: 700, transition: 'all .15s',
                                                }}
                                            >{ICONS.trash}</button>
                                        </div>
                                    </div>
                                ) : (
                                    // Desktop view: Full status selector & action buttons
                                    <>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '3px 9px', borderRadius: 6,
                                            background: sm.bg, color: sm.color,
                                            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.color }} />
                                            {STATUS_META[candStatus]?.label || 'Pending'}
                                        </span>

                                        <div style={{ display: 'flex', gap: 3 }}>
                                            {[
                                                { v: 'approved', icon: ICONS.check, title: 'Approve' },
                                                { v: 'pending', icon: ICONS.circle, title: 'Set Pending' },
                                                { v: 'rejected', icon: ICONS.x, title: 'Reject' },
                                            ].map(({ v, icon, title }) => {
                                                const active = candStatus === v;
                                                const meta = STATUS_META[v];
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => !uploading && updateStatus(c.id, v)}
                                                        title={title}
                                                        disabled={uploading}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: 6, border: 'none',
                                                            cursor: uploading ? 'default' : 'pointer',
                                                            background: active ? (isDark ? meta.bg_dark : meta.bg_light) : 'var(--bg3)',
                                                            outline: `1.5px solid ${active ? meta.color + '55' : 'var(--border)'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 10, color: active ? meta.color : 'var(--text3)',
                                                            fontWeight: 700, transition: 'all .15s',
                                                        }}
                                                    >{icon}</button>
                                                );
                                            })}

                                            <button
                                                onClick={() => !uploading && handleDelete(c.id)}
                                                title="Delete Candidate"
                                                disabled={uploading}
                                                style={{
                                                    width: 22, height: 22, borderRadius: 6, border: 'none',
                                                    cursor: uploading ? 'default' : 'pointer',
                                                    marginLeft: 4, background: 'var(--bg3)',
                                                    outline: '1.5px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 10, color: '#ef4444',
                                                    fontWeight: 700, transition: 'all .15s', opacity: 0.7
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                            >{ICONS.trash}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Expandable Detail Panel ── */}
                        {isExpanded && (
                            <div style={{
                                background: isDark ? '#14141a' : '#f8f8f5',
                                border: '1.5px solid var(--border)',
                                borderRadius: 10, padding: 18, marginBottom: 10,
                                animation: 'fadeIn .2s',
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>

                                    {/* ATS Screening Panel */}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 7 }}>
                                            {ICONS.report} ATS Screening Report
                                        </div>
                                        {c.ats_score != null ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <span style={{ fontSize: 26, fontWeight: 700, color: scC(c.ats_score) }}>{c.ats_score}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ 100 ATS Score</span>
                                                </div>
                                                {atsBreakdown.length > 0 && (
                                                    <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {atsBreakdown.slice(0, 8).map((b, bi) => (
                                                            <div key={bi} style={{
                                                                padding: '5px 8px', borderRadius: 6, fontSize: 11,
                                                                background: b.type === 'success' ? (isDark ? '#052e1666' : '#f0fdf4')
                                                                    : b.type === 'critical' ? (isDark ? '#2d0a0a66' : '#fff1f2')
                                                                        : (isDark ? '#1c140066' : '#fffbeb'),
                                                                color: b.type === 'success' ? '#22c55e' : b.type === 'critical' ? '#ef4444' : '#f59e0b',
                                                                display: 'flex', alignItems: 'center', gap: 6,
                                                            }}>
                                                                {b.type === 'success' ? ICONS.check : b.type === 'critical' ? ICONS.x : ICONS.alert} {b.message}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No ATS scan run yet. Go to ATS Check to analyze.</div>
                                        )}
                                    </div>

                                    {/* JD Match Panel */}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 7 }}>
                                            {ICONS.target} JD Match Report
                                        </div>
                                        {c.match_score != null ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <span style={{ fontSize: 26, fontWeight: 700, color: scC(c.match_score) }}>{Math.round(c.match_score)}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ 100 Match Score</span>
                                                </div>
                                                {matchBreakdown.matched_keywords && (
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600, letterSpacing: '.06em' }}>MATCHED KEYWORDS</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                            {matchBreakdown.matched_keywords.slice(0, 10).map((kw, ki) => (
                                                                <span key={ki} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, background: isDark ? '#052e16' : '#f0fdf4', color: '#22c55e', fontWeight: 500 }}>{kw}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {matchBreakdown.missing_keywords && matchBreakdown.missing_keywords.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600, letterSpacing: '.06em' }}>MISSING KEYWORDS</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                            {matchBreakdown.missing_keywords.slice(0, 10).map((kw, ki) => (
                                                                <span key={ki} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, background: isDark ? '#2d0a0a' : '#fff1f2', color: '#ef4444', fontWeight: 500 }}>{kw}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>No JD match run yet. Go to ATS Check → JD Match to analyze.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        </React.Fragment>
                    );
                }))}
            </div>
        </>
    );
}
