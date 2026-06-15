import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Sparkles, Trash2, Wrench, CheckCircle, RefreshCcw, X,
  UserPlus, BedDouble, Clock, AlertTriangle, Zap, Coffee,
  Moon, Sun, ChevronRight, User, Phone, Calendar, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import BookingForm from '../components/BookingForm';

/* ─── status meta ─── */
const STATUS_META = {
  'Vacant Clean':  { color: '#059669', bg: '#d1fae5', border: '#6ee7b7', icon: '✅', label: 'Vacant Clean'  },
  'Occupied':      { color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', icon: '🛏️', label: 'Occupied'       },
  'Dirty':         { color: '#92400e', bg: '#fef3c7', border: '#fcd34d', icon: '🧹', label: 'Dirty'          },
  'Maintenance':   { color: '#475569', bg: '#f1f5f9', border: '#94a3b8', icon: '🔧', label: 'Maintenance'    },
  'Reserved':      { color: '#3730a3', bg: '#eef2ff', border: '#a5b4fc', icon: '📋', label: 'Reserved'       },
};

const walkInInit = {
  name: '', mobile: '', stayType: 'night', checkIn: '', checkOut: '',
  adults: 1, children: 0, ratePlanId: '', remarks: '', customRate: ''
};

export default function RoomBoard({ user, permission }) {
  const [roomTypes, setRoomTypes]         = useState([]);
  const [rooms, setRooms]                 = useState([]);
  const [tickets, setTickets]             = useState([]);
  const [ratePlans, setRatePlans]         = useState([]);
  const [reservations, setReservations]   = useState([]);
  const [selectedRoom, setSelectedRoom]   = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [viewMode, setViewMode]           = useState('grid'); // 'grid' | 'timeline'
  const [timelineStart, setTimelineStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [panel, setPanel]                 = useState('actions'); // 'actions' | 'walkin' | 'maintenance' | 'reservation'
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [loading, setLoading]             = useState(true);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [walkin, setWalkin]               = useState(walkInInit);
  const [saving, setSaving]               = useState(false);
  
  // New States for upgraded features
  const [collapsedFloors, setCollapsedFloors] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const panelRef = useRef(null);

  const nowISO = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  };

  const fetchRoomData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const [rmRes, tkRes, rpRes, resRes, rtRes] = await Promise.all([
        axios.get('/api/rooms',       { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/maintenance', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans',  { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reservations', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/room-types',  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRooms(rmRes.data);
      setTickets(tkRes.data);
      setRatePlans(rpRes.data);
      setReservations(resRes.data || []);
      setRoomTypes(rtRes.data || []);
    } catch {
      toast.error('Failed to load room board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoomData(); }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setSelectedRoom(null); setSelectedReservation(null); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openRoom = (rm) => {
    if (bulkMode) {
      toggleRoomSelection(rm.id);
      return;
    }
    setSelectedRoom(rm);
    const activeRes = getActiveReservation(rm);
    if (activeRes) {
      setSelectedReservation(activeRes);
      setPanel('reservation');
    } else {
      setSelectedReservation(null);
      setPanel('actions');
    }
    setMaintenanceIssue('');
    setWalkin({ ...walkInInit, checkIn: nowISO() });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  const openReservation = (res, rm) => {
    setSelectedRoom(rm);
    setSelectedReservation(res);
    setPanel('reservation');
    setMaintenanceIssue('');
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
      setSelectedReservation(null);
      fetchRoomData();
    } catch { toast.error('Failed to update status'); }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (permission === 'read') return toast.error('Read-only access');
    if (selectedRoomIds.length === 0) return toast.error('No rooms selected');
    try {
      const token = localStorage.getItem('pms_token');
      await Promise.all(
        selectedRoomIds.map(id =>
          axios.patch(`/api/rooms/${id}/status`, { status: newStatus }, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      toast.success(`Updated ${selectedRoomIds.length} rooms to ${newStatus}`);
      setSelectedRoomIds([]);
      setBulkMode(false);
      fetchRoomData();
    } catch {
      toast.error('Failed to perform bulk update');
    }
  };

  const toggleRoomSelection = (roomId) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
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
      setSelectedReservation(null);
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

  const shiftTimeline = (days) => {
    setTimelineStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const getActiveReservation = (room) => {
    return reservations.find(
      r => (String(r.room_id) === String(room.id) || String(r.room_number) === String(room.room_number)) &&
           r.status === 'Checked In'
    );
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getNightsRemaining = (res) => {
    if (!res) return 0;
    const now = new Date();
    const cout = new Date(res.check_out_datetime);
    const diff = Math.max(0, Math.ceil((cout - now) / 86400000));
    return diff;
  };

  /* ── derived ── */
  const visibleRooms = filterStatus === 'all'
    ? rooms
    : rooms.filter(r => r.status === filterStatus);

  const roomsByFloor = visibleRooms.reduce((acc, rm) => {
    const floor = rm.floor || 'Floor 1';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(rm);
    return acc;
  }, {});

  const statusCounts = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s] = rooms.filter(r => r.status === s).length;
    return acc;
  }, {});
  
  const openTickets = tickets.filter(tk => tk.status !== 'Resolved');
  const roomPlans   = ratePlans.filter(p => String(p.room_type_id) === String(selectedRoom?.room_type_id));

  // Generate 10 days array
  const timelineDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(timelineStart);
    d.setDate(timelineStart.getDate() + i);
    return d;
  });

  const toggleFloorCollapse = (floor) => {
    setCollapsedFloors(prev => ({ ...prev, [floor]: !prev[floor] }));
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading room inventory…</span>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Room Board</h1>
          <p className="page-subtitle">
            {rooms.length} rooms total &nbsp;&middot;&nbsp; {statusCounts['Occupied'] || 0} occupied &nbsp;&middot;&nbsp; {statusCounts['Vacant Clean'] || 0} available
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          
          {permission !== 'read' && (
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedRoomIds([]);
              }}
              className={`btn ${bulkMode ? 'btn-primary' : 'btn-default'} btn-sm`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckSquare size={14} /> {bulkMode ? 'Cancel Bulk' : 'Bulk Edit'}
            </button>
          )}

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '3px' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px', borderRadius: 'var(--r-sm)', border: 'none', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', background: viewMode === 'grid' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--brand-600)' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--t-fast)'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '6px 12px', borderRadius: 'var(--r-sm)', border: 'none', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', background: viewMode === 'timeline' ? 'var(--surface)' : 'transparent',
                color: viewMode === 'timeline' ? 'var(--brand-600)' : 'var(--text-muted)',
                boxShadow: viewMode === 'timeline' ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--t-fast)'
              }}
            >
              Timeline
            </button>
          </div>

          <button onClick={fetchRoomData} className="btn btn-default btn-sm">
            <RefreshCcw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Bulk Edit Actions Row */}
      {bulkMode && selectedRoomIds.length > 0 && (
        <div className="card animate-fade-up" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--brand-50)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-800)' }}>
            Selected {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''} for status updates
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleBulkStatusChange('Vacant Clean')} className="btn btn-primary btn-sm" style={{ background: '#059669', borderColor: '#059669' }}>
              Mark Clean
            </button>
            <button onClick={() => handleBulkStatusChange('Dirty')} className="btn btn-default btn-sm" style={{ color: '#92400e' }}>
              Mark Dirty
            </button>
            <button onClick={() => handleBulkStatusChange('Maintenance')} className="btn btn-default btn-sm" style={{ color: '#475569' }}>
              Set Out-of-Order
            </button>
          </div>
        </div>
      )}

      {/* ── Status summary pills ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '6px 16px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
            border: '1.5px solid', cursor: 'pointer', transition: 'all 0.13s ease',
            background: filterStatus === 'all' ? 'var(--text)' : 'transparent',
            borderColor: filterStatus === 'all' ? 'var(--text)' : 'var(--border)',
            color: filterStatus === 'all' ? 'var(--surface)' : 'var(--text-muted)',
          }}
        >All ({rooms.length})</button>
        {Object.entries(STATUS_META).map(([status, meta]) => (
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
              {meta.icon} {meta.label} ({statusCounts[status] || 0})
            </button>
        ))}
      </div>

      {/* ── Room layout (Grid vs Timeline) ── */}
      {viewMode === 'timeline' ? (
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Timeline Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              📅 Timeline starting from: <strong>{timelineStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-default btn-sm" onClick={() => shiftTimeline(-3)}>◀ Shift 3 Days</button>
              <button className="btn btn-default btn-sm" onClick={() => setTimelineStart(new Date())}>Today</button>
              <button className="btn btn-default btn-sm" onClick={() => shiftTimeline(3)}>Shift 3 Days ▶</button>
            </div>
          </div>

          {/* Timeline Grid */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '800px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--surface-2)' }}>
                <div style={{ width: '130px', flexShrink: 0, padding: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' }}>
                  Room
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', flex: 1 }}>
                  {timelineDates.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '10px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--brand-600)' : 'var(--text-2)',
                          background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <div>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '2px' }}>{d.toLocaleDateString('en-IN', { day: '2-digit' })}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              {visibleRooms.map(rm => {
                const roomReservations = reservations.filter(
                  r => (String(r.room_id) === String(rm.id) || String(r.room_number) === String(rm.room_number)) &&
                       ['Checked In', 'Reserved', 'Checked Out'].includes(r.status)
                );

                return (
                  <div key={rm.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', position: 'relative', minHeight: '48px', alignItems: 'stretch' }}>
                    {/* Room Info */}
                    <div style={{
                      width: '130px', flexShrink: 0, padding: '10px 12px', borderRight: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--surface-2)', zIndex: 5
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>Room {rm.room_number}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', marginTop: '1px' }}>
                        {rm.room_type_code || rm.room_type_name?.slice(0, 4)}
                      </div>
                    </div>

                    {/* Timeline Grid Cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', flex: 1, position: 'relative' }}>
                      {timelineDates.map((d, i) => {
                        const cellDateStr = d.toISOString().split('T')[0];
                        const cellNextDateStr = new Date(d.getTime() + 86400000).toISOString().split('T')[0];
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedRoom(rm);
                              setSelectedReservation(null);
                              setPanel('walkin');
                              setWalkin({
                                ...walkInInit,
                                checkIn: `${cellDateStr}T12:00`,
                                checkOut: `${cellNextDateStr}T11:00`
                              });
                              setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                            }}
                            style={{
                              borderRight: '1px solid var(--border)', cursor: 'pointer',
                              background: d.toDateString() === new Date().toDateString() ? 'rgba(99,102,241,0.02)' : 'transparent',
                              transition: 'background var(--t-fast)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = d.toDateString() === new Date().toDateString() ? 'rgba(99,102,241,0.02)' : 'transparent'}
                            title="Click to book a quick walk-in"
                          />
                        );
                      })}

                      {/* Reservation Bars Overlaid */}
                      {roomReservations.map(res => {
                        const checkInDate = new Date(res.check_in_datetime);
                        checkInDate.setHours(0, 0, 0, 0);
                        const checkOutDate = new Date(res.check_out_datetime);
                        checkOutDate.setHours(0, 0, 0, 0);

                        // Find indices of overlap nights
                        const occupiedIndices = [];
                        timelineDates.forEach((d, index) => {
                          const dateObj = new Date(d);
                          dateObj.setHours(0, 0, 0, 0);
                          if (dateObj >= checkInDate && dateObj < checkOutDate) {
                            occupiedIndices.push(index);
                          }
                        });

                        if (occupiedIndices.length === 0) return null;

                        const firstIdx = occupiedIndices[0];
                        const lastIdx = occupiedIndices[occupiedIndices.length - 1];
                        const leftPct = firstIdx * 10;
                        const span = lastIdx - firstIdx + 1;
                        const widthPct = span * 10;

                        let barBg = '#eef2ff';
                        let barBorder = '#a5b4fc';
                        let barText = '#3730a3';
                        if (res.status === 'Checked In') {
                          barBg = '#d1fae5';
                          barBorder = '#6ee7b7';
                          barText = '#065f46';
                        } else if (res.status === 'Checked Out') {
                          barBg = '#f1f5f9';
                          barBorder = '#cbd5e1';
                          barText = '#475569';
                        }

                        return (
                          <div
                            key={res.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openReservation(res, rm);
                            }}
                            style={{
                              position: 'absolute', top: '6px', bottom: '6px',
                              left: `${leftPct}%`, width: `${widthPct}%`,
                              background: barBg, border: `1.5px solid ${barBorder}`,
                              color: barText, borderRadius: '6px', zIndex: 10,
                              fontSize: '0.72rem', fontWeight: 700, padding: '0 8px',
                              display: 'flex', alignItems: 'center', cursor: 'pointer',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              boxShadow: 'var(--shadow-xs)', transition: 'transform var(--t-fast)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            title={`${res.guest_name} (${res.status}) · ${res.check_in_datetime.split(' ')[0]} to ${res.check_out_datetime.split(' ')[0]}`}
                          >
                            👤 {res.guest_name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Floor Grouping Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.keys(roomsByFloor).sort().map(floor => {
            const isCollapsed = collapsedFloors[floor];
            const floorRooms = roomsByFloor[floor];
            
            return (
              <div key={floor} className="card" style={{ padding: '16px' }}>
                <div 
                  onClick={() => toggleFloorCollapse(floor)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    marginBottom: isCollapsed ? '0px' : '16px',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                    paddingBottom: isCollapsed ? '0px' : '12px'
                  }}
                >
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                    🏢 Floor {floor} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({floorRooms.length} Rooms)</span>
                  </h2>
                  <ChevronRight 
                    size={18} 
                    style={{ 
                      transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', 
                      transition: 'transform 0.2s', 
                      color: 'var(--text-muted)' 
                    }} 
                  />
                </div>

                {!isCollapsed && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '12px',
                  }}>
                    {floorRooms.map(rm => {
                      const meta = STATUS_META[rm.status] || STATUS_META['Vacant Clean'];
                      const isSelected = selectedRoom?.id === rm.id;
                      const isCheckedInBulk = selectedRoomIds.includes(rm.id);
                      const activeRes = getActiveReservation(rm);
                      
                      return (
                        <div
                          key={rm.id}
                          onMouseEnter={(e) => {
                            if (activeRes) {
                              setHoveredRoomId(rm.id);
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseMove={(e) => {
                            if (activeRes) {
                              setTooltipPos({ x: e.clientX, y: e.clientY });
                            }
                          }}
                          onMouseLeave={() => setHoveredRoomId(null)}
                          onClick={() => openRoom(rm)}
                          style={{
                            padding: '16px 8px 12px',
                            borderRadius: 'var(--r-md)',
                            border: `2px solid ${bulkMode ? (isCheckedInBulk ? 'var(--brand-500)' : 'var(--border)') : (isSelected ? 'var(--brand-500)' : meta.border)}`,
                            background: bulkMode ? (isCheckedInBulk ? 'var(--brand-50)' : 'var(--surface)') : (isSelected ? 'var(--brand-50)' : meta.bg),
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                            position: 'relative',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                            transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                          }}
                        >
                          {/* Bulk Checkbox */}
                          {bulkMode && (
                            <div style={{ position: 'absolute', top: '4px', left: '4px', color: isCheckedInBulk ? 'var(--brand-500)' : 'var(--text-faint)' }}>
                              {isCheckedInBulk ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                          )}

                          {/* Guest Initials Badge */}
                          {activeRes && (
                            <div style={{
                              position: 'absolute', top: '4px', right: '4px',
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: '#fff', border: `1px solid ${meta.border}`,
                              color: meta.color, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800
                            }}>
                              {getInitials(activeRes.guest_name)}
                            </div>
                          )}

                          <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: meta.color }}>
                            {rm.room_number}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: meta.color, opacity: 0.85 }}>
                            {rm.room_type_code || rm.room_type_name?.slice(0, 4)}
                          </span>

                          {/* Rich Interactive Tooltip on Hover */}
                          {activeRes && hoveredRoomId === rm.id && (
                            <div style={{
                              position: 'fixed',
                              left: `${tooltipPos.x + 10}px`,
                              top: `${tooltipPos.y + 10}px`,
                              background: '#1e293b',
                              color: '#fff',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              zIndex: 1000,
                              boxShadow: 'var(--shadow-lg)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ fontWeight: 800 }}>👤 {activeRes.guest_name}</div>
                              <div>📞 {activeRes.guest_mobile}</div>
                              <div>📅 In: {new Date(activeRes.check_in_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                              <div>🌙 {getNightsRemaining(activeRes)} Night(s) Remaining</div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Room action panel ── */}
      {selectedRoom && (() => {
        const meta = STATUS_META[selectedRoom.status] || STATUS_META['Vacant Clean'];
        const canBook = selectedRoom.status === 'Vacant Clean';
        return (
          <div
            ref={panelRef}
            style={{
              background: 'var(--surface)', border: `2px solid ${meta.border}`,
              borderRadius: 'var(--r-lg)', overflow: 'hidden',
              animation: 'fadeUp 0.22s var(--ease) both',
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
                { id: 'reservation', label: '📋 Reservation Details', show: !!selectedReservation },
                { id: 'actions',     label: '⚡ Quick Actions', always: true       },
                { id: 'walkin',      label: '👤 Walk-in',       show: canBook && !selectedReservation },
                { id: 'maintenance', label: '🔧 Maintenance',    show: permission !== 'read' },
              ].filter(t => t.always || t.show).map(t => (
                <button
                  key={t.id}
                  onClick={() => setPanel(t.id)}
                  style={{
                    flex: 1, padding: '11px 8px', fontSize: '0.82rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer', background: 'transparent',
                    borderBottom: `2.5px solid ${panel === t.id ? 'var(--brand-500)' : 'transparent'}`,
                    color: panel === t.id ? 'var(--brand-500)' : 'var(--text-muted)',
                    transition: 'all 0.13s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px' }}>

              {/* ─── Reservation Details panel ─── */}
              {panel === 'reservation' && selectedReservation && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>RESERVATION NO.</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>#{selectedReservation.reservation_number}</div>
                      </div>
                      <span className={`badge badge-${selectedReservation.status === 'Checked In' ? 'green' : selectedReservation.status === 'Reserved' ? 'indigo' : 'slate'}`}>
                        {selectedReservation.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>GUEST NAME</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>{selectedReservation.guest_name}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>PHONE</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>{selectedReservation.guest_mobile}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>CHECK-IN</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>{new Date(selectedReservation.check_in_datetime).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>CHECK-OUT</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>{new Date(selectedReservation.check_out_datetime).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>RATE PLAN</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}>{selectedReservation.rate_plan_name || 'Standard'}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>STAY TYPE</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'capitalize' }}>{selectedReservation.stay_type?.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {selectedReservation.remarks && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-faint)', display: 'block' }}>REMARKS</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedReservation.remarks}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        window.location.hash = `#billing?resId=${selectedReservation.id}`;
                        toast.success('Go to Folio & Billing page to process transactions');
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '10px' }}
                    >
                      💳 Go to Folio & Billing
                    </button>
                  </div>
                </div>
              )}

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
                            background: isActive ? m.bg : 'var(--bg)',
                            cursor: blocked || isActive ? 'not-allowed' : 'pointer',
                            opacity: blocked && !isActive ? 0.45 : 1,
                            display: 'flex', flexDirection: 'column', gap: '6px',
                            alignItems: 'flex-start', textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (!blocked && !isActive) { e.currentTarget.style.borderColor = m.border; e.currentTarget.style.background = m.bg; } }}
                          onMouseLeave={e => { if (!blocked && !isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; } }}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    background: '#eef2ff', border: '1.5px solid #c7d2fe',
                    fontSize: '0.8rem', color: '#3730a3', display: 'flex', gap: '8px', alignItems: 'center',
                  }}>
                    <Zap size={14} />
                    Quick walk-in directly into Room <strong>{selectedRoom.room_number}</strong>. Guest will be checked-in immediately.
                  </div>
                  
                  <BookingForm 
                    onSuccess={() => {
                      fetchRoomData();
                      setSelectedRoom(null);
                    }}
                    roomTypes={roomTypes}
                    ratePlans={roomPlans}
                    permission={permission}
                    defaultMode="walkin"
                    defaultRoomId={selectedRoom.id}
                  />
                </div>
              )}

              {/* ─── Maintenance panel ─── */}
              {panel === 'maintenance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Log a maintenance issue to block Room {selectedRoom.room_number} from new bookings.
                  </p>
                  <form onSubmit={createMaintenanceTicket} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="input"
                      placeholder="Describe issue (e.g. AC not working, leaking tap)"
                      value={maintenanceIssue}
                      onChange={e => setMaintenanceIssue(e.target.value)}
                      style={{ flex: 1 }}
                      disabled={permission === 'read'}
                    />
                    <button type="submit" className="btn btn-default" disabled={permission === 'read'}
                      style={{ whiteSpace: 'nowrap', color: '#ef4444' }}>
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
                      <button onClick={() => resolveTicket(tk.id)} className="btn btn-default btn-xs"
                        disabled={permission === 'read'}
                        style={{ color: '#059669', whiteSpace: 'nowrap' }}>
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

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
        {Object.entries(STATUS_META).map(([s, m]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '3px', background: m.bg, border: `1.5px solid ${m.border}` }} />
            {m.label}
          </div>
        ))}
      </div>

      {/* ── Global maintenance tickets ── */}
      {openTickets.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
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
                  className="btn btn-default btn-sm"
                  disabled={permission === 'read'}
                  style={{ color: '#059669', whiteSpace: 'nowrap' }}
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
