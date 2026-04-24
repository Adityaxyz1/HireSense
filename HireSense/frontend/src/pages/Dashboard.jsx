import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';

const scC = v => v >= 85 ? '#22c55e' : v >= 70 ? '#f59e0b' : '#ef4444';
const AVC = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];
const stM = (s, isDark) => ({
    approved: { bg: isDark ? '#052e16' : '#f0fdf4', c: isDark ? '#4ade80' : '#15803d' },
    pending:  { bg: isDark ? '#1c1400' : '#fffbeb', c: isDark ? '#fbbf24' : '#b45309' },
    rejected: { bg: isDark ? '#2d0a0a' : '#fff1f2', c: isDark ? '#f87171' : '#be123c' },
}[s] || { bg: isDark ? '#1a1a1a' : '#f8fafc', c: isDark ? '#94a3b8' : '#64748b' });

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

function StatCard({ color, label, value, delta }) {
    const dc = delta > 0 ? '#4ade80' : '#f87171';
    return (
        <div className="up" style={{
            display: 'flex', alignItems: 'stretch',
            border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            cursor: 'default', transition: 'border-color .15s',
        }}>
            <div style={{ width: 5, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '16px 18px', background: 'var(--card)' }}>
                <div style={{
                    fontSize: 11, color: 'var(--text3)', letterSpacing: '.07em',
                    textTransform: 'uppercase', marginBottom: 10, fontWeight: 500,
                }}>{label}</div>
                <div style={{
                    fontSize: 28, fontWeight: 700, color: 'var(--text)',
                    lineHeight: 1, letterSpacing: '-.01em',
                }}><CountUp target={value} /></div>
                <div style={{ marginTop: 8, fontSize: 11, color: dc, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        {delta > 0 ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        )}
                    </span>
                    {Math.abs(delta)}% vs last week
                </div>
            </div>
        </div>
    );
}

function Badge({ status, isDark }) {
    const m = stM(status, isDark);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 6, background: m.bg,
            color: m.c, fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
            whiteSpace: 'nowrap',
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.c }} />
            {status[0].toUpperCase() + status.slice(1)}
        </span>
    );
}

function Avatar({ initials, size = 32, color, name }) {
    const [imgErr, setImgErr] = React.useState(false);
    const seed = encodeURIComponent(name || initials || 'user');
    const avatarSrc = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf`;

    if (!imgErr) {
        return (
            <div style={{
                width: size, height: size, borderRadius: Math.round(size * .3),
                overflow: 'hidden', flexShrink: 0,
                border: `1.5px solid ${color}44`,
            }}>
                <img
                    src={avatarSrc}
                    alt={name || initials}
                    onError={() => setImgErr(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            </div>
        );
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: Math.round(size * .3),
            background: color + '22', border: `1.5px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * .34, fontWeight: 700, color, flexShrink: 0,
        }}>{initials}</div>
    );
}

// Simple bar chart — now driven by real data
function BarChart({ isDark, data }) {
    const WEEKLY = data && data.length > 0 ? data : [
        { d: 'Mo', u: 0, m: 0 }, { d: 'Tu', u: 0, m: 0 }, { d: 'We', u: 0, m: 0 },
        { d: 'Th', u: 0, m: 0 }, { d: 'Fr', u: 0, m: 0 }, { d: 'Sa', u: 0, m: 0 }, { d: 'Su', u: 0, m: 0 },
    ];
    const max = Math.max(...WEEKLY.map(d => Math.max(d.u, d.m)), 1);
    const ca = isDark ? 'rgba(240,240,244,.8)' : '#1a1a1e';
    const cb = isDark ? '#2a2a34' : '#d8d5ce';
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 76, padding: '0 2px' }}>
            {WEEKLY.map((d, i) => (
                <div key={d.d + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
                        <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: (d.m / max) * 60, background: ca, transition: 'height .8s' }} />
                        <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: (Math.max(0, d.u - d.m) / max) * 60, background: cb, transition: 'height .8s' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{d.d}</span>
                </div>
            ))}
        </div>
    );
}

// Donut ring chart
function RingChart({ data, isDark }) {
    const tot = data.reduce((s, d) => s + d.v, 0);
    let off = 0;
    const R = 42, cx = 52, cy = 52, sw = 10, circ = 2 * Math.PI * R;
    const track = isDark ? '#22222a' : '#e5e3dc';
    return (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <svg width="104" height="104" style={{ flexShrink: 0 }}>
                <circle cx={cx} cy={cy} r={R} fill="none" stroke={track} strokeWidth={sw} />
                {tot > 0 && data.map(d => {
                    const p = d.v / tot;
                    if (p === 0) return null;
                    const seg = <circle key={d.l} cx={cx} cy={cy} r={R} fill="none" stroke={d.c}
                        strokeWidth={sw} strokeDasharray={`${p * circ} ${(1 - p) * circ}`}
                        strokeDashoffset={-off * circ}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />;
                    off += p;
                    return seg;
                })}
                <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize="17" fontWeight="700" fontFamily="var(--font)">{tot}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" fontSize="10" fontFamily="var(--font)">{tot === 0 ? 'empty' : 'total'}</text>
            </svg>
            <div style={{ flex: 1 }}>
                {data.map(d => (
                    <div key={d.l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.c, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{d.l}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginLeft: 'auto' }}>{d.v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: 'var(--card)', border: '1.5px solid var(--border)',
            borderRadius: 10, padding: 18, transition: 'background .2s, border-color .2s',
            ...style,
        }}>{children}</div>
    );
}

function Sec({ title, sub }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '.01em' }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
        </div>
    );
}

