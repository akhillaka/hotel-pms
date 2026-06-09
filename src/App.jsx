import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Bed,
  Users,
  FileText,
  MessageSquare,
  TrendingUp,
  Settings,
  FileSearch,
  LogOut,
  Hotel,
  Plug,
  Sparkles
} from 'lucide-react';

import './App.css';
import './index.css';
import DevPanel from './components/DevPanel';
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

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      Icon: LayoutDashboard },
  { id: 'rooms',        label: 'Room Board',      Icon: Bed             },
  { id: 'housekeeping', label: 'Housekeeping',  Icon: Sparkles        },
  { id: 'guests',       label: 'Guests',          Icon: Users           },
  { id: 'billing',      label: 'Folio / Billing', Icon: FileText        },
  { id: 'chat',         label: 'Comms',           Icon: MessageSquare   },
  { id: 'reports',      label: 'Reports',         Icon: TrendingUp      },
];

const ADMIN_ITEMS = [
  { id: 'admin',        label: 'Config & Admin', Icon: Settings    },
  { id: 'integrations', label: 'Integrations',   Icon: Plug        },
  { id: 'audit',        label: 'Audit Logs',     Icon: FileSearch  },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [preselectedRes, setPreselectedRes] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('pms_token');
    if (!token) return;
    try {
      const res = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('pms_token');
      setUser(null);
    }
  };

  useEffect(() => { checkSession(); }, []);

  const getPermission = (mod) => {
    if (!user?.permissions) return 'disabled';
    return user.permissions[mod] || 'disabled';
  };

  const hasAccess = (mod) => getPermission(mod) !== 'disabled';

  // Auto-redirect if current view becomes disabled
  useEffect(() => {
    if (user?.permissions) {
      if (getPermission(activeView) === 'disabled') {
        const all = [...NAV_ITEMS, ...ADMIN_ITEMS];
        const fallback = all.find(v => hasAccess(v.id));
        if (fallback) setActiveView(fallback.id);
      }
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
  };

  if (!user) {
    return (
      <div className="container">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e2030', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' } }} />
        <Login onLoginSuccess={(u) => setUser(u)} />
        <DevPanel user={user} onRoleSwitched={(u) => setUser(u)} />
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onViewFolio={handleViewFolioFromDashboard} />;
      case 'rooms':        return <RoomBoard user={user} permission={getPermission('rooms')} />;
      case 'housekeeping': return <Housekeeping user={user} />;
      case 'guests':       return <Guests user={user} permission={getPermission('guests')} />;
      case 'billing':   return (
        <Billing
          user={user}
          permission={getPermission('billing')}
          preselectedRes={preselectedRes}
          onClearPreselected={() => setPreselectedRes(null)}
        />
      );
      case 'chat':         return <Communications />;
      case 'reports':      return <Reports />;
      case 'admin':        return <Admin user={user} permission={getPermission('admin')} />;
      case 'integrations': return <Integrations />;
      case 'audit':        return <Audit />;
      default:             return <Dashboard onViewFolio={handleViewFolioFromDashboard} />;
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e2030',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <DevPanel user={user} onRoleSwitched={(u) => setUser(u)} />

      {isMobile ? (
        /* ── MOBILE LAYOUT ── */
        <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>

          {/* Mobile sticky header */}
          <div className="mobile-header no-print">
            <div className="mobile-header-brand">
              <div className="mobile-header-icon" style={{ color: '#fff' }}>🏨</div>
              <span className="mobile-header-title">PMS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {user.name} · {user.role}
              </span>
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Page content */}
          <div className="mobile-page-content animate-fade-in">
            {renderView()}
          </div>

          {/* Bottom nav bar */}
          <nav className="mobile-nav-bar no-print" role="navigation" aria-label="Main navigation">
            {NAV_ITEMS.filter(item => hasAccess(item.id)).slice(0, 6).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`mobile-nav-item ${activeView === id ? 'active' : ''}`}
                aria-label={label}
                aria-current={activeView === id ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>

      ) : (
        /* ── DESKTOP LAYOUT ── */
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>

          {/* Sidebar */}
          <nav className="desktop-side-nav no-print" role="navigation" aria-label="Sidebar navigation">

            {/* Branding */}
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">🏨</div>
              <div className="sidebar-brand-text">
                <div className="sidebar-brand-name">Antigravity PMS</div>
                <div className="sidebar-brand-role">{user.name} · {user.role}</div>
              </div>
            </div>

            {/* Main nav */}
            <div className="sidebar-section-label">Main</div>
            {NAV_ITEMS.filter(item => hasAccess(item.id)).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`sidebar-nav-item ${activeView === id ? 'active' : ''}`}
                aria-current={activeView === id ? 'page' : undefined}
              >
                <Icon size={17} className="sidebar-nav-icon" />
                {label}
              </button>
            ))}

            {/* Admin nav */}
            {ADMIN_ITEMS.some(item => hasAccess(item.id)) && (
              <>
                <div className="sidebar-divider" style={{ margin: '12px 0 8px' }} />
                <div className="sidebar-section-label">Administration</div>
                {ADMIN_ITEMS.filter(item => hasAccess(item.id)).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    className={`sidebar-nav-item ${activeView === id ? 'active' : ''}`}
                    aria-current={activeView === id ? 'page' : undefined}
                  >
                    <Icon size={17} className="sidebar-nav-icon" />
                    {label}
                  </button>
                ))}
              </>
            )}

            {/* Logout at bottom */}
            <div style={{ flex: 1 }} />
            <div className="sidebar-divider" />
            <button className="sidebar-logout" onClick={handleLogout}>
              <LogOut size={16} />
              Sign Out
            </button>
          </nav>

          {/* Main content */}
          <main className="desktop-main animate-fade-in" role="main">
            {renderView()}
          </main>
        </div>
      )}
    </>
  );
}
