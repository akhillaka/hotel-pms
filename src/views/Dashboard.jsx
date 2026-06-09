import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, BedDouble, Users, TrendingUp, AlertTriangle, Clock, CheckCircle, DoorOpen, Search, ChevronRight, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return '☀️ Good morning';
  if (h < 17) return '🌤️ Good afternoon';
  return '🌙 Good evening';
};

const StatCard = ({ count, label, colorClass }) => (
  <div className={`stat-block ${colorClass || ''}`}>
    <span className="count">{count}</span>
    <span className="label">{label}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    'Checked In':  { cls: 'badge-success', text: 'In-House' },
    'Reserved':    { cls: 'badge-info',    text: 'Reserved' },
    'Checked Out': { cls: 'badge-neutral', text: 'Checked Out' },
  };
  const b = map[status] || { cls: 'badge-neutral', text: status };
  return <span className={`badge ${b.cls}`}>{b.text}</span>;
};

export default function Dashboard({ onViewFolio }) {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [stats, setStats]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;
      const [resRes, statsRes, roomsRes] = await Promise.all([
        axios.get('/api/reservations', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setReservations(
        resRes.data.filter(b => ['Checked In', 'Reserved', 'Checked Out'].includes(b.status))
      );
      setStats(statsRes.data);
      setRooms(roomsRes.data);
    } catch {
      toast.error('Failed to sync dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const id = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = reservations.filter(res => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      res.guest_name.toLowerCase().includes(q) ||
      res.guest_mobile.includes(q) ||
      res.reservation_number?.toLowerCase().includes(q) ||
      (res.room_number && res.room_number.includes(q));
    const matchesFilter =
      filter === 'all' ||
      (filter === 'inhouse' && res.status === 'Checked In') ||
      (filter === 'reserved' && res.status === 'Reserved') ||
      (filter === 'checkout' && res.status === 'Checked Out');
    return matchesSearch && matchesFilter;
  });

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '14px', color: 'var(--text-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '0.875rem' }}>Loading operations dashboard…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>
            {getGreeting()}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.855rem', marginTop: '2px' }}>
            {todayStr}
          </p>
        </div>
        <button onClick={fetchDashboardData} className="glass-btn" style={{ gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stat strip ── */}
      <div className="stat-card-row">
        <StatCard count={stats?.occupancy?.inhouse ?? stats?.occupancy?.occupied ?? 0} label="In-House"       colorClass="active-green"  />
        <StatCard count={stats?.activity?.arrivals   ?? 0} label="Arrivals"        colorClass="active-yellow" />
        <StatCard count={stats?.activity?.departures ?? 0} label="Departures"      colorClass="active-blue"   />
        <StatCard count={stats?.activity?.pendingCheckins ?? 0} label="Pending CI"  />
        <StatCard count={stats?.occupancy?.reserved  ?? 0} label="Reserved"        />
        <StatCard count={stats?.occupancy?.dirty     ?? 0} label="Dirty"           />
        <StatCard count={stats?.occupancy?.available ?? 0} label="Vacant"          />
        <StatCard count={`₹${fmt(stats?.financials?.revenueToday)}`} label="Revenue" />
      </div>

      {/* ── Live Property Layout Map & Analytics Insight ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
        
        {/* Interactive Property Map */}
        <div className="glass-panel" style={{ padding: '20px', background: '#fff' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🏢</span> Property Mini-Layout Map
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '8px' }}>
            {rooms.map(r => {
              const colors = {
                'Vacant Clean': { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', label: 'Clean' },
                'Occupied':     { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', label: 'Occupant' },
                'Dirty':        { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', label: 'Dirty' },
                'Maintenance':  { bg: '#f1f5f9', border: '#94a3b8', text: '#475569', label: 'Blocked' },
              };
              const c = colors[r.status] || colors['Vacant Clean'];
              const activeRes = r.status === 'Occupied' 
                ? reservations.find(res => String(res.room_number) === String(r.room_number) && res.status === 'Checked In')
                : null;

              return (
                <div
                  key={r.id}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: `1.5px solid ${c.border}`,
                    background: c.bg,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                  }}
                  title={activeRes ? `Guest: ${activeRes.guest_name}\nRes: ${activeRes.reservation_number}` : `Room ${r.room_number}: ${r.status}`}
                >
                  <strong style={{ fontSize: '0.82rem', color: c.text }}>{r.room_number}</strong>
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, color: c.text, textTransform: 'uppercase', opacity: 0.8 }}>
                    {c.label}
                  </span>
                  {activeRes && (
                    <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Revenue pace card */}
        <div className="glass-panel" style={{ padding: '20px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} style={{ color: 'var(--primary)' }} /> PMS Quick Insights
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your property layout represents clean, blocked, and occupied rooms. Click on the <strong>Room Board</strong> tab to perform quick walk-ins, resolve maintenance logs, or change housekeeping status.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857' }}>● Clean: {rooms.filter(r => r.status === 'Vacant Clean').length}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>● Occupied: {rooms.filter(r => r.status === 'Occupied').length}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#fffbeb', color: '#92400e' }}>● Dirty: {rooms.filter(r => r.status === 'Dirty').length}</span>
          </div>
        </div>

      </div>

      {/* ── Alerts ── */}
      {stats?.alerts?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.alerts.map(alert => {
            const colors = {
              danger:  { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', icon: '🚨' },
              warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '⚠️' },
              info:    { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3', icon: 'ℹ️'  },
            };
            const c = colors[alert.type] || colors.info;
            return (
              <div key={alert.id} style={{
                padding: '10px 14px', borderRadius: 'var(--r-md)',
                background: c.bg, border: `1.5px solid ${c.border}`,
                color: c.text, fontSize: '0.835rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {c.icon} {alert.text}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Search + filter bar ── */}
      <div style={{
        background: '#fff', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '14px 18px',
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Name, mobile, room, reservation no…"
            className="glass-input"
            style={{ paddingLeft: '34px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all',      label: 'All' },
            { id: 'inhouse',  label: 'In-House' },
            { id: 'reserved', label: 'Reserved' },
            { id: 'checkout', label: 'Checked Out' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                border: '1.5px solid',
                cursor: 'pointer',
                transition: 'all 0.13s ease',
                background:   filter === f.id ? 'var(--primary)' : 'transparent',
                borderColor:  filter === f.id ? 'var(--primary)' : 'var(--border)',
                color:        filter === f.id ? '#fff'           : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Reservations list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)',
            color: 'var(--text-muted)', fontSize: '0.875rem',
          }}>
            <BedDouble size={36} style={{ margin: '0 auto 12px', color: '#d1d9e6' }} />
            No reservations match your search.
          </div>
        ) : (
          filtered.map(res => {
            const isIn  = res.status === 'Checked In';
            const isRes = res.status === 'Reserved';
            const cin   = new Date(res.check_in_datetime);
            const cout  = new Date(res.check_out_datetime);
            const nights = Math.max(1, Math.round((cout - cin) / 86400000));

            return (
              <div
                key={res.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isIn ? '#86efac' : isRes ? '#c7d2fe' : 'var(--border)'}`,
                  borderRadius: 'var(--r-md)',
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '16px',
                  alignItems: 'center',
                  transition: 'all 0.18s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Main info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{res.guest_name}</span>
                    <StatusBadge status={res.status} />
                    {res.room_number && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        background: '#f0f2f7', border: '1px solid var(--border)',
                        padding: '2px 8px', borderRadius: '6px', color: 'var(--text-muted)',
                      }}>
                        Room {res.room_number}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {res.guest_mobile}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {cin.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' → '}
                      {cout.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' · '}
                      {nights}N
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BedDouble size={12} /> {res.room_type_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', letterSpacing: '0.03em' }}>
                    {res.reservation_number}
                  </span>
                </div>

                {/* Pax */}
                <div style={{ textAlign: 'center', minWidth: '56px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{res.adults + res.children}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pax</div>
                </div>

                {/* Action */}
                <button
                  onClick={() => onViewFolio(res)}
                  className="glass-btn glass-btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '4px', borderRadius: 'var(--r-md)' }}
                >
                  Folio <ChevronRight size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
