import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Bed, Users, FileText, MessageSquare,
  TrendingUp, Settings, FileSearch, LogOut, Plug, Sparkles,
  ChevronRight, DollarSign, Bell, Plus,
  PanelLeftClose, PanelLeftOpen, Calendar, X, Home, Shield
} from 'lucide-react';

import './App.css';
import './index.css';
import DevPanel from './components/DevPanel';
import MobileShell from './components/MobileShell';
import NotificationPanel from './components/NotificationPanel';
import BookingForm from './components/BookingForm';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import RoomBoard from './views/RoomBoard';
import Guests from './views/Guests';
import Billing from './views/Billing';
import Communications from './views/Communications';
import Reports from './views/Reports';
import Admin from './views/Admin';
import Audit from './views/Audit';
import Integrations from './views/Integrations';
import Housekeeping from './views/Housekeeping';
import MoneyManager from './views/MoneyManager';
import Reservations from './views/Reservations';
import Approvals from './views/Approvals';
import { toastOpts } from './utils/helpers';

/* ─── Navigation config ─── */
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      Icon: LayoutDashboard, alertKey: 'alerts'  },
  { id: 'reservations', label: 'Reservations',   Icon: Calendar,        alertKey: null       },
  { id: 'rooms',        label: 'Room Board',      Icon: Bed,             alertKey: null       },
  { id: 'housekeeping', label: 'Housekeeping',    Icon: Sparkles,        alertKey: 'dirty'   },
  { id: 'guests',       label: 'Guests',          Icon: Users,           alertKey: null       },
  { id: 'billing',      label: 'Folio & Billing', Icon: FileText,        alertKey: null       },
  { id: 'transactions', label: 'Money Manager',   Icon: DollarSign,      alertKey: null       },
  { id: 'chat',         label: 'Communications',  Icon: MessageSquare,   alertKey: null       },
  { id: 'reports',      label: 'Reports',         Icon: TrendingUp,      alertKey: null       },
];

const ADMIN_ITEMS = [
  { id: 'approvals',    label: 'Approvals',       Icon: Shield,     alertKey: null },
  { id: 'admin',        label: 'Settings',        Icon: Settings,   alertKey: null },
  { id: 'integrations', label: 'Integrations',    Icon: Plug,       alertKey: null },
  { id: 'audit',        label: 'Audit Logs',      Icon: FileSearch, alertKey: null },
];

const PAGE_TITLES = {
  dashboard:    'Operations Dashboard',
  reservations: 'Reservations Center',
  rooms:        'Room Board',
  housekeeping: 'Housekeeping',
  guests:       'Guest Management',
  billing:      'Folio & Billing',
  transactions: 'Money Manager',
  chat:         'Communications',
  reports:      'Reports & Analytics',
  admin:        'Settings & Admin',
  integrations: 'Integrations',
  audit:        'Audit Logs',
  approvals:    'Override Approvals',
};

