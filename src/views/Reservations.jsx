import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  Calendar, Search, Plus, Trash2, Edit2, LogIn, LogOut, X, 
  RefreshCw, ChevronLeft, ChevronRight, Check, AlertTriangle, 
  Moon, BedDouble, User, Filter, ShieldAlert, CheckCircle, Clock, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import BookingForm from '../components/BookingForm';

// Custom designed popover date picker component
function CustomDatePicker({ value, onChange, min }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current date or use today
  const dateObj = value ? new Date(value) : new Date();
  const [navDate, setNavDate] = useState(dateObj);

  useEffect(() => {
    if (value) {
      setNavDate(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1));
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayIndex = (y, m) => new Date(y, m, 1).getDay();

  const year = navDate.getFullYear();
  const month = navDate.getMonth();

  const totalDays = daysInMonth(year, month);
  const startOffset = firstDayIndex(year, month);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleSelectDay = (day) => {
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const isSelected = (day) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length !== 3) return false;
    return year === parseInt(parts[0]) && month === (parseInt(parts[1]) - 1) && day === parseInt(parts[2]);
  };

  const isToday = (day) => {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  };

  const isDisabled = (day) => {
    if (!min) return false;
    const current = new Date(year, month, day);
    current.setHours(0,0,0,0);
    const minParts = min.split('-');
    if (minParts.length !== 3) return false;
    const minD = new Date(parseInt(minParts[0]), parseInt(minParts[1]) - 1, parseInt(minParts[2]));
    minD.setHours(0,0,0,0);
    return current < minD;
  };

  // Generate calendar days
  const calendarCells = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(<div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />);
  }
  for (let day = 1; day <= totalDays; day++) {
    const disabled = isDisabled(day);
    const selected = isSelected(day);
    const today = isToday(day);

    calendarCells.push(
      <button
        key={`day-${day}`}
        type="button"
        disabled={disabled}
        onClick={() => handleSelectDay(day)}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: 'none',
          fontSize: '0.8rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: selected ? 'var(--brand-500)' : 'transparent',
          color: selected ? '#fff' : disabled ? 'var(--text-faint)' : 'var(--text)',
          fontWeight: selected || today ? '600' : '400',
          outline: today && !selected ? '1px solid var(--brand-500)' : 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!selected && !disabled) {
            e.currentTarget.style.backgroundColor = 'var(--brand-50)';
            e.currentTarget.style.color = 'var(--brand-600)';
          }
        }}
        onMouseLeave={(e) => {
          if (!selected && !disabled) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text)';
          }
        }}
      >
        {day}
      </button>
    );
  }

  const formatDisplay = (val) => {
    if (!val) return "Select date";
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          height: '38px',
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
        }}
      >
        <span>{formatDisplay(value)}</span>
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 100,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: '16px',
          minWidth: '280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {daysOfWeek.map((day) => (
              <span key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {day}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', justifyItems: 'center' }}>
            {calendarCells}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom designed dropdown time picker component with 10 minute intervals
