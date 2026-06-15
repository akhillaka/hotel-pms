import React from 'react';

/* ─── Skeleton tile (stat card) ─── */
export function SkeletonStatTile() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line" style={{ width: '55%' }} />
      <div className="skeleton skeleton-val" />
      <div className="skeleton skeleton-line" style={{ width: '40%' }} />
    </div>
  );
}

/* ─── Skeleton stat grid (4 tiles) ─── */
export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatTile key={i} />
      ))}
    </div>
  );
}

/* ─── Skeleton table row ─── */
export function SkeletonRow({ cols = 5 }) {
  const widths = ['35%', '20%', '15%', '20%', '10%'];
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center',
      padding: '12px 16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 14, flex: 1, maxWidth: widths[i] || '20%' }}
        />
      ))}
    </div>
  );
}

/* ─── Skeleton list (multiple rows) ─── */
export function SkeletonList({ rows = 5, cols = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/* ─── Skeleton room grid ─── */
export function SkeletonRoomGrid({ count = 12 }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: 80, height: 80, borderRadius: 'var(--r-md)' }}
        />
      ))}
    </div>
  );
}

/* ─── Skeleton card (generic) ─── */
export function SkeletonCard({ lines = 3, style = {} }) {
  return (
    <div className="skeleton-card" style={style}>
      <div className="skeleton" style={{ height: 18, width: '60%', borderRadius: 'var(--r-xs)' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 12,
            width: i % 2 === 0 ? '85%' : '65%',
            borderRadius: 'var(--r-xs)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Skeleton full dashboard ─── */
export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 'var(--r-sm)' }} />
      </div>
      {/* Stat grid */}
      <SkeletonStatGrid count={5} />
      {/* Two column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="skeleton-card" style={{ minHeight: 200 }}>
          <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 'var(--r-xs)' }} />
          <SkeletonList rows={4} cols={4} />
        </div>
        <SkeletonCard lines={6} style={{ minHeight: 200 }} />
      </div>
    </div>
  );
}
