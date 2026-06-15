import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X, User, Phone, BedDouble, Tag, Calendar, Clock,
  Users, Baby, MessageSquare, CheckCircle, ChevronRight,
  Wallet, Zap, Search, DollarSign, Home
} from 'lucide-react';

/* ── helpers ── */
const pad = (n) => String(n).padStart(2, '0');
const todayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const tomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const combineDatetime = (date, time) => `${date}T${time}`;

/* ── Section Header ── */
const SectionLabel = ({ icon, label, step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <div style={{ width: 28, height: 28, borderRadius: 9, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
      {icon}
    </div>
    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>{label}</span>
  </div>
);

/* ── Native-style field ── */
const Field = ({ label, required, children, hint }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
      {label.toUpperCase()}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 12,
  border: '1.5px solid #e2e8f0',
  fontSize: '0.95rem',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  WebkitAppearance: 'none',
};

const selectStyle = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
};

/* ── Counter button ── */
const Counter = ({ value, onChange, min = 0 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', width: 120 }}>
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 40, height: 44, border: 'none', background: 'none', fontSize: '1.3rem', fontWeight: 300, color: '#64748b', cursor: 'pointer' }}>−</button>
    <div style={{ flex: 1, textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
    <button type="button" onClick={() => onChange(value + 1)} style={{ width: 40, height: 44, border: 'none', background: 'none', fontSize: '1.3rem', fontWeight: 300, color: '#4f46e5', cursor: 'pointer' }}>+</button>
  </div>
);

/* ── Main Component ── */
export default function MobileBookingForm({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);

  /* Guest */
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const suggRef = useRef(null);

  /* Stay */
  const [roomTypes, setRoomTypes] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  const [customRate, setCustomRate] = useState('');

  /* Dates — SPLIT */
  const [ciDate, setCiDate] = useState(todayDate());
  const [ciTime, setCiTime] = useState('12:00');
  const [coDate, setCoDate] = useState(tomorrowDate());
  const [coTime, setCoTime] = useState('11:00');

  /* Guests */
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [remarks, setRemarks] = useState('');

  /* Room assignment */
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [advance, setAdvance] = useState('0');
  const [payMethod, setPayMethod] = useState('Cash');

  const [submitting, setSubmitting] = useState(false);

  /* Load room types and rate plans */
  useEffect(() => {
    const token = localStorage.getItem('pms_token');
    Promise.all([
      axios.get('/api/room-types', { headers: { Authorization: `Bearer ${token}` } }),
      axios.get('/api/rate-plans', { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([rt, rp]) => {
      setRoomTypes(rt.data || []);
      setRatePlans(rp.data || []);
    }).catch(() => {});
  }, []);

  /* Fetch available rooms when dates + room type change */
  useEffect(() => {
    if (!roomTypeId || !ciDate || !ciTime || !coDate || !coTime) { setAvailableRooms([]); return; }
    const token = localStorage.getItem('pms_token');
    const checkIn = combineDatetime(ciDate, ciTime);
    const checkOut = combineDatetime(coDate, coTime);
    axios.get(`/api/rooms/available?room_type_id=${roomTypeId}&check_in=${checkIn}&check_out=${checkOut}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setAvailableRooms(r.data || []);
      setRoomId('');
    }).catch(() => setAvailableRooms([]));
  }, [roomTypeId, ciDate, ciTime, coDate, coTime]);

  /* Guest mobile autocomplete */
  useEffect(() => {
    if (guestMobile.length < 3) { setSuggestions([]); return; }
    const token = localStorage.getItem('pms_token');
    const t = setTimeout(() => {
      axios.get(`/api/guests?mobile=${guestMobile}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setSuggestions(r.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [guestMobile]);

  /* Dismiss suggestions on outside click */
  useEffect(() => {
    const h = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const checkIn  = combineDatetime(ciDate, ciTime);
  const checkOut = combineDatetime(coDate, coTime);

  const nightsDiff = () => {
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff.toFixed(1) : '—';
  };

  const canNext1 = guestName && guestMobile;
  const canNext2 = roomTypeId && ratePlanId && ciDate && coDate;

  const handleSubmit = async () => {
    if (!guestName || !guestMobile || !roomTypeId || !ratePlanId) {
      return toast.error('Please complete all required fields');
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/reservations', {
        guest: { name: guestName, mobile: guestMobile },
        stay_type: 'night',
        room_type_id: roomTypeId,
        room_id: roomId || null,
        rate_plan_id: ratePlanId,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        remarks,
        custom_rate: customRate ? parseFloat(customRate) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const reservationId = res.data.reservationId;

      if (autoCheckIn && roomId) {
        const fd = new FormData();
        fd.append('room_id', roomId);
        fd.append('advance_amount', advance);
        fd.append('payment_method', payMethod);
        fd.append('guest_name', guestName);
        fd.append('id_type', 'Walk-In');
        fd.append('id_number', 'N/A');
        await axios.post(`/api/reservations/${reservationId}/check-in`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        toast.success('✅ Checked in successfully!');
      } else {
        toast.success('✅ Reservation saved!');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save reservation');
    }
    setSubmitting(false);
  };

  const selectedRoomType = roomTypes.find(rt => String(rt.id) === String(roomTypeId));
  const filteredRatePlans = ratePlans.filter(rp => String(rp.room_type_id) === String(roomTypeId));
  const vacantRooms = availableRooms.filter(r => r.status !== 'Occupied' && r.status !== 'Maintenance');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(15,23,42,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div style={{
        width: '100%',
        maxHeight: '94dvh',
        maxHeight: '94vh',
        background: '#f8fafc',
        borderRadius: '24px 24px 0 0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'sheetSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {step === 1 ? '👤 Guest Details' : step === 2 ? '🏨 Stay Details' : '✅ Confirm & Book'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>Step {step} of 3</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#e2e8f0', flexShrink: 0 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #4f46e5)', width: `${(step / 3) * 100}%`, transition: 'width 0.3s ease', borderRadius: '0 2px 2px 0' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px' }}>

          {/* ── STEP 1: Guest ── */}
          {step === 1 && (
            <div>
              <SectionLabel icon={<User size={14} />} label="Guest Information" />

              {/* Mobile autocomplete */}
              <div ref={suggRef} style={{ position: 'relative' }}>
                <Field label="Mobile Number" required>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="tel"
                      value={guestMobile}
                      onChange={e => { setGuestMobile(e.target.value); setShowSugg(true); }}
                      onFocus={() => { if (guestMobile.length >= 3) setShowSugg(true); }}
                      placeholder="Search existing guest..."
                      style={{ ...inputStyle, paddingLeft: 40 }}
                      autoComplete="off"
                    />
                  </div>
                </Field>
                {showSugg && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: 68, left: 0, right: 0, zIndex: 20, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                    {suggestions.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setGuestMobile(g.mobile); setGuestName(g.name); setShowSugg(false); }}
                        style={{ width: '100%', padding: '13px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{g.mobile}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{g.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Full Name" required>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Guest's full name"
                  style={inputStyle}
                />
              </Field>

              {/* Quick guest type pills */}
              <Field label="Remarks / Notes">
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Early check-in requested..."
                  style={inputStyle}
                />
              </Field>

              {/* Guests count */}
              <SectionLabel icon={<Users size={14} />} label="Number of Guests" />
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.06em' }}>ADULTS</div>
                  <Counter value={adults} onChange={setAdults} min={1} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.06em' }}>CHILDREN</div>
                  <Counter value={children} onChange={setChildren} min={0} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Stay Details ── */}
          {step === 2 && (
            <div>
              <SectionLabel icon={<BedDouble size={14} />} label="Room & Rate" />

              <Field label="Room Category" required>
                <select value={roomTypeId} onChange={e => { setRoomTypeId(e.target.value); setRatePlanId(''); }} style={selectStyle}>
                  <option value="">Select room type...</option>
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              </Field>

              <Field label="Rate Plan" required>
                <select value={ratePlanId} onChange={e => setRatePlanId(e.target.value)} style={selectStyle} disabled={!roomTypeId}>
                  <option value="">{roomTypeId ? 'Select a package...' : 'Choose room type first'}</option>
                  {filteredRatePlans.map(rp => (
                    <option key={rp.id} value={rp.id}>{rp.name} — Night ₹{rp.night_price} / Day ₹{rp.day_use_price}</option>
                  ))}
                </select>
              </Field>

              <Field label="Custom Rate Override (₹)" hint="Leave blank to use rate plan pricing">
                <input type="number" value={customRate} onChange={e => setCustomRate(e.target.value)} placeholder="e.g. 1500" style={inputStyle} />
              </Field>

              {/* ── Date/Time — SPLIT ── */}
              <SectionLabel icon={<Calendar size={14} />} label="Check-In Date & Time" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <Field label="Date" required>
                  <input type="date" value={ciDate} onChange={e => setCiDate(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Time" required>
                  <input type="time" value={ciTime} onChange={e => setCiTime(e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <SectionLabel icon={<Clock size={14} />} label="Check-Out Date & Time" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <Field label="Date" required>
                  <input type="date" value={coDate} onChange={e => setCoDate(e.target.value)} min={ciDate} style={inputStyle} />
                </Field>
                <Field label="Time" required>
                  <input type="time" value={coTime} onChange={e => setCoTime(e.target.value)} style={inputStyle} />
                </Field>
              </div>

              {/* Duration pill */}
              {ciDate && coDate && (
                <div style={{ background: '#eef2ff', borderRadius: 10, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.8rem', fontWeight: 700, color: '#4338ca' }}>
                  <Clock size={13} /> Duration: {nightsDiff()} nights
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === 3 && (
            <div>
              {/* Summary Card */}
              <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)', borderRadius: 18, padding: '20px', marginBottom: 16, color: '#fff' }}>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 4 }}>BOOKING SUMMARY</div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 2 }}>{guestName}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>{guestMobile}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Check-In', value: `${ciDate} ${ciTime}` },
                    { label: 'Check-Out', value: `${coDate} ${coTime}` },
                    { label: 'Duration', value: `${nightsDiff()} nights` },
                    { label: 'Guests', value: `${adults} adults, ${children} child` },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{item.label.toUpperCase()}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 3 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Assignment */}
              <SectionLabel icon={<Home size={14} />} label="Room Assignment" />

              {/* Auto check-in toggle */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Instant Check-In</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>Assign room & check in right now</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCheckIn(!autoCheckIn)}
                  style={{ width: 48, height: 28, borderRadius: 14, border: 'none', background: autoCheckIn ? '#4f46e5' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 3, left: autoCheckIn ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </button>
              </div>

              {/* Room grid */}
              {vacantRooms.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: 10, letterSpacing: '0.06em' }}>SELECT ROOM</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {vacantRooms.map(rm => {
                      const sel = roomId === rm.id;
                      return (
                        <button
                          key={rm.id}
                          type="button"
                          onClick={() => setRoomId(sel ? '' : rm.id)}
                          style={{ padding: '12px 4px', borderRadius: 12, border: sel ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: sel ? '#eef2ff' : '#fff', color: sel ? '#4f46e5' : '#334155', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center', boxShadow: sel ? '0 2px 8px rgba(79,70,229,0.2)' : 'none', transition: 'all 0.15s' }}
                        >
                          {rm.room_number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : roomTypeId ? (
                <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fca5a5', marginBottom: 14, fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600 }}>
                  ⚠️ No vacant rooms available for selected category & dates.
                </div>
              ) : null}

              {/* Advance payment (only for auto check-in) */}
              {autoCheckIn && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
                  <SectionLabel icon={<Wallet size={14} />} label="Advance Payment" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Amount (₹)">
                      <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} min="0" placeholder="0" style={inputStyle} />
                    </Field>
                    <Field label="Method">
                      <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={selectStyle}>
                        <option>Cash</option>
                        <option>Card</option>
                        <option>UPI</option>
                        <option>Bank Transfer</option>
                      </select>
                    </Field>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{ flex: '0 0 auto', padding: '14px 20px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !canNext1 : !canNext2}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                  background: (step === 1 ? canNext1 : canNext2) ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#e2e8f0',
                  color: (step === 1 ? canNext1 : canNext2) ? '#fff' : '#94a3b8',
                  fontWeight: 800, fontSize: '1rem', cursor: (step === 1 ? canNext1 : canNext2) ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: (step === 1 ? canNext1 : canNext2) ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || (autoCheckIn && !roomId)}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                  background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: submitting ? '#94a3b8' : '#fff',
                  fontWeight: 800, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                }}
              >
                {submitting ? 'Saving...' : autoCheckIn ? '⚡ Check In Now' : '✅ Save Reservation'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
