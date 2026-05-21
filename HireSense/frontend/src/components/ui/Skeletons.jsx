import React from 'react';

// Stat Card Skeleton
export function CardSkeleton() {
    return (
        <div className="shimmer-bg" style={{
            display: 'flex', alignItems: 'stretch',
            border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            height: 106, width: '100%',
        }}>
            <div style={{ width: 5, background: 'var(--border2)', flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Stat label */}
                <div style={{ width: '40%', height: 10, background: 'var(--border)', borderRadius: 4 }} />
                {/* Stat value */}
                <div style={{ width: '25%', height: 26, background: 'var(--border)', borderRadius: 6 }} />
                {/* Stat delta */}
                <div style={{ width: '55%', height: 10, background: 'var(--border)', borderRadius: 4 }} />
            </div>
        </div>
    );
}

// Table / List Item Row Skeleton
export function RowSkeleton() {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '2.2fr 60px 80px 100px 180px',
            gap: 12, alignItems: 'center', padding: '12px 10px',
            borderBottom: '1.5px solid var(--border)',
        }}>
            {/* Candidate Name & Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {/* Avatar */}
                <div className="shimmer-bg" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    {/* Name */}
                    <div className="shimmer-bg" style={{ width: '60%', height: 11, borderRadius: 4 }} />
                    {/* Date */}
                    <div className="shimmer-bg" style={{ width: '30%', height: 9, borderRadius: 3 }} />
                </div>
            </div>
            {/* Score */}
            <div className="shimmer-bg" style={{ width: 24, height: 18, borderRadius: 4 }} />
            {/* File */}
            <div className="shimmer-bg" style={{ width: 45, height: 14, borderRadius: 4 }} />
            {/* Status */}
            <div className="shimmer-bg" style={{ width: 64, height: 14, borderRadius: 4 }} />
            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
                <div className="shimmer-bg" style={{ width: 68, height: 22, borderRadius: 6 }} />
                <div className="shimmer-bg" style={{ width: 22, height: 22, borderRadius: 6 }} />
                <div className="shimmer-bg" style={{ width: 22, height: 22, borderRadius: 6 }} />
                <div className="shimmer-bg" style={{ width: 22, height: 22, borderRadius: 6 }} />
            </div>
        </div>
    );
}

// List Loader Container (maps to standard table)
export function ListSkeleton({ rows = 4 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <RowSkeleton key={i} />
            ))}
        </div>
    );
}

// Kanban Stage Column Skeleton
export function BoardColumnSkeleton() {
    return (
        <div style={{
            flex: 1, minWidth: 260, background: 'var(--card)',
            border: '1.5px solid var(--border)', borderRadius: 10, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div className="shimmer-bg" style={{ width: '35%', height: 14, borderRadius: 4 }} />
                <div className="shimmer-bg" style={{ width: 20, height: 14, borderRadius: 4 }} />
            </div>
            {/* Column Cards */}
            {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="shimmer-bg" style={{
                    height: 90, borderRadius: 8, border: '1.5px solid var(--border)',
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    <div style={{ width: '70%', height: 11, background: 'var(--border)', borderRadius: 4 }} />
                    <div style={{ width: '45%', height: 9, background: 'var(--border)', borderRadius: 3 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <div style={{ width: 22, height: 14, background: 'var(--border)', borderRadius: 4 }} />
                        <div style={{ width: 50, height: 14, background: 'var(--border)', borderRadius: 4 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Full Kanban Board Skeleton
export function BoardSkeleton() {
    return (
        <div style={{ display: 'flex', gap: 12, width: '100%', overflowX: 'auto', paddingBottom: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <BoardColumnSkeleton key={i} />
            ))}
        </div>
    );
}
