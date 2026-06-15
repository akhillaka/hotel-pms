/**
 * Shared helpers for Antigravity PMS
 * Used by both Desktop and Mobile UI
 */

/** Format a number in Indian locale (e.g. 1,23,456) */
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/** Format currency in Indian Rupees */
export const fmtCur = (n) => `₹${fmt(n)}`;

/** Get Authorization header for API calls */
export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('pms_token')}`,
});

/** Axios config with auth headers */
export const authConfig = () => ({ headers: getAuthHeaders() });

/** Format ISO datetime to readable string */
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

/** Format ISO date to DD Mon YYYY */
export const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

/** Today's date as YYYY-MM-DD */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Check if an ISO datetime string is today */
export const isToday = (iso) => {
  if (!iso) return false;
  return iso.slice(0, 10) === todayISO();
};

/** Get initials from a name string */
export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

/** Get greeting based on time of day */
export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Room status color config */
export const ROOM_STATUS_COLORS = {
  'Vacant Clean': { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', dot: '#10b981', label: 'Vacant Clean' },
  'Occupied':     { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', dot: '#ef4444', label: 'Occupied'     },
  'Dirty':        { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', dot: '#f59e0b', label: 'Dirty'        },
  'Maintenance':  { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8', label: 'Maintenance'  },
  'Reserved':     { bg: '#eef2ff', text: '#3730a3', border: '#a5b4fc', dot: '#6366f1', label: 'Reserved'     },
};

/** Reservation status color config */
export const RES_STATUS_COLORS = {
  'Checked In':  { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  'Reserved':    { bg: '#eef2ff', text: '#3730a3', dot: '#6366f1' },
  'Checked Out': { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
  'Cancelled':   { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  'No Show':     { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
};

/** Shared toast options */
export const toastOpts = {
  style: {
    background: '#1e293b',
    color: '#f1f5f9',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    fontSize: '0.84rem',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
  error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
  duration: 3000,
};
