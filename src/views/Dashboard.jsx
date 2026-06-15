import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  RefreshCw, BedDouble, Users, TrendingUp, AlertTriangle,
  Clock, CheckCircle, Search, ChevronRight, ArrowUp, ArrowDown,
  Activity, DollarSign, Moon, Sun, Coffee, Zap, BarChart3, Layers,
  LogIn, LogOut as LogOutIcon, Sparkles, CalendarCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonDashboard } from '../components/SkeletonLoader';

/* ── helpers ── */
const fmt    = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtCur = (n) => `₹${fmt(n)}`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'Good night',      Icon: Moon   };
  if (h < 12) return { text: 'Good morning',     Icon: Sun    };
  if (h < 17) return { text: 'Good afternoon',   Icon: Coffee };
  return              { text: 'Good evening',     Icon: Moon   };
};

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    'Checked In':  { cls: 'badge-green',  text: 'In-House'     },
    'Reserved':    { cls: 'badge-indigo', text: 'Reserved'     },
    'Checked Out': { cls: 'badge-slate',  text: 'Checked Out'  },
  };
  const b = map[status] || { cls: 'badge-slate', text: status };
  return (
    <span className={`badge ${b.cls}`}>
      <span className="badge-dot" />
      {b.text}
    </span>
  );
};

