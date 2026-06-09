import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { 
  TrendingUp, Users, Bed, DollarSign, RefreshCw, AlertCircle, 
  Download, Calendar, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const getChangePct = (curr, prev) => {
  if (curr === 0 && prev === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 100);
};

const CompBadge = ({ label, value, prevValue }) => {
  const pct = getChangePct(value, prevValue);
  let color = 'var(--text-muted)';
  let bg = '#f1f5f9';
  let Icon = Minus;

  if (pct > 0) {
    color = '#16a34a';
    bg = '#dcfce7';
    Icon = ArrowUpRight;
  } else if (pct < 0) {
    color = '#dc2626';
    bg = '#fee2e2';
    Icon = ArrowDownRight;
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem',
      fontWeight: 700, background: bg, color: color
    }}>
      <Icon size={11} />
      <span>{pct > 0 ? '+' : ''}{pct}% {label}</span>
    </div>
  );
};

const KPI = ({ icon: Icon, label, value, prevMonthValue, prevYearValue, color, bg }) => (
  <div style={{
    background: '#fff',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: '20px 22px',
    display: 'flex', flexDirection: 'column', gap: '12px',
    transition: 'box-shadow 0.2s ease',
  }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: 'var(--r-md)',
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? `₹${fmt(value)}` : value}
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>
          {label}
        </div>
      </div>
    </div>
    
    {prevMonthValue !== undefined && (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
        <CompBadge label="MoM" value={typeof value === 'number' ? value : parseFloat(value)} prevValue={prevMonthValue} />
        <CompBadge label="YoY" value={typeof value === 'number' ? value : parseFloat(value)} prevValue={prevYearValue} />
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#e2e8f0',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '4px', color: '#a5b4fc' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          {p.name}: <strong>₹{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const [preset, setPreset] = useState('current_month');
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');

  // Helper to get local formatted date string YYYY-MM-DD
  const getLocalDateStr = (d) => {
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Compute start/end dates based on preset selection
  const resolvePresetDates = (p) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (p) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = yesterday;
        end = yesterday;
        break;
      case 'current_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'ytd':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
      default:
        return null;
    }

    return {
      startDate: getLocalDateStr(start),
      endDate: getLocalDateStr(end)
    };
  };

  useEffect(() => {
    const resolved = resolvePresetDates(preset);
    if (resolved) {
      setDates(resolved);
    }
  }, [preset]);

  const fetchReportData = async () => {
    if (!dates.startDate || !dates.endDate) return;
    setLoading(true);
    setError(false);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get('/api/reports/advanced', {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate: dates.startDate, endDate: dates.endDate }
      });
      setData(res.data);
    } catch (err) {
      setError(true);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dates]);

  const handleDateChange = (e) => {
    setPreset('custom');
    setDates(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const downloadCSV = (listType) => {
    if (!data) return;
    let headers = [];
    let rows = [];
    let filename = '';

    if (listType === 'bookings') {
      headers = [
        'Reservation ID', 'Guest Name', 'Mobile', 'Room Type', 
        'Room Number', 'Stay Type', 'Check In', 'Check Out', 
        'Status', 'Adults', 'Children', 'Custom Rate', 'Created At'
      ];
      rows = data.bookings.map(b => [
        b.reservation_number, b.guest_name, b.guest_mobile, b.room_type_name,
        b.room_number || 'Unassigned', b.stay_type, b.check_in_datetime, b.check_out_datetime,
        b.status, b.adults, b.children, b.custom_rate || '', b.created_at
      ]);
      filename = `bookings_report_${dates.startDate}_to_${dates.endDate}.csv`;
    } else {
      headers = [
        'Transaction ID', 'Folio ID', 'Reservation Number', 'Guest Name',
        'Entry Type', 'Charge Type', 'Payment Method', 'Description',
        'Debit (Charge)', 'Credit (Payment)', 'Balance', 'Created By', 'Created At'
      ];
      rows = data.transactions.map(t => [
        t.id, t.folio_id, t.reservation_number, t.guest_name,
        t.entry_type, t.charge_type || '', t.payment_method || '', t.description,
        t.debit, t.credit, t.balance, t.created_by, t.created_at
      ]);
      filename = `transactions_report_${dates.startDate}_to_${dates.endDate}.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download triggered successfully');
  };

  const mockRevenueTrend = data ? [
    { date: 'Previous Period', Revenue: Math.round(data.metrics?.prevMonth?.revenue || 0) },
    { date: 'Current Period', Revenue: Math.round(data.metrics?.current?.revenue || 0) },
  ] : [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header & Preset Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>Advanced Reports & Analysis</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
            Multi-period business intelligence comparisons & database records export
          </p>
        </div>
        
        {/* Preset Selector */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.7)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'current_month', label: 'Current Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'ytd', label: 'YTD' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: preset === p.id ? 'var(--primary)' : 'transparent',
                color: preset === p.id ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Dates Selectors */}
      <div style={{
        display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
        background: '#fff', padding: '16px 20px', borderRadius: 'var(--r-lg)',
        border: '1.5px solid var(--border)', width: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Range</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            name="startDate"
            value={dates.startDate}
            onChange={handleDateChange}
            className="glass-input"
            style={{ padding: '6px 10px', fontSize: '0.82rem', width: '135px' }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            name="endDate"
            value={dates.endDate}
            onChange={handleDateChange}
            className="glass-input"
            style={{ padding: '6px 10px', fontSize: '0.82rem', width: '135px' }}
          />
        </div>
        <button onClick={fetchReportData} className="glass-btn glass-btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px' }}>
          <RefreshCw size={12} /> Apply Filter
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '14px', color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.875rem' }}>Compiling financial metrics & comparisons…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error || !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Could not load advanced reports.</p>
          <button onClick={fetchReportData} className="glass-btn"><RefreshCw size={14} /> Retry</button>
        </div>
      ) : (
        <>
          {/* Comparative Metrics KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <KPI 
              icon={DollarSign} 
              label="Period Total Revenue" 
              value={data.metrics.current.revenue} 
              prevMonthValue={data.metrics.prevMonth.revenue} 
              prevYearValue={data.metrics.prevYear.revenue} 
              color="#6366f1" bg="#eef2ff" 
            />
            <KPI 
              icon={DollarSign} 
              label="Period Total Collections" 
              value={data.metrics.current.collections} 
              prevMonthValue={data.metrics.prevMonth.collections} 
              prevYearValue={data.metrics.prevYear.collections} 
              color="#10b981" bg="#ecfdf5" 
            />
            <KPI 
              icon={Bed} 
              label="Period Bookings Count" 
              value={data.metrics.current.bookings} 
              prevMonthValue={data.metrics.prevMonth.bookings} 
              prevYearValue={data.metrics.prevYear.bookings} 
              color="#f59e0b" bg="#fef3c7" 
            />
          </div>

          {/* Graphical Representation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '18px' }}>
                Period-over-Period Revenue comparison
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mockRevenueTrend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${fmt(v)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Revenue" fill="var(--primary)" radius={[6, 6, 0, 0]}>
                    <Cell fill="#94a3b8" />
                    <Cell fill="#6366f1" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Summary card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>
                Analytical Insight
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                This dashboard presents key metrics derived from real-time folio records. The comparison indicators represent relative percentage shifts calculated against equivalent historical intervals (e.g., matching day offsets in the preceding calendar month and year) to provide consistent business tracking.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>MoM Comparison Enabled</span>
                <span style={{ fontSize: '0.78rem', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>YoY Comparison Enabled</span>
              </div>
            </div>
          </div>

          {/* Interactive tabs and download section */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`glass-btn ${activeTab === 'bookings' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  Bookings Records ({data.bookings?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`glass-btn ${activeTab === 'transactions' ? 'glass-btn-primary' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                >
                  Transaction Ledger ({data.transactions?.length || 0})
                </button>
              </div>

              <button
                onClick={() => downloadCSV(activeTab)}
                className="glass-btn glass-btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontSize: '0.82rem', padding: '6px 14px', gap: '6px' }}
              >
                <Download size={14} /> Download Excel (CSV)
              </button>
            </div>

            {/* List Table */}
            <div style={{ overflowX: 'auto' }}>
              {activeTab === 'bookings' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <th style={{ padding: '10px 8px' }}>Res Number</th>
                      <th style={{ padding: '10px 8px' }}>Guest Name</th>
                      <th style={{ padding: '10px 8px' }}>Mobile</th>
                      <th style={{ padding: '10px 8px' }}>Room</th>
                      <th style={{ padding: '10px 8px' }}>Stay Type</th>
                      <th style={{ padding: '10px 8px' }}>Check In</th>
                      <th style={{ padding: '10px 8px' }}>Check Out</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings?.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>No bookings found in this period.</td>
                      </tr>
                    ) : (
                      data.bookings.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{b.reservation_number}</td>
                          <td style={{ padding: '10px 8px' }}>{b.guest_name}</td>
                          <td style={{ padding: '10px 8px' }}>{b.guest_mobile}</td>
                          <td style={{ padding: '10px 8px' }}>{b.room_number ? `Room ${b.room_number}` : 'Unassigned'}</td>
                          <td style={{ padding: '10px 8px' }}>{b.stay_type}</td>
                          <td style={{ padding: '10px 8px' }}>{b.check_in_datetime.split(' ')[0]}</td>
                          <td style={{ padding: '10px 8px' }}>{b.check_out_datetime.split(' ')[0]}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                              background: b.status === 'Checked In' ? '#dcfce7' : b.status === 'Checked Out' ? '#f1f5f9' : '#fef3c7',
                              color: b.status === 'Checked In' ? '#16a34a' : b.status === 'Checked Out' ? '#475569' : '#d97706'
                            }}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <th style={{ padding: '10px 8px' }}>Res Number</th>
                      <th style={{ padding: '10px 8px' }}>Guest</th>
                      <th style={{ padding: '10px 8px' }}>Type</th>
                      <th style={{ padding: '10px 8px' }}>Details</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Debit (Charge)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Credit (Payment)</th>
                      <th style={{ padding: '10px 8px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions?.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found in this period.</td>
                      </tr>
                    ) : (
                      data.transactions.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.reservation_number}</td>
                          <td style={{ padding: '10px 8px' }}>{t.guest_name}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                              background: t.entry_type === 'Charge' ? '#fee2e2' : '#dcfce7',
                              color: t.entry_type === 'Charge' ? '#dc2626' : '#16a34a'
                            }}>
                              {t.entry_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: t.debit > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>{t.debit > 0 ? `₹${fmt(t.debit)}` : '—'}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: t.credit > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: t.credit > 0 ? 600 : 400 }}>{t.credit > 0 ? `₹${fmt(t.credit)}` : '—'}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{t.created_at.split(' ')[0]}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
