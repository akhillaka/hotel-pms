import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search, AlertOctagon, History, Ban, CheckCircle,
  Phone, User, Calendar, Star, TrendingUp, Clock,
  X, ChevronRight, BedDouble, ShieldOff, Shield, RefreshCw, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/* ── Avatar initials ── */
const Avatar = ({ name, size = 40 }) => {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 200;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},60%,92%)`,
      border: `2px solid hsl(${hue},60%,80%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.35,
      color: `hsl(${hue},50%,35%)`,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

/* ── Stat chip ── */
const StatChip = ({ label, value, color = 'var(--primary)', bg = '#eef2ff' }) => (
  <div style={{ background: bg, borderRadius: 'var(--r-md)', padding: '12px 16px', minWidth: 100 }}>
    <div style={{ fontSize: '1.3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
  </div>
);

export default function Guests({ user, permission }) {
  const [guests, setGuests]             = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [history, setHistory]           = useState(null);
  const [histLoading, setHistLoading]   = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [activeTab, setActiveTab]       = useState('stays');

  const fetchGuests = useCallback(async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get(`/api/guests?mobile=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuests(res.data);
    } catch { toast.error('Failed to load guest database'); }
  }, [searchQuery]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const selectGuest = async (guest) => {
    setSelectedGuest(guest);
    setHistory(null);
    setBlacklistReason('');
    setActiveTab('stays');
    setHistLoading(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get(`/api/guests/${guest.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch { toast.error('Failed to load guest history'); }
    finally { setHistLoading(false); }
  };

  const handleBlacklistToggle = async (isBlacklisting) => {
    if (isBlacklisting && !blacklistReason.trim()) {
      return toast.error('Blacklist reason is required');
    }
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/guests/${selectedGuest.id}/blacklist`, {
        is_blacklisted: isBlacklisting ? 1 : 0,
        blacklist_reason: isBlacklisting ? blacklistReason : '',
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(isBlacklisting ? '🚫 Guest blacklisted' : '✅ Blacklist revoked');
      const updated = { ...selectedGuest, is_blacklisted: isBlacklisting ? 1 : 0, blacklist_reason: isBlacklisting ? blacklistReason : null };
      setSelectedGuest(updated);
      setBlacklistReason('');
      fetchGuests();
    } catch (err) { toast.error(err.response?.data?.error || 'Action failed'); }
  };

  const canManageBlacklist = ['Admin', 'Manager'].includes(user.role) && permission !== 'read';

  /* ── derived stats ── */
  const stays        = history?.stays || [];
  const totalSpent   = history?.totalSpent || 0;
  const outstanding  = history?.outstanding || 0;
  const completedStays = stays.filter(s => s.status === 'Checked Out').length;
  const lastStay     = stays.find(s => s.status === 'Checked Out');

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Guest CRM</h1>
          <p className="page-subtitle">Guest directory, stay history &amp; blacklist registry</p>
        </div>
        <button onClick={fetchGuests} className="btn btn-default btn-sm">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="filter-bar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <Search size={14} className="search-icon" />
          <input
            type="search"
            placeholder="Search by name or mobile number…"
            className="input"
            style={{ paddingLeft: 32 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {guests.length} guest{guests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Two-column layout on wider screens ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedGuest ? '1fr 1.4fr' : '1fr', gap: '16px', alignItems: 'start' }}>

        {/* ── Guest list ── */}
        <div style={{
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
        }}>
          {guests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <User size={36} style={{ margin: '0 auto 12px', color: '#d1d9e6' }} />
              No guests found
            </div>
          ) : (
            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {guests.map((guest, i) => {
                const isSelected = selectedGuest?.id === guest.id;
                return (
                  <button
                    key={guest.id}
                    onClick={() => selectGuest(guest)}
                    style={{
                      width: '100%', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isSelected ? '#eef2ff' : 'transparent',
                      borderBottom: i < guests.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={guest.name} size={38} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                          {guest.name}
                        </span>
                        {guest.is_blacklisted ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Blacklisted</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Active</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={11} /> {guest.mobile}
                      </div>
                    </div>
                    <ChevronRight size={15} style={{ color: isSelected ? 'var(--primary)' : '#d1d9e6', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Guest profile panel ── */}
        {selectedGuest && (
          <div style={{
            background: '#fff', border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
            animation: 'fadeIn 0.2s ease both',
          }}>

            {/* Profile header */}
            <div style={{
              padding: '20px', background: 'linear-gradient(135deg, #0f1117, #1e2030)',
              display: 'flex', alignItems: 'flex-start', gap: '14px',
            }}>
              <Avatar name={selectedGuest.name} size={52} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedGuest.name}</span>
                  {selectedGuest.is_blacklisted
                    ? <span className="badge badge-danger">🚫 Blacklisted</span>
                    : <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>✓ Clean Record</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} /> {selectedGuest.mobile}
                  </span>
                  {selectedGuest.id_type && (
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={11} /> {selectedGuest.id_type} · {selectedGuest.id_number || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedGuest(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Stats row */}
            {histLoading ? (
              <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--r-md)', flex: 1 }} />)}
              </div>
            ) : history && (
              <div style={{ padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                <StatChip label="Total Stays"    value={stays.length}                color="#6366f1" bg="#eef2ff" />
                <StatChip label="Completed"      value={completedStays}              color="#059669" bg="#d1fae5" />
                <StatChip label="Total Spent"    value={`₹${fmt(totalSpent)}`}       color="#d97706" bg="#fef3c7" />
                <StatChip label="Outstanding"    value={`₹${fmt(outstanding)}`}      color={outstanding > 0 ? '#dc2626' : '#059669'} bg={outstanding > 0 ? '#fee2e2' : '#d1fae5'} />
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)' }}>
              {[
                { id: 'stays',     icon: <History size={14}/>,    label: 'Stay History' },
                { id: 'documents', icon: <Camera size={14}/>,     label: 'Documents & IDs' },
                { id: 'blacklist', icon: <AlertOctagon size={14}/>, label: 'Blacklist'  },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  flex: 1, padding: '11px 8px', fontSize: '0.82rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  borderBottom: `2.5px solid ${activeTab === t.id ? '#6366f1' : 'transparent'}`,
                  color: activeTab === t.id ? '#6366f1' : 'var(--text-muted)',
                  transition: 'all 0.13s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto' }}>

              {/* ── Stay History tab ── */}
              {activeTab === 'stays' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {histLoading ? (
                    [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 'var(--r-md)' }} />)
                  ) : stays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <BedDouble size={32} style={{ margin: '0 auto 10px', color: '#d1d9e6' }} />
                      No past stays on record
                    </div>
                  ) : stays.map(stay => {
                    const cin  = new Date(stay.check_in_datetime);
                    const cout = new Date(stay.check_out_datetime);
                    const nights = Math.max(1, Math.round((cout - cin) / 86400000));
                    const isDone = stay.status === 'Checked Out';
                    return (
                      <div key={stay.id} style={{
                        padding: '12px 14px', borderRadius: 'var(--r-md)',
                        border: '1.5px solid var(--border)',
                        borderLeft: `4px solid ${isDone ? '#10b981' : '#6366f1'}`,
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: isDone ? '#fafffe' : '#fafbff',
                        transition: 'box-shadow 0.15s ease',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 'var(--r-sm)',
                          background: isDone ? '#d1fae5' : '#eef2ff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', flexShrink: 0,
                        }}>
                          {isDone ? '✅' : '🛏️'}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.855rem', fontFamily: 'var(--font-mono)' }}>
                              {stay.reservation_number}
                            </span>
                            {stay.room_number && (
                              <span style={{ fontSize: '0.68rem', background: '#f0f2f7', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Rm {stay.room_number}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={10} />
                              {cin.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} />
                              {nights}N
                            </span>
                          </div>
                        </div>
                        <span className={`badge ${isDone ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.62rem' }}>
                          {stay.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Documents tab ── */}
              {activeTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Verified ID documents scanned and logged during check-in.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--r-md)', padding: '20px', textAlign: 'center', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
                      <Camera size={24} style={{ color: 'var(--text-faint)', marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)' }}>ID Front Photo</div>
                      {selectedGuest.id_front_url ? (
                        <img src={selectedGuest.id_front_url} alt="ID Front" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', marginTop: '10px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>No front document scan found</div>
                      )}
                    </div>
                    
                    <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--r-md)', padding: '20px', textAlign: 'center', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
                      <Camera size={24} style={{ color: 'var(--text-faint)', marginBottom: '8px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-2)' }}>ID Back Photo</div>
                      {selectedGuest.id_back_url ? (
                        <img src={selectedGuest.id_back_url} alt="ID Back" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', marginTop: '10px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>No back document scan found</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Blacklist tab ── */}
              {activeTab === 'blacklist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {selectedGuest.is_blacklisted ? (
                    /* Currently blacklisted */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '14px 16px', borderRadius: 'var(--r-md)',
                        background: '#fef2f2', border: '1.5px solid #fca5a5',
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                      }}>
                        <Ban size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.9rem' }}>This guest is blacklisted</div>
                          <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>
                            Reason: {selectedGuest.blacklist_reason || 'No reason recorded'}
                          </div>
                        </div>
                      </div>
                      {canManageBlacklist ? (
                        <button onClick={() => handleBlacklistToggle(false)} className="glass-btn"
                          style={{ gap: '6px', borderColor: '#10b981', color: '#059669' }}>
                          <CheckCircle size={15} /> Revoke Blacklist (Audit entry will be created)
                        </button>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Only Admin / Manager can revoke blacklisting.
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Not blacklisted */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px 14px', borderRadius: 'var(--r-md)',
                        background: '#d1fae5', border: '1.5px solid #6ee7b7',
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#065f46',
                      }}>
                        <ShieldOff size={15} style={{ flexShrink: 0 }} />
                        Guest has a clean record. All booking channels are open.
                      </div>

                      {canManageBlacklist ? (
                        <>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Blacklisting prevents this guest from being checked in on all booking channels.
                            An audit log entry will be created automatically.
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="State reason for blacklisting (required)…"
                              className="glass-input"
                              value={blacklistReason}
                              onChange={e => setBlacklistReason(e.target.value)}
                            />
                            <button
                              onClick={() => handleBlacklistToggle(true)}
                              className="glass-btn glass-btn-danger"
                              style={{ whiteSpace: 'nowrap', gap: '5px' }}
                              disabled={!blacklistReason.trim()}
                            >
                              <Ban size={14} /> Blacklist
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Only Admin / Manager can blacklist guests.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
