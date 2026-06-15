import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomSelect from './CustomSelect';

const todayDateStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const tomorrowDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export default function BookingForm({
  onCancel,
  onSuccess,
  roomTypes = [],
  ratePlans = [],
  permission = 'edit',
  defaultMode = 'reservation',
  defaultRoomId = '',
  title = 'Register Reservation / Walk-In'
}) {
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  
  // Auto-suggest states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);

  const [roomTypeId, setRoomTypeId] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  const [checkInDate, setCheckInDate] = useState(todayDateStr());
  const [checkInTime, setCheckInTime] = useState('12:00');
  const [checkOutDate, setCheckOutDate] = useState(tomorrowDateStr());
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [customRate, setCustomRate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [remarks, setRemarks] = useState('');
  
  const [autoCheckIn, setAutoCheckIn] = useState(defaultMode === 'walkin');
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [availableRooms, setAvailableRooms] = useState([]);
  
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  useEffect(() => {
    if (roomTypeId && checkInDate && checkOutDate) {
      const fetchAvailableRooms = async () => {
        try {
          const checkIn = `${checkInDate}T${checkInTime}`;
          const checkOut = `${checkOutDate}T${checkOutTime}`;
          const token = localStorage.getItem('pms_token');
          const res = await axios.get(`/api/rooms/available?room_type_id=${roomTypeId}&check_in=${checkIn}&check_out=${checkOut}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAvailableRooms(res.data);
          
          if (defaultRoomId && !res.data.find(r => r.id === defaultRoomId)) {
            setRoomId('');
          }
        } catch (err) {
          console.error('Failed to fetch available rooms', err);
        }
      };
      fetchAvailableRooms();
    } else {
      setAvailableRooms([]);
    }
  }, [roomTypeId, checkInDate, checkInTime, checkOutDate, checkOutTime]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchGuests = async () => {
      if (guestMobile.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const token = localStorage.getItem('pms_token');
        const res = await axios.get(`/api/guests?mobile=${guestMobile}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(res.data);
      } catch (err) {
        console.error('Failed to fetch guests for autocomplete', err);
      }
    };

    const debounce = setTimeout(() => {
      if (guestMobile) fetchGuests();
    }, 300);

    return () => clearTimeout(debounce);
  }, [guestMobile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!guestName || !guestMobile || !roomTypeId || !ratePlanId || !checkInDate || !checkOutDate) {
      return toast.error('Please fill in all required booking fields');
    }
    const checkIn = `${checkInDate}T${checkInTime}`;
    const checkOut = `${checkOutDate}T${checkOutTime}`;

    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/reservations', {
        guest: { name: guestName, mobile: guestMobile },
        stay_type: 'night', 
        room_type_id: roomTypeId,
        room_id: autoCheckIn ? roomId : (roomId || null),
        rate_plan_id: ratePlanId,
        check_in: checkIn,
        check_out: checkOut,
        adults: adults,
        children: children,
        remarks: remarks,
        custom_rate: customRate ? parseFloat(customRate) : null
      }, { headers: { Authorization: `Bearer ${token}` } });

      let reservationId = res.data.reservationId;
      
      if (autoCheckIn && roomId) {
        const formData = new FormData();
        formData.append('room_id', roomId);
        formData.append('advance_amount', advanceAmount);
        formData.append('payment_method', paymentMethod);
        formData.append('guest_name', guestName);
        formData.append('id_type', 'Walk-In Default');
        formData.append('id_number', 'N/A');
        
        await axios.post(`/api/reservations/${reservationId}/check-in`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Walk-In Reservation created & Auto Checked-In!');
      } else {
        toast.success('Reservation successfully recorded');
      }
      
      if (onSuccess) onSuccess();
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register booking');
    }
  };

  const handleSuggestionClick = (guest) => {
    setGuestMobile(guest.mobile);
    setGuestName(guest.name);
    setShowSuggestions(false);
  };

  return (
    <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>{title}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Guest Full Name *</label>
            <input type="text" className="glass-input" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
          </div>
          <div style={{ position: 'relative' }} ref={suggestionRef}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mobile Phone Number *</label>
            <input 
              type="tel" 
              className="glass-input" 
              value={guestMobile} 
              onChange={(e) => {
                setGuestMobile(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => { if(guestMobile.length >= 3) setShowSuggestions(true); }}
              required 
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', marginTop: '4px', boxShadow: 'var(--shadow-md)',
                maxHeight: '200px', overflowY: 'auto'
              }}>
                {suggestions.map(g => (
                  <div 
                    key={g.id} 
                    onClick={() => handleSuggestionClick(g)}
                    style={{
                      padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--surface-2)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.mobile}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Type Category *</label>
            <CustomSelect className="glass-input" value={roomTypeId} onChange={(e) => { setRoomTypeId(e.target.value); setRoomId(''); }} required>
              <option value="">-- Choose Category --</option>
              {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate Plan package *</label>
            <CustomSelect className="glass-input" value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)} disabled={!roomTypeId} required>
              <option value="">-- Choose Package --</option>
              {ratePlans.filter(p => String(p.room_type_id) === String(roomTypeId)).map(p => {
                return <option key={p.id} value={p.id}>{p.name} (Night: ₹{p.night_price} | Day: ₹{p.day_use_price})</option>;
              })}
            </CustomSelect>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Check-In Date *</label>
            <input type="date" className="glass-input" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Time</label>
            <input type="time" className="glass-input" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Check-Out Date *</label>
            <input type="date" className="glass-input" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Time</label>
            <input type="time" className="glass-input" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Custom Price Override (₹)</label>
            <input type="number" className="glass-input" placeholder="e.g. 1500" value={customRate} onChange={(e) => setCustomRate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Adults</label>
            <input type="number" min="1" className="glass-input" value={adults} onChange={(e) => setAdults(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Children</label>
            <input type="number" min="0" className="glass-input" value={children} onChange={(e) => setChildren(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Remarks</label>
            <input type="text" className="glass-input" placeholder="Optional notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={autoCheckIn} onChange={(e) => setAutoCheckIn(e.target.checked)} />
              Auto Check-In (Assigns room immediately & checks guest in)
            </label>
          </div>
          
          {(autoCheckIn || defaultMode === 'reservation') && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Assign Room {autoCheckIn ? '(Required for Auto Check-In)' : '(Optional)'}</label>
              {!roomTypeId ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--border)' }}>
                  Please select a Room Type and check-in/out dates to view available vacant rooms.
                </div>
              ) : (() => {
                const vacantAvailableRooms = availableRooms.filter(rm => rm.status !== 'Occupied' && rm.status !== 'Maintenance');
                if (vacantAvailableRooms.length === 0) {
                  return (
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--danger)' }}>
                      No vacant rooms available for the selected category and duration.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {vacantAvailableRooms.map(rm => {
                      const isSelected = roomId === rm.id;
                      return (
                        <button
                          key={rm.id}
                          type="button"
                          onClick={() => setRoomId(rm.id === roomId ? '' : rm.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--r-md)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--brand-600)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--brand-600)' : 'var(--surface-2)',
                            color: isSelected ? '#fff' : 'var(--text)',
                            boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Room {rm.room_number}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {autoCheckIn && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Advance Amount (₹)</label>
                <input type="number" min="0" className="glass-input" id="advanceAmount" name="advanceAmount" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                <CustomSelect className="glass-input" id="paymentMethod" name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </CustomSelect>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          {onCancel && <button type="button" onClick={onCancel} className="glass-btn">Cancel</button>}
          <button type="submit" className="glass-btn glass-btn-primary" disabled={permission === 'read' || (autoCheckIn && !roomId)}>
            {autoCheckIn ? 'Register Walk-in & Check-In' : 'Save Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