function CustomTimePicker({ value, onChange, timeSlots }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleSelectTime = (time) => {
    onChange(time);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          height: '38px',
          background: 'var(--surface)',
          border: '1px solid var(--border-2)',
        }}
      >
        <span>{value ? value : "12:00"}</span>
        <Clock size={16} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '200px',
            overflowY: 'auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px'
          }}
        >
          {timeSlots.map((slot) => {
            const selected = slot === value;
            return (
              <button
                key={slot}
                type="button"
                data-selected={selected}
                onClick={() => handleSelectTime(slot)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderRadius: 'var(--r-xs)',
                  background: selected ? 'var(--brand-500)' : 'transparent',
                  color: selected ? '#fff' : 'var(--text)',
                  fontWeight: selected ? '600' : '400',
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.backgroundColor = 'var(--brand-50)';
                    e.currentTarget.style.color = 'var(--brand-600)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Reservations({ user, permission, onViewFolio }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [timelineMode, setTimelineMode] = useState('daily'); // daily, hourly
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Timeline calendar starting date
  const [calendarStart, setCalendarStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Booking creation form state
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [stayType, setStayType] = useState('night');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  
  // Split Date & Time fields
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [checkInDateOnly, setCheckInDateOnly] = useState(getTodayStr);
  const [checkInTimeOnly, setCheckInTimeOnly] = useState('12:00');
  const [checkOutDateOnly, setCheckOutDateOnly] = useState(getTomorrowStr);
  const [checkOutTimeOnly, setCheckOutTimeOnly] = useState('11:00');

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);

  // States for manual inventory blocks & price updates
  const [statusRoomId, setStatusRoomId] = useState('');
  const [roomTargetStatus, setRoomTargetStatus] = useState('Vacant Clean');
  const [ratePlanEditId, setRatePlanEditId] = useState('');
  const [editNightPrice, setEditNightPrice] = useState('');
  const [editDayPrice, setEditDayPrice] = useState('');

  // Fetch available rooms dynamically based on form criteria
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!roomTypeId || !checkInDateOnly || !checkInTimeOnly || !checkOutDateOnly || !checkOutTimeOnly) {
        setAvailableRooms([]);
        return;
      }
      try {
        const token = localStorage.getItem('pms_token');
        const checkIn = `${checkInDateOnly}T${checkInTimeOnly}:00`;
        const checkOut = `${checkOutDateOnly}T${checkOutTimeOnly}:00`;
        const res = await axios.get('/api/rooms/available', {
          params: { room_type_id: roomTypeId, check_in: checkIn, check_out: checkOut },
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableRooms(res.data);
      } catch (err) {
        console.error('Failed to fetch available rooms list', err);
      }
    };
    fetchAvailableRooms();
  }, [roomTypeId, checkInDateOnly, checkInTimeOnly, checkOutDateOnly, checkOutTimeOnly]);

  // Generate 10 minute time slots (00:00 to 23:50)
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  // Selected reservation details modal state
  const [selectedRes, setSelectedRes] = useState(null);
  
  // Extend checkout dates modal
  const [extendRes, setExtendRes] = useState(null);
  const [extendDate, setExtendDate] = useState('');

  // Confirm Modals
  const [cancelModal, setCancelModal] = useState({ isOpen: false, res: null });
  const [noShowModal, setNoShowModal] = useState({ isOpen: false, res: null });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;
      
      const [resList, roomList, planList, typeList] = await Promise.all([
        axios.get('/api/reservations', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/room-types', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setReservations(resList.data);
      setRooms(roomList.data);
      setRatePlans(planList.data);
      setRoomTypes(typeList.data);
    } catch {
      toast.error('Failed to sync reservation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRoomStatus = async (e) => {
    e.preventDefault();
    if (!statusRoomId || !roomTargetStatus) return toast.error('Choose a room and status');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/rooms/${statusRoomId}/status`, {
        status: roomTargetStatus
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Room status successfully updated');
      setStatusRoomId('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update room status');
    }
  };

  const handleUpdateRatePlan = async (e) => {
    e.preventDefault();
    if (!ratePlanEditId || !editNightPrice || !editDayPrice) return toast.error('Fill in all rate fields');
    try {
      const token = localStorage.getItem('pms_token');
      
      if (user.role !== 'Admin') {
        const confirmReq = window.confirm('Modifying rate plan prices requires Admin approval. Would you like to submit an approval request?');
        if (confirmReq) {
          await axios.post('/api/approvals/request', {
            type: 'RATE_MODIFY',
            details: { 
              rate_plan_id: ratePlanEditId, 
              new_night_price: parseFloat(editNightPrice),
              new_day_price: parseFloat(editDayPrice),
              reason: `Request rate change to Night: ₹${editNightPrice}, Day: ₹${editDayPrice}`
            }
          }, { headers: { Authorization: `Bearer ${token}` } });
          toast.success('Rate change approval request submitted!');
          setRatePlanEditId('');
          setEditNightPrice('');
          setEditDayPrice('');
        }
        return;
      }

      const currentPlan = ratePlans.find(rp => rp.id === ratePlanEditId);
      await axios.patch(`/api/rate-plans/${ratePlanEditId}`, {
        name: currentPlan ? currentPlan.name : 'Standard Rate Plan',
        night_price: parseFloat(editNightPrice),
        day_use_price: parseFloat(editDayPrice),
        hourly_prices: currentPlan ? currentPlan.hourly_prices : {}
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Rate plan prices successfully updated');
      setRatePlanEditId('');
      setEditNightPrice('');
      setEditDayPrice('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update rate plan');
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!guestName || !guestMobile || !roomTypeId || !ratePlanId || !checkInDateOnly || !checkInTimeOnly || !checkOutDateOnly || !checkOutTimeOnly) {
      return toast.error('Please fill in all required fields');
    }

    if (customRate && user.role !== 'Admin') {
      return toast.error('Custom rate selection is restricted to Admins. Please create the reservation using standard rates, or request an Admin.');
    }
    
    const checkInDateTimeStr = `${checkInDateOnly}T${checkInTimeOnly}:00`;
    const checkOutDateTimeStr = `${checkOutDateOnly}T${checkOutTimeOnly}:00`;

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/reservations', {
        guest: { name: guestName, mobile: guestMobile },
        stay_type: stayType,
        room_type_id: roomTypeId,
        room_id: selectedRoomId || null,
        rate_plan_id: ratePlanId,
        check_in: checkInDateTimeStr,
        check_out: checkOutDateTimeStr,
        adults,
        children,
        remarks,
        custom_rate: customRate ? parseFloat(customRate) : null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Reservation successfully recorded');
      // Clear fields
      setGuestName('');
      setGuestMobile('');
      setRoomTypeId('');
      setRatePlanId('');
      setCheckInDateOnly(getTodayStr());
      setCheckInTimeOnly('12:00');
      setCheckOutDateOnly(getTomorrowStr());
      setCheckOutTimeOnly('11:00');
      setCustomRate('');
      setRemarks('');
      setSelectedRoomId('');
      setActiveTab('timeline');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register reservation');
    }
  };

  const handleCancelReservation = async () => {
    const res = cancelModal.res;
    if (!res) return;
    try {
      const token = localStorage.getItem('pms_token');
      if (user.role !== 'Admin') {
        const confirmReq = window.confirm(`Cancellation requires Admin approval. Would you like to submit a cancellation request to the Admin?`);
        if (confirmReq) {
          await axios.post('/api/approvals/request', {
            type: 'CANCELLATION',
            details: { reservation_id: res.id, reason: `Staff Request Cancellation for Res #${res.reservation_number}` }
          }, { headers: { Authorization: `Bearer ${token}` } });
          toast.success('Cancellation approval request raised successfully!');
          setCancelModal({ isOpen: false, res: null });
        }
        return;
      }
      await axios.post(`/api/reservations/${res.id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Reservation cancelled successfully');
      setCancelModal({ isOpen: false, res: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel reservation');
    }
  };

  const handleNoShow = async () => {
    const res = noShowModal.res;
    if (!res) return;
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/reservations/${res.id}/no-show`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Reservation marked as No Show');
      setNoShowModal({ isOpen: false, res: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update reservation');
    }
  };

  const handleExtendStay = async (e) => {
    e.preventDefault();
    if (!extendDate) return toast.error('Choose a new check-out date');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/reservations/${extendRes.id}/dates`, {
        check_out: extendDate
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Checkout date extended successfully');
      setExtendRes(null);
      setExtendDate('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to extend stay');
    }
  };

  const shiftCalendar = (offset) => {
    setCalendarStart(prev => {
      const next = new Date(prev);
      if (timelineMode === 'daily') {
        next.setDate(next.getDate() + offset);
      } else {
        next.setDate(next.getDate() + offset);
      }
      return next;
    });
  };

  // Generate 15-day range for daily view
  const timelineDates = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(calendarStart);
    d.setDate(calendarStart.getDate() + i);
    return d;
  });

  // Generate 24 hours list for hourly view
  const timelineHours = Array.from({ length: 24 }, (_, i) => {
    return `${String(i).padStart(2, '0')}:00`;
  });

  const getFilteredBookings = () => {
    return reservations.filter(res => {
      const matchSearch = 
        res.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.guest_mobile.includes(searchQuery) ||
        res.reservation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.room_number && String(res.room_number).includes(searchQuery));
      
      const matchStatus = filterStatus === 'all' || res.status === filterStatus;
      return matchSearch && matchStatus;
    });
  };

  const getDailyCurrentTimeLinePct = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    const idx = timelineDates.findIndex(d => d.toDateString() === todayStr);
    if (idx === -1) return null;
    const hours = now.getHours() + now.getMinutes() / 60;
    return ((idx + hours / 24) / 15) * 100;
  };

  const getHourlyCurrentTimeLinePct = () => {
    if (calendarStart.toDateString() !== new Date().toDateString()) return null;
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    return (hours / 24) * 100;
  };

  const currentTimeLinePct = timelineMode === 'daily' ? getDailyCurrentTimeLinePct() : getHourlyCurrentTimeLinePct();

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading reservation records…</span>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} style={{ color: 'var(--brand-500)' }} />
            Reservation Center
          </h1>
          <p className="page-subtitle">Manage bookings, room availability, and calendar timelines</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '3px' }}>
            {['timeline', 'list', 'inventory', 'newbooking'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--r-sm)', border: 'none', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', background: activeTab === tab ? 'var(--surface)' : 'transparent',
                  color: activeTab === tab ? 'var(--brand-600)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab ? 'var(--shadow-xs)' : 'none',
                  transition: 'all var(--t-fast)'
                }}
              >
                {tab === 'timeline' ? 'Timeline Calendar' : tab === 'list' ? 'All Bookings' : tab === 'inventory' ? 'Room Inventory' : 'New Reservation'}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="btn btn-default btn-sm">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* TIMELINE CALENDAR TAB */}
      {activeTab === 'timeline' && (
        <div className="card animate-fade-up" style={{ padding: '0px', overflow: 'hidden' }}>
          
          {/* Calendar Controls with Hourly/Daily view selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                📅 Timeline Start: <strong>{calendarStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              
              {/* Daily / Hourly Switcher Toggle */}
              <div style={{ display: 'flex', background: 'var(--border)', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setTimelineMode('daily')}
                  style={{
                    border: 'none', background: timelineMode === 'daily' ? '#fff' : 'transparent',
                    color: timelineMode === 'daily' ? 'var(--brand-600)' : 'var(--text-muted)',
                    fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  Daily Timeline
                </button>
                <button
                  onClick={() => setTimelineMode('hourly')}
                  style={{
                    border: 'none', background: timelineMode === 'hourly' ? '#fff' : 'transparent',
                    color: timelineMode === 'hourly' ? 'var(--brand-600)' : 'var(--text-muted)',
                    fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  Hourly view
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-default btn-sm" onClick={() => shiftCalendar(timelineMode === 'daily' ? -7 : -1)}>
                ◀ {timelineMode === 'daily' ? 'Back 1 Wk' : 'Prev Day'}
              </button>
              <button className="btn btn-default btn-sm" onClick={() => setCalendarStart(new Date())}>Today</button>
              <button className="btn btn-default btn-sm" onClick={() => shiftCalendar(timelineMode === 'daily' ? 7 : 1)}>
                {timelineMode === 'daily' ? 'Next Wk' : 'Next Day'} ▶
              </button>
            </div>
          </div>

          {/* Timeline Grid layout */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: timelineMode === 'daily' ? '1000px' : '1300px' }}>
              
              {/* Day/Hour header row */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--surface-2)' }}>
                <div style={{ width: '150px', flexShrink: 0, padding: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' }}>
                  Room No
                </div>
                
                {/* Headers Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: timelineMode === 'daily' ? 'repeat(15, 1fr)' : 'repeat(24, 1fr)', flex: 1, position: 'relative' }}>
                  {currentTimeLinePct !== null && (
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: `${currentTimeLinePct}%`,
                      width: '2px', background: '#ef4444', zIndex: 30, pointerEvents: 'none'
                    }}>
                      <div style={{
                        position: 'absolute', top: 0, left: '-4px', width: '10px', height: '10px',
                        borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)'
                      }} />
                    </div>
                  )}
                  {timelineMode === 'daily' ? (
                    timelineDates.map((d, i) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '10px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: isToday ? 800 : 600,
                            color: isToday ? 'var(--brand-600)' : 'var(--text-2)',
                            background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
                            borderRight: '1px solid var(--border)',
                          }}
                        >
                          <div>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                          <div style={{ fontSize: '0.9rem', marginTop: '2px' }}>{d.toLocaleDateString('en-IN', { day: '2-digit' })}</div>
                        </div>
                      );
                    })
                  ) : (
                    timelineHours.map((h, i) => {
                      const currentHour = new Date().getHours();
                      const isCurrentHour = calendarStart.toDateString() === new Date().toDateString() && currentHour === i;
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '12px 4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: isCurrentHour ? 800 : 600,
                            color: isCurrentHour ? 'var(--brand-600)' : 'var(--text-2)',
                            background: isCurrentHour ? 'rgba(99,102,241,0.08)' : 'transparent',
                            borderRight: '1px solid var(--border)',
                          }}
                        >
                          {h}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Room Grid Rows */}
              {rooms.map(rm => {
                const roomReservations = reservations.filter(
                  r => (String(r.room_id) === String(rm.id) || String(r.room_number) === String(rm.room_number)) &&
                       ['Checked In', 'Reserved'].includes(r.status)
                );

                return (
                  <div key={rm.id} style={{ display: 'flex', borderBottom: '1px solid var(--border)', position: 'relative', minHeight: '52px', alignItems: 'stretch' }}>
                    {/* Room Info Sidebar column */}
                    <div style={{
                      width: '150px', flexShrink: 0, padding: '8px 12px', borderRight: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--surface-2)', zIndex: 5
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Room {rm.room_number}</span>
                        {rm.status === 'Occupied' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
                        {rm.status === 'Dirty' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                        {rm.room_type_code || rm.room_type_name?.slice(0, 4)} · {rm.status}
                      </span>
                    </div>

                    {/* Grid Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: timelineMode === 'daily' ? 'repeat(15, 1fr)' : 'repeat(24, 1fr)', flex: 1, position: 'relative' }}>
                      {currentTimeLinePct !== null && (
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0, left: `${currentTimeLinePct}%`,
                          width: '2px', background: '#ef4444', zIndex: 30, pointerEvents: 'none'
                        }} />
                      )}
                      {timelineMode === 'daily' ? (
                        timelineDates.map((d, i) => {
                          const cellDateStr = d.toISOString().split('T')[0];
                          const cellNextDateStr = new Date(d.getTime() + 86400000).toISOString().split('T')[0];
                          const isToday = d.toDateString() === new Date().toDateString();
                          const isUnderMaint = rm.status === 'Maintenance' && isToday;
                          const isCurrentlyOccupied = rm.status === 'Occupied' && isToday && roomReservations.filter(r => r.status === 'Checked In').length === 0;

                          return (
                            <div
                              key={i}
                              onClick={() => {
                                setSelectedRoomId(rm.id);
                                setRoomTypeId(rm.room_type_id);
                                setCheckInDateOnly(cellDateStr);
                                setCheckInTimeOnly('12:00');
                                setCheckOutDateOnly(cellNextDateStr);
                                setCheckOutTimeOnly('11:00');
                                setStayType('night');
                                setActiveTab('newbooking');
                                toast.success(`Selected Room ${rm.room_number} on ${cellDateStr}`);
                              }}
                              style={{
                                borderRight: '1px solid var(--border)', cursor: 'pointer',
                                background: isUnderMaint ? '#f1f5f9' : isCurrentlyOccupied ? '#fef2f2' : 'transparent',
                                position: 'relative'
                              }}
                            />
                          );
                        })
                      ) : (
                        timelineHours.map((h, i) => {
                          const cellDateStr = calendarStart.toISOString().split('T')[0];
                          const isToday = calendarStart.toDateString() === new Date().toDateString();
                          const isUnderMaint = rm.status === 'Maintenance' && isToday;
                          const currentHour = new Date().getHours();
                          const isCurrentlyOccupied = rm.status === 'Occupied' && isToday && currentHour === i;

                          return (
                            <div
                              key={i}
                              onClick={() => {
                                setSelectedRoomId(rm.id);
                                setRoomTypeId(rm.room_type_id);
                                setCheckInDateOnly(cellDateStr);
                                setCheckInTimeOnly(`${String(i).padStart(2, '0')}:00`);
                                setCheckOutDateOnly(cellDateStr);
                                setCheckOutTimeOnly(`${String((i + 3) % 24).padStart(2, '0')}:00`);
                                setStayType('hourly');
                                setActiveTab('newbooking');
                                toast.success(`Selected Hourly Stay for Room ${rm.room_number} starting at ${h}`);
                              }}
                              style={{
                                borderRight: '1px solid var(--border)', cursor: 'pointer',
                                background: isUnderMaint ? '#f1f5f9' : isCurrentlyOccupied ? '#fef2f2' : 'transparent',
                                position: 'relative'
                              }}
                            />
                          );
                        })
                      )}

                      {/* Overlay Reservation Bars */}
                      {timelineMode === 'daily' ? (
                        roomReservations.map(res => {
                          const timelineStartMs = new Date(timelineDates[0]);
                          timelineStartMs.setHours(0, 0, 0, 0);
                          const timelineStart = timelineStartMs.getTime();
                          
                          // 15 days total = 15 * 24 * 60 * 60 * 1000
                          const totalTimelineMs = 15 * 24 * 60 * 60 * 1000;
                          const timelineEnd = timelineStart + totalTimelineMs;

                          const resCheckInMs = new Date(res.check_in_datetime).getTime();
                          const resCheckOutMs = new Date(res.check_out_datetime).getTime();

                          if (resCheckOutMs <= timelineStart || resCheckInMs >= timelineEnd) return null;

                          const startMs = Math.max(resCheckInMs, timelineStart);
                          const endMs = Math.min(resCheckOutMs, timelineEnd);

                          const leftPct = ((startMs - timelineStart) / totalTimelineMs) * 100;
                          let widthPct = ((endMs - startMs) / totalTimelineMs) * 100;
                          if (widthPct < 1) widthPct = 1; // Ensure it's at least visible

                          const isCheckedIn = res.status === 'Checked In';
                          return (
                            <div
                              key={res.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRes(res);
                              }}
                              style={{
                                position: 'absolute', top: '8px', bottom: '8px',
                                left: `${leftPct}%`, width: `${widthPct}%`,
                                background: isCheckedIn ? '#fee2e2' : '#eef2ff',
                                border: `1.5px solid ${isCheckedIn ? '#fca5a5' : '#a5b4fc'}`,
                                color: isCheckedIn ? '#b91c1c' : '#3730a3',
                                borderRadius: '6px', zIndex: 10, fontSize: '0.72rem', fontWeight: 700, padding: '0 8px',
                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                boxShadow: 'var(--shadow-xs)'
                              }}
                            >
                              <span style={{ marginRight: '4px' }}>{isCheckedIn ? '🛏️' : '📋'}</span>
                              {res.guest_name}
                            </div>
                          );
                        })
                      ) : (
                        roomReservations.map(res => {
                          const timelineStartMs = new Date(calendarStart);
                          timelineStartMs.setHours(0, 0, 0, 0);
                          const timelineStart = timelineStartMs.getTime();
                          
                          // 24 hours total = 24 * 60 * 60 * 1000
                          const totalTimelineMs = 24 * 60 * 60 * 1000;
                          const timelineEnd = timelineStart + totalTimelineMs;

                          const resCheckInMs = new Date(res.check_in_datetime).getTime();
                          const resCheckOutMs = new Date(res.check_out_datetime).getTime();

                          if (resCheckOutMs <= timelineStart || resCheckInMs >= timelineEnd) return null;

                          const startMs = Math.max(resCheckInMs, timelineStart);
                          const endMs = Math.min(resCheckOutMs, timelineEnd);

                          const leftPct = ((startMs - timelineStart) / totalTimelineMs) * 100;
                          let widthPct = ((endMs - startMs) / totalTimelineMs) * 100;
                          if (widthPct < 1) widthPct = 1;

                          const isCheckedIn = res.status === 'Checked In';
                          return (
                            <div
                              key={res.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRes(res);
                              }}
                              style={{
                                position: 'absolute', top: '8px', bottom: '8px',
                                left: `${leftPct}%`, width: `${widthPct}%`,
                                background: isCheckedIn ? '#fee2e2' : '#eef2ff',
                                border: `1.5px solid ${isCheckedIn ? '#fca5a5' : '#a5b4fc'}`,
                                color: isCheckedIn ? '#b91c1c' : '#3730a3',
                                borderRadius: '6px', zIndex: 10, fontSize: '0.72rem', fontWeight: 700, padding: '0 8px',
                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                boxShadow: 'var(--shadow-xs)'
                              }}
                            >
                              <span style={{ marginRight: '4px' }}>⏱️</span>
                              {res.guest_name}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5' }} />
              Active Check-In (Occupied)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '3px', background: '#eef2ff', border: '1px solid #a5b4fc' }} />
              Reserved Booking (Future Stay)
            </div>
          </div>

        </div>
      )}

      {/* ALL BOOKINGS LIST VIEW TAB */}
      {activeTab === 'list' && (
        <div className="card animate-fade-up" style={{ padding: '20px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search bookings by Guest Name, mobile, room, or res number..."
                className="input"
                style={{ paddingLeft: '38px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <CustomSelect className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '160px' }}>
                <option value="all">All Booking Statuses</option>
                <option value="Reserved">Reserved</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="No Show">No Show</option>
                <option value="Cancelled">Cancelled</option>
              </CustomSelect>
            </div>
          </div>

          {/* Bookings Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Res Number</th>
                  <th style={{ padding: '12px' }}>Guest Info</th>
                  <th style={{ padding: '12px' }}>Dates &amp; Duration</th>
                  <th style={{ padding: '12px' }}>Room &amp; Type</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredBookings().length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching reservations found
                    </td>
                  </tr>
                ) : (
                  getFilteredBookings().map(res => (
                    <tr key={res.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{res.reservation_number}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{res.guest_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.guest_mobile}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.8rem' }}>CI: {new Date(res.check_in_datetime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CO: {new Date(res.check_out_datetime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{res.room_number ? `Room ${res.room_number}` : 'Unassigned'}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{res.room_type_name}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          background: res.status === 'Checked In' ? '#fee2e2' : res.status === 'Checked Out' ? '#f1f5f9' : '#eef2ff',
                          color: res.status === 'Checked In' ? '#b91c1c' : res.status === 'Checked Out' ? '#475569' : '#3730a3'
                        }}>
                          {res.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button onClick={() => setSelectedRes(res)} className="btn btn-default btn-xs" style={{ marginRight: '4px' }}>Details</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROOM INVENTORY MANAGEMENT MODULE */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }} className="animate-fade-up">
          {/* Heatmap Grid */}
          <div className="card" style={{ padding: '24px', flex: '3 1 600px', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Room Inventory & Availability</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily capacity and booked inventory for the next 15 days</p>
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => shiftCalendar(-7)} className="btn btn-default btn-sm" style={{ padding: '6px 10px' }}>
                  <ChevronLeft size={14} /> Prev Week
                </button>
                <button onClick={() => setCalendarStart(new Date())} className="btn btn-default btn-sm">
                  Today
                </button>
                <button onClick={() => shiftCalendar(7)} className="btn btn-default btn-sm" style={{ padding: '6px 10px' }}>
                  Next Week <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', minWidth: '180px' }}>Room Category</th>
                    {timelineDates.map((d, i) => {
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <th key={i} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, minWidth: '60px', borderLeft: '1px solid var(--border)', background: isToday ? 'var(--brand-50)' : 'transparent' }}>
                          <div style={{ color: isToday ? 'var(--brand-600)' : 'var(--text)' }}>
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {d.getDate()} {d.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map(rt => {
                    const categoryRooms = rooms.filter(rm => rm.room_type_id === rt.id);
                    const totalCapacity = categoryRooms.length;
                    const maintenanceRooms = categoryRooms.filter(rm => rm.status === 'Maintenance').length;

                    return (
                      <tr key={rt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>{rt.name}</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--surface-3)', borderRadius: '10px', color: 'var(--text-muted)' }}>
                              Cap: {totalCapacity}
                            </span>
                          </div>
                        </td>
                        {timelineDates.map((d, i) => {
                          const dateStart = new Date(d);
                          dateStart.setHours(0,0,0,0);
                          const dateEnd = new Date(d);
                          dateEnd.setHours(23,59,59,999);

                          const overlappingRes = reservations.filter(res => {
                            if (res.room_type_id !== rt.id) return false;
                            if (res.status === 'Cancelled' || res.status === 'No Show') return false;
                            const resCheckIn = new Date(res.check_in_datetime);
                            const resCheckOut = new Date(res.check_out_datetime);
                            return resCheckIn < dateEnd && resCheckOut > dateStart;
                          });
                          
                          const blockedRoomIds = new Set();
                          let unassignedCount = 0;
                          overlappingRes.forEach(res => {
                            if (res.room_id) {
                              blockedRoomIds.add(res.room_id);
                            } else {
                              unassignedCount++;
                            }
                          });
                          
                          const available = Math.max(0, totalCapacity - blockedRoomIds.size - unassignedCount - maintenanceRooms);
                          
                          let bg = 'rgba(16, 185, 129, 0.08)'; 
                          let text = 'var(--green)';
                          let border = 'rgba(16, 185, 129, 0.15)';
                          
                          if (available === 0) {
                            bg = 'rgba(239, 68, 68, 0.08)'; 
                            text = 'var(--danger)';
                            border = 'rgba(239, 68, 68, 0.15)';
                          } else if (available <= 2) {
                            bg = 'rgba(245, 158, 11, 0.08)'; 
                            text = 'var(--warning)';
                            border = 'rgba(245, 158, 11, 0.15)';
                          }

                          return (
                            <td key={i} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '42px',
                                height: '28px',
                                borderRadius: 'var(--r-sm)',
                                backgroundColor: bg,
                                color: text,
                                border: `1px solid ${border}`,
                                fontWeight: 600,
                                fontSize: '0.8rem'
                              }}>
                                {available}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Adjustments sidebar controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1.1 1 300px', minWidth: 0 }}>
            
            {/* Room Status adjustments */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>Adjust Room Status</h3>
              <form onSubmit={handleUpdateRoomStatus} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="label">Select Room</label>
                  <CustomSelect
                    value={statusRoomId}
                    onChange={e => setStatusRoomId(e.target.value)}
                  >
                    <option value="">-- Choose Room --</option>
                    {rooms.map(rm => (
                      <option key={rm.id} value={rm.id}>Room {rm.room_number} ({rm.status})</option>
                    ))}
                  </CustomSelect>
                </div>
                <div>
                  <label className="label">Target Status</label>
                  <CustomSelect
                    value={roomTargetStatus}
                    onChange={e => setRoomTargetStatus(e.target.value)}
                  >
                    <option value="Vacant Clean">Vacant Clean (Sellable)</option>
                    <option value="Maintenance">Maintenance (Blocked)</option>
                    <option value="Dirty">Dirty</option>
                    <option value="Occupied">Occupied</option>
                  </CustomSelect>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '6px' }}>
                  Update Status
                </button>
              </form>
            </div>

            {/* Rate adjustments */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>Adjust Rate Plan</h3>
              <form onSubmit={handleUpdateRatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="label">Select Rate Plan</label>
                  <CustomSelect
                    value={ratePlanEditId}
                    onChange={e => {
                      setRatePlanEditId(e.target.value);
                      const plan = ratePlans.find(rp => rp.id === e.target.value);
                      if (plan) {
                        setEditNightPrice(String(plan.night_price));
                        setEditDayPrice(String(plan.day_use_price));
                      } else {
                        setEditNightPrice('');
                        setEditDayPrice('');
                      }
                    }}
                  >
                    <option value="">-- Choose Plan --</option>
                    {ratePlans.map(rp => (
                      <option key={rp.id} value={rp.id}>{rp.name}</option>
                    ))}
                  </CustomSelect>
                </div>
                <div>
                  <label className="label">Night Price (₹)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 1500"
                    value={editNightPrice}
                    onChange={e => setEditNightPrice(e.target.value)}
                    required
                    disabled={!ratePlanEditId}
                  />
                </div>
                <div>
                  <label className="label">Day Use Price (₹)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 1000"
                    value={editDayPrice}
                    onChange={e => setEditDayPrice(e.target.value)}
                    required
                    disabled={!ratePlanEditId}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '6px' }} disabled={!ratePlanEditId}>
                  Update Rates
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* NEW RESERVATION FORM TAB */}
      {activeTab === 'newbooking' && (
        <div className="card animate-fade-up" style={{ padding: '24px', maxWidth: '680px' }}>
          <BookingForm 
            onCancel={() => setActiveTab('timeline')}
            onSuccess={() => {
              fetchData();
              setActiveTab('timeline');
            }}
            roomTypes={roomTypes}
            ratePlans={ratePlans}
            permission={permission}
            defaultMode="reservation"
          />
        </div>
      )}

      {/* QUICK ACTION RIGHT SIDEBAR (MINI-FOLIO) */}
      <div 
        style={{
          position: 'fixed', top: 0, right: selectedRes ? 0 : '-420px', bottom: 0,
          width: '400px', background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 1050, transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {selectedRes && (
          <>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Quick Actions</h2>
              </div>
              <button onClick={() => setSelectedRes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Reservation ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedRes.reservation_number}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Guest Name</span>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedRes.guest_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Mobile No</span>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedRes.guest_mobile}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Room Assigned</span>
                  <strong style={{ fontSize: '0.85rem' }}>Room {selectedRes.room_number || 'Unassigned'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Check-in</span>
                  <span style={{ fontSize: '0.85rem' }}>{new Date(selectedRes.check_in_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Check-out</span>
                  <span style={{ fontSize: '0.85rem' }}>{new Date(selectedRes.check_out_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: selectedRes.status === 'Checked In' ? '#ef4444' : 'var(--brand-600)' }}>{selectedRes.status}</span>
                </div>
              </div>

              {/* Full Folio Button */}
              {onViewFolio && (
                <button 
                  onClick={() => {
                    setSelectedRes(null);
                    onViewFolio(selectedRes);
                  }} 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <FileText size={18} /> Open Full Folio & Billing
                </button>
              )}

              <div style={{ borderTop: '1px dashed var(--border)' }} />

              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quick Booking Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedRes.status === 'Reserved' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => setCancelModal({ isOpen: true, res: selectedRes })}
                      className="btn btn-default"
                      style={{ borderColor: '#ef4444', color: '#ef4444', padding: '10px' }}
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => setNoShowModal({ isOpen: true, res: selectedRes })}
                      className="btn btn-default"
                      style={{ borderColor: '#f59e0b', color: '#f59e0b', padding: '10px' }}
                    >
                      Mark No-Show
                    </button>
                  </div>
                )}
                {selectedRes.status === 'Checked In' && (
                  <button
                    onClick={() => {
                      setExtendRes(selectedRes);
                      setExtendDate(selectedRes.check_out_datetime.slice(0, 16));
                      setSelectedRes(null);
                    }}
                    className="btn btn-default"
                    style={{ padding: '10px' }}
                  >
                    Extend Checkout Date
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Backdrop for Sidebar */}
      {selectedRes && (
        <div 
          onClick={() => setSelectedRes(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 1040 }}
        />
      )}

      {/* EXTEND STAY MODAL */}
      {extendRes && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px' }}>Extend Guest Stay</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Adjust check-out date for **{extendRes.guest_name}** (Room {extendRes.room_number}).
            </p>
            <form onSubmit={handleExtendStay} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">New Check-Out Datetime</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={extendDate}
                  onChange={e => setExtendDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setExtendRes(null)} className="btn btn-default">Discard</button>
                <button type="submit" className="btn btn-primary">Extend Stay</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm cancel modal */}
      <ConfirmModal
        isOpen={cancelModal.isOpen}
        title="Cancel Booking"
        message={`Are you sure you want to cancel the reservation for ${cancelModal.res?.guest_name}? This cannot be undone.`}
        confirmLabel="Cancel Booking"
        confirmVariant="danger"
        onConfirm={handleCancelReservation}
        onCancel={() => setCancelModal({ isOpen: false, res: null })}
      />

      {/* Confirm no show modal */}
      <ConfirmModal
        isOpen={noShowModal.isOpen}
        title="Mark No-Show"
        message={`Confirm guest ${noShowModal.res?.guest_name} failed to arrive? Room ${noShowModal.res?.room_number || ''} will be released.`}
        confirmLabel="Mark No-Show"
        confirmVariant="warning"
        onConfirm={handleNoShow}
        onCancel={() => setNoShowModal({ isOpen: false, res: null })}
      />

    </div>
  );
}
