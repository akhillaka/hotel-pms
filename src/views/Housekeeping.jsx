import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  RefreshCw, CheckSquare, Play, AlertCircle,
  Sparkles, User, Clock, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const COL_META = {
  'Pending':     { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b' },
  'In Progress': { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', dot: '#3b82f6' },
  'Completed':   { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', dot: '#10b981' },
};

export default function Housekeeping({ user }) {
  const [tasks, setTasks]                 = useState([]);
  const [housekeepers, setHousekeepers]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('board');
  const [sortByPriority, setSortByPriority] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      const headers = { Authorization: `Bearer ${token}` };
      const [tasksRes, hkRes] = await Promise.all([
        axios.get('/api/housekeeping/tasks', { headers }),
        axios.get('/api/housekeepers', { headers }),
      ]);
      setTasks(tasksRes.data);
      setHousekeepers(hkRes.data);
    } catch {
      toast.error('Failed to load housekeeping details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateTask = async (taskId, fields) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/housekeeping/tasks/${taskId}`, fields, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Task updated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    }
  };

  const isManager = ['Manager', 'Admin'].includes(user.role);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading housekeeping board…</span>
    </div>
  );

  const getPriorityScore = (task) => {
    const prio = task.priority || 'medium';
    return { high: 3, medium: 2, low: 1 }[prio];
  };

  const sortTasks = (taskList) => {
    if (!sortByPriority) return taskList;
    return [...taskList].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  };

  const columns = {
    'Pending':     sortTasks(tasks.filter(t => t.status === 'Pending')),
    'In Progress': sortTasks(tasks.filter(t => t.status === 'In Progress')),
    'Completed':   sortTasks(tasks.filter(t => t.status === 'Completed')),
  };

  const totalTasks    = tasks.length;
  const pendingCount  = columns['Pending'].length;
  const inProgCount   = columns['In Progress'].length;
  const doneCount     = columns['Completed'].length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--brand-500)' }} />
            Housekeeping Board
          </h1>
          <p className="page-subtitle">Manage room cleaning tasks and staff assignments</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSortByPriority(!sortByPriority)}
            className={`btn btn-sm ${sortByPriority ? 'btn-primary' : 'btn-default'}`}
            style={{ fontSize: '0.8rem', fontWeight: 600 }}
          >
            ⚠️ {sortByPriority ? 'Priority Sorted' : 'Sort by Priority'}
          </button>
          <button onClick={fetchData} className="btn btn-default btn-sm">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Total Tasks', val: totalTasks, cls: '' },
          { label: 'Pending',     val: pendingCount,  cls: 'amber' },
          { label: 'In Progress', val: inProgCount,   cls: 'blue'  },
          { label: 'Completed',   val: doneCount,     cls: 'green' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`stat-tile ${cls}`}>
            <span className="stat-tile-label">{label}</span>
            <span className="stat-tile-val">{val}</span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        alignItems: 'flex-start',
      }}>
        {Object.entries(columns).map(([colStatus, colTasks]) => {
          const meta = COL_META[colStatus];
          return (
            <div
              key={colStatus}
              style={{
                background: meta.bg,
                border: `1.5px solid ${meta.border}`,
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${meta.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: meta.dot,
                  }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: meta.color }}>
                    {colStatus}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  background: 'rgba(0,0,0,0.07)',
                  padding: '2px 8px', borderRadius: '20px',
                  color: meta.color,
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '32px 16px', gap: '8px',
                    color: 'rgba(0,0,0,0.25)',
                  }}>
                    <AlertCircle size={22} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>No tasks</span>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderRadius: 'var(--r-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
                    >
                      {/* Room & status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
                            Room {task.room_number}
                          </span>
                          
                          {/* Priority Indicator */}
                          {(() => {
                            const priority = task.priority || 'medium';
                            const prioColors = {
                              high: { bg: '#fee2e2', border: '#fca5a5', text: '#ef4444' },
                              medium: { bg: '#fef3c7', border: '#fcd34d', text: '#d97706' },
                              low: { bg: '#f1f5f9', border: '#cbd5e1', text: '#64748b' }
                            }[priority];
                            
                            return isManager && task.status !== 'Completed' ? (
                              <select
                                value={priority}
                                onChange={(e) => {
                                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: e.target.value } : t));
                                  updateTask(task.id, { priority: e.target.value });
                                }}
                                style={{
                                  padding: '2px 4px', fontSize: '0.65rem', fontWeight: 700, borderRadius: '4px',
                                  background: prioColors.bg, borderColor: prioColors.border, color: prioColors.text,
                                  cursor: 'pointer', outline: 'none'
                                }}
                              >
                                <option value="high">🔴 HIGH</option>
                                <option value="medium">🟡 MED</option>
                                <option value="low">⚪ LOW</option>
                              </select>
                            ) : (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                background: prioColors.bg, border: `1px solid ${prioColors.border}`, color: prioColors.text
                              }}>
                                {priority.toUpperCase()}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="badge badge-slate" style={{ fontSize: '0.62rem' }}>
                          {task.room_status}
                        </span>
                      </div>

                      {/* Checklist */}
                      <div style={{ marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '6px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                          Cleaning Checklist
                        </span>
                        {(() => {
                          let checklist = [];
                          try {
                            checklist = typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist;
                          } catch (e) { checklist = []; }
                          
                          if (!Array.isArray(checklist) || checklist.length === 0) return null;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {checklist.map((item) => (
                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', cursor: task.status === 'Completed' ? 'default' : 'pointer', color: item.completed ? 'var(--text-muted)' : 'var(--text-2)' }}>
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    disabled={task.status === 'Completed'}
                                    onChange={() => {
                                      const nextChecklist = checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
                                      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checklist: JSON.stringify(nextChecklist) } : t));
                                      updateTask(task.id, { checklist: nextChecklist });
                                    }}
                                    style={{ width: '13px', height: '13px', accentColor: 'var(--brand-600)' }}
                                  />
                                  <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.text}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Remarks */}
                      {task.remarks && (
                        <div style={{
                          fontSize: '0.76rem', color: 'var(--text-muted)',
                          background: 'var(--surface-2)',
                          padding: '5px 8px', borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--border)',
                          lineHeight: 1.4,
                        }}>
                          {task.remarks}
                        </div>
                      )}

                      {/* Assignee */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Assigned To
                        </span>
                        {isManager && task.status !== 'Completed' ? (
                          <select
                            className="input"
                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                            value={task.assigned_to || ''}
                            onChange={e => updateTask(task.id, { assigned_to: e.target.value || null })}
                          >
                            <option value="">— Unassigned —</option>
                            {housekeepers.map(hk => (
                              <option key={hk.username} value={hk.username}>
                                {hk.name} ({hk.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)',
                            display: 'flex', alignItems: 'center', gap: '5px',
                          }}>
                            <User size={12} style={{ color: 'var(--text-faint)' }} />
                            {task.housekeeper_name || 'Unassigned'}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {task.status !== 'Completed' && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          {task.status === 'Pending' && (
                            <button
                              onClick={() => updateTask(task.id, { status: 'In Progress' })}
                              className="btn btn-sm"
                              style={{ flex: 1, borderColor: '#93c5fd', color: '#2563eb', background: '#eff6ff' }}
                            >
                              <Play size={11} /> Start
                            </button>
                          )}
                          {task.status === 'In Progress' && (
                            <button
                              onClick={() => updateTask(task.id, { status: 'Completed' })}
                              className="btn btn-sm"
                              style={{ flex: 1, borderColor: '#6ee7b7', color: '#059669', background: '#ecfdf5' }}
                            >
                              <CheckCircle2 size={11} /> Mark Done
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const issue = window.prompt(`Report maintenance issue for Room ${task.room_number}:`);
                              if (!issue) return;
                              try {
                                const token = localStorage.getItem('pms_token');
                                await axios.post('/api/maintenance', {
                                  room_id: task.room_id,
                                  issue
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                toast.success('Maintenance ticket logged & room blocked');
                                fetchData();
                              } catch (e) {
                                toast.error('Failed to log maintenance issue');
                              }
                            }}
                            className="btn btn-sm"
                            style={{ flex: 1, borderColor: '#cbd5e1', color: '#64748b', background: '#f8fafc' }}
                            title="Report Room issue to Maintenance"
                          >
                            🔧 Report
                          </button>
                        </div>
                      )}

                      {task.status === 'Completed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '0.72rem', fontWeight: 600, color: '#059669',
                          }}>
                            <CheckSquare size={12} /> Cleaned & Ready
                          </div>
                          {task.updated_at && (
                            <div style={{
                              fontSize: '0.65rem',
                              color: 'var(--text-faint)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={10} /> Completed {new Date(task.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
