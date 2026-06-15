import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login({ onLoginSuccess, propertySettings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Please fill in all fields');

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('pms_token', res.data.token);
      onLoginSuccess(res.data.user);
      toast.success(`Welcome back, ${res.data.user.name} 👋`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f1117 0%, #1a1c2e 50%, #0f1117 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Background decorations */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-8%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }} />
      </div>

      {/* Left panel — branding (desktop only) */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'flex-start',
        padding: '64px', gap: '32px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }} className="no-print" id="login-branding">
        <style>{`@media(max-width:900px){#login-branding{display:none!important}}`}</style>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: propertySettings?.logo_url ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
            border: propertySettings?.logo_url ? '1px solid rgba(255,255,255,0.09)' : 'none',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.6rem',
            boxShadow: propertySettings?.logo_url ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
            overflow: 'hidden',
          }}>
            {propertySettings?.logo_url ? (
              <img src={propertySettings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              '🏨'
            )}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              {propertySettings?.name || 'Akhil Residency'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Property Management System
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '380px' }}>
          {[
            { icon: '📊', title: 'Live Operations Dashboard', desc: 'Real-time occupancy, arrivals, departures and revenue at a glance.' },
            { icon: '🛏️', title: 'Room & Housekeeping Board', desc: 'Visual room grid with live status — clean, dirty, occupied, and maintenance.' },
            { icon: '💳', title: 'Folio & Billing Engine', desc: 'Full folio management, GST invoicing, charges, payments and adjustments.' },
          ].map(feat => (
            <div key={feat.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', flexShrink: 0,
              }}>{feat.icon}</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{feat.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', lineHeight: '1.45' }}>{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%', maxWidth: '480px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '40px 36px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Mobile brand (hidden on desktop) */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }} className="no-print" id="login-mobile-brand">
          <style>{`@media(min-width:901px){#login-mobile-brand{display:none!important}}`}</style>
          <div style={{
            width: '56px', height: '56px',
            background: propertySettings?.logo_url ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
            border: propertySettings?.logo_url ? '1px solid rgba(255,255,255,0.09)' : 'none',
            borderRadius: '16px', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.8rem', marginBottom: '14px',
            boxShadow: propertySettings?.logo_url ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
            overflow: 'hidden',
          }}>
            {propertySettings?.logo_url ? (
              <img src={propertySettings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              '🏨'
            )}
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{propertySettings?.name || 'Akhil Residency'}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Property Management System</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              Sign in to continue
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              Enter your staff credentials below
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '7px', letterSpacing: '0.02em' }}>
                USERNAME
              </label>
              <input
                id="pms-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  color: '#fff',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '7px', letterSpacing: '0.02em' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="pms-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    padding: '11px 44px 11px 14px',
                    color: '#fff',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.35)', padding: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                transition: 'all 0.15s ease',
                letterSpacing: '0.02em',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Authenticating...
                </>
              ) : (
                <><LogIn size={17} /> Sign In</>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
              <ShieldAlert size={13} style={{ color: '#f59e0b' }} />
              Use the developer toolbelt (top-right) to switch roles instantly.
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', lineHeight: '1.6' }}>
              <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Demo accounts:</strong><br />
              admin / admin123 &nbsp;·&nbsp; receptionist / recep123
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(30,32,50,0.8) inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
