import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  DollarSign, TrendingUp, TrendingDown, PlusCircle, Search, Filter, 
  Printer, ArrowUpRight, ArrowDownRight, User, Calendar, Check, AlertTriangle,
  Lock, Unlock, Wallet, CreditCard, Smartphone, History, BarChart3, Activity, List
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MoneyManager({ user, permission }) {
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [activeRegister, setActiveRegister] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab/Filter state for Master Ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time'); // 'Today', 'Yesterday', 'This Week', 'This Month', 'Year to Date', 'Custom Range', 'All Time'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Register open/close form state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openCash, setOpenCash] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Dialog logging form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [formType, setFormType] = useState('Income');
  const [formCategory, setFormCategory] = useState('Room Tariff');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const categories = [
    'Room Tariff', 'Food & Beverage', 'Maintenance', 'Utilities', 'Salaries', 'Inventory', 'Other'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('pms_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [txnsRes, currentRes, historyRes] = await Promise.all([
        axios.get('/api/transactions', { headers }),
        axios.get('/api/ledger/current', { headers }),
        axios.get('/api/ledger/history', { headers })
      ]);

      setTransactions(txnsRes.data);
      setActiveRegister(currentRes.data);
      setShiftHistory(historyRes.data);
    } catch (err) {
      toast.error('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied');
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/ledger/open', {
        opening_cash: parseFloat(openCash) || 0,
        notes: openNotes
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Shift Register Opened successfully!');
      setActiveRegister(res.data);
      setShowOpenModal(false);
      setOpenCash(''); setOpenNotes('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open register');
    }
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied');
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/ledger/close', {
        actual_cash: parseFloat(actualCash) || 0,
        notes: closeNotes
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success(`Shift Register Closed! Discrepancy: ₹${res.data.cash_discrepancy}`);
      setActiveRegister(null);
      setShiftHistory([res.data, ...shiftHistory]);
      setShowCloseModal(false);
      setActualCash(''); setCloseNotes('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to close register');
    }
  };

  const handleLogTransaction = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied');
    if (!formAmount || !formDesc) return toast.error('Please fill in all fields');

    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/transactions', {
        type: formType,
        amount: parseFloat(formAmount),
        category: formCategory,
        description: formDesc
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(`Transaction logged successfully`);
      setTransactions(prev => [res.data, ...prev]);
      setShowLogModal(false);
      
      setFormAmount(''); setFormDesc('');
      setFormCategory('Room Tariff'); setFormType('Income');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post transaction');
    }
  };

  // Helper dates using Indian Time Zone
  const getISTDate = (d = new Date()) => {
    const s = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(s);
  };

  const today = getISTDate();
  today.setHours(0,0,0,0);
  const todayStr = today.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay());
  
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Date Filtered Transactions (for Stat Cards & Ledger Base)
  const dateFilteredTxns = useMemo(() => transactions.filter(t => {
    if (!t.created_at) return false;
    let matchesDate = true;
    const txDateStr = new Date(t.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const txDateObj = new Date(t.created_at);
    
    if (dateFilter === 'Today') matchesDate = txDateStr === todayStr;
    if (dateFilter === 'Yesterday') matchesDate = txDateStr === yesterdayStr;
    if (dateFilter === 'This Week') matchesDate = txDateObj >= thisWeek;
    if (dateFilter === 'This Month') matchesDate = txDateObj >= thisMonth;
    if (dateFilter === 'Year to Date') matchesDate = txDateObj >= startOfYear;
    if (dateFilter === 'Custom Range') {
      if (customStartDate && txDateStr < customStartDate) matchesDate = false;
      if (customEndDate && txDateStr > customEndDate) matchesDate = false;
    }
    return matchesDate;
  }), [transactions, dateFilter, todayStr, yesterdayStr, thisWeek, thisMonth, startOfYear, customStartDate, customEndDate]);

  const todaysTxns = dateFilteredTxns;

  const getCleanDesc = (t) => (t.description || '').toLowerCase();

  const todayCash = todaysTxns.filter(t => t.type === 'Income' && getCleanDesc(t).includes('cash')).reduce((s,t) => s+t.amount, 0)
                  + todaysTxns.filter(t => t.type === 'Income' && !getCleanDesc(t).includes('upi') && !getCleanDesc(t).includes('card') && !getCleanDesc(t).includes('cash')).reduce((s,t) => s+t.amount, 0); // fallback to cash if unknown
  const todayCard = todaysTxns.filter(t => t.type === 'Income' && getCleanDesc(t).includes('card')).reduce((s,t) => s+t.amount, 0);
  const todayUpi = todaysTxns.filter(t => t.type === 'Income' && getCleanDesc(t).includes('upi')).reduce((s,t) => s+t.amount, 0);
  const todayExpenses = todaysTxns.filter(t => t.type === 'Expense').reduce((s,t) => s+t.amount, 0);
  const todayTotalIncome = todayCash + todayCard + todayUpi;

  // Transaction tab filters (Applies search query, type, and category filters on top of the date filter)
  const filteredTxns = useMemo(() => dateFilteredTxns.filter(t => {
    const matchesSearch = 
      (t.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.created_by || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  }), [dateFilteredTxns, searchQuery, typeFilter, categoryFilter]);

  // Analytics logic (Last 7 days)
  const miniChartData = useMemo(() => {
    const days = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      days.push({ key: dateStr, amount: 0, dateObj: d });
    }
    
    transactions.filter(t => t.type === 'Income').forEach(t => {
      const tDate = new Date(t.created_at);
      const dateStr = tDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });
      const match = days.find(d => d.key === dateStr);
      if (match) match.amount += t.amount;
    });
    
    return days;
  }, [transactions]);

  const getOverviewTitle = () => {
    if (dateFilter === 'Today') return "Today's Collections Overview";
    if (dateFilter === 'Yesterday') return "Yesterday's Collections Overview";
    if (dateFilter === 'This Week') return "This Week's Collections Overview";
    if (dateFilter === 'This Month') return "This Month's Collections Overview";
    if (dateFilter === 'Year to Date') return "Year to Date Collections Overview";
    if (dateFilter === 'Custom Range') {
      const startParsed = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
      const endParsed = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;
      const startDisplay = startParsed && !isNaN(startParsed.getTime()) ? startParsed.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : '...';
      const endDisplay = endParsed && !isNaN(endParsed.getTime()) ? endParsed.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : '...';
      return `Collections Overview (${startDisplay} to ${endDisplay})`;
    }
    return "All Time Collections Overview";
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 16px' }}/>Loading dashboard...</div>;

  const maxChartVal = Math.max(...miniChartData.map(d => d.amount), 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Financial Dashboard</h1>
          <p className="page-subtitle">Track your property's cash flow, shift registers, and daily collections</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Preset Date Selector tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { id: 'All Time', label: 'All Time' },
              { id: 'Today', label: 'Today' },
              { id: 'Yesterday', label: 'Yesterday' },
              { id: 'This Week', label: 'This Week' },
              { id: 'This Month', label: 'This Month' },
              { id: 'Year to Date', label: 'Year to Date' },
              { id: 'Custom Range', label: 'Custom Range' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                style={{
                  border: 'none', padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: '0.78rem',
                  fontWeight: 600, cursor: 'pointer', background: dateFilter === p.id ? 'var(--brand-600)' : 'transparent',
                  color: dateFilter === p.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {permission === 'edit' && (
            <button onClick={() => setShowLogModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={16} /> Log Transaction
            </button>
          )}
          <button onClick={() => window.print()} className="btn btn-default" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {dateFilter === 'Custom Range' && (
        <div style={{
          display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
          background: 'var(--surface)', padding: '14px 18px', borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)', width: 'fit-content', marginTop: '-8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timeframe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              className="glass-input"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '135px' }}
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="glass-input"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: '135px' }}
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* TOP ROW: DYNAMIC METRICS */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '-8px' }}>{getOverviewTitle()}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-tile" style={{ background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Income</span>
            <DollarSign size={16} className="text-brand" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '8px' }}>₹{todayTotalIncome.toFixed(2)}</div>
        </div>
        <div className="stat-tile" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Cash Volume</span>
            <Wallet size={16} color="#166534" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#166534', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>₹{todayCash.toFixed(2)}</div>
        </div>
        <div className="stat-tile" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Card & Gateway</span>
            <CreditCard size={16} color="#1e40af" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e40af', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>₹{todayCard.toFixed(2)}</div>
        </div>
        <div className="stat-tile" style={{ background: '#faf5ff', borderColor: '#e9d5ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>UPI Volume</span>
            <Smartphone size={16} color="#6b21a8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6b21a8', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>₹{todayUpi.toFixed(2)}</div>
        </div>
        <div className="stat-tile" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Expenses</span>
            <TrendingDown size={16} color="#991b1b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#991b1b', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>₹{todayExpenses.toFixed(2)}</div>
        </div>
      </div>

      {/* MIDDLE ROW: CHART */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'stretch' }}>
        {/* Revenue Chart */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px' }}>Revenue Last 7 Days</h3>
          <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-end', minHeight: '180px' }}>
            {miniChartData.map(d => (
              <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '100%', maxWidth: '30px', background: 'var(--brand-gradient)', height: `${(d.amount/maxChartVal)*100}%`, borderRadius: '4px 4px 0 0', minHeight: '4px' }} title={`₹${d.amount.toFixed(2)}`} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: MASTER LEDGER */}
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Master Transaction Ledger</h2>
            <p className="page-subtitle" style={{ margin: '2px 0 0 0' }}>Audit and search all historical cash flows and bookings ledger entries</p>
          </div>
        </div>

        <div className="filter-bar no-print" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1', minWidth: '260px' }}>
            <Search className="search-icon" size={16} />
            <input 
              type="text" placeholder="Search by Transaction ID or description..." 
              className="glass-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
              <button onClick={() => setTypeFilter('All')} className={`filter-pill ${typeFilter === 'All' ? 'active' : ''}`} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>All</button>
              <button onClick={() => setTypeFilter('Income')} className={`filter-pill ${typeFilter === 'Income' ? 'active' : ''}`} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Incomes</button>
              <button onClick={() => setTypeFilter('Expense')} className={`filter-pill ${typeFilter === 'Expense' ? 'active' : ''}`} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Expenses</button>
            </div>
            <select className="glass-input" style={{ padding: '6px 12px', fontSize: '0.75rem', height: '34px', width: '150px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>TRANSACTION ID</th>
                <th style={{ padding: '12px 16px' }}>DATE & TIME</th>
                <th style={{ padding: '12px 16px' }}>TYPE</th>
                <th style={{ padding: '12px 16px' }}>CATEGORY</th>
                <th style={{ padding: '12px 16px' }}>DESCRIPTION</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>AMOUNT</th>
                <th style={{ padding: '12px 16px' }}>OPERATOR</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map((txn) => (
                <tr 
                  key={txn.id} 
                  style={{ 
                    borderBottom: '1px solid #e2e8f0',
                    cursor: txn.reservation_id ? 'pointer' : 'default'
                  }} 
                  className="hover-highlight"
                  onClick={() => {
                    if (txn.reservation_id && onViewFolio) {
                      onViewFolio({ id: txn.reservation_id });
                    }
                  }}
                  title={txn.reservation_id ? "Click to view folio" : ""}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: txn.reservation_id ? 'var(--brand-600)' : 'var(--brand-700)', textDecoration: txn.reservation_id ? 'underline' : 'none' }}>{txn.id}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(txn.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td style={{ padding: '12px 16px' }}><span className={`badge ${txn.type === 'Income' ? 'badge-green' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>{txn.type}</span></td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{txn.category}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{txn.description}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: txn.type === 'Income' ? '#166534' : '#991b1b' }}>{txn.type === 'Income' ? '+' : '-'}₹{txn.amount.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{txn.created_by}</td>
                </tr>
              ))}
              {filteredTxns.length === 0 && (
                <tr><td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-faint)' }}>No transactions found for these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* LOG TRANSACTION MODAL */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>Log Cash Flow Transaction</h3>
            <form onSubmit={handleLogTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Flow Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" onClick={() => { setFormType('Income'); setFormCategory('Room Tariff'); }} className={`btn ${formType === 'Income' ? 'btn-primary' : 'btn-default'}`}>📈 INCOME</button>
                  <button type="button" onClick={() => { setFormType('Expense'); setFormCategory('Utilities'); }} className={`btn ${formType === 'Expense' ? 'btn-danger' : 'btn-default'}`}>📉 EXPENSE</button>
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="glass-input" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                  {formType === 'Income' ? (
                    <>
                      <option value="Room Tariff">Room Tariff / Bookings</option>
                      <option value="Food & Beverage">Food & Beverage Sales</option>
                      <option value="Other">Other Ancillary Incomes</option>
                    </>
                  ) : (
                    <>
                      <option value="Utilities">Electricity / Water / Internet</option>
                      <option value="Maintenance">Room & Facility Maintenance</option>
                      <option value="Salaries">Payroll / Staff Salaries</option>
                      <option value="Inventory">Linen & Room Prep restock</option>
                      <option value="Other">Miscellaneous Expenses</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="label">Cash Amount (₹)</label>
                <input type="number" min="0.01" step="0.01" className="glass-input" value={formAmount} onChange={e => setFormAmount(e.target.value)} required />
              </div>
              <div>
                <label className="label">Details / Remarks</label>
                <textarea className="glass-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows="3" required />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowLogModal(false)} className="btn btn-default">Cancel</button>
                <button type="submit" className="btn btn-primary">Commit Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
