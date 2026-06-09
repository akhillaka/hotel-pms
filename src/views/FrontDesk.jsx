import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, LogOut, CheckCircle, Search, Upload, Camera, ShieldAlert, Award, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FrontDesk({ user }) {
  const [activeTab, setActiveTab] = useState('checkin');
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [stayType, setStayType] = useState('hourly');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [customRate, setCustomRate] = useState('');

  // Check-In Active Session State
  const [selectedRes, setSelectedRes] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);

  // Overrides
  const [managerPin, setManagerPin] = useState('');
  const [isOverrideActive, setIsOverrideActive] = useState(false);

  const fetchFrontDeskData = async () => {
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
    } catch (err) {
      toast.error('Failed to sync front desk registries');
    }
  };

  useEffect(() => {
    fetchFrontDeskData();
  }, []);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!guestName || !guestMobile || !roomTypeId || !ratePlanId || !checkInDate || !checkOutDate) {
      return toast.error('Please enter all required booking fields');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/reservations', {
        guest: { name: guestName, mobile: guestMobile },
        stay_type: stayType,
        room_type_id: roomTypeId,
        rate_plan_id: ratePlanId,
        check_in: checkInDate,
        check_out: checkOutDate,
        adults,
        children,
        remarks,
        custom_rate: customRate ? parseFloat(customRate) : null
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Reservation successfully recorded');
      fetchFrontDeskData();
      
      // Clear fields
      setGuestName('');
      setGuestMobile('');
      setRoomTypeId('');
      setRatePlanId('');
      setCheckInDate('');
      setCheckOutDate('');
      setCustomRate('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register booking');
    }
  };

  const handleMockCameraCapture = (type) => {
    // Generates a mock File payload representing webcam capture
    const mockFile = new File(['mock_image_binary_data'], `mock-${type}-capture.jpg`, { type: 'image/jpeg' });
    if (type === 'photo') setPhotoFile(mockFile);
    if (type === 'idFront') setIdFrontFile(mockFile);
    if (type === 'idBack') setIdBackFile(mockFile);
    toast.success(`Simulated webcam capture for ${type} complete`);
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRes || !selectedRoom) {
      return toast.error('Please select a reservation and assign a clean room');
    }

    // Role-based document uploads validation rule
    const missingDocs = !photoFile || !idFrontFile || !idBackFile || !idNumber;
    if (missingDocs && user.role === 'Receptionist' && !isOverrideActive) {
      return toast.error('BLOCK ALERT: Receptionists cannot check-in guests without Guest Photo, ID Front, and ID Back. Ask Manager to override.');
    }

    const formData = new FormData();
    formData.append('room_id', selectedRoom);
    formData.append('advance_amount', advanceAmount);
    formData.append('payment_method', paymentMethod);
    formData.append('guest_name', selectedRes.guest_name);
    formData.append('id_type', idType);
    formData.append('id_number', idNumber);

    if (photoFile) formData.append('photo', photoFile);
    if (idFrontFile) formData.append('idFront', idFrontFile);
    if (idBackFile) formData.append('idBack', idBackFile);

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/reservations/${selectedRes.id}/check-in`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Check-In complete! Room assigned.`);
      setSelectedRes(null);
      setSelectedRoom('');
      setPhotoFile(null);
      setIdFrontFile(null);
      setIdBackFile(null);
      setIdNumber('');
      setIsOverrideActive(false);
      fetchFrontDeskData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete check-in');
    }
  };

  const handleCheckOut = async (res) => {
    try {
      const token = localStorage.getItem('pms_token');
      
      // First fetch folio status
      const folioRes = await axios.get(`/api/folios/${res.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const balance = folioRes.data.summary.balance;
      
      if (balance > 0 && user.role === 'Receptionist' && !isOverrideActive) {
        return toast.error(`BLOCK ALERT: Outstanding balance of ₹${balance} remains. Receptionists cannot checkout outstanding bills. Require Manager override.`);
      }

      await axios.post(`/api/reservations/${res.id}/check-out`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Check-Out processed successfully! Room set to Dirty.');
      setIsOverrideActive(false);
      fetchFrontDeskData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-Out failed');
    }
  };

  const verifyManagerOverride = () => {
    // Simulated manager approval (manager pin is '1234' or any Manager role authenticated is valid)
    if (managerPin === '1234' || user.role === 'Manager' || user.role === 'Admin') {
      setIsOverrideActive(true);
      toast.success('Manager Compliance Override Activated!');
    } else {
      toast.error('Invalid Manager PIN Code');
    }
  };

  const filteredReservations = reservations.filter(res => 
    res.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    res.guest_mobile.includes(searchQuery) ||
    (res.room_number && res.room_number.includes(searchQuery))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Front Desk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Check-in execution & override protection</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('checkin')} 
            className={`glass-btn ${activeTab === 'checkin' ? 'glass-btn-primary' : ''}`}
          >
            Check-In Desk
          </button>
          <button 
            onClick={() => setActiveTab('newres')} 
            className={`glass-btn ${activeTab === 'newres' ? 'glass-btn-primary' : ''}`}
          >
            New Booking / Walk-in
          </button>
        </div>
      </div>

      {/* Manager Override Trigger Panel */}
      {user.role === 'Receptionist' && (
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
            <ShieldAlert className="text-danger" size={20} />
            <div>
              <strong>Audit Shield Active:</strong> Missing files or outstanding balances block receptionists automatically.
              {isOverrideActive && <div style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Manager Override: ON</div>}
            </div>
          </div>
          {!isOverrideActive && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="password" 
                placeholder="Manager PIN" 
                className="glass-input" 
                style={{ width: '120px', padding: '6px 12px', fontSize: '0.8rem' }}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
              />
              <button onClick={verifyManagerOverride} className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Apply</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'checkin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          {/* Reservation Search Table */}
          {!selectedRes ? (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by Guest Name, Mobile, or Room..." 
                    className="glass-input" 
                    style={{ paddingLeft: '40px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>Res Number</th>
                      <th style={{ padding: '12px' }}>Guest</th>
                      <th style={{ padding: '12px' }}>Stay Duration</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Room</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No matching bookings found</td>
                      </tr>
                    ) : (
                      filteredReservations.map(res => (
                        <tr key={res.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{res.reservation_number}</td>
                          <td style={{ padding: '12px' }}>
                            <div>{res.guest_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{res.guest_mobile}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '0.8rem' }}>In: {new Date(res.check_in_datetime).toLocaleString()}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Out: {new Date(res.check_out_datetime).toLocaleString()}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${res.status === 'Checked In' ? 'badge-success' : res.status === 'Reserved' ? 'badge-info' : 'badge-neutral'}`}>
                              {res.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>{res.room_number || 'Unassigned'}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {res.status === 'Reserved' && (
                              <button 
                                onClick={() => setSelectedRes(res)} 
                                className="glass-btn glass-btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Check-In
                              </button>
                            )}
                            {res.status === 'Checked In' && (
                              <button 
                                onClick={() => handleCheckOut(res)} 
                                className="glass-btn glass-btn-danger"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Check-Out
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            
            /* Check-In Form */
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Checking In: {selectedRes.guest_name}</h2>
                <button onClick={() => setSelectedRes(null)} className="glass-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Back to Desk</button>
              </div>

              <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Image WebCam Capture Mock Simulation */}
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Force Document Capture (Mandatory Anti-Leakage Rules)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ border: '1px dashed var(--border-glass)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Guest Photo</span>
                      {photoFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Image Simulated</div>
                      ) : (
                        <button type="button" onClick={() => handleMockCameraCapture('photo')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Snap Face
                        </button>
                      )}
                    </div>
                    <div style={{ border: '1px dashed var(--border-glass)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ID Front</span>
                      {idFrontFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Image Simulated</div>
                      ) : (
                        <button type="button" onClick={() => handleMockCameraCapture('idFront')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Scan Front
                        </button>
                      )}
                    </div>
                    <div style={{ border: '1px dashed var(--border-glass)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ID Back</span>
                      {idBackFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Image Simulated</div>
                      ) : (
                        <button type="button" onClick={() => handleMockCameraCapture('idBack')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Scan Back
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>ID Type</label>
                    <select className="glass-input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>ID Number</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Enter ID reference number" 
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Advance collection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Collect Advance (Debit Folio)</label>
                    <input 
                      type="number" 
                      className="glass-input" 
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payment Method</label>
                    <select className="glass-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="UPI">UPI Payment</option>
                      <option value="Cash">Cash Drawer</option>
                      <option value="Card">Terminal Card</option>
                      <option value="Bank Transfer">Bank Wire</option>
                    </select>
                  </div>
                </div>

                {/* Room Assignment */}
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Assign Room (Vacant Clean only list)</label>
                  <select 
                    className="glass-input" 
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                  >
                    <option value="">-- Select Vacant Clean Room --</option>
                    {rooms
                      .filter(rm => rm.room_type_id === selectedRes.room_type_id && (rm.status === 'Vacant Clean' || user.role !== 'Receptionist' || isOverrideActive))
                      .map(rm => (
                        <option key={rm.id} value={rm.id}>
                          Room {rm.room_number} (Floor {rm.floor} | {rm.status})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <button type="submit" className="glass-btn glass-btn-primary" style={{ width: '100%' }}>
                  <LogIn size={18} /> Confirm Check-In & Post Initial Accommodation Charge
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'newres' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px' }}>Register Reservation / Walk-In</h2>
          <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Guest Full Name *</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={guestName} 
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Mobile Number *</label>
                <input 
                  type="tel" 
                  className="glass-input" 
                  placeholder="e.g. 9876543210" 
                  value={guestMobile} 
                  onChange={(e) => setGuestMobile(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Stay Type</label>
                <select className="glass-input" value={stayType} onChange={(e) => setStayType(e.target.value)}>
                  <option value="hourly">Hourly Stay Package</option>
                  <option value="night">Night Stay</option>
                  <option value="day_use">Day Use</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Room Type *</label>
                <select 
                  className="glass-input" 
                  value={roomTypeId} 
                  onChange={(e) => {
                    setRoomTypeId(e.target.value);
                    setRatePlanId(''); // reset plan
                  }}
                >
                  <option value="">-- Choose Type --</option>
                  {roomTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name} ({type.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Rate Package *</label>
                <select 
                  className="glass-input" 
                  value={ratePlanId} 
                  onChange={(e) => setRatePlanId(e.target.value)}
                  disabled={!roomTypeId}
                >
                  <option value="">-- Choose Package --</option>
                  {ratePlans
                    .filter(plan => plan.room_type_id === roomTypeId)
                    .map(plan => {
                      const basePrice = stayType === 'hourly' ? 'Hourly Configured' : (stayType === 'day_use' ? `₹${plan.day_use_price}` : `₹${plan.night_price}`);
                      return <option key={plan.id} value={plan.id}>{plan.name} - {basePrice}</option>;
                    })
                  }
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Check-In Time *</label>
                <input 
                  type="datetime-local" 
                  className="glass-input" 
                  value={checkInDate} 
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Check-Out Time *</label>
                <input 
                  type="datetime-local" 
                  className="glass-input" 
                  value={checkOutDate} 
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Adults count</label>
                <input type="number" className="glass-input" value={adults} onChange={(e) => setAdults(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Children count</label>
                <input type="number" className="glass-input" value={children} onChange={(e) => setChildren(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Custom Price Override (₹)</label>
                <input type="number" className="glass-input" placeholder="e.g. 1500" value={customRate} onChange={(e) => setCustomRate(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Special Remarks</label>
              <textarea 
                className="glass-input" 
                rows="2" 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '8px' }}>
              <CheckCircle size={18} /> Register Booking
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
