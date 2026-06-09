import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageCircle, Bot, CreditCard, Save, RefreshCw,
  TestTube, Eye, EyeOff, CheckCircle, AlertCircle,
  Copy, ExternalLink, Zap, Globe, Lock, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const token = () => localStorage.getItem('pms_token');

/* ── small masked input ── */
const SecretInput = ({ label, value, onChange, placeholder, hint }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="glass-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: '40px' }}
        />
        <button type="button" onClick={() => setShow(s => !s)} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
        }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  );
};

/* ── Section card ── */
const Section = ({ icon, title, badge, badgeColor = '#6366f1', children, footer }) => (
  <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc' }}>
      <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: `${badgeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: badgeColor }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
        {badge && <div style={{ fontSize: '0.68rem', color: badgeColor, fontWeight: 600 }}>{badge}</div>}
      </div>
    </div>
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {children}
    </div>
    {footer && (
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
        {footer}
      </div>
    )}
  </div>
);

const Field = ({ label, value, onChange, placeholder, hint, type = 'text' }) => (
  <div>
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{label}</label>
    <input type={type} placeholder={placeholder} className="glass-input" value={value} onChange={e => onChange(e.target.value)} />
    {hint && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</p>}
  </div>
);

export default function Integrations() {
  // WhatsApp
  const [waToken,       setWaToken]       = useState('');
  const [waPhoneId,     setWaPhoneId]     = useState('');
  const [waLang,        setWaLang]        = useState('en');
  const [waVerifyToken, setWaVerifyToken] = useState('');
  const [waTest,        setWaTest]        = useState('');

  // Telegram
  const [tgToken,  setTgToken]  = useState('');
  const [tgChatId, setTgChatId] = useState('');

  // Razorpay
  const [rzpKeyId,         setRzpKeyId]         = useState('');
  const [rzpKeySecret,     setRzpKeySecret]     = useState('');
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState('');
  const [rzpMode,          setRzpMode]          = useState('test');

  const [saving,  setSaving]  = useState('');
  const [testing, setTesting] = useState('');

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
  const rzpWebhookUrl = `${window.location.origin}/api/razorpay/webhook`;

  useEffect(() => {
    (async () => {
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
      } catch { toast.error('Failed to load integration settings'); }
    })();
  }, []);

  const saveSection = async (section, payload) => {
    setSaving(section);
    try {
      await axios.post('/api/integrations/config', payload, api(token()));
      toast.success(`${section} settings saved ✅`);
    } catch { toast.error('Save failed'); }
    finally { setSaving(''); }
  };

  const testIntegration = async (name, endpoint, body = {}) => {
    setTesting(name);
    try {
      const res = await axios.post(endpoint, body, api(token()));
      toast.success(res.data.message || `${name} test passed ✅`);
    } catch (err) {
      toast.error(err.response?.data?.error || `${name} test failed`);
    }
    finally { setTesting(''); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); };

  const BtnRow = ({ section, onSave, onTest, testLabel }) => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
      <button onClick={onSave} disabled={saving === section} className="glass-btn glass-btn-primary" style={{ gap: '6px' }}>
        {saving === section
          ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          : <Save size={14} />}
        Save
      </button>
      {onTest && (
        <button onClick={onTest} disabled={testing === section} className="glass-btn" style={{ gap: '6px' }}>
          {testing === section
            ? <div style={{ width: 14, height: 14, border: '2px solid #d1d9e6', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <TestTube size={14} />}
          {testLabel || 'Test Connection'}
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>Integrations</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.855rem', marginTop: '2px' }}>
          Configure WhatsApp, Telegram alerts & Razorpay online payments
        </p>
      </div>

      {/* ── WHATSAPP ── */}
      <Section
        icon={<MessageCircle size={16} />}
        title="WhatsApp Business Cloud API"
        badge="Meta / Facebook Business Platform"
        badgeColor="#25d366"
      >
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#f0fdf4', border: '1.5px solid #bbf7d0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.55 }}>
          <strong>Required:</strong> WhatsApp Business Account → System User Token with <code>whatsapp_business_messaging</code> permission.<br/>
          After saving, set the <strong>Webhook URL</strong> below in Meta App Dashboard → WhatsApp → Configuration.
        </div>

        <SecretInput
          label="Access Token (waToken)"
          value={waToken}
          onChange={setWaToken}
          placeholder="EAAxxxxxxxxxx..."
          hint="System User Token from Meta Business Manager → System Users"
        />
        <Field
          label="Phone Number ID (waPhoneId)"
          value={waPhoneId}
          onChange={setWaPhoneId}
          placeholder="1234567890"
          hint="Found in Meta App Dashboard → WhatsApp → API Setup"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Language Code</label>
            <select className="glass-input" value={waLang} onChange={e => setWaLang(e.target.value)}>
              <option value="en">English (en)</option>
              <option value="en_US">English US (en_US)</option>
              <option value="hi">Hindi (hi)</option>
              <option value="mr">Marathi (mr)</option>
              <option value="gu">Gujarati (gu)</option>
              <option value="ta">Tamil (ta)</option>
              <option value="te">Telugu (te)</option>
            </select>
          </div>
          <Field
            label="Verify Token (waVerifyToken)"
            value={waVerifyToken}
            onChange={setWaVerifyToken}
            placeholder="my_secret_verify_token"
            hint="A string you choose; paste it in Meta webhook setup"
          />
        </div>

        {/* Webhook URL display */}
        <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: '#f8fafc', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            📡 Your Webhook URL — set this in Meta App Dashboard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ flex: 1, fontSize: '0.78rem', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {webhookUrl}
            </code>
            <button onClick={() => copy(webhookUrl)} className="glass-btn" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }}>
              <Copy size={12} /> Copy
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Subscribe to <strong>messages</strong> webhook field. Incoming guest replies will appear in Communications Hub.
          </p>
        </div>

        {/* Test row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Test Mobile (for test ping)" value={waTest} onChange={setWaTest} placeholder="9876543210" />
          </div>
          <BtnRow
            section="WhatsApp"
            onSave={() => saveSection('WhatsApp', { waToken, waPhoneId, waLang, waVerifyToken })}
            onTest={waTest ? () => testIntegration('WhatsApp', '/api/integrations/test-whatsapp', { mobile: waTest }) : undefined}
            testLabel="Send Test"
          />
        </div>
      </Section>

      {/* ── TELEGRAM ── */}
      <Section
        icon={<Bot size={16} />}
        title="Telegram Owner Alerts Bot"
        badge="Real-time notifications to hotel owner/manager"
        badgeColor="#2196f3"
      >
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#eff6ff', border: '1.5px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.55 }}>
          <strong>Setup:</strong> Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: '#2196f3' }}>@BotFather</a> on Telegram → create a bot → copy the token.
          Then message your bot, visit <code>api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> to get your Chat ID.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <SecretInput
            label="Bot Token (tgToken)"
            value={tgToken}
            onChange={setTgToken}
            placeholder="123456789:AAF..."
            hint="From @BotFather"
          />
          <Field
            label="Chat ID (tgChatId)"
            value={tgChatId}
            onChange={setTgChatId}
            placeholder="-100123456789"
            hint="Your personal or group chat ID"
          />
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#f8fafc', border: '1.5px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          🔔 You will receive alerts for: New bookings, Payments received, Guest checkouts, Maintenance issues
        </div>
        <BtnRow
          section="Telegram"
          onSave={() => saveSection('Telegram', { tgToken, tgChatId })}
          onTest={() => testIntegration('Telegram', '/api/integrations/test-telegram')}
          testLabel="Send Test Alert"
        />
      </Section>

      {/* ── RAZORPAY ── */}
      <Section
        icon={<CreditCard size={16} />}
        title="Razorpay Payment Gateway"
        badge="Online payments — UPI, Cards, NetBanking, Wallets"
        badgeColor="#072654"
      >
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: '#eef2ff', border: '1.5px solid #c7d2fe', fontSize: '0.78rem', color: '#3730a3', lineHeight: 1.55 }}>
          <strong>Setup:</strong> Log in to <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>dashboard.razorpay.com</a> →
          Settings → API Keys → Generate Key. Use <strong>Test Mode</strong> keys during development.
        </div>

        {/* Mode toggle */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['test', 'live'].map(m => (
              <button
                key={m}
                onClick={() => setRzpMode(m)}
                style={{
                  padding: '8px 20px', borderRadius: 'var(--r-sm)', border: '1.5px solid',
                  borderColor: rzpMode === m ? (m === 'live' ? '#059669' : '#6366f1') : 'var(--border)',
                  background: rzpMode === m ? (m === 'live' ? '#d1fae5' : '#eef2ff') : '#fff',
                  color: rzpMode === m ? (m === 'live' ? '#065f46' : '#3730a3') : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.13s ease',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {m === 'live' ? '🟢' : '🧪'} {m.charAt(0).toUpperCase() + m.slice(1)} Mode
              </button>
            ))}
          </div>
          {rzpMode === 'live' && (
            <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} /> Live mode charges real money. Ensure compliance with RBI regulations.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field
            label={`Key ID (rzp${rzpMode === 'live' ? 'Live' : 'Test'}_key)`}
            value={rzpKeyId}
            onChange={setRzpKeyId}
            placeholder={rzpMode === 'test' ? 'rzp_test_xxxxxxxxxxxx' : 'rzp_live_xxxxxxxxxxxx'}
            hint="Public key — safe to use in frontend checkout"
          />
          <SecretInput
            label="Key Secret"
            value={rzpKeySecret}
            onChange={setRzpKeySecret}
            placeholder="xxxxxxxxxxxxxxxxxxxx"
            hint="Keep secret — used only server-side for signature verification"
          />
        </div>
        <SecretInput
          label="Webhook Secret (optional)"
          value={rzpWebhookSecret}
          onChange={setRzpWebhookSecret}
          placeholder="webhook_secret_from_razorpay"
          hint="Set this in Razorpay Dashboard → Webhooks → Secret. Used to verify webhook events."
        />

        {/* Webhook URL */}
        <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: '#f8fafc', border: '1.5px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
            📡 Razorpay Webhook URL
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <code style={{ flex: 1, fontSize: '0.78rem', color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rzpWebhookUrl}
            </code>
            <button onClick={() => copy(rzpWebhookUrl)} className="glass-btn" style={{ padding: '4px 8px', fontSize: '0.72rem', gap: '4px' }}>
              <Copy size={12} /> Copy
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Add this in Razorpay Dashboard → Settings → Webhooks. Subscribe to <strong>payment.captured</strong> event.
          </p>
        </div>

        <BtnRow
          section="Razorpay"
          onSave={() => saveSection('Razorpay', { rzpKeyId, rzpKeySecret, rzpWebhookSecret, rzpMode })}
          onTest={() => testIntegration('Razorpay', '/api/integrations/test-razorpay')}
          testLabel="Verify Credentials"
        />
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
