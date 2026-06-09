import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ShieldAlert, FileSearch, Check, RefreshCw, Search, Filter, Clock, User, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  RESERVATION_CREATE: '#6366f1',
  CHECK_IN:           '#0284c7',
  CHECK_OUT_COMPLETED:'#059669',
  PAYMENT_RECORDED:   '#059669',
  ONLINE_PAYMENT_RECEIVED: '#7c3aed',
  FOLIO_ENTRY_REVERSED:'#dc2626',
  CANCEL:             '#dc2626',
  USER_CREATED:       '#0891b2',
  USER_UPDATED:       '#0891b2',
  INTEGRATIONS_CONFIG_UPDATED: '#b45309',
  GATEWAY_SETTINGS_UPDATE:     '#b45309',
  ROLE_PERMISSIONS_UPDATE:     '#d97706',
};
const actionColor = (action) => {
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (action.includes(k)) return v;
  }
  return '#64748b';
};

export default function Audit() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.get('/api/audit', { headers: { Authorization: `Bearer ${token}` } });
      setLogs(res.data);
    } catch {
      toast.error('Access denied — Admin or Manager required');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isMobile) fetchLogs(); }, [isMobile]);

  // Unique actors for filter dropdown
  const actors = useMemo(() => ['All', ...new Set(logs.map(l => l.username))], [logs]);

  const filtered = useMemo(() => logs.filter(log => {
    const matchActor  = filter === 'All' || log.username === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || log.action?.toLowerCase().includes(q) ||
      log.username?.toLowerCase().includes(q) ||
      log.new_value?.toLowerCase().includes(q) ||
      log.old_value?.toLowerCase().includes(q);
    return matchActor && matchSearch;
  }), [logs, search, filter]);

  if (isMobile) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', padding:'16px' }}>
      <div className="glass-panel" style={{ padding:'32px', maxWidth:'420px', textAlign:'center', background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)' }}>
        <ShieldAlert size={48} style={{ color:'#dc2626', marginBottom:'14px' }} />
        <h2 style={{ fontSize:'1.2rem', fontWeight:800 }}>Desktop Only</h2>
        <p style={{ color:'var(--text-muted)', fontSize:'0.84rem', marginTop:'8px', lineHeight:1.5 }}>
          Audit logs are restricted to desktop terminals to protect compliance integrity.
        </p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'1.65rem', fontWeight:800, letterSpacing:'-0.4px' }}>Audit & Compliance Ledger</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.855rem', marginTop:'2px' }}>
            Immutable log of all system events, overrides and changes
          </p>
        </div>
        <button onClick={fetchLogs} className="glass-btn" style={{ gap:'6px', height:'38px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI pills */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        {[
          { label:'Total Events', value: logs.length, icon: <Activity size={14} />, color:'#6366f1' },
          { label:'Unique Actors', value: actors.length - 1, icon: <User size={14} />, color:'#0284c7' },
          { label:'Today', value: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length, icon: <Clock size={14} />, color:'#059669' },
        ].map(k => (
          <div key={k.label} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', background:'#fff', borderRadius:'var(--r-sm)', border:'1.5px solid var(--border)', fontSize:'0.82rem' }}>
            <span style={{ color:k.color }}>{k.icon}</span>
            <span style={{ fontWeight:800, color:k.color }}>{k.value}</span>
            <span style={{ color:'var(--text-muted)' }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'220px', position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input
            className="glass-input"
            placeholder="Search events, users, values…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:'34px' }}
          />
        </div>
        <div style={{ position:'relative', minWidth:'180px' }}>
          <Filter size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          <select className="glass-input" value={filter} onChange={e => setFilter(e.target.value)} style={{ paddingLeft:'32px' }}>
            {actors.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actors' : a}</option>)}
          </select>
        </div>
      </div>

      {/* Log table */}
      <div className="glass-panel" style={{ padding:'0', background:'#fff', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'8px' }}>
          <FileSearch size={16} style={{ color:'var(--primary)' }} />
          <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Tamper-Proof Operations Log</span>
          <span style={{ marginLeft:'auto', fontSize:'0.72rem', fontWeight:700, color:'#6366f1', background:'#eef2ff', padding:'2px 8px', borderRadius:'10px' }}>
            {filtered.length} entries
          </span>
        </div>

        {loading ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.855rem' }}>
            <div style={{ width:28, height:28, border:'3px solid #e2e8f0', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 12px' }} />
            Fetching security registry…
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1.5px solid var(--border)' }}>
                  {['Timestamp', 'Actor', 'Event', 'Before', 'After / Details', 'Status'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
                      No matching audit events found
                    </td>
                  </tr>
                ) : filtered.map((log, i) => {
                  const color = actionColor(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom:'1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fafbfc', transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}
                    >
                      <td style={{ padding:'10px 14px', color:'var(--text-muted)', fontSize:'0.72rem', whiteSpace:'nowrap' }}>
                        <div>{new Date(log.timestamp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                        <div style={{ marginTop:'1px' }}>{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.68rem', color:'#6366f1' }}>
                            {(log.username || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight:600 }}>{log.username}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'3px 8px', borderRadius:'8px', background:`${color}12`, color, whiteSpace:'nowrap' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--text-muted)', maxWidth:'180px' }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={log.old_value}>
                          {log.old_value || <span style={{ opacity:0.4 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', maxWidth:'220px' }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }} title={log.new_value}>
                          {log.new_value || <span style={{ color:'var(--text-muted)', opacity:0.4 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.68rem', fontWeight:700, color:'#059669', background:'#d1fae5', padding:'3px 8px', borderRadius:'8px' }}>
                          <Check size={10} /> SECURED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
