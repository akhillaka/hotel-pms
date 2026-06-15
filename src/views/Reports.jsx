import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Bed, DollarSign, RefreshCw, AlertCircle, 
  Download, Calendar, ArrowUpRight, ArrowDownRight, Minus,
  Check, CheckSquare, Square, FileSpreadsheet, FileJson, FileText, Filter,
  Shield, CreditCard, ClipboardList, CheckCircle2, AlertTriangle, Briefcase
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

export default function Reports() {
  const [preset, setPreset] = useState('current_month');
  const [dates, setDates] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('flash'); // flash, revenue, sales, inventory, master_export
  const [propertySettings, setPropertySettings] = useState(null);

  // Master Exporter State
  const [exportType, setExportType] = useState('bookings');
  const [selectedFields, setSelectedFields] = useState({
    reservation_number: true,
    guest_name: true,
    guest_mobile: true,
    room_type_name: true,
    room_number: true,
    stay_type: true,
    check_in_datetime: true,
    check_out_datetime: true,
    status: true,
    entry_type: true,
    payment_method: true,
    description: true,
    debit: true,
    credit: true,
    balance: true,
    created_at: true
  });

  const bookingsFieldsList = [
    { key: 'reservation_number', label: 'Reservation ID' },
    { key: 'guest_name', label: 'Guest Name' },
    { key: 'guest_mobile', label: 'Mobile No' },
    { key: 'room_type_name', label: 'Room Type' },
    { key: 'room_number', label: 'Room No' },
    { key: 'stay_type', label: 'Stay Category' },
    { key: 'check_in_datetime', label: 'Check In Date' },
    { key: 'check_out_datetime', label: 'Check Out Date' },
    { key: 'status', label: 'Stay Status' }
  ];

  const transactionsFieldsList = [
    { key: 'reservation_number', label: 'Reservation No' },
    { key: 'guest_name', label: 'Guest Name' },
    { key: 'entry_type', label: 'Type (Debit/Credit)' },
    { key: 'payment_method', label: 'Payment Channel' },
    { key: 'description', label: 'Transaction Details' },
    { key: 'debit', label: 'Charges (Debit)' },
    { key: 'credit', label: 'Payments (Credit)' },
    { key: 'balance', label: 'Running Balance' },
    { key: 'created_at', label: 'Transaction Date' }
  ];

  const fetchPropertySettings = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get('/api/property/public', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPropertySettings(res.data);
    } catch (err) {
      console.error('Failed to load property settings', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch rooms list', err);
    }
  };

  useEffect(() => {
    fetchPropertySettings();
    fetchRooms();
  }, []);

  const getLocalDateStr = (d) => {
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

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
      case 'this_week': {
        const tempToday = new Date();
        const day = tempToday.getDay();
        const diff = tempToday.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(tempToday.setDate(diff));
        end = new Date();
        break;
      }
      case 'last_week': {
        const tempToday = new Date();
        const day = tempToday.getDay();
        const diff = tempToday.getDate() - day + (day === 0 ? -6 : 1) - 7;
        start = new Date(tempToday.setDate(diff));
        const tempEndToday = new Date(start);
        end = new Date(tempEndToday.setDate(tempEndToday.getDate() + 6));
        break;
      }
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

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  // KPI Calculations
  const totalRoomsCount = rooms.length || 10; // fallback if empty
  const totalBookings = data?.bookings?.length || 0;
  
  // Occupancy metrics
  const checkedInReservations = data?.bookings?.filter(b => b.status === 'Checked In') || [];
  const occupiedRoomsCount = checkedInReservations.length;
  const occupancyPercentage = Math.round((occupiedRoomsCount / totalRoomsCount) * 100);

  // Revenue metrics
  const totalRevenue = data?.metrics?.current?.revenue || 0;
  const totalCollections = data?.metrics?.current?.collections || 0;
  const outstandingFolioBalance = totalRevenue - totalCollections;

  // ADR and RevPAR
  const averageDailyRate = occupiedRoomsCount > 0 ? Math.round(totalRevenue / occupiedRoomsCount) : 0;
  const revenuePerAvailableRoom = Math.round(totalRevenue / totalRoomsCount);

  // Arrivals and Departures
  const totalArrivals = data?.bookings?.filter(b => b.status === 'Reserved') || [];
  const totalDepartures = data?.bookings?.filter(b => b.status === 'Checked In') || [];

  // Room Revenue breakdown
  const revenueByRoomType = {};
  const revenueByStayType = { night: 0, day: 0, hourly: 0 };

  if (data?.bookings) {
    data.bookings.forEach(b => {
      const rt = b.room_type_name || 'Standard Room';
      const rate = b.custom_rate || 1500;
      revenueByRoomType[rt] = (revenueByRoomType[rt] || 0) + rate;
      
      const st = b.stay_type || 'night';
      revenueByStayType[st] = (revenueByStayType[st] || 0) + rate;
    });
  }

  const roomTypeChartData = Object.keys(revenueByRoomType).map(key => ({
    name: key,
    value: revenueByRoomType[key]
  }));

  const stayTypeChartData = Object.keys(revenueByStayType).map(key => ({
    name: key.toUpperCase(),
    value: revenueByStayType[key]
  }));

  // Sales Payments breakdown
  const paymentsByMethod = {};
  if (data?.transactions) {
    data.transactions.forEach(t => {
      if (t.entry_type === 'Payment') {
        const pm = t.payment_method || 'Cash';
        paymentsByMethod[pm] = (paymentsByMethod[pm] || 0) + (t.credit || 0);
      }
    });
  }

  const paymentChartData = Object.keys(paymentsByMethod).map(key => ({
    name: key,
    value: paymentsByMethod[key]
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

  // Inventory logic
  const vacantCleanCount = rooms.filter(r => r.status === 'Vacant Clean').length;
  const vacantDirtyCount = rooms.filter(r => r.status === 'Vacant Dirty').length;
  const outOfOrderCount = rooms.filter(r => r.status === 'Maintenance').length;
  const occupiedCount = rooms.filter(r => r.status === 'Occupied').length;

  // Print Flash Manager Report
  const printFlashReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error('Pop-up blocked! Please allow pop-ups.');

    printWindow.document.write(`
      <html>
        <head>
          <title>Flash Manager Report - ${propertySettings?.name || 'Hotel PMS'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #e2e8f0; padding: 20px; borderRadius: 8px; background: #f8fafc; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .card-value { font-size: 24px; font-weight: 800; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>⚡ Flash Manager Report</h2>
              <p>${propertySettings?.name || 'Hotel PMS'} · Daily Performance</p>
            </div>
            <div style="text-align: right; font-size: 12px;">
              <strong>Date Range:</strong> ${dates.startDate} to ${dates.endDate}<br/>
              <strong>Generated:</strong> ${new Date().toLocaleString()}
            </div>
          </div>
          <div class="grid">
            <div class="card"><div class="card-title">Occupancy Rate</div><div class="card-value">${occupancyPercentage}%</div></div>
            <div class="card"><div class="card-title">Average Daily Rate (ADR)</div><div class="card-value">₹${fmt(averageDailyRate)}</div></div>
            <div class="card"><div class="card-title">RevPAR</div><div class="card-value">₹${fmt(revenuePerAvailableRoom)}</div></div>
          </div>
          <div class="grid">
            <div class="card"><div class="card-title">Total Revenue</div><div class="card-value">₹${fmt(totalRevenue)}</div></div>
            <div class="card"><div class="card-title">Total Collections</div><div class="card-value">₹${fmt(totalCollections)}</div></div>
            <div class="card"><div class="card-title">Outstanding Balance</div><div class="card-value">₹${fmt(outstandingFolioBalance)}</div></div>
          </div>
          <h3>Expected Movements Summary</h3>
          <table>
            <thead><tr><th>Res ID</th><th>Guest Name</th><th>Room</th><th>Stay Type</th><th>Status</th></tr></thead>
            <tbody>
              ${data?.bookings?.map(b => `<tr><td>${b.reservation_number}</td><td>${b.guest_name}</td><td>Room ${b.room_number || 'Unassigned'}</td><td>${b.stay_type}</td><td>${b.status}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  // Exporters for Excel / JSON
  const handleExportJSON = () => {
    if (!data) return;
    const sourceList = exportType === 'bookings' ? data.bookings : data.transactions;
    const activeKeys = Object.keys(selectedFields).filter(k => selectedFields[k]);

    const filteredData = sourceList.map(item => {
      const filteredItem = {};
      activeKeys.forEach(k => { if (item[k] !== undefined) filteredItem[k] = item[k]; });
      return filteredItem;
    });

    const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType}_custom_report_${dates.startDate}_to_${dates.endDate}.json`;
    link.click();
    toast.success('JSON Export completed successfully 📊');
  };

  const handleExportCSV = () => {
    if (!data) return;
    const sourceList = exportType === 'bookings' ? data.bookings : data.transactions;
    const fieldsList = exportType === 'bookings' ? bookingsFieldsList : transactionsFieldsList;
    const activeFields = fieldsList.filter(f => selectedFields[f.key]);

    if (activeFields.length === 0) return toast.error('Please select at least one field.');

    const headers = activeFields.map(f => f.label);
    const rows = sourceList.map(item => 
      activeFields.map(f => {
        const val = item[f.key];
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType}_custom_report_${dates.startDate}_to_${dates.endDate}.csv`;
    link.click();
    toast.success('CSV Export completed successfully 📈');
  };

  const previewSource = data ? (exportType === 'bookings' ? data.bookings : data.transactions) : [];
  const previewFields = exportType === 'bookings' ? bookingsFieldsList : transactionsFieldsList;

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>

      {/* Header & Date presets */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={28} className="text-primary" />
            Hotel Reports &amp; Analytics
          </h1>
          <p className="page-subtitle">Configure business intelligence modules, exports, and daily manager sheets.</p>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'last_week', label: 'Last Week' },
            { id: 'current_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'ytd', label: 'YTD' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              style={{
                border: 'none', padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: '0.78rem',
                fontWeight: 600, cursor: 'pointer', background: preset === p.id ? 'var(--brand-600)' : 'transparent',
                color: preset === p.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom range selectors */}
      <div style={{
        display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--surface)', padding: '14px 18px', borderRadius: 'var(--r-md)',
        border: '1px solid var(--border)', width: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timeframe</span>
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
          <RefreshCw size={12} /> Apply Timeframe
        </button>
      </div>

      {/* ── REPORT SUB-NAVIGATION ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '12px', paddingBottom: '2px', flexWrap: 'wrap' }}>
        {[
          { id: 'flash', label: '⚡ Flash Manager Report' },
          { id: 'revenue', label: '🛏️ Room Revenue Report' },
          { id: 'sales', label: '💰 Sales & Payments' },
          { id: 'inventory', label: '📋 Room Inventory Report' },
          { id: 'master_export', label: '📊 Master Report Module' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: 600,
              borderBottom: activeTab === tab.id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', flexDirection: 'column', gap: '14px', color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.875rem' }}>Compiling hotel database analytics…</span>
        </div>
      ) : error || !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Could not compile PMS reports.</p>
          <button onClick={fetchReportData} className="glass-btn"><RefreshCw size={14} /> Retry</button>
        </div>
      ) : (
        <>
          {/* ── FLASH MANAGER TAB ── */}
          {activeTab === 'flash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Daily Performance KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Occupancy Rate</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{occupancyPercentage}%</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{occupiedRoomsCount} / {totalRoomsCount} rooms active</span>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Average Daily Rate (ADR)</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>₹{fmt(averageDailyRate)}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Room Revenue / Active stays</span>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>RevPAR</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>₹{fmt(revenuePerAvailableRoom)}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Room Revenue / Capacity</span>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Arrivals &amp; Departures</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ec4899' }}>{totalArrivals.length} arr / {totalDepartures.length} dep</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Reserved arrivals vs in-house checkout</span>
                </div>
              </div>

              {/* Action and Summary */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Export Executive Summary</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Download or print the daily manager performance sheet detailing revenue metrics and arrivals checklists.</p>
                </div>
                <button onClick={printFlashReport} className="glass-btn glass-btn-primary" style={{ gap: '8px', padding: '10px 18px' }}>
                  <FileText size={16} /> Compile &amp; Print Flash Sheet
                </button>
              </div>

            </div>
          )}

          {/* ── ROOM REVENUE TAB ── */}
          {activeTab === 'revenue' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              
              {/* Revenue splits charts */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '18px' }}>Revenue shares by Room Category</h3>
                {roomTypeChartData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No room category transactions.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={roomTypeChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {roomTypeChartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${fmt(v)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Hourly splits */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '18px' }}>Revenue shares by Stay Categories</h3>
                {stayTypeChartData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No stay categories transactions.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stayTypeChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {stayTypeChartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${fmt(v)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          )}

          {/* ── SALES & PAYMENTS TAB ── */}
          {activeTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Financial Balance Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MTD Generated Revenue</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{fmt(totalRevenue)}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total billed room &amp; retail charges</span>
                </div>
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MTD Cash/Online Collections</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{fmt(totalCollections)}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total payments received on folios</span>
                </div>
                <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #dc2626' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Pending Outstanding Balance</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>₹{fmt(outstandingFolioBalance)}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Unsettled folio debts</span>
                </div>
              </div>

              {/* Payment Splits */}
              <div className="glass-panel" style={{ padding: '24px', maxWidth: '500px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '18px' }}>Collections Split by Payment Channel</h3>
                {paymentChartData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No payment collections.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {paymentChartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${fmt(v)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          )}

          {/* ── ROOM INVENTORY TAB ── */}
          {activeTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Occupancy and housekeeping metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vacant Clean</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{vacantCleanCount}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vacant Dirty</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{vacantDirtyCount}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Occupied Rooms</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{occupiedCount}</div>
                </div>
                <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Out-of-Order Maintenance</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#64748b' }}>{outOfOrderCount}</div>
                </div>
              </div>

              {/* Maintenance Blocks */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                  Out-of-Service &amp; Maintenance Allocations
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <th style={{ padding: '10px 8px' }}>Room Number</th>
                        <th style={{ padding: '10px 8px' }}>Capacity</th>
                        <th style={{ padding: '10px 8px' }}>Floor</th>
                        <th style={{ padding: '10px 8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.filter(r => r.status === 'Maintenance').length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>No rooms currently blocked for maintenance.</td>
                        </tr>
                      ) : (
                        rooms.filter(r => r.status === 'Maintenance').map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>Room {r.room_number}</td>
                            <td style={{ padding: '10px 8px' }}>Capacity: {r.capacity} pax</td>
                            <td style={{ padding: '10px 8px' }}>Floor {r.floor}</td>
                            <td style={{ padding: '10px 8px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>Maintenance</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ── MASTER EXPORT MODULE ── */}
          {activeTab === 'master_export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '16px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99,102,241,0.15)',
                display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>1. Select Table Dataset:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setExportType('bookings')}
                      className={`glass-btn ${exportType === 'bookings' ? 'glass-btn-primary' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Bookings Records
                    </button>
                    <button
                      onClick={() => setExportType('transactions')}
                      className={`glass-btn ${exportType === 'transactions' ? 'glass-btn-primary' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Transaction Ledger
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '10px' }}>
                    2. Select Columns to Include in Output:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(exportType === 'bookings' ? bookingsFieldsList : transactionsFieldsList).map(field => (
                      <button
                        key={field.key}
                        onClick={() => toggleField(field.key)}
                        style={{
                          border: '1.5px solid',
                          borderColor: selectedFields[field.key] ? 'var(--primary)' : 'var(--border)',
                          background: selectedFields[field.key] ? 'rgba(99, 102, 241, 0.1)' : '#fff',
                          color: selectedFields[field.key] ? 'var(--primary)' : 'var(--text-muted)',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {selectedFields[field.key] ? <CheckSquare size={13} /> : <Square size={13} />}
                        {field.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    onClick={handleExportCSV}
                    className="glass-btn"
                    style={{ borderColor: '#10b981', color: '#10b981', fontSize: '0.82rem', padding: '10px 16px', gap: '8px', background: '#ecfdf5', fontWeight: 700 }}
                  >
                    <FileSpreadsheet size={16} /> Export Custom Excel / CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="glass-btn"
                    style={{ borderColor: '#3b82f6', color: '#3b82f6', fontSize: '0.82rem', padding: '10px 16px', gap: '8px', background: '#eff6ff', fontWeight: 700 }}
                  >
                    <FileJson size={16} /> Export Raw JSON Format
                  </button>
                </div>
              </div>

              {/* Live Preview Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Live Output Preview (First 5 Rows):</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matched Timeframe: {dates.startDate} to {dates.endDate}</span>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
                        {previewFields.filter(f => selectedFields[f.key]).map(f => (
                          <th key={f.key} style={{ padding: '10px 12px', fontWeight: 600 }}>{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewSource.length === 0 ? (
                        <tr>
                          <td colSpan={100} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found in this range.</td>
                        </tr>
                      ) : (
                        previewSource.slice(0, 5).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            {previewFields.filter(f => selectedFields[f.key]).map(f => {
                              let val = row[f.key] === null || row[f.key] === undefined ? '—' : row[f.key];
                              if (f.key === 'debit' || f.key === 'credit' || f.key === 'balance') {
                                val = val !== '—' ? `₹${parseFloat(val).toFixed(2)}` : '—';
                              }
                              if (f.key === 'status') {
                                val = (
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                                    background: val === 'Checked In' ? '#dcfce7' : val === 'Checked Out' ? '#f1f5f9' : '#fef3c7',
                                    color: val === 'Checked In' ? '#16a34a' : val === 'Checked Out' ? '#475569' : '#d97706'
                                  }}>
                                    {val}
                                  </span>
                                );
                              }
                              return <td key={f.key} style={{ padding: '10px 12px' }}>{val}</td>;
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