export default function Dashboard() {
    const { isDark } = useTheme();
    const [candidates, setCandidates] = useState([]);
    const [resumes, setResumes] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Primary data source: getCandidates (resumes table) — single source of truth
        api.getCandidates().then(r => setResumes(r || [])).catch(() => {});
        // Match results for the "Recent Candidates" table
        api.getResults().then(r => setCandidates(r || [])).catch(() => {});
        // Stats for avg ATS score
        api.getStats().then(s => setStats(s)).catch(() => {});
    }, []);

    const totalResumes = resumes.length;
    const totalMatches = candidates.length;
    const pendingCount = resumes.filter(c => (c.candidate_status || 'pending') === 'pending').length;
    const selectedCount = resumes.filter(c => c.candidate_status === 'approved').length;
    const rejectedCount = resumes.filter(c => c.candidate_status === 'rejected').length;
    const avgAts = stats?.avg_ats_score || 0;

    const vis = filter === 'all' ? resumes : resumes.filter(c => (c.candidate_status || 'pending') === filter);

    // Only mutually exclusive statuses in the ring (they sum to totalResumes)
    const PIPE = [
        { l: 'Pending', v: pendingCount, c: '#a78bfa' },
        { l: 'Approved', v: selectedCount, c: '#22c55e' },
        { l: 'Rejected', v: rejectedCount, c: '#ef4444' },
    ];

    // Info stats shown below the ring (not in the donut)
    const PIPE_INFO = [
        { l: 'Uploaded', v: totalResumes, c: '#6366f1' },
        { l: 'Matched', v: totalMatches, c: '#8b5cf6' },
    ];

    const filters = ['all', 'pending', 'approved', 'rejected'];

    return (
        <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                <StatCard color="#6366f1" label="Resumes Uploaded" value={totalResumes} delta={totalResumes > 0 ? totalResumes : 0} />
                <StatCard color="#8b5cf6" label="Matches Found" value={totalMatches} delta={totalMatches > 0 ? totalMatches : 0} />
                <StatCard color="#22c55e" label="Approved" value={selectedCount} delta={selectedCount > 0 ? selectedCount : 0} />
                <StatCard color="#f59e0b" label="Avg ATS Score" value={avgAts} delta={avgAts > 0 ? (avgAts > 70 ? 5 : 2) : 0} />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Card>
                    <Sec title="Weekly Activity" sub="Uploads vs matches" />
                    <BarChart isDark={isDark} data={stats?.weekly_activity} />
                    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: isDark ? 'rgba(240,240,244,.8)' : '#1a1a1e' }} />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Uploads</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: isDark ? '#2a2a34' : '#d8d5ce' }} />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Matches</span>
                        </div>
                    </div>
                </Card>
                <Card>
                    <Sec title="Pipeline Funnel" sub="Candidate flow breakdown" />
                    <RingChart data={PIPE} isDark={isDark} />
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        {PIPE_INFO.map(d => (
                            <div key={d.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.c, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.l}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{d.v}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent Candidates */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Sec title="Recent Candidates" />
                    <div style={{ display: 'flex', gap: 6 }}>
                        {filters.map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                padding: '5px 12px', borderRadius: 7,
                                border: `1.5px solid ${f === filter ? 'var(--border2)' : 'var(--border)'}`,
                                background: f === filter ? 'var(--btn)' : 'transparent',
                                color: f === filter ? 'var(--btn-fg)' : 'var(--text2)',
                                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                letterSpacing: '.04em', textTransform: 'capitalize',
                                fontFamily: 'var(--font)',
                            }}>{f}</button>
                        ))}
                    </div>
                </div>

                {/* Table header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '2.2fr 70px 90px 100px',
                    gap: 12, padding: '6px 8px 10px',
                    borderBottom: '1.5px solid var(--border)', marginBottom: 4,
                }}>
                    {['Candidate', 'Score', 'Applied', 'Status'].map(h => (
                        <span key={h} style={{
                            fontSize: 10, color: 'var(--text3)', letterSpacing: '.1em',
                            textTransform: 'uppercase', fontWeight: 600,
                        }}>{h}</span>
                    ))}
                </div>

                {vis.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                        No candidates found. Upload resumes and run evaluations to see data here.
                    </div>
                )}

                {vis.slice(0, 10).map((c, i) => {
                    const name = c.candidate_name || (c.file_url ? c.file_url.split('/').pop()?.replace('.pdf','') : 'Candidate');
                    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const score = c.match_score || c.ats_score || 0;
                    return (
                        <div key={c.id || i} className="up rh" style={{
                            display: 'grid', gridTemplateColumns: '2.2fr 70px 90px 100px',
                            gap: 12, alignItems: 'center', padding: '10px 8px',
                            borderRadius: 8, cursor: 'default',
                            animationDelay: `${i * 30}ms`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <Avatar initials={initials} size={32} color={AVC[i % 5]} name={name} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.match_score ? 'JD Matched' : c.ats_score ? 'ATS Scanned' : 'Uploaded'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: scC(score) }}>
                                    {c.status === 'processing' ? (
                                        <div style={{ width: 24, height: 18, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                    ) : (
                                        Math.round(score)
                                    )}
                                </span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                            </span>
                            <Badge status={c.candidate_status || 'pending'} isDark={isDark} />
                        </div>
                    );
                })}
            </Card>
        </>
    );
}
