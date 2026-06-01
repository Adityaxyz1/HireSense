import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { BoardSkeleton } from '../components/ui/Skeletons';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';
const AVC = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];

const COLS = [
    { k: 'pending',  l: 'Pending',      c: '#f59e0b' },
    { k: 'approved', l: 'Interviewing', c: '#22c55e' },
    { k: 'rejected', l: 'Rejected',     c: '#ef4444' },
];

export default function Pipeline() {
    const { isMobile } = useBreakpoint();

    const [candidates, setCandidates] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const debounce = useRef(null);

    // Debounced refetch — fired by realtime events so applied candidates and
    // their scores stream in live without a manual refresh.
    const refetch = useCallback(() => {
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
            api.getCandidates().then(r => setCandidates(r || [])).catch(() => {});
        }, 250);
    }, []);

    useEffect(() => {
        setLoading(true);
        api.getCandidates()
            .then(r => setCandidates(r || []))
            .catch(() => {})
            .finally(() => setLoading(false));

        const channel = supabase
            .channel('pipeline-candidates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resumes' }, refetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' }, refetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, refetch)
            .subscribe();
        return () => { supabase.removeChannel(channel); clearTimeout(debounce.current); };
    }, [refetch]);

    const moveCard = async (id, newStatus) => {
        if (!id) return;
        const cand = candidates.find(c => c.id === id);
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, candidate_status: newStatus } : c));
        try {
            // Applied candidates' status lives on their match_result; uploaded
            // resumes' status lives on the resume row.
            if (cand?.source === 'application' && cand.match_id) {
                await api.updateCandidateStatus(cand.match_id, newStatus);
            } else {
                await api.updateResumeStatus(id, newStatus);
            }
        } catch (e) { console.error(e); }
    };

    const groups = {};
    COLS.forEach(col => { groups[col.k] = candidates.filter(c => (c.candidate_status || 'pending') === col.k); });

    return (
        <>
            <div className="section-head" style={{ marginBottom: 16 }}>
                <div>
                    <div className="title" style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>Pipeline</div>
                    <div className="subtitle" style={{ fontSize: 13, color: 'var(--text3)' }}>Drag candidates across stages to update their status</div>
                </div>
            </div>
            {loading ? (
                <BoardSkeleton />
            ) : (
                <div className="mobile-scroll-x" style={{
                    display: 'grid',
                    // Mobile: swipeable board; each column caps at 280px but shrinks
                    // to fit small phones (min of 280px / 80vw) so a column never
                    // overflows the viewport. Desktop/tablet: three equal columns.
                    gridTemplateColumns: isMobile ? 'repeat(3, min(280px, 80vw))' : 'repeat(3, 1fr)',
                    gap: 14,
                    paddingBottom: isMobile ? 12 : 0
                }}>
                {COLS.map(col => (
                    <div key={col.k}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); if (draggingId != null) { moveCard(draggingId, col.k); setDraggingId(null); } }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                    >
                        {/* Column header */}
                        <div style={{
                            padding: '12px 16px', borderRadius: 'var(--r-sm)',
                            background: col.c + '0e', border: `1.5px solid ${col.c}28`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: col.c }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '.04em' }}>{col.l}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{groups[col.k].length}</span>
                        </div>

                        {/* Cards */}
                        {groups[col.k].map(c => {
                            const name = c.candidate_name || (c.file_url ? c.file_url.split('/').pop()?.replace('.pdf','') : 'Candidate');
                            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            const hasScore = c.match_score != null || c.ats_score != null;
                            const score = c.match_score != null ? c.match_score : (c.ats_score != null ? c.ats_score : 0);
                            const label = c.match_score ? 'JD Matched' : c.ats_score ? 'ATS Scanned' : 'Uploaded';
                            return (
                                <div key={c.id} draggable
                                    className="card-modern hover-lift-sm"
                                    onDragStart={(e) => {
                                        setDraggingId(c.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', c.id);
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                    style={{
                                        padding: '14px 16px', cursor: 'grab',
                                        userSelect: 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 }}>
                                        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8,
                                                overflow: 'hidden', flexShrink: 0,
                                                border: `1.5px solid ${col.c}44`,
                                            }}>
                                                <img
                                                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf`}
                                                    alt={name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.style.background = col.c + '22';
                                                        e.target.parentElement.style.display = 'flex';
                                                        e.target.parentElement.style.alignItems = 'center';
                                                        e.target.parentElement.style.justifyContent = 'center';
                                                        e.target.parentElement.innerHTML = `<span style="font-size:10px;font-weight:700;color:${col.c}">${initials}</span>`;
                                                    }}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{label}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: scC(score) }}>
                                            {hasScore ? (
                                                Math.round(score)
                                            ) : c.status === 'processing' ? (
                                                <div style={{ width: 24, height: 18, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                            ) : (
                                                0
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                                        </span>
                                        <span style={{ fontSize: 11, color: col.c, fontWeight: 500 }}>
                                            {hasScore ? `Score ${Math.round(score)}` : (c.status === 'processing' ? 'Processing...' : `Score 0`)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {groups[col.k].length === 0 && (
                            <div style={{
                                border: '1.5px dashed var(--border)', borderRadius: 'var(--r-sm)',
                                padding: '28px 12px', textAlign: 'center',
                                color: 'var(--text3)', fontSize: 12,
                            }}>Drop candidate here</div>
                        )}
                    </div>
                ))}
            </div>
            )}

            {/* Summary */}
            <div className="bento stagger" style={{ marginTop: 16 }}>
                {COLS.map((col, i) => (
                    <div key={col.k} className="card-modern col-4" style={{
                        '--i': i,
                        padding: isMobile ? 16 : 20,
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>{col.l}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: col.c }}>{loading ? '...' : groups[col.k].length}</div>
                    </div>
                ))}
            </div>
        </>
    );
}
