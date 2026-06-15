import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageCircle, Bot, CreditCard, Save, RefreshCw,
  TestTube, Eye, EyeOff, CheckCircle, AlertCircle,
  Copy, ExternalLink, Zap, Globe, Lock, Info, Activity,
  Settings, Check, Send, Terminal, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const token = () => localStorage.getItem('pms_token');

/* ── Masked Secret Input ── */
const SecretInput = ({ label, value, onChange, placeholder, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="glass-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: '40px', width: '100%', fontFamily: show ? 'inherit' : 'monospace' }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{hint}</p>}
    </div>
  );
};

/* ── Standard Field ── */
const Field = ({ label, value, onChange, placeholder, hint, type = 'text', disabled = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      className="glass-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{ width: '100%' }}
    />
    {hint && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{hint}</p>}
  </div>
);

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('config'); // config, webhooks, logs

  // WhatsApp Config
  const [waToken,       setWaToken]       = useState('');
  const [waPhoneId,     setWaPhoneId]     = useState('');
  const [waLang,        setWaLang]        = useState('en');
  const [waVerifyToken, setWaVerifyToken] = useState('');
  const [waTest,        setWaTest]        = useState('');

  // Telegram Config
  const [tgToken,  setTgToken]  = useState('');
  const [tgChatId, setTgChatId] = useState('');

  // Razorpay Config
  const [rzpKeyId,         setRzpKeyId]         = useState('');
  const [rzpKeySecret,     setRzpKeySecret]     = useState('');
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState('');
  const [rzpMode,          setRzpMode]          = useState('test');

  const [saving,  setSaving]  = useState('');
  const [testing, setTesting] = useState('');

  // Feeds/Logs
  const [waLogs, setWaLogs] = useState([]);
  const [tgLogs, setTgLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const rzpWebhookUrl = `${window.location.origin}/api/razorpay/webhook`;

  // Fetch configs
  const fetchConfigs = async () => {
    try {
      const res = await axios.get('/api/integrations/config', api(token()));
      const d = res.data;
      setWaToken(d.waToken || '');
      setWaPhoneId(d.waPhoneId || '');
      setWaLang(d.waLang || 'en');
      setWaVerifyToken(d.waVerifyToken || '');
      setTgToken(d.tgToken || '');
      setTgChatId(d.tgChatId || '');
      setRzpKeyId(d.rzpKeyId || '');
      setRzpKeySecret(d.rzpKeySecret || '');
      setRzpWebhookSecret(d.rzpWebhookSecret || '');
      setRzpMode(d.rzpMode || 'test');
    } catch {
      toast.error('Failed to load integration settings');
    }
  };

  // Fetch activity logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const [waRes, tgRes] = await Promise.all([
        axios.get('/api/whatsapp/feed', api(token())),
        axios.get('/api/telegram/feed', api(token()))
      ]);
      setWaLogs(waRes.data || []);
      setTgLogs(tgRes.data || []);
    } catch {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const saveSection = async (section, payload) => {
    setSaving(section);
    try {
      await axios.post('/api/integrations/config', payload, api(token()));
      toast.success(`${section} settings saved ✅`);
      fetchConfigs();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving('');
    }
  };

  const testIntegration = async (name, endpoint, body = {}) => {
    setTesting(name);
    try {
      const res = await axios.post(endpoint, body, api(token()));
      toast.success(res.data.message || `${name} connection test passed ✅`);
    } catch (err) {
      toast.error(err.response?.data?.error || `${name} connection test failed ❌`);
    } finally {
      setTesting('');
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard 📋');
  };

  // Status computation for UI indicators
  const isWaConfigured = waToken && waPhoneId;
  const isTgConfigured = tgToken && tgChatId;
  const isRzpConfigured = rzpKeyId && rzpKeySecret;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* ── HEADER ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={28} className="text-primary" />
            Integrations Portal
          </h1>
          <p className="page-subtitle">Configure real-time messaging APIs, staff notifications, and payment gateways.</p>
        </div>
        
        {/* Real-time Status Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', 
            background: isWaConfigured ? 'rgba(37, 211, 102, 0.1)' : 'rgba(100, 116, 139, 0.05)',
            border: `1px solid ${isWaConfigured ? '#25d366' : '#94a3b8'}`,
            color: isWaConfigured ? '#166534' : '#64748b', fontSize: '0.75rem', fontWeight: 600
          }}>
            <MessageCircle size={14} /> WhatsApp: {isWaConfigured ? 'Active' : 'Unconfigured'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', 
            background: isTgConfigured ? 'rgba(33, 150, 243, 0.1)' : 'rgba(100, 116, 139, 0.05)',
            border: `1px solid ${isTgConfigured ? '#2196f3' : '#94a3b8'}`,
            color: isTgConfigured ? '#1e40af' : '#64748b', fontSize: '0.75rem', fontWeight: 600
          }}>
            <Bot size={14} /> Telegram: {isTgConfigured ? 'Active' : 'Unconfigured'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', 
            background: isRzpConfigured ? 'rgba(7, 38, 84, 0.1)' : 'rgba(100, 116, 139, 0.05)',
            border: `1px solid ${isRzpConfigured ? '#072654' : '#94a3b8'}`,
            color: isRzpConfigured ? '#072654' : '#64748b', fontSize: '0.75rem', fontWeight: 600
          }}>
            <CreditCard size={14} /> Razorpay: {isRzpConfigured ? 'Active' : 'Unconfigured'}
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE TABS ── */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px', paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            borderBottom: activeTab === 'config' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'config' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Settings size={16} /> API Configurations
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            borderBottom: activeTab === 'webhooks' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'webhooks' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Globe size={16} /> Webhooks Setup Guide
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          style={{
            background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            borderBottom: activeTab === 'logs' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'logs' ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'all 0.15s ease'
          }}
        >
          <Activity size={16} /> Live Integration Monitor
        </button>
      </div>

      {/* ── TAB CONTENT: CONFIGURATION PANEL ── */}
      {activeTab === 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* WhatsApp API Section */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.05), rgba(255,255,255,1))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25d3661a', color: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>WhatsApp Business Cloud API</h3>
                  <span style={{ fontSize: '0.72rem', color: '#25d366', fontWeight: 600 }}>Guest Automated Notifications</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
                background: isWaConfigured ? '#d1fae5' : '#f1f5f9', color: isWaConfigured ? '#065f46' : '#64748b'
              }}>
                {isWaConfigured ? '🟢 Linked' : '⚪ Standby'}
              </span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: '0.78rem', color: '#166534', display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  Sends guest reservation confirmations, digital keys, invoices, and feedback messages automatically via Meta Business Cloud platform. Set up webhook listener in active channels tab.
                </div>
              </div>

              <SecretInput
                label="System User Access Token"
                value={waToken}
                onChange={setWaToken}
                placeholder="EAAWxxxxxxxxxxxxxxxxxxxx..."
                hint="Generate inside Meta Business Manager → Settings → System Users (give 'whatsapp_business_messaging' access)"
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <Field
                  label="Phone Number ID"
                  value={waPhoneId}
                  onChange={setWaPhoneId}
                  placeholder="108425712395642"
                  hint="Found in WhatsApp Product API Setup in Meta dashboard"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Template Language</label>
                  <select className="glass-input" value={waLang} onChange={e => setWaLang(e.target.value)}>
                    <option value="en">English (en)</option>
                    <option value="en_US">English US (en_US)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="mr">Marathi (mr)</option>
                    <option value="gu">Gujarati (gu)</option>
                    <option value="ta">Tamil (ta)</option>
                    <option value="te">Telugu (te)</option>
                  </select>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Locale matching the approved Meta templates</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
                <Field
                  label="Test Mobile Number"
                  value={waTest}
                  onChange={setWaTest}
                  placeholder="919876543210"
                  hint="Prefix with country code (e.g. 91 for India) without '+'"
                />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={() => saveSection('WhatsApp', { waToken, waPhoneId, waLang })}
                    disabled={saving === 'WhatsApp'}
                    className="glass-btn glass-btn-primary"
                    style={{ flex: 1, gap: '8px', height: '42px' }}
                  >
                    {saving === 'WhatsApp' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Config
                  </button>
                  <button
                    onClick={() => testIntegration('WhatsApp', '/api/integrations/test-whatsapp', { mobile: waTest })}
                    disabled={testing === 'WhatsApp' || !waTest || !isWaConfigured}
                    className="glass-btn"
                    style={{ flex: 1, gap: '8px', height: '42px' }}
                  >
                    {testing === 'WhatsApp' ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                    Send Test Msg
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Alerts Section */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(255,255,255,1))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2196f31a', color: '#2196f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Telegram Alerts Bot</h3>
                  <span style={{ fontSize: '0.72rem', color: '#2196f3', fontWeight: 600 }}>Real-time Internal Staff Notifications</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
                background: isTgConfigured ? '#d1fae5' : '#f1f5f9', color: isTgConfigured ? '#065f46' : '#64748b'
              }}>
                {isTgConfigured ? '🟢 Active' : '⚪ Standby'}
              </span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe',
                fontSize: '0.78rem', color: '#1e40af', display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  Dispatches direct messages or channel broadcasts to hotel managers/owners for new reservations, payments, checkouts, and urgent maintenance updates.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <SecretInput
                  label="Telegram Bot Token"
                  value={tgToken}
                  onChange={setTgToken}
                  placeholder="5839201948:AAFlzk..."
                  hint="Create a bot via Telegram @BotFather to get this token"
                />
                <Field
                  label="Target Chat / Channel ID"
                  value={tgChatId}
                  onChange={setTgChatId}
                  placeholder="-100194857204"
                  hint="Your user ID or a private Group/Channel ID (e.g. prefix with -100)"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
                <button
                  onClick={() => saveSection('Telegram', { tgToken, tgChatId })}
                  disabled={saving === 'Telegram'}
                  className="glass-btn glass-btn-primary"
                  style={{ gap: '8px', height: '42px', minWidth: '150px' }}
                >
                  {saving === 'Telegram' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Config
                </button>
                <button
                  onClick={() => testIntegration('Telegram', '/api/integrations/test-telegram')}
                  disabled={testing === 'Telegram' || !isTgConfigured}
                  className="glass-btn"
                  style={{ gap: '8px', height: '42px', minWidth: '150px' }}
                >
                  {testing === 'Telegram' ? <RefreshCw size={16} className="animate-spin" /> : <TestTube size={16} />}
                  Send Test Alert
                </button>
              </div>
            </div>
          </div>

          {/* Razorpay Gateway Section */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(7, 38, 84, 0.05), rgba(255,255,255,1))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0726541a', color: '#072654', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Razorpay Payment Gateway</h3>
                  <span style={{ fontSize: '0.72rem', color: '#072654', fontWeight: 600 }}>Online Reservation & POS Deposits</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
                background: rzpMode === 'live' ? '#d1fae5' : '#e0e7ff', color: rzpMode === 'live' ? '#065f46' : '#4338ca'
              }}>
                {rzpMode === 'live' ? '🟢 Live Gateway' : '🧪 Sandbox Mode'}
              </span>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '8px', background: '#f5f3ff', border: '1px solid #ddd6fe',
                fontSize: '0.78rem', color: '#5b21b6', display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  Enables instant booking payments, card intakes, and automated folio settlements. Supports UPI, Netbanking, Cards, and wallets.
                </div>
              </div>

              {/* Mode Toggle UI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gateway Transaction Mode</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setRzpMode('test')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid',
                      borderColor: rzpMode === 'test' ? 'var(--primary)' : 'var(--border)',
                      background: rzpMode === 'test' ? 'rgba(99, 102, 241, 0.1)' : '#fff',
                      color: rzpMode === 'test' ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    🧪 Test Sandbox Mode
                  </button>
                  <button
                    onClick={() => setRzpMode('live')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid',
                      borderColor: rzpMode === 'live' ? '#10b981' : 'var(--border)',
                      background: rzpMode === 'live' ? 'rgba(16, 185, 129, 0.1)' : '#fff',
                      color: rzpMode === 'live' ? '#047857' : 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    🟢 Live Production Mode
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <Field
                  label="Razorpay Key ID"
                  value={rzpKeyId}
                  onChange={setRzpKeyId}
                  placeholder={rzpMode === 'test' ? 'rzp_test_xxxxxxx' : 'rzp_live_xxxxxxx'}
                  hint="Required for client checkout load"
                />
                <SecretInput
                  label="Razorpay Key Secret"
                  value={rzpKeySecret}
                  onChange={setRzpKeySecret}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  hint="Required to verify signatures on server"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px dashed var(--border)', paddingTop: '20px' }}>
                <button
                  onClick={() => saveSection('Razorpay', { rzpKeyId, rzpKeySecret, rzpMode })}
                  disabled={saving === 'Razorpay'}
                  className="glass-btn glass-btn-primary"
                  style={{ gap: '8px', height: '42px', minWidth: '150px' }}
                >
                  {saving === 'Razorpay' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Gateway
                </button>
                <button
                  onClick={() => testIntegration('Razorpay', '/api/integrations/test-razorpay')}
                  disabled={testing === 'Razorpay' || !isRzpConfigured}
                  className="glass-btn"
                  style={{ gap: '8px', height: '42px', minWidth: '150px' }}
                >
                  {testing === 'Razorpay' ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  Verify Keys
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB CONTENT: WEBHOOK WEB PORTAL ── */}
      {activeTab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} className="text-primary" />
              Real-time Webhook Synchronization
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Webhooks let external services notify the PMS instantly when an event happens. For example, when a customer pays a deposit online via UPI, Razorpay contacts your webhook URL to automatically approve the reservation status.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* WhatsApp Webhook Display */}
              <div style={{ padding: '16px', borderRadius: '8px', border: '1.5px solid var(--border)', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>WhatsApp Webhook URL</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paste this in the WhatsApp Configuration Webhook Endpoint</span>
                  </div>
                  <button onClick={() => copyText(webhookUrl)} className="glass-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '6px' }}>
                    <Copy size={13} /> Copy URL
                  </button>
                </div>
                <code style={{ display: 'block', padding: '10px', borderRadius: '6px', background: '#0f172a', color: '#38bdf8', fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {webhookUrl}
                </code>
                
                {/* Verify Token verification */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                  <Field
                    label="Verify Token (waVerifyToken)"
                    value={waVerifyToken}
                    onChange={setWaVerifyToken}
                    placeholder="my_pms_secret_verify_token"
                    hint="Define a custom string. Match this string in the Meta App Developer Webhook setup."
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => saveSection('WhatsApp', { waVerifyToken })}
                      disabled={saving === 'WhatsApp'}
                      className="glass-btn glass-btn-primary"
                      style={{ width: '100%', height: '42px', gap: '8px' }}
                    >
                      {saving === 'WhatsApp' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                      Update Token
                    </button>
                  </div>
                </div>
              </div>

              {/* Razorpay Webhook Display */}
              <div style={{ padding: '16px', borderRadius: '8px', border: '1.5px solid var(--border)', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Razorpay Webhook URL</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paste this in Razorpay Dashboard → Settings → Webhooks</span>
                  </div>
                  <button onClick={() => copyText(rzpWebhookUrl)} className="glass-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '6px' }}>
                    <Copy size={13} /> Copy URL
                  </button>
                </div>
                <code style={{ display: 'block', padding: '10px', borderRadius: '6px', background: '#0f172a', color: '#38bdf8', fontSize: '0.8rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {rzpWebhookUrl}
                </code>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                  <SecretInput
                    label="Webhook Signature Secret (optional)"
                    value={rzpWebhookSecret}
                    onChange={setRzpWebhookSecret}
                    placeholder="webhook_secret_from_razorpay_dashboard"
                    hint="Matches webhook signature headers to verify payloads originate from Razorpay securely."
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => saveSection('Razorpay', { rzpWebhookSecret })}
                      disabled={saving === 'Razorpay'}
                      className="glass-btn glass-btn-primary"
                      style={{ width: '100%', height: '42px', gap: '8px' }}
                    >
                      {saving === 'Razorpay' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                      Update Secret
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Integration Guides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><HelpCircle size={16} className="text-primary" /> Meta Webhook Guide</h4>
              <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Log in to developers.facebook.com and go to your app.</li>
                <li>Add the <strong>WhatsApp</strong> product to your app.</li>
                <li>Go to **WhatsApp Configuration** → Click edit webhook.</li>
                <li>Paste your **Webhook URL** and your custom **Verify Token**.</li>
                <li>Subscribe to <code>messages</code> field to receive incoming chat messages in Communications Hub.</li>
              </ol>
            </div>
            
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><HelpCircle size={16} className="text-primary" /> Razorpay Setup</h4>
              <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Log in to Razorpay Dashboard, go to **Settings** → **Webhooks**.</li>
                <li>Click **Add New Webhook** and paste the Webhook URL.</li>
                <li>Set a custom webhook secret and save it here in PMS.</li>
                <li>Enable the <code>payment.captured</code> event in the check list.</li>
                <li>Click save. PMS will automatically process incoming deposit intakes.</li>
              </ol>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB CONTENT: LIVE ACTIVITY MONITOR ── */}
      {activeTab === 'logs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* WhatsApp Logs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={16} style={{ color: '#25d366' }} />
                WhatsApp Message Activity Logs
              </h3>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="glass-btn"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
              </button>
            </div>

            <div style={{ padding: '16px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
              {waLogs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 0', color: 'var(--text-muted)', gap: '10px' }}>
                  <Terminal size={24} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '0.78rem' }}>No WhatsApp logs dispatch captured yet.</span>
                </div>
              ) : (
                waLogs.map(log => (
                  <div key={log.id} style={{
                    padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <span>To: {log.to}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                      {log.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                      <span>Status: DISPATCHED</span>
                      <span style={{ background: '#d1fae5', padding: '1px 6px', borderRadius: '10px' }}>{log.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Telegram Logs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={16} style={{ color: '#2196f3' }} />
                Telegram Alert Bot Feeds
              </h3>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="glass-btn"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
              </button>
            </div>

            <div style={{ padding: '16px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
              {tgLogs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 0', color: 'var(--text-muted)', gap: '10px' }}>
                  <Terminal size={24} style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '0.78rem' }}>No Telegram alert streams captured yet.</span>
                </div>
              ) : (
                tgLogs.map(log => (
                  <div key={log.id} style={{
                    padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.7)',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <span>System Bot Stream</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                      {log.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#1e40af', fontWeight: 700, marginTop: '2px' }}>
                      <span>Channel: BROADCAST</span>
                      <span style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: '10px' }}>Alert Event</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Embedded Dynamic Shimmer Animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
