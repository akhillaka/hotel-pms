import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Sparkles, Trash2, Wrench, CheckCircle, RefreshCcw, X,
  UserPlus, BedDouble, Clock, AlertTriangle, Zap, Coffee,
  Moon, Sun, ChevronRight, User, Phone, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── status meta ─── */
const STATUS_META = {
  'Vacant Clean':  { color: '#059669', bg: '#d1fae5', border: '#6ee7b7', icon: '✅', label: 'Vacant Clean'  },
  'Occupied':      { color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: '🛏️', label: 'Occupied'       },
  'Dirty':         { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', icon: '🧹', label: 'Dirty'          },
  'Maintenance':   { color: '#475569', bg: '#f1f5f9', border: '#94a3b8', icon: '🔧', label: 'Maintenance'    },
  'Reserved':      { color: '#3730a3', bg: '#eef2ff', border: '#a5b4fc', icon: '📋', label: 'Reserved'       },
};

/* ─── quick walk-in initial state ─── */
const walkInInit = {
  name: '', mobile: '', stayType: 'night', checkIn: '', checkOut: '',
  adults: 1, children: 0, ratePlanId: '', remarks: '', customRate: ''
};

export default function RoomBoard({ user, permission }) {
  const [rooms, setRooms]                 = useState([]);
  const [tickets, setTickets]             = useState([]);
  const [ratePlans, setRatePlans]         = useState([]);
  const [selectedRoom, setSelectedRoom]   = useState(null);
  const [panel, setPanel]                 = useState('actions'); // 'actions' | 'walkin' | 'maintenance'
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [loading, setLoading]             = useState(true);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [walkin, setWalkin]               = useState(walkInInit);
  const [saving, setSaving]               = useState(false);
  const panelRef = useRef(null);

  /* ── now string for default check-in datetime ── */
  const nowISO = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  };

  const fetchRoomData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const [rmRes, tkRes, rpRes] = await Promise.all([
        axios.get('/api/rooms',       { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/maintenance', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans',  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRooms(rmRes.data);
      setTickets(tkRes.data);
      setRatePlans(rpRes.data);
    } catch {
      toast.error('Failed to load room board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoomData(); }, []);

  /* close panel on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedRoom(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openRoom = (rm) => {
    setSelectedRoom(rm);
    setPanel('actions');
    setMaintenanceIssue('');
    setWalkin({ ...walkInInit, checkIn: nowISO() });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const changeRoomStatus = async (newStatus) => {
    if (permission === 'read') return toast.error('Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/rooms/${selectedRoom.id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Room ${selectedRoom.room_number} → ${newStatus}`);
      setSelectedRoom(null);
      fetchRoomData();
    } catch { toast.error('Failed to update status'); }
  };

  const createMaintenanceTicket = async (e) => {
    e.preventDefault();
    if (!maintenanceIssue.trim()) return toast.error('Describe the issue first');
    if (permission === 'read') return toast.error('Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/maintenance', { room_id: selectedRoom.id, issue: maintenanceIssue }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket created — room blocked for maintenance');
      setMaintenanceIssue('');
      setSelectedRoom(null);
      fetchRoomData();
    } catch { toast.error('Failed to create ticket'); }
  };

  const resolveTicket = async (ticketId) => {
    if (permission === 'read') return toast.error('Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/maintenance/${ticketId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket resolved — room set to Vacant Clean');
      fetchRoomData();
    } catch { toast.error('Failed to resolve'); }
  };

  const handleWalkIn = async (e) => {
    e.preventDefault();
    if (!walkin.name || !walkin.mobile || !walkin.checkIn || !walkin.checkOut || !walkin.ratePlanId) {
      return toast.error('Fill all required fields');
    }
    if (permission === 'read') return toast.error('Read-only access');
    setSaving(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/reservations', {
        guest: { name: walkin.name, mobile: walkin.mobile },
        stay_type:   walkin.stayType,
        room_type_id: selectedRoom.room_type_id,
        rate_plan_id: walkin.ratePlanId,
        check_in:    walkin.checkIn,
        check_out:   walkin.checkOut,
        adults:      walkin.adults,
        children:    walkin.children,
        remarks:     walkin.remarks,
        custom_rate: walkin.customRate ? parseFloat(walkin.customRate) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const reservationId = res.data.reservationId;

      /* Auto check-in into this specific room */
      const fd = new FormData();
      fd.append('room_id',       selectedRoom.id);
      fd.append('advance_amount','0');
      fd.append('payment_method','Cash');
      fd.append('guest_name',    walkin.name);
      fd.append('id_type',       'Walk-In');
      fd.append('id_number',     'N/A');
      await axios.post(`/api/reservations/${reservationId}/check-in`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`✅ Walk-in checked in — Room ${selectedRoom.room_number}`);
      setSelectedRoom(null);
      fetchRoomData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Walk-in failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── derived ── */
  const visibleRooms = filterStatus === 'all'
    ? rooms
    : rooms.filter(r => r.status === filterStatus);

  const statusCounts = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s] = rooms.filter(r => r.status === s).length;
    return acc;
  }, {});
  const openTickets = tickets.filter(tk => tk.status !== 'Resolved');
  const roomPlans   = ratePlans.filter(p => String(p.room_type_id) === String(selectedRoom?.room_type_id));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '14px', color: 'var(--text-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '0.875rem' }}>Loading room inventory…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>Room Board</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.855rem', marginTop: '2px' }}>
            Real-time inventory — {rooms.length} rooms · {statusCounts['Occupied'] || 0} occupied · {statusCounts['Vacant Clean'] || 0} available
          </p>
        </div>
        <button onClick={fetchRoomData} className="glass-btn" style={{ gap: '6px' }}>
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* ── Status summary pills ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '6px 16px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.13s ease',
            background: filterStatus === 'all' ? '#0f1117' : 'transparent',
            borderColor: filterStatus === 'all' ? '#0f1117' : 'var(--border)',
            color: filterStatus === 'all' ? '#fff' : 'var(--text-muted)',
          }}
        >All ({rooms.length})</button>
        {Object.entries(STATUS_META).map(([status, meta]) => (
          statusCounts[status] > 0 && (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                border: `1.5px solid`, cursor: 'pointer', transition: 'all 0.13s ease',
                background: filterStatus === status ? meta.color : meta.bg,
                borderColor: filterStatus === status ? meta.color : meta.border,
                color: filterStatus === status ? '#fff' : meta.color,
              }}
            >
              {meta.icon} {meta.label} ({statusCounts[status]})
            </button>
          )
        ))}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_META).map(([s, m]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '3px', background: m.bg, border: `1.5px solid ${m.border}` }} />
            {m.label}
          </div>
        ))}
      </div>

      {/* ── Room grid ── */}
      <div style={{
        background: '#fff', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '10px',
        }}>
          {visibleRooms.map(rm => {
            const meta = STATUS_META[rm.status] || STATUS_META['Vacant Clean'];
            const isSelected = selectedRoom?.id === rm.id;
            return (
              <button
                key={rm.id}
                onClick={() => openRoom(rm)}
                style={{
                  padding: '14px 6px 12px',
                  borderRadius: 'var(--r-md)',
                  border: `2px solid ${isSelected ? '#6366f1' : meta.border}`,
                  background: isSelected ? '#eef2ff' : meta.bg,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  outline: 'none',
                }}
                title={`Room ${rm.room_number} — ${rm.status}`}
              >
                <span style={{ fontSize: '0.95rem' }}>{meta.icon}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isSelected ? '#6366f1' : meta.color }}>
                  {rm.room_number}
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', color: meta.color, opacity: 0.75 }}>
                  {rm.room_type_code || rm.room_type_name?.slice(0, 4)}
                </span>
              </button>
            );
          })}
          {visibleRooms.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px' }}>
              No rooms match this filter
            </div>
          )}
        </div>
      </div>

      {/* ── Room action panel ── */}
      {selectedRoom && (() => {
        const meta = STATUS_META[selectedRoom.status] || STATUS_META['Vacant Clean'];
        const canBook = selectedRoom.status === 'Vacant Clean';
        return (
          <div
            ref={panelRef}
            style={{
              background: '#fff', border: `2px solid ${meta.border}`,
              borderRadius: 'var(--r-lg)', overflow: 'hidden',
              animation: 'fadeIn 0.22s ease both',
            }}
          >
            {/* Panel header */}
            <div style={{
              background: meta.bg, padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1.5px solid ${meta.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--r-md)',
                  background: '#fff', border: `2px solid ${meta.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.3rem',
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: meta.color }}>
                    Room {selectedRoom.room_number}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {selectedRoom.room_type_name} · <strong style={{ color: meta.color }}>{selectedRoom.status}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.08)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)' }}>
              {[
                { id: 'actions',     label: '⚡ Quick Actions', always: true       },
                { id: 'walkin',      label: '👤 Walk-in',       show: canBook       },
                { id: 'maintenance', label: '🔧 Maintenance',    show: permission !== 'read' },
              ].filter(t => t.always || t.show).map(t => (
                <button
                  key={t.id}
                  onClick={() => setPanel(t.id)}
                  style={{
                    flex: 1, padding: '11px 8px', fontSize: '0.82rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer', background: 'transparent',
                    borderBottom: `2.5px solid ${panel === t.id ? '#6366f1' : 'transparent'}`,
                    color: panel === t.id ? '#6366f1' : 'var(--text-muted)',
                    transition: 'all 0.13s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px' }}>

              {/* ─── Quick Actions panel ─── */}
              {panel === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Update housekeeping status for Room {selectedRoom.room_number}. Occupied rooms cannot be changed here.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    {[
                      { status: 'Vacant Clean',  icon: <Sparkles  size={18}/>, label: 'Mark Clean',       desc: 'Ready to book' },
                      { status: 'Dirty',          icon: <Trash2    size={18}/>, label: 'Mark Dirty',       desc: 'Needs cleaning' },
                      { status: 'Maintenance',    icon: <Wrench    size={18}/>, label: 'Out of Order',     desc: 'Block room' },
                    ].map(opt => {
                      const m = STATUS_META[opt.status];
                      const isActive = selectedRoom.status === opt.status;
                      const blocked = selectedRoom.status === 'Occupied' || permission === 'read';
                      return (
                        <button
                          key={opt.status}
                          onClick={() => changeRoomStatus(opt.status)}
                          disabled={blocked || isActive}
                          style={{
                            padding: '16px 12px', borderRadius: 'var(--r-md)',
                            border: `2px solid ${isActive ? m.border : 'var(--border)'}`,
                            background: isActive ? m.bg : '#fafafa',
                            cursor: blocked || isActive ? 'not-allowed' : 'pointer',
                            opacity: blocked && !isActive ? 0.45 : 1,
                            display: 'flex', flexDirection: 'column', gap: '6px',
                            alignItems: 'flex-start', textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (!blocked && !isActive) { e.currentTarget.style.borderColor = m.border; e.currentTarget.style.background = m.bg; } }}
                          onMouseLeave={e => { if (!blocked && !isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fafafa'; } }}
                        >
                          <div style={{ color: m.color }}>{opt.icon}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: m.color }}>{opt.label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                          {isActive && (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                              background: m.color, color: '#fff', borderRadius: '10px',
                            }}>Current</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedRoom.status === 'Occupied' && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 'var(--r-md)',
                      background: '#fff7ed', border: '1.5px solid #fed7aa',
                      fontSize: '0.8rem', color: '#9a3412', display: 'flex', gap: '8px',
                    }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      Room is currently occupied. Check out the guest from Folio to change status.
                    </div>
                  )}
                </div>
              )}

              {/* ─── Walk-in panel ─── */}
              {panel === 'walkin' && (
                <form onSubmit={handleWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    background: '#eef2ff', border: '1.5px solid #c7d2fe',
                    fontSize: '0.8rem', color: '#3730a3', display: 'flex', gap: '8px', alignItems: 'center',
                  }}>
                    <Zap size={14} />
                    Quick walk-in directly into Room <strong>{selectedRoom.room_number}</strong>. Guest will be checked-in immediately.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>GUEST NAME *</label>
                      <input className="glass-input" placeholder="Full name" value={walkin.name}
                        onChange={e => setWalkin(w => ({ ...w, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>MOBILE *</label>
                      <input className="glass-input" placeholder="10-digit number" type="tel" value={walkin.mobile}
                        onChange={e => setWalkin(w => ({ ...w, mobile: e.target.value }))} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CHECK-IN *</label>
                      <input className="glass-input" type="datetime-local" value={walkin.checkIn}
                        onChange={e => setWalkin(w => ({ ...w, checkIn: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CHECK-OUT *</label>
                      <input className="glass-input" type="datetime-local" value={walkin.checkOut}
                        onChange={e => setWalkin(w => ({ ...w, checkOut: e.target.value }))} required />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>STAY TYPE</label>
                      <select className="glass-input" value={walkin.stayType}
                        onChange={e => setWalkin(w => ({ ...w, stayType: e.target.value }))}>
                        <option value="night">Night Stay</option>
                        <option value="day_use">Day Use</option>
                        <option value="hourly">Hourly</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>ADULTS</label>
                      <input className="glass-input" type="number" min="1" max="10" value={walkin.adults}
                        onChange={e => setWalkin(w => ({ ...w, adults: +e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CHILDREN</label>
                      <input className="glass-input" type="number" min="0" max="10" value={walkin.children}
                        onChange={e => setWalkin(w => ({ ...w, children: +e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>RATE PLAN *</label>
                      <select className="glass-input" value={walkin.ratePlanId}
                        onChange={e => setWalkin(w => ({ ...w, ratePlanId: e.target.value }))} required>
                        <option value="">— Select package —</option>
                        {roomPlans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ₹{p.night_price ?? p.day_use_price ?? '—'}/night
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CUSTOM PRICE (₹)</label>
                      <input type="number" className="glass-input" placeholder="e.g. 1500" value={walkin.customRate || ''}
                        onChange={e => setWalkin(w => ({ ...w, customRate: e.target.value }))} />
                    </div>
                  </div>
                  {roomPlans.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>
                      No rate plans configured for this room type. Set them up in Admin → Rate Packages.
                    </p>
                  )}

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>REMARKS (optional)</label>
                    <input className="glass-input" placeholder="e.g. honeymoon couple, early check-in" value={walkin.remarks}
                      onChange={e => setWalkin(w => ({ ...w, remarks: e.target.value }))} />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="glass-btn glass-btn-primary"
                    style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    {saving
                      ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Checking in…</>
                      : <><UserPlus size={17} /> Check-in to Room {selectedRoom.room_number}</>
                    }
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </button>
                </form>
              )}

              {/* ─── Maintenance panel ─── */}
              {panel === 'maintenance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Log a maintenance issue to block Room {selectedRoom.room_number} from new bookings.
                  </p>
                  <form onSubmit={createMaintenanceTicket} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="glass-input"
                      placeholder="Describe issue (e.g. AC not working, leaking tap)"
                      value={maintenanceIssue}
                      onChange={e => setMaintenanceIssue(e.target.value)}
                      style={{ flex: 1 }}
                      disabled={permission === 'read'}
                    />
                    <button type="submit" className="glass-btn" disabled={permission === 'read'}
                      style={{ whiteSpace: 'nowrap', borderColor: '#ef4444', color: '#ef4444' }}>
                      <Wrench size={15} /> Block Room
                    </button>
                  </form>

                  {/* Active tickets for this room */}
                  {openTickets.filter(t => t.room_id === selectedRoom.id || t.room_number === selectedRoom.room_number).map(tk => (
                    <div key={tk.id} style={{
                      padding: '12px 14px', borderRadius: 'var(--r-md)',
                      background: '#fef2f2', border: '1.5px solid #fca5a5',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.855rem', color: '#b91c1c' }}>{tk.issue}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Opened: {new Date(tk.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button onClick={() => resolveTicket(tk.id)} className="glass-btn"
                        disabled={permission === 'read'}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px', borderColor: '#10b981', color: '#059669', whiteSpace: 'nowrap' }}>
                        <CheckCircle size={13} /> Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Global maintenance tickets ── */}
      {openTickets.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={17} style={{ color: 'var(--danger)' }} />
            Open Maintenance Tickets ({openTickets.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {openTickets.map(tk => (
              <div key={tk.id} style={{
                padding: '12px 16px', borderRadius: 'var(--r-md)',
                background: '#fef2f2', border: '1.5px solid #fca5a5',
                borderLeft: '4px solid #ef4444',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#b91c1c', fontSize: '0.9rem' }}>
                    Room {tk.room_number}
                  </span>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{tk.issue}</p>
                </div>
                <button
                  onClick={() => resolveTicket(tk.id)}
                  className="glass-btn"
                  disabled={permission === 'read'}
                  style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '5px', borderColor: '#10b981', color: '#059669', whiteSpace: 'nowrap' }}
                >
                  <CheckCircle size={13} /> Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