export default function App() {
  const [user, setUser]               = useState(null);
  const [activeView, setActiveView]   = useState('dashboard');
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 1024);
  const [preselectedRes, setPreselectedRes] = useState(null);

  /* Sidebar */
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('pms_sidebar_collapsed') === 'true'
  );

  /* Notifications */
  const [showNotif, setShowNotif] = useState(false);
  const [alerts, setAlerts]       = useState([]);
  const [dashSummary, setDashSummary] = useState(null);
  const notifRef = useRef(null);

  /* New Booking FAB modal */
  const [showFabBooking, setShowFabBooking] = useState(false);
  const [fabRoomTypes, setFabRoomTypes]     = useState([]);
  const [fabRatePlans, setFabRatePlans]     = useState([]);

  /* Persist sidebar collapse */
  useEffect(() => {
    localStorage.setItem('pms_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  /* Close notif panel on outside click */
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotif]);

  /* Fetch dashboard alerts */
  const fetchAlerts = useCallback(async () => {
    const token = localStorage.getItem('pms_token');
    if (!token) return;
    try {
      const res = await axios.get('/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      setDashSummary(data);
      const newAlerts = [];
      if (data.overdue_checkouts > 0)
        newAlerts.push({ id: 'oc', type: 'danger',  text: `${data.overdue_checkouts} guest(s) are past check-out time` });
      if (data.due_today_arrivals > 0)
        newAlerts.push({ id: 'ar', type: 'arrival', text: `${data.due_today_arrivals} arrival(s) expected today` });
      if (data.dirty_rooms > 0)
        newAlerts.push({ id: 'dr', type: 'clean',   text: `${data.dirty_rooms} room(s) need housekeeping` });
      if (data.maintenance_rooms > 0)
        newAlerts.push({ id: 'mt', type: 'warning', text: `${data.maintenance_rooms} room(s) under maintenance` });
      if (data.pending_checkouts > 0)
        newAlerts.push({ id: 'pc', type: 'info',    text: `${data.pending_checkouts} guest(s) due to check out` });
      setAlerts(newAlerts);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user, fetchAlerts]);

  const [propertySettings, setPropertySettings] = useState({ name: 'Akhil Residency', logo_url: '' });

  const fetchPropertySettings = async () => {
    try {
      const res = await axios.get('/api/property/public');
      if (res.data) {
        setPropertySettings({
          name: res.data.name || 'Akhil Residency',
          logo_url: res.data.logo_url || ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch public property settings:', err);
    }
  };

  useEffect(() => {
    fetchPropertySettings();
  }, []);

  /* Resize handler */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Session check */
  const checkSession = async () => {
    const token = localStorage.getItem('pms_token');
    if (!token) return;
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('pms_token');
      setUser(null);
    }
  };
  useEffect(() => { checkSession(); }, []);

  /* Load room types and rate plans for FAB booking form */
  const loadFabData = useCallback(async () => {
    if (fabRoomTypes.length > 0) return; // already loaded
    const token = localStorage.getItem('pms_token');
    if (!token) return;
    try {
      const [rt, rp] = await Promise.all([
        axios.get('/api/room-types', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setFabRoomTypes(rt.data || []);
      setFabRatePlans(rp.data || []);
    } catch { /* ignore */ }
  }, [fabRoomTypes.length]);

  /* Open FAB booking form */
  const handleFabClick = () => {
    loadFabData();
    setShowFabBooking(true);
  };

  /* Permission helpers */
  const getPermission = (mod) => {
    if (mod === 'approvals') return ['Admin', 'Manager'].includes(user?.role) ? 'write' : 'disabled';
    if (!user?.permissions) return 'disabled';
    if (mod === 'reservations') return user.permissions['rooms'] || 'write';
    return user.permissions[mod] || 'disabled';
  };
  const hasAccess = (mod) => getPermission(mod) !== 'disabled';

  /* Redirect if current view becomes inaccessible */
  useEffect(() => {
    if (user?.permissions && getPermission(activeView) === 'disabled') {
      const all = [...NAV_ITEMS, ...ADMIN_ITEMS];
      const fallback = all.find(v => hasAccess(v.id));
      if (fallback) setActiveView(fallback.id);
    }
  }, [user, activeView]);

  const handleLogout = () => {
    localStorage.removeItem('pms_token');
    setUser(null);
    setActiveView('dashboard');
    setPreselectedRes(null);
  };

  const handleViewFolioFromDashboard = (res) => {
    setPreselectedRes(res);
    setActiveView('billing');
  };

  const navigate = (view) => {
    if (view !== 'billing') setPreselectedRes(null);
    setActiveView(view);
    setShowNotif(false);
  };

  /* ── Auth gate ── */
  if (!user) {
    return (
      <>
        <Toaster position="top-right" toastOptions={toastOpts} />
        <Login onLoginSuccess={(u) => setUser(u)} propertySettings={propertySettings} />
        <DevPanel user={user} onRoleSwitched={(u) => setUser(u)} />
      </>
    );
  }

  /* ── View renderer ── */
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':    return <Dashboard onViewFolio={handleViewFolioFromDashboard} />;
      case 'reservations': return <Reservations user={user} permission={getPermission('reservations')} onViewFolio={handleViewFolioFromDashboard} />;
      case 'rooms':        return <RoomBoard user={user} permission={getPermission('rooms')} onViewFolio={handleViewFolioFromDashboard} />;
      case 'housekeeping': return <Housekeeping user={user} />;
      case 'guests':       return <Guests user={user} permission={getPermission('guests')} />;
      case 'billing':      return (
        <Billing
          user={user}
          permission={getPermission('billing')}
          preselectedRes={preselectedRes}
          onClearPreselected={() => setPreselectedRes(null)}
        />
      );
      case 'transactions': return <MoneyManager user={user} permission={getPermission('transactions')} onViewFolio={handleViewFolioFromDashboard} />;
      case 'chat':         return <Communications />;
      case 'reports':      return <Reports />;
      case 'admin':        return <Admin user={user} permission={getPermission('admin')} onSettingsUpdated={fetchPropertySettings} />;
      case 'approvals':    return <Approvals user={user} permission={getPermission('approvals')} />;
      case 'integrations': return <Integrations />;
      case 'audit':        return <Audit />;
      default:             return <Dashboard onViewFolio={handleViewFolioFromDashboard} />;
    }
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const todayLong = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  const hasDirty    = (dashSummary?.dirty_rooms || 0) > 0;
  const hasAlertsAny = alerts.length > 0;

  /* ── Sidebar nav item ── */
  const SidebarNavItem = ({ id, label, Icon, alertKey }) => {
    const showDot = (alertKey === 'dirty' && hasDirty) || (alertKey === 'alerts' && hasAlertsAny);
    return (
      <button
        onClick={() => navigate(id)}
        className={`sidebar-item ${activeView === id ? 'active' : ''}`}
        aria-current={activeView === id ? 'page' : undefined}
        title={collapsed ? label : undefined}
      >
        <Icon size={16} className="sidebar-item-icon" style={{ flexShrink: 0 }} />
        <span className="sidebar-label">{label}</span>
        {showDot && !collapsed && <span className="sidebar-item-alert" />}
        {showDot && collapsed && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red)',
          }} />
        )}
      </button>
    );
  };

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <>
        <Toaster position="top-right" toastOptions={toastOpts} />
        <DevPanel user={user} onRoleSwitched={(u) => setUser(u)} />
        <MobileShell
          user={user}
          alerts={alerts}
          dashSummary={dashSummary}
          onLogout={handleLogout}
          onViewFolio={handleViewFolioFromDashboard}
          renderDesktopView={() => null}
        />
      </>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <>
      <Toaster position="top-right" toastOptions={toastOpts} />
      <DevPanel user={user} onRoleSwitched={(u) => setUser(u)} />

      {/* ── FAB Booking Modal ── */}
      {showFabBooking && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            width: '100%', maxWidth: 600, maxHeight: '90vh',
            overflowY: 'auto',
            animation: 'fabModalIn 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '20px 20px 0 0',
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                  ➕ New Walk-In / Reservation
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  Create booking directly from the dashboard
                </div>
              </div>
              <button
                onClick={() => setShowFabBooking(false)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 10,
                  padding: '8px', cursor: 'pointer', display: 'flex',
                }}
              >
                <X size={18} color="#475569" />
              </button>
            </div>
            {/* Booking form */}
            <div style={{ padding: '20px 24px 24px' }}>
              <BookingForm
                roomTypes={fabRoomTypes}
                ratePlans={fabRatePlans}
                permission={getPermission('billing')}
                defaultMode="walkin"
                onCancel={() => setShowFabBooking(false)}
                onSuccess={() => {
                  setShowFabBooking(false);
                  navigate('billing');
                  fetchAlerts();
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="app-shell">
        {/* ── Sidebar ── */}
        <nav
          className={`sidebar no-print${collapsed ? ' collapsed' : ''}`}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              {propertySettings.logo_url ? (
                <img src={propertySettings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
              ) : (
                '🏨'
              )}
            </div>
            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name">{propertySettings.name || 'Akhil Residency'}</div>
              <div className="sidebar-brand-sub">Property Management</div>
            </div>
          </div>

          <div className="sidebar-scroll">
            {/* Operations nav */}
            <div className="sidebar-section-label">Operations</div>
            {NAV_ITEMS.filter(item => hasAccess(item.id)).map(({ id, label, Icon, alertKey }) => (
              <SidebarNavItem key={id} id={id} label={label} Icon={Icon} alertKey={alertKey} />
            ))}

            {/* Admin nav */}
            {ADMIN_ITEMS.some(item => hasAccess(item.id)) && (
              <>
                <div className="sidebar-divider" />
                <div className="sidebar-section-label">Administration</div>
                {ADMIN_ITEMS.filter(item => hasAccess(item.id)).map(({ id, label, Icon, alertKey }) => (
                  <SidebarNavItem key={id} id={id} label={label} Icon={Icon} alertKey={alertKey} />
                ))}
              </>
            )}
          </div>

          {/* Collapse toggle */}
          <div style={{ padding: '0 8px 4px' }}>
            <button
              className="sidebar-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <PanelLeftOpen size={15} />
                : <>
                    <span className="sidebar-collapse-label" style={{ fontSize: '0.7rem', fontWeight: 600 }}>Collapse</span>
                    <PanelLeftClose size={15} />
                  </>
              }
            </button>
          </div>

          {/* User footer */}
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
              <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </nav>

        {/* ── Main area ── */}
        <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>

          {/* Top bar */}
          <div className="topbar no-print">
            <div className="topbar-breadcrumb">
              <Home size={13} color="var(--text-muted)" />
              <ChevronRight size={13} />
              <span className="topbar-breadcrumb-active">{PAGE_TITLES[activeView] || activeView}</span>
            </div>
            <div className="topbar-spacer" />

            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Live</span>
            </div>

            <span className="topbar-date">{todayLong}</span>
            <div className="topbar-divider" />

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="topbar-icon-btn"
                onClick={() => setShowNotif(v => !v)}
                title="Notifications"
              >
                <Bell size={15} />
                {alerts.length > 0 && (
                  <span className="notif-badge">{alerts.length > 9 ? '9+' : alerts.length}</span>
                )}
              </button>
              {showNotif && (
                <NotificationPanel alerts={alerts} onClose={() => setShowNotif(false)} />
              )}
            </div>

            {/* User avatar */}
            <div
              className="topbar-avatar"
              title={`${user.name} · ${user.role}`}
            >
              {initials}
            </div>
          </div>

          {/* Page body */}
          <main className="page-body anim-fade-up" role="main" key={activeView}>
            {renderView()}
          </main>
        </div>

        {/* ── FAB: New Walk-In booking ── */}
        <button
          className="fab no-print"
          title="New Walk-In / Reservation"
          onClick={handleFabClick}
          style={{ zIndex: 500 }}
        >
          <Plus size={22} />
        </button>
      </div>

      <style>{`
        @keyframes fabModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
