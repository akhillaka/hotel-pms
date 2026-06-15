import React from 'react';
import { Bell, X, AlertTriangle, Clock, Sparkles, ArrowDown } from 'lucide-react';

const ICON_MAP = {
  danger:  { Icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' },
  warning: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
  info:    { Icon: Clock,         color: '#3b82f6', bg: '#dbeafe' },
  clean:   { Icon: Sparkles,      color: '#10b981', bg: '#dcfce7' },
  arrival: { Icon: ArrowDown,     color: '#6366f1', bg: '#eef2ff' },
};

export default function NotificationPanel({ alerts = [], onClose }) {
  return (
    <div className="notif-panel">
      {/* Header */}
      <div className="notif-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={15} style={{ color: 'var(--brand-500)' }} />
          <span className="notif-panel-title">Notifications</span>
          {alerts.length > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff',
              fontSize: '0.6rem', fontWeight: 800,
              padding: '1px 6px', borderRadius: '10px',
            }}>
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-faint)', padding: '4px',
            display: 'flex', alignItems: 'center',
            borderRadius: 'var(--r-xs)',
            transition: 'color var(--t-fast)',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="notif-panel-body">
        {alerts.length === 0 ? (
          <div className="notif-empty">
            <Bell size={28} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            All caught up — no active alerts
          </div>
        ) : (
          alerts.map((alert, i) => {
            const meta = ICON_MAP[alert.type] || ICON_MAP.info;
            const { Icon } = meta;
            return (
              <div key={alert.id || i} className="notif-item">
                <div
                  className="notif-item-dot"
                  style={{ background: meta.color, marginTop: 5 }}
                />
                <div className="notif-item-body">
                  <div className="notif-item-text">{alert.text}</div>
                  <div className="notif-item-meta" style={{ color: meta.color }}>
                    {alert.type?.toUpperCase() || 'INFO'}
                  </div>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: 'var(--r-sm)',
                  background: meta.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} style={{ color: meta.color }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''} · Auto-refreshes every 30s
          </span>
        </div>
      )}
    </div>
  );
}
