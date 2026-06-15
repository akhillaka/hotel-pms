import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MessageSquare, Send, Bot, Clock, RefreshCw,
  CheckCheck, AlertCircle, Zap, User, Award,
  HelpCircle, Settings, Phone, MessageCircle, Link,
  CheckCircle, PlusCircle, Paperclip
} from 'lucide-react';
import toast from 'react-hot-toast';

const QUICK_TEMPLATES = [
  { label: '👋 Welcome', icon: '👋', text: 'Welcome to our hotel! Your room is ready. WiFi: GuestNet | Password: welcome123.' },
  { label: '🌅 Checkout', icon: '🌅', text: 'Good morning! Just a reminder that checkout is at 11:00 AM today.' },
  { label: '💳 Payment', icon: '💳', text: 'Dear guest, we have an outstanding balance on your folio. Please pay at reception.' },
  { label: '⭐ Feedback', icon: '⭐', text: 'We hope you enjoyed your stay! Please take a moment to leave us a review.' },
];

const Bubble = ({ msg }) => {
  const isInbound = msg.type === 'Guest Reply';
  const isAgent   = msg.type === 'Manual Agent Reply';
  const isSystem  = msg.type === 'System Auto';

  const time = new Date(msg.timestamp || msg.created_at)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let bg, color, borderColor, alignSelf;
  if (isInbound) {
    bg = '#ffffff'; color = '#1a202c'; borderColor = '#e2e8f0'; alignSelf = 'flex-start';
  } else if (isAgent) {
    bg = 'linear-gradient(135deg, #10b981, #059669)'; color = '#fff'; borderColor = 'transparent'; alignSelf = 'flex-end';
  } else {
    bg = 'linear-gradient(135deg, #475569, #334155)'; color = '#fff'; borderColor = 'transparent'; alignSelf = 'flex-end';
  }

  const label = isInbound ? '← Guest' : isAgent ? 'Agent →' : `System (${msg.type}) →`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignSelf, maxWidth: '78%', gap: '4px' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', paddingLeft: isInbound ? '4px' : '0', paddingRight: isInbound ? '0' : '4px', textAlign: isInbound ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{
        padding: '12px 16px',
        borderRadius: isInbound ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        background: bg, color,
        border: `1px solid ${borderColor}`,
        fontSize: '0.9rem', lineHeight: 1.5,
        boxShadow: isInbound ? '0 1px 2px rgba(0,0,0,0.05)' : '0 2px 8px rgba(16,185,129,0.2)',
      }}>
        {msg.template_name && (
          <div style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px', fontWeight: 700 }}>
            <Zap size={10} style={{ display: 'inline', marginRight: '3px' }}/> Template: {msg.template_name}
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
        <div style={{ fontSize: '0.65rem', marginTop: '6px', opacity: 0.8, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
          {time}
          {!isInbound && <CheckCheck size={12} />}
        </div>
      </div>
    </div>
  );
};

export default function Communications() {
  const [waMessages, setWaMessages] = useState([]);
  const [selectedMobile, setSelectedMobile] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState([]);
  
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestHistory, setGuestHistory] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const chatRef = useRef(null);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const waRes = await axios.get('/api/whatsapp/feed', { headers: { Authorization: `Bearer ${token}` } });
      setWaMessages(waRes.data);
      if (waRes.data.length > 0 && !selectedMobile) {
        const mobs = [...new Set(waRes.data.map(m => m.mobile))];
        if (mobs[0]) setSelectedMobile(mobs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get('/api/whatsapp/templates', { headers: { Authorization: `Bearer ${token}` } });
      setMetaTemplates(res.data);
    } catch {
      setMetaTemplates([]);
    }
  };

  const fetchGuestProfile = async (mobileNum) => {
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get(`/api/guests?mobile=${mobileNum}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.length > 0) {
        setGuestProfile(res.data[0]);
        const histRes = await axios.get(`/api/guests/${res.data[0].id}/history`, { headers: { Authorization: `Bearer ${token}` } });
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
    fetchTemplates();
    const id = setInterval(fetchAll, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedMobile) fetchGuestProfile(selectedMobile);
  }, [selectedMobile]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [waMessages, selectedMobile]);

  const claimConversation = async (mobile) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/whatsapp/claim', { mobile }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Conversation claimed');
      fetchAll();
    } catch {
      toast.error('Failed to claim');
    }
  };

  const sendWA = async (text, mobile, templateName = null) => {
    if (!text?.trim() || !mobile) return toast.error('Select a conversation');
    setSending(true);
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/whatsapp/send', { mobile, message: text, templateName }, { headers: { Authorization: `Bearer ${token}` } });
      setTypedMessage('');
      setShowTemplates(false);
      await fetchAll();
      toast.success('Sent successfully');
    } catch { 
      toast.error('Failed to send message'); 
    } finally { 
      setSending(false); 
    }
  };

  const uniqueMobiles = [...new Set(waMessages.map(m => m.mobile))];
  const chatHistory   = waMessages.filter(m => m.mobile === selectedMobile);
  const activeAgent   = chatHistory.length > 0 ? chatHistory[0].assigned_agent : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)', minHeight: '600px' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={22} style={{ color: '#10b981' }} /> WhatsApp CRM (Shared Inbox)
          </h1>
          <p className="page-subtitle">Manage guest communications, templates, and assignments</p>
        </div>
        <button onClick={fetchAll} className="btn btn-default btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: '16px', minHeight: 0 }}>
        
        {/* 1. Inbox List */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#fff' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Active Conversations</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {uniqueMobiles.map(mob => {
              const msgs = waMessages.filter(m => m.mobile === mob);
              const last = msgs[msgs.length - 1];
              const isActive = selectedMobile === mob;
              return (
                <button
                  key={mob}
                  onClick={() => setSelectedMobile(mob)}
                  style={{
                    width: '100%', padding: '16px', textAlign: 'left',
                    border: 'none', borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: isActive ? '#ecfdf5' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', gap: '12px'
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: isActive ? '#10b981' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : '#64748b', fontWeight: 800 }}>
                    {mob.slice(-2)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: isActive ? '#065f46' : '#1e293b' }}>+{mob}</strong>
                      {last.assigned_agent && <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{last.assigned_agent}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                      {last?.message}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Chat Pane */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-md)' }}>
          {selectedMobile ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>+{selectedMobile}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Active Session
                    </div>
                  </div>
                </div>
                <div>
                  {!activeAgent ? (
                    <button onClick={() => claimConversation(selectedMobile)} className="btn btn-default" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      <User size={14}/> Claim Chat
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <CheckCircle size={14} color="#10b981" /> Assigned to {activeAgent}
                    </div>
                  )}
                </div>
              </div>

              <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatHistory.map(msg => <Bubble key={msg.id} msg={msg} />)}
              </div>

              {showTemplates && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff', padding: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '12px', color: '#64748b' }}>META APPROVED TEMPLATES</div>
                  {metaTemplates.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No Meta templates found. Showing fallbacks.</div>}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(metaTemplates.length > 0 ? metaTemplates : QUICK_TEMPLATES).map((t, i) => (
                      <button key={i} onClick={() => sendWA(t.text || 'Fallback template body', selectedMobile, t.name || t.label)} className="btn btn-default" style={{ textAlign: 'left', fontSize: '0.8rem', padding: '8px 12px' }}>
                        {t.icon || <Zap size={14}/>} {t.name || t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); sendWA(typedMessage, selectedMobile); }} style={{ padding: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="btn btn-default" style={{ padding: '12px' }}>
                  <PlusCircle size={20} />
                </button>
                <input
                  className="glass-input"
                  style={{ flex: 1, padding: '12px 16px', fontSize: '0.95rem' }}
                  placeholder="Type a message..."
                  value={typedMessage}
                  onChange={e => setTypedMessage(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className="glass-btn glass-btn-primary" disabled={sending || !typedMessage.trim()} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff' }}>
                  {sending ? '...' : <Send size={20} />}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <MessageCircle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <h3>No Conversation Selected</h3>
              <p>Select a chat from the inbox to start messaging</p>
            </div>
          )}
        </div>

        {/* 3. Live Context Sidebar */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#fff' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Live Guest Context</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {!selectedMobile ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '40px' }}>Context will appear here</div>
            ) : loadingProfile ? (
              <div style={{ textAlign: 'center', marginTop: '40px' }}><RefreshCw className="spin" size={24} color="#10b981" /></div>
            ) : guestProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, margin: '0 auto 12px' }}>
                    {guestProfile.name.charAt(0)}
                  </div>
                  <h3 style={{ margin: 0, color: '#0f172a' }}>{guestProfile.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>VIP Guest</div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '12px' }}>FINANCIAL SUMMARY</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Spent</span>
                    <strong style={{ fontSize: '0.9rem' }}>₹{guestHistory?.totalSpent || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>Outstanding</span>
                    <strong style={{ fontSize: '0.9rem', color: guestHistory?.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                      ₹{guestHistory?.outstanding || 0}
                    </strong>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '12px' }}>ACTIVE RESERVATION</div>
                  {guestHistory?.stays?.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a' }}>Room {guestHistory.stays[0].room_number || 'TBD'}</strong>
                        <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>{guestHistory.stays[0].status}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{guestHistory.stays[0].reservation_number}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No active stays</div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
                <div>Number not found in PMS records.</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
