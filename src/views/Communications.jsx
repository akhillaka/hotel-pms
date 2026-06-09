import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageSquare, Send, Bell, Phone, Clock, RefreshCw,
  Wifi, CheckCheck, AlertCircle, Zap, Bot, Hash,
  MessageCircle, ChevronRight, User, Calendar, CreditCard,
  Settings, Award, HelpCircle, Save, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── quick-reply templates ─── */
const QUICK_TEMPLATES = [
  { label: '👋 Welcome Message',   icon: '👋', text: 'Welcome to our hotel! Your room is ready. WiFi: GuestNet | Password: welcome123. Please let us know if you need anything.' },
  { label: '🌅 Checkout Reminder', icon: '🌅', text: 'Good morning! Just a reminder that checkout is at 11:00 AM today. Please let us know if you need a late checkout.' },
  { label: '💳 Payment Request',   icon: '💳', text: 'Dear guest, we have an outstanding balance on your folio. Please visit the reception or tap here to pay online. Thank you!' },
  { label: '⭐ Feedback Request',  icon: '⭐', text: 'We hope you enjoyed your stay! Please take a moment to leave us a review. Your feedback helps us serve you better.' },
  { label: '🔑 Room Info',         icon: '🔑', text: 'Your room number is ready for check-in. Please proceed to the front desk with a valid photo ID.' },
];

