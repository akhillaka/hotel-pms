import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Smartphone, Send, Shield, UserCheck, MessageSquare, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DevPanel({ user, onRoleSwitched }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('telegram');
  const [whatsappFeed, setWhatsappFeed] = useState([]);
  const [telegramFeed, setTelegramFeed] = useState([]);

  const fetchFeeds = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;

      const [waRes, tgRes] = await Promise.all([
        axios.get('/api/whatsapp/feed', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/telegram/feed', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setWhatsappFeed(waRes.data);
      setTelegramFeed(tgRes.data);
    } catch (err) {
      console.error('Error fetching developer feeds', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeeds();
      const interval = setInterval(fetchFeeds, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const switchRole = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('pms_token', res.data.token);
      onRoleSwitched(res.data.user);
      toast.success(`Role switched to ${res.data.user.role} (${res.data.user.name})`);
      fetchFeeds();
    } catch (err) {
      toast.error('Failed to switch role');
    }
  };

  return (
    <>
      <div className="dev-toolbelt">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="glass-btn glass-btn-primary" 
          style={{ padding: '8px 12px', fontSize: '0.85rem', height: '38px' }}
        >
          <Terminal size={16} />
          {isOpen ? 'Close Developer Toolbelt' : 'Developer Toolbelt'}
        </button>
      </div>

      {isOpen && (
        <div className="glass-panel developer-console animate-fade-in">
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} className="text-primary" /> Core Integration & Role Switcher Simulator
            </span>
          </div>

          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(99, 102, 241, 0.05)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              QUICK ROLE SWITCHER (Bypasses logins for testing)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button 
                onClick={() => switchRole('admin', 'admin123')}
                className={`glass-btn ${user?.role === 'Admin' ? 'glass-btn-primary' : ''}`}
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Admin (Unlimited)
              </button>
              <button 
                onClick={() => switchRole('manager', 'manager123')}
                className={`glass-btn ${user?.role === 'Manager' ? 'glass-btn-primary' : ''}`}
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Manager (20% Disc)
              </button>
              <button 
                onClick={() => switchRole('receptionist', 'recep123')}
                className={`glass-btn ${user?.role === 'Receptionist' ? 'glass-btn-primary' : ''}`}
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Receptionist (5%)
              </button>
              <button 
                onClick={() => switchRole('housekeeping', 'house123')}
                className={`glass-btn ${user?.role === 'Housekeeping' ? 'glass-btn-primary' : ''}`}
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Housekeeper
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
              Current User: <strong>{user?.name || 'Guest'}</strong> ({user?.role})
            </div>
          </div>

          <div className="console-tab-buttons">
            <button 
              onClick={() => setActiveTab('telegram')}
              className={`console-tab-btn ${activeTab === 'telegram' ? 'active' : ''}`}
            >
              Owner Telegram Bot Stream
            </button>
            <button 
              onClick={() => setActiveTab('whatsapp')}
              className={`console-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            >
              Guest WhatsApp Stream
            </button>
          </div>

          <div className="console-tab">
            {activeTab === 'telegram' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--color-info)' }}>
                  📲 <strong>Telegram Bot Active:</strong> Notifies property owner of real-time reservation edits, check-ins, refunds, and final bills.
                </div>
                {telegramFeed.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '24px' }}>No messages sent to owner yet.</div>
                ) : (
                  telegramFeed.map(log => (
                    <div key={log.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--color-info)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Property Owner Bot</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                  💬 <strong>WhatsApp API Connected:</strong> Simulates guest transactional updates (reservation, receipt check-in & check-out logs).
                </div>
                {whatsappFeed.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '24px' }}>No messages triggered yet.</div>
                ) : (
                  whatsappFeed.map(log => (
                    <div key={log.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--color-success)', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>To: {log.mobile} ({log.type})</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)' }}>{log.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
