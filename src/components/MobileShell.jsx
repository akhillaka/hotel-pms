import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MobileBookingForm from './MobileBookingForm';
import MobileFolioDetail from './MobileFolioDetail';
import { MobileRoomBoard, MobileHousekeeping, MobileMoneyManager, MobileReservations, MobileReports, MobileAudit } from './MobileViews';
import {
  LayoutDashboard, Bed, Users, MessageSquare, Grid3X3,
  Bell, LogOut, Plus, X, ChevronRight, ChevronLeft,
  Phone, CalendarCheck, AlertTriangle, Sparkles, DollarSign,
  TrendingUp, Settings, Plug, FileSearch, FileText,
  CheckCircle, Clock, Zap, ArrowRight, RefreshCw,
  UserPlus, BedDouble, Wrench, MessageCircle, BarChart3,
  Home, Search, CreditCard, ShieldCheck, IndianRupee,
  LogIn, Wallet, ReceiptText, ChevronDown, ChevronUp,
  Building, Star, Send, Shield
} from 'lucide-react';
import Approvals from '../views/Approvals';

/* ─── HELPERS ─── */
const API = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('pms_token')}` } });
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtCur = (n) => `₹${fmt(n)}`;

/* ─── CONSTANTS ─── */
const MAIN_TABS = ['home', 'folios', 'guests', 'inbox', 'more'];

const MOBILE_TABS = [
  { id: 'home',   label: 'Home',   Icon: Home         },
  { id: 'folios', label: 'Folios', Icon: ReceiptText   },
  { id: 'guests', label: 'Guests', Icon: Users         },
  { id: 'inbox',  label: 'Inbox',  Icon: MessageSquare },
  { id: 'more',   label: 'More',   Icon: Grid3X3       },
];

const VIEW_TITLES = {
  home: 'Home',
  folios: 'Folios & Billing',
  guests: 'Guests',
  inbox: 'Communications',
  more: 'All Modules',
  reservations: 'Reservations',
  rooms: 'Room Board',
  housekeeping: 'Housekeeping',
  transactions: 'Money Manager',
  reports: 'Reports',
  audit: 'Audit Logs',
  chat: 'WhatsApp CRM',
  admin: 'Settings',
  integrations: 'Integrations',
  approvals: 'Override Approvals',
};

const FOLIO_STATUS = {
  'Checked In':  { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', label: 'In-House' },
  'Reserved':    { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1', label: 'Reserved' },
  'Checked Out': { bg: '#f8fafc', text: '#475569', dot: '#94a3b8', label: 'Checked Out' },
};

/* ══════════════════════════════════════════════════════════
   MOBILE HOME
══════════════════════════════════════════════════════════ */
function MobileHome({ user, alerts, dashSummary, navigate, onNewBooking, onQuickCheckIn }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arrivals, setArrivals] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, res] = await Promise.all([
          axios.get('/api/reports/dashboard', API()),
          axios.get('/api/reservations?status=Reserved&limit=5', API()),
        ]);
        setData(dash.data);
        setArrivals((res.data || []).slice(0, 5));
      } catch {}
      setLoading(false);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const QUICK_ACTIONS = [
    { label: 'New Booking',   icon: <Plus size={22} />,          color: '#6366f1', bg: '#eef2ff', action: onNewBooking },
    { label: 'Quick Check-In',icon: <CalendarCheck size={22} />, color: '#10b981', bg: '#ecfdf5', action: onQuickCheckIn },
    { label: 'Room Board',    icon: <Bed size={22} />,            color: '#f59e0b', bg: '#fffbeb', action: () => navigate('rooms') },
    { label: 'Housekeeping',  icon: <Sparkles size={22} />,       color: '#8b5cf6', bg: '#f5f3ff', action: () => navigate('housekeeping') },
    { label: 'Guests',        icon: <Users size={22} />,          color: '#3b82f6', bg: '#eff6ff', action: () => navigate('guests') },
    { label: 'Money',         icon: <DollarSign size={22} />,     color: '#ef4444', bg: '#fef2f2', action: () => navigate('transactions') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '24px 20px 36px', marginTop: -1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {greeting}, {user?.name?.split(' ')[0] || 'Manager'} 👋
            </div>
          </div>
          {alerts.length > 0 && (
            <div style={{ background: '#ef4444', borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Bell size={12} color="#fff" />
              <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>{alerts.length}</span>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
          {[
            { label: 'Occupancy',  value: loading ? '—' : `${Math.round((data?.occupancy?.occupancyRate || data?.occupancy_pct || dashSummary?.occupancy?.occupancyRate || dashSummary?.occupancy_pct || 0))}%`, icon: <BedDouble size={14} />, color: '#a5b4fc' },
            { label: 'In-House',   value: loading ? '—' : (data?.occupancy?.inhouse ?? data?.in_house_guests ?? dashSummary?.occupancy?.inhouse ?? dashSummary?.in_house_guests ?? dashSummary?.in_house ?? '—'),                     icon: <Users size={14} />,     color: '#6ee7b7' },
            { label: "Today's Rev",value: loading ? '—' : fmtCur(data?.financials?.revenueToday ?? data?.revenue_today ?? dashSummary?.financials?.revenueToday ?? dashSummary?.revenue_today),                    icon: <TrendingUp size={14} />, color: '#fcd34d' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 10px', backdropFilter: 'blur(12px)' }}>
              <div style={{ color: s.color, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', marginTop: 4, fontWeight: 600 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div style={{ margin: '16px 16px 0', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c' }}>{alerts[0].text}</div>
            {alerts.length > 1 && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 2 }}>+{alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''}</div>}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 12 }}>QUICK ACTIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {QUICK_ACTIONS.map((a, i) => (
            <button
              key={i}
              onClick={a.action}
              style={{ background: a.bg, border: 'none', borderRadius: 16, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', transition: 'transform 0.1s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ color: a.color }}>{a.icon}</div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Arrivals */}
      <div style={{ padding: '16px 16px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em' }}>UPCOMING ARRIVALS</div>
          <button onClick={() => navigate('reservations')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            See All <ChevronRight size={14} />
          </button>
        </div>
        {arrivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 14, border: '1px dashed #e2e8f0' }}>
            No upcoming arrivals today
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {arrivals.map((r, i) => (
              <div key={r.id || i} onClick={() => navigate('reservations')} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                  {(r.guest_name || r.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.guest_name || r.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Room {r.room_number || 'TBD'} · {r.check_in_date || r.check_in_datetime?.split('T')[0]}</div>
                </div>
                <span style={{ background: '#eef2ff', color: '#4f46e5', fontSize: '0.65rem', fontWeight: 700, padding: '4px 8px', borderRadius: 8, flexShrink: 0 }}>Arriving</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE PAYMENT SHEET
══════════════════════════════════════════════════════════ */
function MobilePaymentSheet({ reservation, folio, onClose, onSuccess }) {
  const balance = folio?.summary?.balance || 0;
  const [amount, setAmount] = useState(String(Math.max(0, balance).toFixed(0)));
  const [method, setMethod] = useState('Cash');
  const [desc, setDesc]     = useState('Payment received');
  const [saving, setSaving] = useState(false);

  const METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer'];
  const METHOD_ICONS = { Cash: '💵', Card: '💳', UPI: '📲', 'Bank Transfer': '🏦' };

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      await axios.post(`/api/folios/${folio.folio.id}/payment`, {
        payment_type: method,
        description: desc || `${method} payment`,
        amount: parseFloat(amount),
      }, API());
      toast.success(`✅ ₹${parseFloat(amount).toLocaleString('en-IN')} collected via ${method}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    }
    setSaving(false);
  };

  const newBalance = balance - parseFloat(amount || 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#f8fafc', borderRadius: '24px 24px 0 0', overflow: 'hidden', animation: 'sheetSlideUp 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>💰 Collect Payment</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>{reservation.guest_name} · Room {reservation.room_number || 'TBD'}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: '20px 16px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Balance due banner */}
          <div style={{ background: balance > 0 ? '#fef2f2' : '#ecfdf5', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${balance > 0 ? '#fca5a5' : '#6ee7b7'}` }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>OUTSTANDING BALANCE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: balance > 0 ? '#dc2626' : '#059669', fontFamily: 'monospace', marginTop: 2 }}>₹{Number(balance).toLocaleString('en-IN')}</div>
            </div>
            {parseFloat(amount) > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>AFTER PAYMENT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: newBalance <= 0 ? '#059669' : '#f59e0b', fontFamily: 'monospace', marginTop: 2 }}>₹{Math.max(0, newBalance).toLocaleString('en-IN')}</div>
              </div>
            )}
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: 8 }}>AMOUNT (₹)</div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: 14, border: '2px solid #6366f1', fontSize: '1.5rem', fontWeight: 800, outline: 'none', background: '#fff', color: '#0f172a', boxSizing: 'border-box', textAlign: 'center', fontFamily: 'monospace' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[balance, Math.round(balance / 2), 500, 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map(v => (
                <button key={v} type="button" onClick={() => setAmount(String(v.toFixed(0)))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                  ₹{Number(v).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: 8 }}>PAYMENT METHOD</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {METHODS.map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  style={{ padding: '10px 4px', borderRadius: 12, border: method === m ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: method === m ? '#eef2ff' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '1.2rem' }}>{METHOD_ICONS[m]}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: method === m ? '#4f46e5' : '#475569' }}>{m}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', marginBottom: 8 }}>DESCRIPTION</div>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Payment note..."
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handlePay}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: saving ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)', color: saving ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(16,185,129,0.3)', marginBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {saving ? 'Processing...' : `✅ Collect ₹${parseFloat(amount || 0).toLocaleString('en-IN')} via ${method}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE FOLIOS
══════════════════════════════════════════════════════════ */
function MobileFolios({ navigate, user, propertySettings }) {
  const [reservations, setReservations] = useState([]);
  const [folioMap, setFolioMap]         = useState({});
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('All');
  const [search, setSearch]             = useState('');
  const [selectedRes, setSelectedRes]   = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);

  const FILTERS = ['All', 'Checked In', 'Reserved', 'Checked Out'];

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/reservations', API());
      setReservations(res.data || []);
      const folios = await Promise.all(
        (res.data || []).map(r =>
          axios.get(`/api/folios/${r.id}`, API())
            .then(f => [r.id, f.data])
            .catch(() => [r.id, null])
        )
      );
      setFolioMap(Object.fromEntries(folios.filter(([, f]) => f)));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = reservations.filter(r => {
    const matchFilter = filter === 'All' || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      r.guest_name?.toLowerCase().includes(q) ||
      r.room_number?.toString().includes(q) ||
      r.reservation_number?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = reservations.filter(r => r.status === s).length;
    return acc;
  }, {});

  const refreshFolio = async (resId) => {
    try {
      const f = await axios.get(`/api/folios/${resId}`, API());
      setFolioMap(prev => ({ ...prev, [resId]: f.data }));
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Payment Sheet */}
      {paymentTarget && (
        <MobilePaymentSheet
          reservation={paymentTarget.res}
          folio={paymentTarget.folio}
          onClose={() => setPaymentTarget(null)}
          onSuccess={() => { setPaymentTarget(null); refreshFolio(paymentTarget.res.id); }}
        />
      )}

      {/* Full Folio Detail */}
      {selectedRes && (
        <MobileFolioDetail
          reservation={selectedRes}
          folioData={folioMap[selectedRes.id]}
          onBack={() => setSelectedRes(null)}
          onRefresh={() => refreshFolio(selectedRes.id)}
          propertySettings={propertySettings}
          user={user}
        />
      )}

      {/* Sticky search + filters */}
      <div style={{ padding: '16px 16px 0', background: '#f4f6fa', position: 'sticky', top: 56, zIndex: 10 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Guest name, room or booking #..."
            style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
          {FILTERS.map(f => {
            const isActive = filter === f;
            const col = FOLIO_STATUS[f];
            return (
              <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', background: isActive ? '#4f46e5' : '#fff', color: isActive ? '#fff' : '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: isActive ? '0 2px 8px rgba(79,70,229,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' }}>
                {col && <div style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.8)' : col.dot }} />}
                {f}{f !== 'All' && <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>({counts[f] || 0})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Folio Cards */}
      <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 100, background: '#fff', borderRadius: 18, animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <ReceiptText size={44} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontWeight: 600 }}>No folios found</div>
          </div>
        ) : (
          filtered.map(res => {
            const sc = FOLIO_STATUS[res.status] || FOLIO_STATUS['Checked Out'];
            const folio = folioMap[res.id];
            const balance = folio?.summary?.balance ?? null;
            const hasBalance = balance !== null && balance > 0;

            return (
              <div key={res.id} onClick={() => setSelectedRes(res)} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${hasBalance ? '#fca5a5' : '#f1f5f9'}`, cursor: 'pointer' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc.text, fontWeight: 800, fontSize: '1rem', flexShrink: 0, border: `1.5px solid ${sc.dot}22` }}>
                    {res.guest_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{res.guest_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: sc.text }}>{sc.label}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3, display: 'flex', gap: 8 }}>
                      <span>Room {res.room_number || 'TBD'}</span>
                      <span>·</span>
                      <span>{res.room_type_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      {balance !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Balance</span>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: hasBalance ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                            ₹{Number(balance).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Folio loading...</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {res.status === 'Checked In' && folio?.folio?.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setPaymentTarget({ res, folio }); }}
                            style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', borderRadius: 10, padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CreditCard size={13} /> Pay
                          </button>
                        )}
                        <ChevronRight size={16} color="#94a3b8" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE GUESTS
══════════════════════════════════════════════════════════ */
function MobileGuests({ navigate }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/guests', API());
        setGuests(res.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = search
    ? guests.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()) || g.mobile?.includes(search))
    : guests;

  const initials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      {/* Guest detail bottom sheet */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '85vh', overflowY: 'auto', animation: 'sheetSlideUp 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
            {/* Sheet header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Guest Profile</div>
              <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: selected.is_blacklisted ? '#fef2f2' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: selected.is_blacklisted ? '#dc2626' : '#4f46e5', flexShrink: 0 }}>
                  {initials(selected.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{selected.name}</div>
                  {selected.is_blacklisted && (
                    <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8, display: 'inline-block', marginTop: 4 }}>⛔ BLACKLISTED</span>
                  )}
                </div>
              </div>

              {/* Info rows */}
              {[
                { label: 'Mobile',      value: selected.mobile },
                { label: 'Email',       value: selected.email },
                { label: 'Gender',      value: selected.gender },
                { label: 'Date of Birth', value: selected.date_of_birth },
                { label: 'Nationality', value: selected.nationality },
                { label: 'ID Type',     value: selected.id_type },
                { label: 'ID Number',   value: selected.id_number },
                { label: 'Address',     value: selected.address },
              ].filter(row => row.value).map((row, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < 7 ? '1px solid #f8fafc' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}

              {selected.remarks && (
                <div style={{ marginTop: 16, background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>REMARKS</div>
                  <div style={{ fontSize: '0.85rem', color: '#78350f' }}>{selected.remarks}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or mobile..."
          style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 14, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
        />
      </div>

      {!loading && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 12 }}>
          {filtered.length} GUEST{filtered.length !== 1 ? 'S' : ''}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 70, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <Users size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
          <div>No guests found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((g, i) => (
            <div
              key={g.id}
              onClick={() => setSelected(g)}
              style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: `1px solid ${g.is_blacklisted ? '#fca5a5' : '#f1f5f9'}`, cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: g.is_blacklisted ? '#fef2f2' : `hsl(${(i * 47) % 360}, 70%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: g.is_blacklisted ? '#dc2626' : `hsl(${(i * 47) % 360}, 50%, 40%)`, flexShrink: 0 }}>
                {initials(g.name)}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>{g.mobile || 'No mobile'}</span>
                  {g.id_type && <><span>·</span><span>{g.id_type}</span></>}
                </div>
              </div>
              {g.is_blacklisted ? (
                <span style={{ background: '#fef2f2', color: '#b91c1c', fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 8, flexShrink: 0 }}>⛔ BLOCKED</span>
              ) : (
                <ChevronRight size={16} color="#cbd5e1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE INBOX
══════════════════════════════════════════════════════════ */
function MobileInbox({ navigate }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/whatsapp/conversations', API());
        setConvs(res.data || []);
      } catch (err) {
        if (err.response?.status === 404) {
          // Try /api/whatsapp/feed as fallback
          try {
            const feed = await axios.get('/api/whatsapp/feed', API());
            const msgs = feed.data || [];
            const unique = [...new Map(msgs.map(m => [m.mobile, m])).values()];
            setConvs(unique);
          } catch {
            setFailed(true);
          }
        } else {
          setFailed(true);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const openConv = async (conv) => {
    setActiveConv(conv);
    try {
      const mobile = conv.mobile || conv.contact;
      const res = await axios.get(`/api/whatsapp/messages?mobile=${mobile}`, API());
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    const mobile = activeConv?.mobile || activeConv?.contact;
    setSending(true);
    try {
      await axios.post('/api/whatsapp/send', { to: mobile, message: msgText.trim() }, API());
      setMsgText('');
      setMessages(prev => [...prev, { type: 'Hotel', message: msgText.trim(), created_at: new Date().toISOString() }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    }
    setSending(false);
  };

  const unread = convs.filter(c => c.type === 'Guest Reply').length;

  // Conversation detail view
  if (activeConv) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 56px)' }}>
        {/* Conv header */}
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setActiveConv(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} color="#475569" />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 800, fontSize: '0.9rem' }}>
            {(activeConv.mobile || activeConv.contact || '??').slice(-2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>+{activeConv.mobile || activeConv.contact}</div>
            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>● WhatsApp</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f0fdf4' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px', fontSize: '0.85rem' }}>No messages yet</div>
          ) : (
            messages.map((m, i) => {
              const isHotel = m.type === 'Hotel' || m.direction === 'outbound';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isHotel ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '78%', background: isHotel ? '#4f46e5' : '#fff', color: isHotel ? '#fff' : '#0f172a', borderRadius: isHotel ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: '0.88rem', lineHeight: 1.4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {m.message || m.text}
                    <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <input
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
          />
          <button
            onClick={sendMsg}
            disabled={sending || !msgText.trim()}
            style={{ width: 46, height: 46, borderRadius: '50%', background: sending || !msgText.trim() ? '#e2e8f0' : '#25D366', border: 'none', cursor: sending || !msgText.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={18} color={sending || !msgText.trim() ? '#94a3b8' : '#fff'} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em' }}>WHATSAPP INBOX</div>
          {unread > 0 && <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginTop: 2 }}>{unread} unread message{unread > 1 ? 's' : ''}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: failed ? '#94a3b8' : '#10b981' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: failed ? '#94a3b8' : '#10b981' }}>{failed ? 'Offline' : 'Live'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 70, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : failed || convs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MessageCircle size={32} color="#25D366" />
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: 8 }}>
            {failed ? 'WhatsApp Not Connected' : 'No Conversations Yet'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
            {failed
              ? 'Connect your WhatsApp Business account to receive and send messages from this inbox.'
              : 'Messages from your guests will appear here once WhatsApp is connected.'}
          </div>
          {/* Setup guide card */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', marginBottom: 12 }}>📋 Setup Guide</div>
            {[
              'Go to More → Integrations',
              'Configure WhatsApp Business API',
              'Set up webhook URL',
              'Start receiving messages',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5' }}>{i + 1}</div>
                <span style={{ fontSize: '0.82rem', color: '#475569', paddingTop: 2 }}>{step}</span>
              </div>
            ))}
            <button onClick={() => navigate('integrations')} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 12, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Go to Integrations →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {convs.map((c, i) => (
            <div
              key={c.id || i}
              onClick={() => openConv(c)}
              style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: `1px solid ${c.type === 'Guest Reply' ? '#bbf7d0' : '#f1f5f9'}`, cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 800, flexShrink: 0, fontSize: '0.9rem' }}>
                {(c.mobile || c.contact || '??').slice(-2)}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>+{c.mobile || c.contact}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.message || c.last_message || 'Tap to view'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {c.created_at && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                {c.type === 'Guest Reply' && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px #d1fae5' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE MORE
══════════════════════════════════════════════════════════ */
function MobileMore({ user, navigate, onLogout }) {
  const MORE_ITEMS = [
    { id: 'reservations', label: 'Reservations',  Icon: CalendarCheck,  color: '#10b981', bg: '#ecfdf5' },
    { id: 'rooms',        label: 'Room Board',    Icon: BedDouble,      color: '#f59e0b', bg: '#fffbeb' },
    { id: 'transactions', label: 'Money Manager', Icon: DollarSign,     color: '#059669', bg: '#f0fdf4' },
    { id: 'housekeeping', label: 'Housekeeping',  Icon: Sparkles,       color: '#8b5cf6', bg: '#f5f3ff' },
    { id: 'reports',      label: 'Reports',       Icon: BarChart3,      color: '#f59e0b', bg: '#fffbeb' },
    { id: 'chat',         label: 'WhatsApp',      Icon: MessageCircle,  color: '#25D366', bg: '#f0fdf4' },
    { id: 'admin',        label: 'Settings',      Icon: Settings,       color: '#64748b', bg: '#f8fafc' },
    { id: 'integrations', label: 'Integrations',  Icon: Plug,           color: '#3b82f6', bg: '#eff6ff' },
    { id: 'audit',        label: 'Audit Logs',    Icon: FileSearch,     color: '#ef4444', bg: '#fef2f2' },
  ];

  if (['Admin', 'Manager'].includes(user?.role)) {
    MORE_ITEMS.push({ id: 'approvals', label: 'Approvals', Icon: Shield, color: '#f43f5e', bg: '#fff1f2' });
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      {/* User card */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)', borderRadius: 20, padding: '20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{user?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
          <LogOut size={16} />
        </button>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', marginBottom: 12 }}>ALL MODULES</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {MORE_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            style={{ background: item.bg, border: 'none', borderRadius: 16, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'left', transition: 'transform 0.12s' }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ color: item.color, background: '#fff', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <item.Icon size={20} />
            </div>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', lineHeight: 1.3 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   QUICK CHECK-IN SHEET
══════════════════════════════════════════════════════════ */
function QuickCheckInSheet({ onClose }) {
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState({}); // { [id]: true }

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reservations?status=Reserved', API());
      const todayArrivals = (res.data || []).filter(r => {
        const d = r.check_in_datetime ? r.check_in_datetime.split('T')[0] : r.check_in_date;
        return d === today;
      });
      setArrivals(todayArrivals);
    } catch {}
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async (r) => {
    setCheckingIn(prev => ({ ...prev, [r.id]: true }));
    try {
      await axios.post(`/api/reservations/${r.id}/check-in`, {}, API());
      toast.success(`✅ ${r.guest_name} checked in successfully!`);
      setArrivals(prev => prev.filter(a => a.id !== r.id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed. Please try again.');
    }
    setCheckingIn(prev => ({ ...prev, [r.id]: false }));
  };

  const initials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: '24px 24px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'sheetSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>⚡ Quick Check-In</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: 76, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
            </div>
          ) : arrivals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: 6 }}>All caught up!</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No arrivals remaining for today.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', marginBottom: 4 }}>
                {arrivals.length} ARRIVAL{arrivals.length !== 1 ? 'S' : ''} TODAY
              </div>
              {arrivals.map(r => (
                <div key={r.id} style={{ background: '#f8fafc', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                    {initials(r.guest_name)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.guest_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Room {r.room_number || 'TBD'}
                      {r.check_in_datetime && ` · ${new Date(r.check_in_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheckIn(r)}
                    disabled={checkingIn[r.id]}
                    style={{ background: checkingIn[r.id] ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 12, padding: '10px 16px', cursor: checkingIn[r.id] ? 'not-allowed' : 'pointer', color: checkingIn[r.id] ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, boxShadow: checkingIn[r.id] ? 'none' : '0 3px 10px rgba(16,185,129,0.3)' }}
                  >
                    {checkingIn[r.id] ? (
                      <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Checking in...</>
                    ) : (
                      <><CheckCircle size={14} /> Check In</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE COMMUNICATIONS (full-screen WhatsApp CRM)
══════════════════════════════════════════════════════════ */
function MobileCommunications({ navigate }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/whatsapp/conversations', API());
        setConvs(res.data || []);
      } catch (err) {
        if (err.response?.status === 404) {
          try {
            const feed = await axios.get('/api/whatsapp/feed', API());
            const msgs = feed.data || [];
            const unique = [...new Map(msgs.map(m => [m.mobile, m])).values()];
            setConvs(unique);
          } catch {
            setFailed(true);
          }
        } else {
          setFailed(true);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const openConv = async (conv) => {
    setActiveConv(conv);
    try {
      const mobile = conv.mobile || conv.contact;
      const res = await axios.get(`/api/whatsapp/messages?mobile=${mobile}`, API());
      setMessages(res.data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setMessages([]);
    }
  };

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    const mobile = activeConv?.mobile || activeConv?.contact;
    setSending(true);
    try {
      await axios.post('/api/whatsapp/send', { to: mobile, message: msgText.trim() }, API());
      setMsgText('');
      setMessages(prev => [...prev, { type: 'Hotel', message: msgText.trim(), created_at: new Date().toISOString() }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    }
    setSending(false);
  };

  if (activeConv) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 56px)' }}>
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setActiveConv(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} color="#475569" />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 800, fontSize: '0.9rem' }}>
            {(activeConv.mobile || activeConv.contact || '??').slice(-2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>+{activeConv.mobile || activeConv.contact}</div>
            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>● WhatsApp</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f0fdf4' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px', fontSize: '0.85rem' }}>No messages in this conversation</div>
          ) : (
            messages.map((m, i) => {
              const isHotel = m.type === 'Hotel' || m.direction === 'outbound';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isHotel ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '78%', background: isHotel ? '#4f46e5' : '#fff', color: isHotel ? '#fff' : '#0f172a', borderRadius: isHotel ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: '0.88rem', lineHeight: 1.4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {m.message || m.text}
                    <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <input
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#f8fafc' }}
          />
          <button
            onClick={sendMsg}
            disabled={sending || !msgText.trim()}
            style={{ width: 46, height: 46, borderRadius: '50%', background: sending || !msgText.trim() ? '#e2e8f0' : '#25D366', border: 'none', cursor: sending || !msgText.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={18} color={sending || !msgText.trim() ? '#94a3b8' : '#fff'} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 32 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em' }}>CONVERSATIONS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: failed ? '#94a3b8' : '#10b981' }} />
          <span style={{ fontSize: '0.72rem', color: failed ? '#94a3b8' : '#10b981', fontWeight: 600 }}>{failed ? 'Offline' : 'Connected'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: 70, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      ) : failed || convs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MessageCircle size={32} color="#25D366" />
          </div>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
            {failed ? 'WhatsApp Not Connected' : 'No Conversations Yet'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
            Connect your WhatsApp Business account to receive guest messages.
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', marginBottom: 12 }}>📋 Setup Guide</div>
            {['Configure WhatsApp Business API in Integrations', 'Set up Meta webhook callback URL', 'Verify webhook token', 'Start receiving guest messages'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5' }}>{i + 1}</div>
                <span style={{ fontSize: '0.82rem', color: '#475569', paddingTop: 2 }}>{step}</span>
              </div>
            ))}
            <button onClick={() => navigate('integrations')} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 12, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              Go to Integrations →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {convs.map((c, i) => (
            <div
              key={c.id || i}
              onClick={() => openConv(c)}
              style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: `1px solid ${c.type === 'Guest Reply' ? '#bbf7d0' : '#f1f5f9'}`, cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 800, flexShrink: 0, fontSize: '0.9rem' }}>
                {(c.mobile || c.contact || '??').slice(-2)}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>+{c.mobile || c.contact}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.message || c.last_message || 'Tap to view'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {c.created_at && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                {c.type === 'Guest Reply' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px #d1fae5' }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE SETTINGS
══════════════════════════════════════════════════════════ */
function MobileSettings({ navigate }) {
  const [property, setProperty] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prop, tax, pay] = await Promise.allSettled([
          axios.get('/api/settings/property', API()),
          axios.get('/api/taxes', API()),
          axios.get('/api/payment-methods', API()),
        ]);
        if (prop.status === 'fulfilled') setProperty(prop.value.data);
        if (tax.status === 'fulfilled') setTaxes(tax.value.data || []);
        if (pay.status === 'fulfilled') setPayMethods(pay.value.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f8fafc', gap: 12 }}>
      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  if (loading) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: 120, background: '#f1f5f9', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Property Info */}
      {property && (
        <div style={{ background: '#fff', borderRadius: 18, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} color="#4f46e5" />
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Property Info</div>
          </div>
          <InfoRow label="Name"    value={property.name || property.property_name} />
          <InfoRow label="Address" value={property.address} />
          <InfoRow label="City"    value={property.city} />
          <InfoRow label="Phone"   value={property.phone} />
          <InfoRow label="Email"   value={property.email} />
          <InfoRow label="Website" value={property.website} />
          <InfoRow label="GSTIN"   value={property.gstin} />
        </div>
      )}

      {/* Tax Settings */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={18} color="#d97706" />
          </div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Tax Settings</div>
        </div>
        {taxes.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>No taxes configured</div>
        ) : (
          taxes.map((t, i) => (
            <div key={t.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < taxes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>{t.name}</div>
                {t.description && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{t.description}</div>}
              </div>
              <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>{t.rate}%</span>
            </div>
          ))
        )}
      </div>

      {/* Payment Methods */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={18} color="#059669" />
          </div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Payment Methods</div>
        </div>
        {payMethods.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>No payment methods configured</div>
        ) : (
          payMethods.map((m, i) => (
            <div key={m.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < payMethods.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>{m.name || m.type}</div>
              <span style={{ background: m.is_active ? '#ecfdf5' : '#f8fafc', color: m.is_active ? '#059669' : '#94a3b8', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8 }}>
                {m.is_active ? '✓ Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Desktop note */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
          To edit settings, please use the <strong>Desktop version</strong> for full access to all configuration options.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE INTEGRATIONS
══════════════════════════════════════════════════════════ */
function MobileIntegrations({ navigate }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/integrations/config', API());
        setConfig(res.data);
      } catch {
        try {
          const res = await axios.get('/api/integrations', API());
          setConfig(res.data);
        } catch {}
      }
      setLoading(false);
    };
    load();
  }, []);

  const INTEGRATIONS = [
    {
      key: 'whatsapp',
      name: 'WhatsApp (Meta)',
      icon: '💬',
      color: '#25D366',
      bg: '#f0fdf4',
      check: (c) => !!(c?.whatsapp?.phone_number_id || c?.whatsapp?.access_token),
      detail: (c) => c?.whatsapp?.phone_number_id ? `ID: ${c.whatsapp.phone_number_id}` : null,
    },
    {
      key: 'telegram',
      name: 'Telegram Bot',
      icon: '✈️',
      color: '#2AABEE',
      bg: '#eff9ff',
      check: (c) => !!(c?.telegram?.bot_token),
      detail: (c) => c?.telegram?.chat_id ? `Chat ID: ${c.telegram.chat_id}` : null,
    },
    {
      key: 'razorpay',
      name: 'Razorpay',
      icon: '💳',
      color: '#3395FF',
      bg: '#eff6ff',
      check: (c) => !!(c?.razorpay?.key_id || c?.razorpay?.enabled),
      detail: (c) => c?.razorpay?.key_id ? `Key: ${c.razorpay.key_id.slice(0, 12)}...` : null,
    },
    {
      key: 'email',
      name: 'Email (SMTP)',
      icon: '📧',
      color: '#6366f1',
      bg: '#eef2ff',
      check: (c) => !!(c?.email?.smtp_host || c?.email?.host),
      detail: (c) => c?.email?.smtp_host || c?.email?.host ? `Host: ${c.email.smtp_host || c.email.host}` : null,
    },
    {
      key: 'sms',
      name: 'SMS Gateway',
      icon: '📱',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      check: (c) => !!(c?.sms?.api_key || c?.sms?.enabled),
      detail: () => null,
    },
  ];

  return (
    <div style={{ padding: '16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {loading ? (
        [...Array(4)].map((_, i) => <div key={i} style={{ height: 80, background: '#f1f5f9', borderRadius: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />)
      ) : (
        <>
          {INTEGRATIONS.map(integ => {
            const connected = integ.check(config);
            const detail = integ.detail(config);
            return (
              <div key={integ.key} style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${connected ? '#bbf7d0' : '#f1f5f9'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: integ.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                    {integ.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{integ.name}</div>
                    {detail && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{detail}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#94a3b8' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: connected ? '#059669' : '#94a3b8' }}>
                      {connected ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Desktop note */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.5 }}>
              Configure integrations and enter API credentials from the <strong>Desktop version</strong> for security.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN MOBILE SHELL
══════════════════════════════════════════════════════════ */
export default function MobileShell({ user, alerts, dashSummary, onLogout, onViewFolio, renderDesktopView }) {
  const [navStack, setNavStack] = useState(['home']);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showQuickCheckIn, setShowQuickCheckIn] = useState(false);
  const [propertySettings, setPropertySettings] = useState(null);

  /* ── Property settings at shell level ── */
  useEffect(() => {
    axios.get('/api/settings/property', API())
      .then(r => setPropertySettings(r.data))
      .catch(() => {});
  }, []);

  /* ── Navigation ── */
  const activeView = navStack[navStack.length - 1];
  const isMainTab = MAIN_TABS.includes(activeView);

  const navigate = useCallback((view) => {
    if (MAIN_TABS.includes(view)) {
      setNavStack([view]);
    } else {
      setNavStack(prev => [...prev, view]);
    }
  }, []);

  const goBack = useCallback(() => {
    setNavStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  /* ── Content renderer ── */
  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return (
          <MobileHome
            user={user}
            alerts={alerts || []}
            dashSummary={dashSummary}
            navigate={navigate}
            onNewBooking={() => setShowBookingForm(true)}
            onQuickCheckIn={() => setShowQuickCheckIn(true)}
          />
        );
      case 'folios':
        return <MobileFolios navigate={navigate} user={user} propertySettings={propertySettings} />;
      case 'guests':
        return <MobileGuests navigate={navigate} />;
      case 'inbox':
        return <MobileInbox navigate={navigate} />;
      case 'more':
        return <MobileMore user={user} navigate={navigate} onLogout={onLogout} />;
      case 'reservations':
        return <MobileReservations />;
      case 'rooms':
        return <MobileRoomBoard />;
      case 'housekeeping':
        return <MobileHousekeeping />;
      case 'transactions':
        return <MobileMoneyManager />;
      case 'reports':
        return <MobileReports />;
      case 'audit':
        return <MobileAudit />;
      case 'chat':
        return <MobileCommunications navigate={navigate} />;
      case 'admin':
        return <MobileSettings navigate={navigate} />;
      case 'integrations':
        return <MobileIntegrations navigate={navigate} />;
      case 'approvals':
        return <Approvals user={user} permission={['Admin', 'Manager'].includes(user?.role) ? 'write' : 'disabled'} />;
      default:
        return (
          <MobileHome
            user={user}
            alerts={alerts || []}
            dashSummary={dashSummary}
            navigate={navigate}
            onNewBooking={() => setShowBookingForm(true)}
            onQuickCheckIn={() => setShowQuickCheckIn(true)}
          />
        );
    }
  };

  return (
    <>
      {/* Booking form sheet */}
      {showBookingForm && (
        <MobileBookingForm
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => { setShowBookingForm(false); navigate('folios'); }}
        />
      )}

      {/* Quick check-in sheet */}
      {showQuickCheckIn && (
        <QuickCheckInSheet onClose={() => setShowQuickCheckIn(false)} />
      )}

      <div style={{ background: '#f4f6fa', minHeight: '100dvh' }}>
        {/* ── HEADER ── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 300, height: 56, background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
          {isMainTab ? (
            /* Logo + title on main tabs */
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: propertySettings?.logo_url ? 'none' : 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {propertySettings?.logo_url ? (
                  <img src={propertySettings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                ) : (
                  '🏨'
                )}
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.3px' }}>
                {propertySettings?.name || propertySettings?.property_name || 'Akhil Residency'}
              </span>
            </div>
          ) : (
            /* Back button + title on sub-views */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={goBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px', cursor: 'pointer', display: 'flex', WebkitTapHighlightColor: 'transparent' }}>
                <ChevronLeft size={18} color="#475569" />
              </button>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{VIEW_TITLES[activeView] || activeView}</span>
            </div>
          )}

          {/* Right side: bell only on main tabs */}
          {isMainTab && (alerts || []).length > 0 && (
            <div style={{ position: 'relative' }}>
              <button style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '7px', cursor: 'pointer', display: 'flex', color: '#475569', WebkitTapHighlightColor: 'transparent' }}>
                <Bell size={16} />
              </button>
              <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', fontSize: '0.55rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(alerts || []).length}
              </span>
            </div>
          )}
          {/* Empty spacer when no bell */}
          {isMainTab && !(alerts || []).length && <div />}
        </header>

        {/* ── CONTENT ── */}
        <div key={activeView} style={{ animation: 'mobileSlideIn 0.2s ease', paddingBottom: isMainTab ? 0 : 32 }}>
          {renderContent()}
        </div>

        {/* ── BOTTOM TAB BAR (main tabs only) ── */}
        {isMainTab && (
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'calc(60px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid #f1f5f9', display: 'flex', zIndex: 300, boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
            {MOBILE_TABS.map(({ id, label, Icon }) => {
              const isActive = activeView === id;
              return (
                <button
                  key={id}
                  onClick={() => navigate(id)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: '6px 2px', position: 'relative' }}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', top: 6, width: 36, height: 36, borderRadius: 12, background: '#eef2ff', zIndex: -1 }} />
                  )}
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} color={isActive ? '#4f46e5' : '#94a3b8'} style={{ transition: 'transform 0.15s', transform: isActive ? 'translateY(-1px)' : 'none' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#4f46e5' : '#94a3b8', letterSpacing: '0.02em' }}>{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <style>{`
        @keyframes mobileSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