/* ─── Message bubble ─── */
const Bubble = ({ msg }) => {
  const isInbound = msg.type === 'Guest Reply';
  const isAgent   = msg.type === 'Manual Agent Reply';
  const isSystem  = msg.type === 'System Auto';

  const time = new Date(msg.timestamp || msg.created_at)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let bg, color, borderColor, alignSelf;
  if (isInbound) {
    bg = '#fff'; color = '#1a202c'; borderColor = '#d1fae5'; alignSelf = 'flex-start';
  } else if (isAgent) {
    bg = 'linear-gradient(135deg,#6366f1,#4f46e5)'; color = '#fff'; borderColor = 'transparent'; alignSelf = 'flex-end';
  } else {
    bg = 'linear-gradient(135deg,#0f1117,#1e2030)'; color = '#e2e8f0'; borderColor = 'transparent'; alignSelf = 'flex-end';
  }

  const label = isInbound ? '← Guest' : isAgent ? 'Agent →' : `PMS Auto (${msg.type}) →`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf, maxWidth: '78%', gap: '3px' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', paddingLeft: isInbound ? '4px' : '0', paddingRight: isInbound ? '0' : '4px', textAlign: isInbound ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{
        padding: '10px 14px',
        borderRadius: isInbound ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        background: bg, color,
        border: `1.5px solid ${isInbound ? '#d1fae5' : 'transparent'}`,
        fontSize: '0.855rem', lineHeight: 1.5,
        boxShadow: isInbound ? 'var(--shadow-xs)' : isAgent ? '0 2px 8px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <div>{msg.message}</div>
        <div style={{ fontSize: '0.62rem', marginTop: '5px', opacity: 0.65, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
          {time}
          {!isInbound && <CheckCheck size={10} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Status indicator ─── */
const IntegStatus = ({ label, connected, icon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
    background: connected ? '#d1fae5' : '#f1f5f9',
    border: `1.5px solid ${connected ? '#6ee7b7' : '#e2e8f0'}`,
    color: connected ? '#065f46' : '#94a3b8',
  }}>
    {icon}
    {label}
    <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#cbd5e1', animation: connected ? 'pulse 2s infinite' : 'none' }} />
  </div>
);

export default function Communications() {
  const [channel, setChannel]         = useState('whatsapp'); // 'whatsapp' | 'telegram' | 'settings'
  const [waMessages, setWaMessages]   = useState([]);
  const [tgMessages, setTgMessages]   = useState([]);
  const [selectedMobile, setSelectedMobile] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const chatRef = useRef(null);

  // CRM Guest Profile States
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestHistory, setGuestHistory] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Template settings mappings
  const [templatesConfig, setTemplatesConfig] = useState(() => {
    const saved = localStorage.getItem('pms_wa_template_mappings');
    return saved ? JSON.parse(saved) : {
      booking_confirmation: { metaName: 'booking_confirmation', lang: 'en', btnAction: 'Quick Reply: View Booking' },
      payment_receipt: { metaName: 'payment_receipt', lang: 'en', btnAction: 'Quick Reply: View Invoice' },
      stay_extended: { metaName: 'stay_extended', lang: 'en', btnAction: 'Visit Website' },
      checkout_reminder: { metaName: 'checkout_reminder', lang: 'en', btnAction: 'Quick Reply: Pay Dues' },
    };
  });

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const [waRes, tgRes] = await Promise.all([
        axios.get('/api/whatsapp/feed', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/telegram/feed', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setWaMessages(waRes.data);
      setTgMessages(tgRes.data);
      if (waRes.data.length > 0 && !selectedMobile) {
        const mobs = [...new Set(waRes.data.map(m => m.mobile))];
        if (mobs[0]) setSelectedMobile(mobs[0]);
      }
    } catch {
      // silently fail — integrations may not be configured
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestProfile = async (mobileNum) => {
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get(`/api/guests?mobile=${mobileNum}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.length > 0) {
        const profile = res.data[0];
        setGuestProfile(profile);
        const histRes = await axios.get(`/api/guests/${profile.id}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGuestHistory(histRes.data);
      } else {
        setGuestProfile(null);
        setGuestHistory(null);
      }
    } catch {
      setGuestProfile(null);
      setGuestHistory(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedMobile) {
      fetchGuestProfile(selectedMobile);
    } else {
      setGuestProfile(null);
      setGuestHistory(null);
    }
  }, [selectedMobile]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [waMessages, tgMessages, selectedMobile, channel]);

  const sendWA = async (text, mobile) => {
    if (!text?.trim() || !mobile) return toast.error('Select a conversation first');
    setSending(true);
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/whatsapp/send', { mobile, message: text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTypedMessage('');
      await fetchAll();
      toast.success('Message sent');
    } catch { toast.error('Send failed — check WhatsApp integration settings'); }
    finally { setSending(false); }
  };

  const handleSend = (e) => { e.preventDefault(); sendWA(typedMessage, selectedMobile); };
  const sendTemplate = (text) => sendWA(text, selectedMobile);

  const saveTemplatesConfig = () => {
    localStorage.setItem('pms_wa_template_mappings', JSON.stringify(templatesConfig));
    toast.success('Template mappings saved successfully! ✅');
  };

  const handleTemplateChange = (key, field, val) => {
    setTemplatesConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }));
  };

  const uniqueMobiles = [...new Set(waMessages.map(m => m.mobile))];
  const chatHistory   = waMessages.filter(m => m.mobile === selectedMobile);
  const tgFeed        = tgMessages;
  const waConnected   = waMessages.length > 0;
  const tgConnected   = tgMessages.length > 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)', minHeight: '600px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>Communications CRM</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.855rem', marginTop: '2px' }}>Omnichannel guest communication, Meta templates configuration & database guest profiles</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <IntegStatus label="WhatsApp"   connected={waConnected} icon={<MessageCircle size={13}/>} />
          <IntegStatus label="Telegram"   connected={tgConnected} icon={<Bot size={13}/>} />
          <button onClick={fetchAll} className="glass-btn" style={{ padding: '6px 12px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Channel Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'whatsapp', label: 'WhatsApp Chat', icon: <MessageCircle size={15}/>, count: uniqueMobiles.length },
          { id: 'telegram', label: 'Telegram Bot Feed', icon: <Bot size={15}/>, count: tgFeed.length },
          { id: 'settings', label: 'WhatsApp Settings', icon: <Settings size={15}/>, count: 0 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setChannel(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: 'var(--r-md)',
              border: '1.5px solid',
              borderColor: channel === t.id ? 'var(--primary)' : 'var(--border)',
              background: channel === t.id ? 'var(--primary)' : '#fff',
              color: channel === t.id ? '#fff' : 'var(--text-muted)',
              fontWeight: 600, fontSize: '0.855rem', cursor: 'pointer',
              transition: 'all 0.13s ease',
            }}
          >
            {t.icon} {t.label}
            {t.count > 0 && (
              <span style={{
                background: channel === t.id ? 'rgba(255,255,255,0.25)' : '#eef2ff',
                color: channel === t.id ? '#fff' : 'var(--primary)',
                borderRadius: '20px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main Layout Workspace ── */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', minHeight: 0 }}>

        {/* ─── WHATSAPP CHANNEL WORKSPACE ─── */}
        {channel === 'whatsapp' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1.2fr 280px 220px', gap: '12px', width: '100%', minHeight: 0 }}>
            
            {/* 1. Conversations List */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Chats</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {uniqueMobiles.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <MessageSquare size={28} style={{ margin: '0 auto 8px', color: '#d1d9e6' }} />
                    No active chats.
                  </div>
                ) : (
                  uniqueMobiles.map(mob => {
                    const last = waMessages.filter(m => m.mobile === mob)[0];
                    const isActive = selectedMobile === mob;
                    return (
                      <button
                        key={mob}
                        onClick={() => setSelectedMobile(mob)}
                        style={{
                          width: '100%', padding: '13px 16px', textAlign: 'left',
                          border: 'none', borderBottom: '1px solid var(--border)',
                          background: isActive ? '#eef2ff' : 'transparent',
                          cursor: 'pointer', transition: 'background 0.1s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: isActive ? '#c7d2fe' : '#f0f2f7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
                            color: isActive ? '#6366f1' : '#64748b',
                          }}>
                            {mob.slice(-2)}
                          </div>
                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--text-main)' }}>
                              +91 {mob}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                              {last?.message?.slice(0, 45)}…
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Chat Conversation Pane */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {selectedMobile ? (
                <>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#6366f1' }}>
                      {selectedMobile.slice(-2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>+91 {selectedMobile}</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                        Active Communication Stream
                      </div>
                    </div>
                  </div>

                  <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23e5e9f0' /%3E%3C/svg%3E")`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...chatHistory].reverse().map(msg => (
                      <Bubble key={msg.id} msg={msg} />
                    ))}
                  </div>

                  <form onSubmit={handleSend} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', background: '#fff' }}>
                    <input
                      type="text"
                      placeholder="Type custom text reply here..."
                      className="glass-input"
                      value={typedMessage}
                      onChange={e => setTypedMessage(e.target.value)}
                      style={{ flex: 1 }}
                      disabled={sending}
                    />
                    <button type="submit" className="glass-btn glass-btn-primary" disabled={sending || !typedMessage.trim()} style={{ padding: '9px 16px' }}>
                      {sending ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Send size={16} />}
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
                  <MessageSquare size={40} style={{ color: '#d1d9e6' }} />
                  <span style={{ fontSize: '0.875rem' }}>Select conversation to display chat streams</span>
                </div>
              )}
            </div>

            {/* 3. Lightweight CRM Guest Profile Sidebar */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guest Profile (PMS)</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {loadingProfile ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : guestProfile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Primary info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                        <User size={20} />
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{guestProfile.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nationality: {guestProfile.nationality || 'Indian'}</span>
                      </div>
                    </div>

                    {/* VIP/Blacklist Indicator */}
                    {guestProfile.is_blacklisted ? (
                      <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>
                        ⚠️ BLACKLISTED: {guestProfile.blacklist_reason || 'Policy Violation'}
                      </div>
                    ) : (
                      <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#047857', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} /> VIP Guest Status: Active
                      </div>
                    )}

                    {/* Demographic details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Document: </span>
                        <strong>{guestProfile.id_type || 'ID'} - {guestProfile.id_number || 'None'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Address: </span>
                        <strong>{guestProfile.address || 'Not Recorded'}</strong>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    {guestHistory && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Spent</span>
                          <strong>₹{guestHistory.totalSpent}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Outstanding Due</span>
                          <strong style={{ color: guestHistory.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            ₹{guestHistory.outstanding}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Stays List */}
                    {guestHistory?.stays?.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>STAYS RECORD</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {guestHistory.stays.slice(0, 3).map((s, idx) => (
                            <div key={idx} style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.72rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>{s.reservation_number}</span>
                                <span style={{ color: 'var(--primary)' }}>{s.status}</span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                                Room {s.room_number || 'Pending'} · {s.stay_type}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                    <HelpCircle size={28} />
                    <span style={{ fontSize: '0.78rem' }}>Mobile number is not mapped to any registered guest profile in the PMS.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Quick Templates Selector */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Reply</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {QUICK_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.label}
                    onClick={() => sendTemplate(tpl.text)}
                    disabled={!selectedMobile}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--border)', background: '#fafafa',
                      cursor: selectedMobile ? 'pointer' : 'not-allowed',
                      opacity: selectedMobile ? 1 : 0.45,
                      textAlign: 'left', fontSize: '0.78rem', fontWeight: 600,
                      color: 'var(--text-main)', transition: 'all 0.12s ease',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                    onMouseEnter={e => { if (selectedMobile) { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#eef2ff'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fafafa'; }}
                  >
                    <span style={{ fontSize: '1rem' }}>{tpl.icon}</span>
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ─── TELEGRAM CHANNEL FEED ─── */}
        {channel === 'telegram' && (
          <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#1a1c2e,#0f1117)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#2196f3,#0d8de4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Telegram Alerts Feed</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Alerts for bookings, extensions & housekeeping logs</div>
              </div>
            </div>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tgFeed.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', padding: '40px 0' }}>
                  <Bot size={32} />
                  <span style={{ fontSize: '0.82rem', marginTop: '6px' }}>No alert records.</span>
                </div>
              ) : (
                [...tgFeed].reverse().map((log, i) => (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: '#fff', border: '1.5px solid var(--border)', borderLeft: '4px solid #2196f3', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.855rem', color: 'var(--text-main)' }}>{log.message}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {new Date(log.timestamp || log.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── WHATSAPP SETTINGS & TEMPLATES CONFIG ─── */}
        {channel === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', width: '100%', overflowY: 'auto', padding: '4px' }}>
            
            {/* Left Column: Template Button Mapping */}
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Meta WhatsApp Templates Mapping</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Map trigger events to WhatsApp Business Cloud API approved templates and their call-to-action buttons</p>
              </div>

              {Object.keys(templatesConfig).map(k => (
                <div key={k} style={{ padding: '14px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--primary)' }}>
                      {k.replace('_', ' ')}
                    </strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Template Name</label>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        value={templatesConfig[k].metaName}
                        onChange={e => handleTemplateChange(k, 'metaName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Button Action Mapping</label>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        value={templatesConfig[k].btnAction}
                        onChange={e => handleTemplateChange(k, 'btnAction', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={saveTemplatesConfig} className="glass-btn glass-btn-primary" style={{ gap: '8px', alignSelf: 'flex-start', marginTop: '10px' }}>
                <Save size={14} /> Save Mappings Config
              </button>
            </div>

            {/* Right Column: API Guide & Free Open Source integrations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* WhatsApp Guidelines */}
              <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} style={{ color: 'var(--primary)' }} />
                  WhatsApp API Checklist (Meta)
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.5 }}>
                  <div>• <strong>Access Token</strong>: Ensure you use a Permanent System User Token. Temporary tokens expire in 24 hours.</div>
                  <div>• <strong>WABA ID & Phone ID</strong>: Phone Number ID is used for endpoint calls; WhatsApp Business Account (WABA) ID is used to manage template catalogs.</div>
                  <div>• <strong>Webhook Setup</strong>: Set your webhook URL in Meta Dashboard, choose <code>messages</code> subscription to sync guest answers.</div>
                </div>
              </div>

              {/* Free Open Source integrations */}
              <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={16} />
                  Open Source WhatsApp CRM Tools
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                  If you want to operate WhatsApp messaging with zero Meta API charges and customize mappings, consider these self-hosted platforms:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Evolution API</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>Node.js web-service that exposes APIs to command regular WhatsApp accounts (using Baileys library). Offers free multi-instance support and webhooks.</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Baileys / WhatsApp-Web.js</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>Free JavaScript libraries that execute web automation of WhatsApp Web. Excellent for developers creating custom servers.</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Chatwoot Omnichannel</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>Fully-featured open-source customer support chat platform that connects seamlessly to WhatsApp.</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
