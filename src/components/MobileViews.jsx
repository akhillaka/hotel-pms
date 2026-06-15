import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RefreshCw, X, BedDouble, Plus, Search, Calendar, CheckCircle,
  Clock, AlertTriangle, Play, Check, TrendingUp, TrendingDown,
  Users, Key, LogIn, Edit, Trash, ChevronDown, Activity, MoreVertical
} from 'lucide-react';


const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('pms_token')}` } });

const colors = {
  primary: '#4f46e5',
  bg: '#f4f6fa',
  surface: '#fff',
  text: '#0f172a',
  muted: '#64748b',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  slate: '#94a3b8'
};

const cardStyle = {
  borderRadius: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  background: '#fff',
  transition: 'transform 0.15s ease',
};

const sectionHeaderStyle = {
  fontSize: '0.72rem',
  fontWeight: 800,
  color: '#64748b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '16px 0 12px 0'
};

const pageStyle = {
  backgroundColor: colors.bg,
  minHeight: '100vh',
  padding: '16px',
  paddingBottom: '100px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: colors.text,
  boxSizing: 'border-box'
};

const tapTargetStyle = {
  minHeight: '44px',
  minWidth: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const fabStyle = {
  position: 'fixed', bottom: 120, right: 24, width: 56, height: 56,
  borderRadius: 28, background: colors.primary, color: '#fff',
  border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
};

// Utilities
const handleTouchStart = (e) => { e.currentTarget.style.transform = 'scale(0.95)'; };
const handleTouchEnd = (e) => { e.currentTarget.style.transform = 'scale(1)'; };

const Skeleton = ({ height, width, borderRadius = 8, style }) => (
  <div style={{
    height, width, borderRadius, backgroundColor: '#e2e8f0',
    animation: 'pulse 1.5s infinite ease-in-out', ...style
  }} />
);

const ActionSheet = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '24px 20px 40px', boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 8, ...tapTargetStyle }}>
            <X size={24} color={colors.muted}/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const getRoomColor = (status) => {
  switch(status) {
    case 'Vacant Clean': return colors.green;
    case 'Occupied': return colors.primary;
    case 'Dirty': return colors.red;
    case 'Maintenance': return colors.amber;
    case 'Reserved': return colors.slate;
    default: return colors.muted;
  }
};

// 1. MobileRoomBoard
export function MobileRoomBoard() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomTab, setRoomTab] = useState('status');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newRoom, setNewRoom] = useState({});
  const [editRoom, setEditRoom] = useState({});

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/rooms', authH());
      setRooms(data);
    } catch (e) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const changeRoomStatus = async (status) => {
    try {
      await axios.patch(`/api/rooms/${selectedRoom.id}/status`, { status }, authH());
      toast.success(`Room updated to ${status}`);
      setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, status } : r));
      setSelectedRoom(null);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };
  
  const addRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/rooms', newRoom, authH());
      toast.success('Room added');
      setIsAdding(false);
      setNewRoom({});
      fetchRooms();
    } catch(e) { toast.error('Error adding room'); }
  };

  const updateRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/rooms/${selectedRoom.id}`, editRoom, authH());
      toast.success('Room updated');
      setSelectedRoom(null);
      fetchRooms();
    } catch(e) { toast.error('Error updating room'); }
  };

  const deleteRoom = async (id) => {
    if(!window.confirm('Delete room?')) return;
    try {
      await axios.delete(`/api/rooms/${id}`, authH());
      toast.success('Room deleted');
      setSelectedRoom(null);
      fetchRooms();
    } catch(e) { toast.error('Error deleting room'); }
  };

  const counts = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, { 'Vacant Clean': 0, 'Occupied': 0, 'Dirty': 0, 'Maintenance': 0, 'Reserved': 0 });

  const filters = ['All', 'Vacant Clean', 'Occupied', 'Dirty', 'Maintenance', 'Reserved'];
  const filteredRooms = filter === 'All' ? rooms : rooms.filter(r => r.status === filter);

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Room Board</h2>
        <button onClick={fetchRooms} style={{ background: 'none', border: 'none', ...tapTargetStyle }}>
          <RefreshCw size={20} color={colors.primary} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexShrink: 0, alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, color: getRoomColor(k), border: `1px solid ${getRoomColor(k)}30`, whiteSpace: 'nowrap' }}>
            {k}: {v}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 12 }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: filter === f ? colors.primary : '#fff',
              color: filter === f ? '#fff' : colors.muted,
              fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, ...tapTargetStyle
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={100} />)}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
          <BedDouble size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>No rooms found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
          {filteredRooms.map(r => (
            <div
              key={r.id}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => { setSelectedRoom(r); setEditRoom(r); setRoomTab('status'); }}
              style={{
                ...cardStyle, padding: '16px', borderTop: `4px solid ${getRoomColor(r.status)}`,
                display: 'flex', flexDirection: 'column', cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{r.room_number}</span>
              <span style={{ fontSize: '0.8rem', color: colors.muted, marginTop: 4 }}>{r.type_name}</span>
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getRoomColor(r.status) }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button onClick={() => setIsAdding(true)} style={fabStyle}><Plus size={28} /></button>

      <ActionSheet isOpen={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Room ${selectedRoom?.room_number}`}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setRoomTab('status')} style={{ flex: 1, padding: '8px', border: 'none', background: roomTab === 'status' ? colors.primary : colors.bg, color: roomTab === 'status' ? '#fff' : colors.text, borderRadius: 8, fontWeight: 600 }}>Quick Status</button>
          <button onClick={() => setRoomTab('edit')} style={{ flex: 1, padding: '8px', border: 'none', background: roomTab === 'edit' ? colors.primary : colors.bg, color: roomTab === 'edit' ? '#fff' : colors.text, borderRadius: 8, fontWeight: 600 }}>Edit Room</button>
        </div>
        
        {roomTab === 'status' && (
          <div>
            <p style={{ color: colors.muted, marginTop: 0, marginBottom: 16 }}>Current: <strong style={{ color: getRoomColor(selectedRoom?.status) }}>{selectedRoom?.status}</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {['Vacant Clean', 'Dirty', 'Maintenance', 'Reserved'].map(status => (
                <button
                  key={status}
                  onClick={() => changeRoomStatus(status)}
                  style={{
                    padding: '12px', border: 'none', borderRadius: 8,
                    background: getRoomColor(status) + '15',
                    color: getRoomColor(status), fontWeight: 600, ...tapTargetStyle
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}

        {roomTab === 'edit' && (
          <form onSubmit={updateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={editRoom.room_number || ''} onChange={e => setEditRoom({...editRoom, room_number: e.target.value})} placeholder="Room Number" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input required value={editRoom.type_name || ''} onChange={e => setEditRoom({...editRoom, type_name: e.target.value})} placeholder="Room Type" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input type="number" required value={editRoom.capacity || ''} onChange={e => setEditRoom({...editRoom, capacity: Number(e.target.value)})} placeholder="Capacity" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input required value={editRoom.floor || ''} onChange={e => setEditRoom({...editRoom, floor: e.target.value})} placeholder="Floor" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Save Changes</button>
            
            <button type="button" onClick={() => deleteRoom(selectedRoom?.id)} style={{ width: '100%', padding: 12, marginTop: 8, border: 'none', background: colors.red+'15', color: colors.red, borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem' }}>
              <Trash size={16} /> Delete Room
            </button>
          </form>
        )}
      </ActionSheet>
      
      <ActionSheet isOpen={isAdding} onClose={() => setIsAdding(false)} title="Add Room">
        <form onSubmit={addRoom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={newRoom.room_number || ''} onChange={e => setNewRoom({...newRoom, room_number: e.target.value})} placeholder="Room Number" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input required value={newRoom.type_name || ''} onChange={e => setNewRoom({...newRoom, type_name: e.target.value})} placeholder="Room Type" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input type="number" required value={newRoom.capacity || ''} onChange={e => setNewRoom({...newRoom, capacity: Number(e.target.value)})} placeholder="Capacity" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input required value={newRoom.floor || ''} onChange={e => setNewRoom({...newRoom, floor: e.target.value})} placeholder="Floor" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Create Room</button>
        </form>
      </ActionSheet>
    </div>
  );
}

// 2. MobileHousekeeping
export function MobileHousekeeping() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [editRemarks, setEditRemarks] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({});

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/housekeeping/tasks', authH());
      setTasks(data);
    } catch (e) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`/api/housekeeping/tasks/${id}`, { status }, authH());
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      toast.success(`Task ${status}`);
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  const updateChecklist = async (task, itemToUpdate) => {
    let checklist = [];
    try { checklist = typeof task.checklist === 'string' ? JSON.parse(task.checklist) : task.checklist; } catch (e) {}
    const nextChecklist = checklist.map(i => i.id === itemToUpdate.id ? { ...i, completed: !i.completed } : i);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, checklist: JSON.stringify(nextChecklist) } : t));
    try { await axios.patch(`/api/housekeeping/tasks/${task.id}`, { checklist: nextChecklist }, authH()); }
    catch (e) { toast.error('Failed to update checklist'); }
  };
  
  const updateRemarks = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`/api/housekeeping/tasks/${selectedTask.id}`, { remarks: editRemarks }, authH());
      toast.success('Remarks updated');
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, remarks: editRemarks } : t));
      setSelectedTask(null);
    } catch (e) { toast.error('Failed to update remarks'); }
  };
  
  const deleteTask = async (id) => {
    if(!window.confirm('Delete task?')) return;
    try {
      await axios.delete(`/api/housekeeping/tasks/${id}`, authH());
      toast.success('Task deleted');
      setSelectedTask(null);
      fetchTasks();
    } catch(e) { toast.error('Failed to delete task'); }
  };
  
  const createTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/housekeeping/tasks', newTask, authH());
      toast.success('Task created');
      setIsCreating(false);
      setNewTask({});
      fetchTasks();
    } catch(e) { toast.error('Failed to create task'); }
  };

  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const summary = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, { Pending: 0, 'In Progress': 0, Completed: 0 });

  return (
    <div style={pageStyle}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 700 }}>Housekeeping</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Pending', count: summary['Pending'], color: colors.amber },
          { label: 'In Progress', count: summary['In Progress'], color: colors.primary },
          { label: 'Completed', count: summary['Completed'], color: colors.green }
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '0.7rem', color: colors.muted, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
        {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: filter === f ? colors.text : '#fff',
            color: filter === f ? '#fff' : colors.muted,
            fontWeight: 600, whiteSpace: 'nowrap', ...tapTargetStyle
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {[1,2,3].map(i => <Skeleton key={i} height={120} />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
          <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>No tasks found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {filteredTasks.map(t => {
            let checklist = [];
            try { checklist = typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist; } catch (e) {}
            return (
            <div key={t.id} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => { setSelectedTask(t); setEditRemarks(t.remarks || ''); }} style={{ ...cardStyle, padding: '16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Rm {t.room_number}</span>
                <span style={{
                  padding: '4px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                  background: t.status === 'Completed' ? colors.green+'20' : t.status === 'In Progress' ? colors.primary+'20' : colors.amber+'20',
                  color: t.status === 'Completed' ? colors.green : t.status === 'In Progress' ? colors.primary : colors.amber
                }}>{t.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: colors.muted, marginBottom: 8, fontWeight: 600 }}>Task #{t.id.substring(0, 6).toUpperCase()}</div>
              {t.remarks && <p style={{ fontSize: '0.9rem', color: colors.muted, margin: '0 0 12px 0' }}>{t.remarks}</p>}
              
              {/* Checklist */}
              {Array.isArray(checklist) && checklist.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.muted, textTransform: 'uppercase' }}>Checklist</div>
                  {checklist.map(item => (
                    <label key={item.id} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: item.completed ? colors.muted : '#1e293b' }}>
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        disabled={t.status === 'Completed'}
                        onChange={() => updateChecklist(t, item)}
                        style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                      />
                      <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.text}</span>
                    </label>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {t.status === 'Pending' && (
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(t.id, 'In Progress'); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', fontWeight: 600, ...tapTargetStyle }}>
                    <Play size={16} style={{ marginRight: 6, display: 'inline' }} /> Start
                  </button>
                )}
                {t.status === 'In Progress' && (
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(t.id, 'Completed'); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: colors.green, color: '#fff', fontWeight: 600, ...tapTargetStyle }}>
                    <Check size={16} style={{ marginRight: 6, display: 'inline' }} /> Done
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
      
      <button onClick={() => setIsCreating(true)} style={fabStyle}><Plus size={28} /></button>

      <ActionSheet isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title={`Task Rm ${selectedTask?.room_number}`}>
         <form onSubmit={updateRemarks} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="Remarks" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Save Remarks</button>
         </form>
         <button type="button" onClick={() => deleteTask(selectedTask?.id)} style={{ width: '100%', padding: 12, marginTop: 16, border: 'none', background: colors.red+'15', color: colors.red, borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem' }}>
            <Trash size={16} /> Delete Task
         </button>
      </ActionSheet>
      
      <ActionSheet isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create Task">
         <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input required value={newTask.room_id || ''} onChange={e => setNewTask({...newTask, room_id: Number(e.target.value)})} placeholder="Room ID" type="number" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input value={newTask.remarks || ''} onChange={e => setNewTask({...newTask, remarks: e.target.value})} placeholder="Remarks" style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Create Task</button>
         </form>
      </ActionSheet>
    </div>
  );
}

// 3. MobileMoneyManager
export function MobileMoneyManager() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Today'); // 'Today', 'Yesterday', 'This Week', 'This Month', 'Year to Date', 'All Time', 'Custom Range'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [editTx, setEditTx] = useState({});

  // Form state
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');

  const fetchTxs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/transactions', authH());
      setTxs(data);
    } catch (e) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTxs(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      // Normalize casing to match database records (Income / Expense)
      const normalizedType = type === 'income' ? 'Income' : 'Expense';
      await axios.post('/api/transactions', { type: normalizedType, amount: Number(amount), category, description: desc }, authH());
      toast.success('Transaction added');
      setIsAdding(false);
      fetchTxs();
      setAmount(''); setCategory(''); setDesc('');
    } catch (e) {
      toast.error('Error adding transaction');
    }
  };
  
  const updateTx = async (e) => {
    e.preventDefault();
    try {
      const normalizedType = editTx.type === 'income' ? 'Income' : editTx.type === 'expense' ? 'Expense' : editTx.type;
      await axios.put(`/api/transactions/${selectedTx.id}`, { type: normalizedType, amount: Number(editTx.amount), category: editTx.category, description: editTx.description }, authH());
      toast.success('Transaction updated');
      setSelectedTx(null);
      fetchTxs();
    } catch(e) { toast.error('Error updating transaction'); }
  }

  const deleteTx = async (id) => {
    if(!window.confirm('Delete transaction?')) return;
    try {
      await axios.delete(`/api/transactions/${id}`, authH());
      toast.success('Transaction deleted');
      setSelectedTx(null);
      fetchTxs();
    } catch(e) { toast.error('Error deleting transaction'); }
  }

  // Date Filtering Setup matching desktop's IST behavior
  const getISTDate = (d = new Date()) => {
    const s = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return new Date(s);
  };

  const today = getISTDate();
  today.setHours(0,0,0,0);
  const todayStr = today.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay());

  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const filteredTxs = txs.filter(t => {
    if (!t.created_at) return false;
    let matchesDate = true;
    const txDateStr = new Date(t.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const txDateObj = new Date(t.created_at);

    if (filter === 'Today') matchesDate = txDateStr === todayStr;
    if (filter === 'Yesterday') matchesDate = txDateStr === yesterdayStr;
    if (filter === 'This Week') matchesDate = txDateObj >= thisWeek;
    if (filter === 'This Month') matchesDate = txDateObj >= thisMonth;
    if (filter === 'Year to Date') matchesDate = txDateObj >= startOfYear;
    if (filter === 'Custom Range') {
      if (customStartDate && txDateStr < customStartDate) matchesDate = false;
      if (customEndDate && txDateStr > customEndDate) matchesDate = false;
    }
    return matchesDate;
  });

  const income = filteredTxs.filter(t => t.type?.toLowerCase() === 'income').reduce((a, b) => a + Number(b.amount), 0);
  const expense = filteredTxs.filter(t => t.type?.toLowerCase() === 'expense').reduce((a, b) => a + Number(b.amount), 0);
  const net = income - expense;

  return (
    <div style={pageStyle}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 700 }}>Money Manager</h2>

      {/* Date filter presets horizontal list on top */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {['Today', 'Yesterday', 'This Week', 'This Month', 'Year to Date', 'All Time', 'Custom Range'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: filter === f ? colors.primary : '#fff',
            color: filter === f ? '#fff' : colors.muted,
            fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0, ...tapTargetStyle
          }}>{f}</button>
        ))}
      </div>

      {filter === 'Custom Range' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16, background: '#fff', padding: '10px 12px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <input 
            type="date" 
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', flex: 1 }} 
            value={customStartDate} 
            onChange={e => setCustomStartDate(e.target.value)} 
          />
          <span style={{ fontSize: '0.78rem', color: colors.muted }}>to</span>
          <input 
            type="date" 
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.78rem', flex: 1 }} 
            value={customEndDate} 
            onChange={e => setCustomEndDate(e.target.value)} 
          />
        </div>
      )}

      <div style={{ ...cardStyle, padding: 20, marginBottom: 24, background: `linear-gradient(135deg, ${colors.primary}, #3730a3)`, color: '#fff' }}>
        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Balance</p>
        <h3 style={{ margin: '4px 0 16px 0', fontSize: '2rem', fontWeight: 800 }}>₹{net.toFixed(2)}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>Income</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#a7f3d0' }}>+₹{income.toFixed(2)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>Expense</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#fecaca' }}>-₹{expense.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <h4 style={sectionHeaderStyle}>Recent Transactions</h4>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} height={70} />)}
        </div>
      ) : filteredTxs.length === 0 ? (
        <p style={{ textAlign: 'center', color: colors.muted, padding: 20 }}>No transactions found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTxs.map(t => (
            <div key={t.id} onClick={() => { setSelectedTx(t); setEditTx(t); }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ ...cardStyle, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: t.type?.toLowerCase() === 'income' ? colors.green+'15' : colors.red+'15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.type?.toLowerCase() === 'income' ? <TrendingUp size={20} color={colors.green} /> : <TrendingDown size={20} color={colors.red} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{t.category}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>{t.description || 'No description'}</p>
                </div>
              </div>
              <span style={{ fontWeight: 800, color: t.type?.toLowerCase() === 'income' ? colors.green : colors.red }}>
                {t.type?.toLowerCase() === 'income' ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setIsAdding(true)} style={fabStyle}><Plus size={28} /></button>

      <ActionSheet isOpen={isAdding} onClose={() => setIsAdding(false)} title="New Transaction">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setType('income')} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${type === 'income' ? colors.green : '#e2e8f0'}`, background: type === 'income' ? colors.green+'10' : '#fff', color: type === 'income' ? colors.green : colors.muted, fontWeight: 600 }}>Income</button>
            <button type="button" onClick={() => setType('expense')} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${type === 'expense' ? colors.red : '#e2e8f0'}`, background: type === 'expense' ? colors.red+'10' : '#fff', color: type === 'expense' ? colors.red : colors.muted, fontWeight: 600 }}>Expense</button>
          </div>
          <input required type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
          <input required type="text" placeholder="Category (e.g. F&B, Maintenance)" value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
          <input type="text" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
          <button type="submit" style={{ padding: '16px', borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', fontWeight: 700, fontSize: '1rem', marginTop: 8 }}>Save Transaction</button>
        </form>
      </ActionSheet>
      
      <ActionSheet isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} title="Edit Transaction">
         <form onSubmit={updateTx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setEditTx({...editTx, type: 'income'})} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${editTx.type === 'income' ? colors.green : '#e2e8f0'}`, background: editTx.type === 'income' ? colors.green+'10' : '#fff', color: editTx.type === 'income' ? colors.green : colors.muted, fontWeight: 600 }}>Income</button>
              <button type="button" onClick={() => setEditTx({...editTx, type: 'expense'})} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${editTx.type === 'expense' ? colors.red : '#e2e8f0'}`, background: editTx.type === 'expense' ? colors.red+'10' : '#fff', color: editTx.type === 'expense' ? colors.red : colors.muted, fontWeight: 600 }}>Expense</button>
            </div>
            <input required type="number" placeholder="Amount" value={editTx.amount || ''} onChange={e => setEditTx({...editTx, amount: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input required type="text" placeholder="Category" value={editTx.category || ''} onChange={e => setEditTx({...editTx, category: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <input type="text" placeholder="Description" value={editTx.description || ''} onChange={e => setEditTx({...editTx, description: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
            <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Save Changes</button>
         </form>
         <button onClick={() => deleteTx(selectedTx?.id)} style={{ width: '100%', padding: 12, marginTop: 16, border: 'none', background: colors.red+'15', color: colors.red, borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem' }}>
            <Trash size={16} /> Delete Transaction
         </button>
      </ActionSheet>
    </div>
  );
}

// 4. MobileReservations
export function MobileReservations() {
  const [res, setRes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const [selectedRes, setSelectedRes] = useState(null);
  const [editRes, setEditRes] = useState({});

  const fetchRes = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/reservations', authH());
      setRes(data);
    } catch (e) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRes(); }, []);

  const handleAction = async (id, action) => {
    try {
      await axios.post(`/api/reservations/${id}/${action}`, {}, authH());
      toast.success(`Successfully ${action.replace('-', ' ')}ed`);
      fetchRes();
    } catch (e) {
      toast.error(`Error with ${action}`);
    }
  };
  
  const updateRes = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/reservations/${selectedRes.id}`, { guest_name: editRes.guest_name, adults: Number(editRes.adults), children: Number(editRes.children), remarks: editRes.remarks }, authH());
      toast.success('Reservation updated');
      setSelectedRes(null);
      fetchRes();
    } catch(e) { toast.error('Error updating reservation'); }
  };
  
  const deleteRes = async (id) => {
    if(!window.confirm('Delete reservation?')) return;
    try {
      await axios.delete(`/api/reservations/${id}`, authH());
      toast.success('Reservation deleted');
      setSelectedRes(null);
      fetchRes();
    } catch(e) { toast.error('Error deleting reservation'); }
  };

  const filtered = res.filter(r => {
    if (filter !== 'All' && r.status !== filter) return false;
    if (search && !r.guest_name.toLowerCase().includes(search.toLowerCase()) && !r.reservation_number.includes(search)) return false;
    return true;
  });

  return (
    <div style={pageStyle}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: colors.bg, paddingTop: 16, paddingBottom: 12, zIndex: 10 }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 700 }}>Reservations</h2>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={20} color={colors.muted} style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search guests or #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {['All', 'Reserved', 'Checked In', 'Checked Out'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: filter === f ? colors.primary : '#fff',
              color: filter === f ? '#fff' : colors.muted,
              fontWeight: 600, whiteSpace: 'nowrap', ...tapTargetStyle
            }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {[1,2,3].map(i => <Skeleton key={i} height={140} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.muted }}>
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>No reservations found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => (
            <div key={r.id} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ ...cardStyle, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>{r.guest_name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>#{r.reservation_number}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, background: colors.bg, color: colors.text }}>
                    Rm {r.room_number || 'TBA'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem', color: colors.muted }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(r.check_in_datetime).toLocaleDateString()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={14} /> {r.adults}A {r.children}C</div>
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                {r.status === 'Reserved' && (
                  <button onClick={() => handleAction(r.id, 'check-in')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: colors.primary, color: '#fff', fontWeight: 600, ...tapTargetStyle }}>
                    Check In
                  </button>
                )}
                {r.status === 'Checked In' && (
                  <button onClick={() => handleAction(r.id, 'check-out')} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: colors.red, color: '#fff', fontWeight: 600, ...tapTargetStyle }}>
                    Check Out
                  </button>
                )}
                <button onClick={() => { setSelectedRes(r); setEditRes(r); }} style={{ flex: r.status === 'Reserved' || r.status === 'Checked In' ? 0.3 : 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: colors.text, fontWeight: 600, ...tapTargetStyle }}>
                  Options
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <ActionSheet isOpen={!!selectedRes} onClose={() => setSelectedRes(null)} title="Reservation Options">
        <form onSubmit={updateRes} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
           <input required type="text" placeholder="Guest Name" value={editRes.guest_name || ''} onChange={e => setEditRes({...editRes, guest_name: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
           <div style={{ display: 'flex', gap: 8 }}>
             <input required type="number" placeholder="Adults" value={editRes.adults || ''} onChange={e => setEditRes({...editRes, adults: Number(e.target.value)})} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
             <input required type="number" placeholder="Children" value={editRes.children || ''} onChange={e => setEditRes({...editRes, children: Number(e.target.value)})} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
           </div>
           <input type="text" placeholder="Remarks" value={editRes.remarks || ''} onChange={e => setEditRes({...editRes, remarks: e.target.value})} style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem' }} />
           <button type="submit" style={{ padding: 12, background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem' }}>Save Changes</button>
        </form>
        <button type="button" onClick={() => deleteRes(selectedRes?.id)} style={{ width: '100%', padding: 12, marginTop: 16, border: 'none', background: colors.red+'15', color: colors.red, borderRadius: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '1rem' }}>
            <Trash size={16} /> Delete Reservation
        </button>
      </ActionSheet>
    </div>
  );
}

// 5. MobileReports
export function MobileReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('Today');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reports/dashboard?range=${range}`, authH());
      setData(res.data);
    } catch (e) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const int = setInterval(fetchReports, 60000);
    return () => clearInterval(int);
  }, [range]);

  if (loading && !data) return <div style={pageStyle}><Skeleton height={200} /><div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16}}>{[1,2,3,4].map(i=><Skeleton key={i} height={100} />)}</div></div>;

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Reports</h2>
        <select value={range} onChange={e => setRange(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
           <option value="Today">Today</option>
           <option value="Last 7 Days">Last 7 Days</option>
           <option value="This Month">This Month</option>
        </select>
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 16, background: colors.text, color: '#fff' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: colors.muted }}>Occupancy ({range})</p>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '2.5rem', fontWeight: 800 }}>{data?.occupancy_pct || 0}%</h3>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: colors.green, width: `${data?.occupancy_pct || 0}%` }} />
        </div>
      </div>

      <h4 style={sectionHeaderStyle}>Key Metrics</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ ...cardStyle, padding: 16 }}>
          <Users size={20} color={colors.primary} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{data?.in_house_guests || 0}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>In-House Guests</p>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <BedDouble size={20} color={colors.green} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{data?.available_rooms || 0}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>Available Rooms</p>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <TrendingUp size={20} color={colors.amber} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>${data?.revenue_today || 0}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>Revenue</p>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <LogIn size={20} color={colors.primary} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{data?.due_today_arrivals || 0}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: colors.muted }}>Arrivals</p>
        </div>
      </div>

      <h4 style={sectionHeaderStyle}>Needs Attention</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Dirty Rooms', val: data?.dirty_rooms || 0, color: colors.red },
          { label: 'Maintenance', val: data?.maintenance_rooms || 0, color: colors.amber },
          { label: 'Overdue Checkouts', val: data?.overdue_checkouts || 0, color: colors.red }
        ].map((item, i) => (
          <div key={i} style={{ ...cardStyle, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${item.color}` }}>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontWeight: 800, color: item.color, fontSize: '1.2rem' }}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. MobileAudit
export function MobileAudit() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (p) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/audit?page=${p}&limit=20`, authH());
      if (p === 1) setLogs(data);
      else setLogs(prev => [...prev, ...data]);
    } catch (e) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const getActionStyles = (action) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('add')) return { icon: <Plus size={16} color={colors.green} />, bg: colors.green+'15' };
    if (a.includes('delete') || a.includes('remove')) return { icon: <Trash size={16} color={colors.red} />, bg: colors.red+'15' };
    if (a.includes('update') || a.includes('edit')) return { icon: <Edit size={16} color={colors.amber} />, bg: colors.amber+'15' };
    if (a.includes('login') || a.includes('auth')) return { icon: <Key size={16} color={colors.primary} />, bg: colors.primary+'15' };
    return { icon: <Activity size={16} color={colors.muted} />, bg: colors.bg };
  };

  return (
    <div style={pageStyle}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: 700 }}>Audit Trail</h2>
      
      <div style={{ ...cardStyle, padding: '16px 0' }}>
        {logs.map((log, i) => {
          const s = getActionStyles(log.action);
          return (
            <div key={log.id || i} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: i === logs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600 }}>{log.action} <span style={{ fontWeight: 400, color: colors.muted }}>by {log.username}</span></p>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: colors.muted }}>{log.details}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: colors.slate }}>{new Date(log.timestamp || log.created_at).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        {loading && <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}><Skeleton height={20} width={100} /></div>}
      </div>
      
      {!loading && logs.length > 0 && (
        <button
          onClick={() => setPage(p => p + 1)}
          style={{ width: '100%', padding: 16, marginTop: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', color: colors.primary, fontWeight: 600, ...tapTargetStyle }}
        >
          Load More
        </button>
      )}
    </div>
  );
}
