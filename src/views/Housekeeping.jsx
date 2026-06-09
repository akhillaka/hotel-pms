import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, UserCheck, CheckSquare, Play, Clipboard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Housekeeping({ user }) {
  const [tasks, setTasks] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchData();
  }, []);

  const updateTask = async (taskId, fields) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/housekeeping/tasks/${taskId}`, fields, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Task updated successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    }
  };

  const isManagerOrAdmin = ['Manager', 'Admin'].includes(user.role);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '14px', color: 'var(--text-muted)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e9f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.875rem' }}>Loading housekeeping tasks…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const columns = {
    'Pending': tasks.filter(t => t.status === 'Pending'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'Completed': tasks.filter(t => t.status === 'Completed'),
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.4px' }}>Housekeeping Board</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.855rem', marginTop: '2px' }}>
            Manage room cleaning activities, allocate staff, and track task completion.
          </p>
        </div>
        <button onClick={fetchData} className="glass-btn" style={{ gap: '6px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {Object.entries(columns).map(([colStatus, colTasks]) => (
          <div
            key={colStatus}
            className="glass-panel"
            style={{
              padding: '16px',
              background: '#fff',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '400px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: colStatus === 'Pending' ? '#f59e0b' : colStatus === 'In Progress' ? '#3b82f6' : '#10b981',
                  }}
                />
                {colStatus}
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'var(--border)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  color: 'var(--text-muted)',
                }}
              >
                {colTasks.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
              {colTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--border)',
                    background: '#fafafa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary-light)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Room {task.room_number}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#ecfdf5',
                        color: '#047857',
                      }}
                    >
                      {task.room_status}
                    </span>
                  </div>

                  {task.remarks && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: '#fff', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      📝 {task.remarks}
                    </div>
                  )}

                  {/* Assignee / Action Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Staff Assigned
                    </label>
                    {isManagerOrAdmin && task.status !== 'Completed' ? (
                      <select
                        className="glass-input"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
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
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        👤 {task.housekeeper_name || 'Unassigned'}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons for housekeepers & managers */}
                  {task.status !== 'Completed' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => updateTask(task.id, { status: 'In Progress' })}
                          className="glass-btn"
                          style={{ flex: 1, padding: '5px', fontSize: '0.75rem', gap: '4px', borderColor: '#3b82f6', color: '#2563eb' }}
                        >
                          <Play size={12} /> Start Cleaning
                        </button>
                      )}
                      {task.status === 'In Progress' && (
                        <button
                          onClick={() => updateTask(task.id, { status: 'Completed' })}
                          className="glass-btn"
                          style={{ flex: 1, padding: '5px', fontSize: '0.75rem', gap: '4px', borderColor: '#10b981', color: '#059669' }}
                        >
                          <CheckSquare size={12} /> Mark Done
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {colTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={20} style={{ color: '#d1d9e6' }} />
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