/* ── Stat tile ── */
const StatTile = ({ value, label, colorClass, Icon, subtext }) => (
  <div className={`stat-tile anim-fade-up ${colorClass || ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className="stat-tile-label">{label}</span>
      {Icon && <div className="stat-tile-icon"><Icon size={16} /></div>}
    </div>
    <div className="stat-tile-val">{value}</div>
    {subtext && <div className="text-xs text-faint">{subtext}</div>}
  </div>
);

/* ── Room status pill colors ── */
const ROOM_COLORS = {
  'Vacant Clean': { bg: '#f0fdf4', border: '#86efac', text: '#15803d', label: 'Clean' },
  'Occupied':     { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', label: 'Occ'   },
  'Dirty':        { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', label: 'Dirty' },
  'Maintenance':  { bg: '#f8fafc', border: '#94a3b8', text: '#475569', label: 'Maint' },
  'Reserved':     { bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3', label: 'Res'   },
};

/* ── Occupancy donut (pure CSS ring) ── */
const OccupancyRing = ({ pct }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="45" cy="45" r={r}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          {pct}%
        </span>
        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Occ.
        </span>
      </div>
    </div>
  );
};

/* ── Activity item ── */
const AlertRow = ({ alert }) => {
  const colors = {
    danger:  'alert-red',
    warning: 'alert-amber',
    info:    'alert-blue',
  };
  const icons = {
    danger:  <AlertTriangle size={14} />,
    warning: <AlertTriangle size={14} />,
    info:    <Activity size={14} />,
  };
  return (
    <div className={`alert ${colors[alert.type] || 'alert-blue'}`} style={{ padding: '8px 12px' }}>
      <span>{icons[alert.type] || icons.info}</span>
      <span style={{ flex: 1 }}>{alert.text}</span>
    </div>
  );
};

export default function Dashboard({ onViewFolio }) {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [stats, setStats]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [lastUpdated, setLastUpdated]   = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;
      const [resRes, statsRes, roomsRes] = await Promise.all([
        axios.get('/api/reservations',         { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports/dashboard',    { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rooms',                { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setReservations(
        resRes.data.filter(b => ['Checked In', 'Reserved', 'Checked Out'].includes(b.status))
      );
      setStats(statsRes.data);
      setRooms(roomsRes.data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to sync dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  /* ── Derived counts ── */
  const totalRooms     = rooms.length;
  const occupiedCount  = rooms.filter(r => r.status === 'Occupied').length;
  const vacantCount    = rooms.filter(r => r.status === 'Vacant Clean').length;
  const dirtyCount     = rooms.filter(r => r.status === 'Dirty').length;
  const maintCount     = rooms.filter(r => r.status === 'Maintenance').length;
  const occPct         = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  /* ── Live counts from reservations (single source of truth) ── */
  const inhouseCount  = reservations.filter(r => r.status === 'Checked In').length;
  const reservedCount = reservations.filter(r => r.status === 'Reserved').length;
  const checkoutCount = reservations.filter(r => r.status === 'Checked Out').length;

  /* ── Filtered list ── */
  const filtered = reservations.filter(res => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      res.guest_name.toLowerCase().includes(q) ||
      res.guest_mobile.includes(q) ||
      res.reservation_number?.toLowerCase().includes(q) ||
      (res.room_number && String(res.room_number).includes(q));
    const matchF =
      filter === 'all' ||
      (filter === 'inhouse'  && res.status === 'Checked In')  ||
      (filter === 'reserved' && res.status === 'Reserved')    ||
      (filter === 'checkout' && res.status === 'Checked Out');
    return matchQ && matchF;
  });

  const greeting = getGreeting();

  /* ── Arrival countdown helper ── */
  const getArrivalChip = (res) => {
    const now  = new Date();
    const cin  = new Date(res.check_in_datetime);
    const cout = new Date(res.check_out_datetime);
    if (res.status === 'Checked In') {
      const diffH = Math.round((cout - now) / 3600000);
      if (diffH < 0)  return { cls: 'overdue', label: `CO ${Math.abs(diffH)}h overdue` };
      if (diffH < 4)  return { cls: 'soon',    label: `CO in ${diffH}h` };
      return           { cls: 'inhouse',  label: `In-house` };
    }
    if (res.status === 'Reserved') {
      const diffH = Math.round((cin - now) / 3600000);
      if (diffH < 0)  return { cls: 'overdue', label: `CI ${Math.abs(diffH)}h overdue` };
      if (diffH < 3)  return { cls: 'soon',    label: `CI in ${diffH}h` };
      if (diffH < 24) return { cls: 'soon',    label: `CI in ${diffH}h` };
      return           { cls: 'future',   label: `CI ${cin.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` };
    }
    return null;
  };

  /* ── Loading ── */
  if (loading) return <SkeletonDashboard />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <greeting.Icon size={18} style={{ color: 'var(--amber)' }} />
            <h1 className="page-title">{greeting.text}</h1>
          </div>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
            })}
            {inhouseCount > 0 && (
              <span style={{ marginLeft: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                · {inhouseCount} guest{inhouseCount !== 1 ? 's' : ''} in-house tonight
              </span>
            )}
            {lastUpdated && (
              <span style={{ marginLeft: 10, color: 'var(--text-faint)' }}>
                · Synced {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <button onClick={fetchData} className="btn btn-default btn-sm">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Quick-action bar ── */}
      <div className="quick-action-bar">
        {[
          { Icon: LogIn,        label: 'Due Arrivals',   count: stats?.activity?.arrivals ?? 0,     color: '#10b981' },
          { Icon: LogOutIcon,   label: 'Due Departures', count: stats?.activity?.departures ?? 0,    color: '#3b82f6' },
          { Icon: Sparkles,     label: 'Dirty Rooms',    count: dirtyCount,                          color: '#f59e0b' },
          { Icon: CalendarCheck,label: 'Reserved',       count: reservedCount,                       color: '#6366f1' },
        ].map(({ Icon, label, count, color }) => (
          <div key={label} className="quick-chip">
            <Icon size={13} style={{ color }} />
            <span>{label}</span>
            <span style={{
              background: 'var(--surface-3)', borderRadius: '10px',
              padding: '0 6px', fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--text-muted)',
            }}>{count}</span>
          </div>
        ))}
      </div>

      {/* ── Stats strip ── */}
      <div className="stat-grid anim-stagger">
        <StatTile
          value={inhouseCount}
          label="In-House"
          colorClass="green"
          Icon={BedDouble}
          subtext={`of ${totalRooms} rooms`}
        />
        <StatTile
          value={stats?.activity?.arrivals ?? 0}
          label="Arrivals Today"
          colorClass="amber"
          Icon={ArrowDown}
          subtext="check-ins due"
        />
        <StatTile
          value={stats?.activity?.departures ?? 0}
          label="Departures"
          colorClass="blue"
          Icon={ArrowUp}
          subtext="check-outs due"
        />
        <StatTile
          value={stats?.activity?.pendingCheckins ?? 0}
          label="Pending CI"
          Icon={Clock}
          subtext="awaiting check-in"
        />
        <StatTile
          value={reservedCount}
          label="Reserved"
          colorClass="violet"
          Icon={CheckCircle}
          subtext="upcoming"
        />
        <StatTile
          value={dirtyCount}
          label="Dirty Rooms"
          colorClass="amber"
          Icon={Zap}
          subtext="need housekeeping"
        />
        <StatTile
          value={vacantCount}
          label="Vacant Clean"
          colorClass="green"
          Icon={CheckCircle}
          subtext="ready to assign"
        />
        <StatTile
          value={fmtCur(stats?.financials?.revenueToday)}
          label="Revenue Today"
          colorClass="violet"
          Icon={TrendingUp}
          subtext="gross collection"
        />
        <StatTile
          value={fmtCur(stats?.financials?.depositsHeld ?? 0)}
          label="Deposits Held"
          colorClass="blue"
          Icon={DollarSign}
          subtext="active security deposits"
        />
      </div>

      {/* ── Two-column info row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>

        {/* Property Map */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Layers size={15} style={{ color: 'var(--brand-500)' }} />
              Property Map
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'Clean',    bg: '#f0fdf4', border: '#86efac', text: '#15803d', count: vacantCount  },
                { label: 'Occupied', bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', count: occupiedCount },
                { label: 'Dirty',    bg: '#fffbeb', border: '#fcd34d', text: '#92400e', count: dirtyCount    },
                { label: 'Maint',    bg: '#f8fafc', border: '#94a3b8', text: '#475569', count: maintCount    },
              ].map(({ label, bg, border, text, count }) => (
                <span key={label} style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '4px',
                  background: bg, border: `1px solid ${border}`, color: text,
                }}>
                  {label} {count}
                </span>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div className="prop-map-grid">
              {rooms.map(r => {
                const c = ROOM_COLORS[r.status] || ROOM_COLORS['Vacant Clean'];
                const activeRes = r.status === 'Occupied'
                  ? reservations.find(res => String(res.room_number) === String(r.room_number) && res.status === 'Checked In')
                  : null;
                return (
                  <div
                    key={r.id}
                    className="prop-map-tile"
                    style={{ background: c.bg, borderColor: c.border, color: c.text }}
                    title={activeRes
                      ? `${activeRes.guest_name} · ${activeRes.reservation_number}`
                      : `Room ${r.room_number}: ${r.status}`
                    }
                  >
                    <div className="prop-map-num">{r.room_number}</div>
                    <div className="prop-map-label">{c.label}</div>
                    {activeRes && <div className="prop-map-dot" />}
                  </div>
                );
              })}
              {rooms.length === 0 && (
                <div style={{ gridColumn: '1/-1', color: 'var(--text-faint)', fontSize: '0.8rem', textAlign: 'center', padding: '24px' }}>
                  No rooms configured
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Occupancy & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Occupancy card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <BarChart3 size={15} style={{ color: 'var(--brand-500)' }} />
                Occupancy
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <OccupancyRing pct={occPct} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                {[
                  { label: 'Occupied',    val: occupiedCount, color: '#b91c1c' },
                  { label: 'Vacant',      val: vacantCount,   color: '#059669' },
                  { label: 'Dirty',       val: dirtyCount,    color: '#d97706' },
                  { label: 'Maintenance', val: maintCount,    color: '#475569' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', flex: 1 }}>{label}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts card */}
          {stats?.alerts?.length > 0 && (
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <span className="card-title">
                  <AlertTriangle size={15} style={{ color: 'var(--amber)' }} />
                  Alerts
                  <span className="tab-count" style={{ background: '#fef3c7', color: '#92400e' }}>
                    {stats.alerts.length}
                  </span>
                </span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 16px' }}>
                {stats.alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)}
              </div>
            </div>
          )}

          {/* Revenue summary */}
          <div className="card">
            <div className="card-body" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Revenue
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                {fmtCur(stats?.financials?.revenueToday ?? 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '2px' }}>today's gross</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & filter bar ── */}
      <div className="filter-bar">
        <div className="search-wrap" style={{ flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} className="search-icon" />
          <input
            type="search"
            placeholder="Search guest, mobile, room, reservation…"
            className="input"
            style={{ paddingLeft: 32 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {[
            { id: 'all',      label: 'All',         count: reservations.length },
            { id: 'inhouse',  label: 'In-House',    count: inhouseCount        },
            { id: 'reserved', label: 'Reserved',    count: reservedCount       },
            { id: 'checkout', label: 'Checked Out', count: checkoutCount       },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`filter-pill ${filter === f.id ? 'active' : ''}`}
            >
              {f.label}
              <span style={{ opacity: 0.7, marginLeft: 3 }}>({f.count})</span>
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Reservations list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><BedDouble size={22} /></div>
              <div className="empty-state-title">No reservations found</div>
              <div className="empty-state-desc">
                {searchQuery ? 'Try adjusting your search or filter.' : 'No bookings match the selected filter.'}
              </div>
            </div>
          </div>
        ) : (
          filtered.map((res, i) => {
            const isIn  = res.status === 'Checked In';
            const isRes = res.status === 'Reserved';
            const cin   = new Date(res.check_in_datetime);
            const cout  = new Date(res.check_out_datetime);
            const nights = Math.max(1, Math.round((cout - cin) / 86400000));

            return (
              <div
                key={res.id}
                className={`booking-card ${isIn ? 'status-in' : isRes ? 'status-res' : 'status-out'}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Guest info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="booking-guest">{res.guest_name}</span>
                    <StatusBadge status={res.status} />
                    {res.room_number && (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        background: 'var(--surface-3)', border: '1px solid var(--border)',
                        padding: '1px 7px', borderRadius: 'var(--r-xs)',
                        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                      }}>
                        Rm {res.room_number}
                      </span>
                    )}
                    {(() => { const chip = getArrivalChip(res); return chip ? <span className={`arrival-chip ${chip.cls}`}><Clock size={9} />{chip.label}</span> : null; })()}
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={11} /> {res.guest_mobile}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      {cin.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' → '}
                      {cout.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      {' · '}{nights}N
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BedDouble size={11} /> {res.room_type_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', letterSpacing: '0.04em' }}>
                    {res.reservation_number}
                  </span>
                </div>

                {/* Pax */}
                <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                    {res.adults + res.children}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Pax
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => onViewFolio(res)}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, gap: 4 }}
                >
                  Folio <ChevronRight size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
