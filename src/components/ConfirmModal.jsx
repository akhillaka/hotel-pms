import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

/**
 * ConfirmModal — animated confirmation dialog
 *
 * Props:
 *   isOpen        {boolean}
 *   title         {string}
 *   message       {string}
 *   confirmLabel  {string}   default 'Confirm'
 *   cancelLabel   {string}   default 'Cancel'
 *   variant       {'danger'|'primary'|'warning'}  default 'danger'
 *   onConfirm     {function}
 *   onCancel      {function}
 */
export default function ConfirmModal({
  isOpen,
  title        = 'Are you sure?',
  message      = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  onConfirm,
  onCancel,
}) {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const colors = {
    danger:  { btn: 'btn-danger',  icon: '#ef4444', iconBg: '#fee2e2' },
    primary: { btn: 'btn-primary', icon: '#6366f1', iconBg: '#eef2ff' },
    warning: { btn: 'btn-default', icon: '#f59e0b', iconBg: '#fffbeb' },
  }[variant] || colors?.danger;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 900, padding: '16px',
        animation: 'fadeIn 0.15s ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-xl)',
        width: '100%', maxWidth: '420px',
        animation: 'fadeUp 0.2s var(--ease) both',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          display: 'flex', alignItems: 'flex-start', gap: '14px',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--r-md)',
            background: colors.iconBg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} style={{ color: colors.icon }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '1rem', fontWeight: 700,
              color: 'var(--text)', lineHeight: 1.3,
            }}>{title}</div>
            <div style={{
              fontSize: '0.82rem', color: 'var(--text-muted)',
              marginTop: '6px', lineHeight: 1.55,
            }}>{message}</div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', padding: '2px',
              display: 'flex', alignItems: 'center',
              borderRadius: 'var(--r-xs)',
              transition: 'color var(--t-fast)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'flex-end',
          padding: '20px 24px 22px',
        }}>
          <button
            onClick={onCancel}
            className="btn btn-default btn-sm"
            style={{ minWidth: 72 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${colors.btn} btn-sm`}
            style={{ minWidth: 96 }}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
