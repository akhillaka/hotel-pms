import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Plus, CreditCard, RotateCcw, AlertTriangle, ShieldCheck, Printer, 
  User, UserCheck, Calendar, Clock, Bed, ArrowLeft, Trash2, Check, Download, ChevronDown, 
  LogOut, ShieldAlert, Image as ImageIcon, PlusCircle, History, Camera, CheckCircle2, Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import BookingForm from '../components/BookingForm';

export default function Billing({ user, permission, preselectedRes, onClearPreselected }) {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [propertySettings, setPropertySettings] = useState(null);

  const [selectedRes, setSelectedRes] = useState(null);
  const [folioData, setFolioData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab State inside Folio View
  const [activeFolioTab, setActiveFolioTab] = useState('Summary');
  const [splitFolioBEntries, setSplitFolioBEntries] = useState({});
  const [selectedFolioGroup, setSelectedFolioGroup] = useState('A');
  const [paymentLinkData, setPaymentLinkData] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Deposits & Refunds State variables
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('UPI');
  const [depositDesc, setDepositDesc] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('UPI');
  const [refundReason, setRefundReason] = useState('');

  // Load split folios on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pms_split_folios');
      if (saved) setSplitFolioBEntries(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleSplitEntry = (folioId, entryId) => {
    setSplitFolioBEntries(prev => {
      const current = prev[folioId] || [];
      const next = current.includes(entryId)
        ? current.filter(id => id !== entryId)
        : [...current, entryId];
      const updated = { ...prev, [folioId]: next };
      localStorage.setItem('pms_split_folios', JSON.stringify(updated));
      return updated;
    });
    toast.success('Folio entry split group updated');
  };

  // Walk-In / New Booking form toggler & state
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const getTodayDateTimeStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T12:00`;
  };
  const getTomorrowDateTimeStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T11:00`;
  };

  const [walkInStayType, setWalkInStayType] = useState('hourly');
  const [walkInRoomTypeId, setWalkInRoomTypeId] = useState('');
  const [walkInRatePlanId, setWalkInRatePlanId] = useState('');
  const [walkInCheckIn, setWalkInCheckIn] = useState(getTodayDateTimeStr);
  const [walkInCheckOut, setWalkInCheckOut] = useState(getTomorrowDateTimeStr);
  const [walkInAdults, setWalkInAdults] = useState(1);
  const [walkInChildren, setWalkInChildren] = useState(0);
  const [walkInRemarks, setWalkInRemarks] = useState('');
  const [walkInCustomRate, setWalkInCustomRate] = useState('');
  const [walkInAutoCheckIn, setWalkInAutoCheckIn] = useState(true);
  const [walkInRoomId, setWalkInRoomId] = useState('');
  const [walkInAvailableRooms, setWalkInAvailableRooms] = useState([]);

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!walkInRoomTypeId || !walkInCheckIn || !walkInCheckOut) {
        setWalkInAvailableRooms([]);
        return;
      }
      try {
        const token = localStorage.getItem('pms_token');
        const res = await axios.get('/api/rooms/available', {
          params: { room_type_id: walkInRoomTypeId, check_in: walkInCheckIn, check_out: walkInCheckOut },
          headers: { Authorization: `Bearer ${token}` }
        });
        setWalkInAvailableRooms(res.data);
      } catch (err) {
        console.error('Failed to fetch walk-in available rooms', err);
      }
    };
    fetchAvailableRooms();
  }, [walkInRoomTypeId, walkInCheckIn, walkInCheckOut]);

  // Check-In Workspace Form States (for reservations not yet Checked In)
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [advanceAmt, setAdvanceAmt] = useState('0');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);

  // Manager Overrides PIN for compliance block bypass
  const [managerPin, setManagerPin] = useState('');
  const [isOverrideActive, setIsOverrideActive] = useState(false);

  // Add Charge state
  const [chargeType, setChargeType] = useState('Food');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [chargeTaxId, setChargeTaxId] = useState('');

  // Add Payment state
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentAmt, setPaymentAmt] = useState('');

  // Adjustment state
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustEntry, setAdjustEntry] = useState(null);
  const [discountPercent, setDiscountPercent] = useState('');

  // Subtabs state
  const [guestHistory, setGuestHistory] = useState(null);
  const [guestData, setGuestData] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [resAuditLogs, setResAuditLogs] = useState([]);

  // Extend Stay / Dates state
  const [newCheckOut, setNewCheckOut] = useState('');

  // Edit Guest Profile state
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestMobile, setEditGuestMobile] = useState('');
  const [editGuestNat, setEditGuestNat] = useState('');
  const [editGuestIdType, setEditGuestIdType] = useState('Aadhaar');
  const [editGuestIdNum, setEditGuestIdNum] = useState('');

  // Edit posted charges state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editChargeDesc, setEditChargeDesc] = useState('');
  const [editChargeAmt, setEditChargeAmt] = useState('');

  // Edit payments state
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentDesc, setEditPaymentDesc] = useState('');
  const [editPaymentAmt, setEditPaymentAmt] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');

  const syncAllData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;

      const [resList, roomList, planList, typeList, taxList, propList] = await Promise.all([
        axios.get('/api/reservations', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/room-types', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/taxes', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/property/public', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setReservations(resList.data);
      setRooms(roomList.data);
      setRatePlans(planList.data);
      setRoomTypes(typeList.data);
      setTaxes(taxList.data);
      setPropertySettings(propList.data);
    } catch (err) {
      toast.error('Failed to sync front desk files');
    }
  };

  useEffect(() => {
    syncAllData();
  }, []);

  // Listen to parent preselection triggers
  useEffect(() => {
    if (preselectedRes) {
      if (preselectedRes.guest_id) {
        // Full object already provided
        openFolio(preselectedRes);
      } else if (reservations.length > 0) {
        // Need to find full object in reservations array
        const fullRes = reservations.find(r => r.id === preselectedRes.id);
        if (fullRes) {
          openFolio(fullRes);
        } else {
          toast.error('Reservation not found in records.');
          onClearPreselected();
        }
      }
    }
  }, [preselectedRes, reservations]);

  const openFolio = async (res) => {
    setSelectedRes(res);
    setFolioData(null);
    setGuestData(null);
    setGuestHistory(null);
    setResAuditLogs([]);
    setAdjustEntry(null);
    setSelectedFolioGroup('A');
    setPaymentLinkData(null);

    // Reset check-in form fields
    setSelectedRoomId('');
    setAdvanceAmt('0');
    setPaymentMode('UPI');
    setPhotoFile(null);
    setIdFrontFile(null);
    setIdBackFile(null);
    setIdNumber('');
    setIsOverrideActive(false);

    try {
      const token = localStorage.getItem('pms_token');

      // Fetch folio, guest history, and guest profile in parallel
      const [folioRes, histRes, guestRes] = await Promise.all([
        axios.get(`/api/folios/${res.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/guests/${res.guest_id}/history`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/guests/${res.guest_id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setFolioData(folioRes.data);
      setGuestHistory(histRes.data);
      setGuestData(guestRes.data);
      
      setEditGuestName(guestRes.data.name || '');
      setEditGuestMobile(guestRes.data.mobile || '');
      setEditGuestNat(guestRes.data.nationality || '');
      setEditGuestIdType(guestRes.data.id_type || 'Aadhaar');
      setEditGuestIdNum(guestRes.data.id_number || '');
      setNewCheckOut(res.check_out_datetime || '');

      // Audit logs are restricted to Admin/Manager — fetch separately so a 403 doesn't crash folio loading
      try {
        const folioId = folioRes.data?.folio?.id;
        const auditRes = await axios.get('/api/audit', { headers: { Authorization: `Bearer ${token}` } });
        setResAuditLogs(
          auditRes.data.filter(log =>
            log.old_value?.includes(res.reservation_number) ||
            log.new_value?.includes(res.reservation_number) ||
            (folioId && (log.old_value?.includes(folioId) || log.new_value?.includes(folioId)))
          )
        );
      } catch {
        setResAuditLogs([]); // Receptionists lack audit access — silently ignore
      }
    } catch (err) {
      toast.error('Failed to load guest folio details');
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!walkInName || !walkInMobile || !walkInRoomTypeId || !walkInRatePlanId || !walkInCheckIn || !walkInCheckOut) {
      return toast.error('Please fill in all booking fields');
    }

    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/reservations', {
        guest: { name: walkInName, mobile: walkInMobile },
        stay_type: walkInStayType,
        room_type_id: walkInRoomTypeId,
        rate_plan_id: walkInRatePlanId,
        check_in: walkInCheckIn,
        check_out: walkInCheckOut,
        adults: walkInAdults,
        children: walkInChildren,
        remarks: walkInRemarks,
        custom_rate: walkInCustomRate ? parseFloat(walkInCustomRate) : null
      }, { headers: { Authorization: `Bearer ${token}` } });

      let reservationId = res.data.reservationId;
      
      // Auto-CheckIn flow
      if (walkInAutoCheckIn && walkInRoomId) {
        const formData = new FormData();
        formData.append('room_id', walkInRoomId);
        formData.append('advance_amount', advanceAmt || '0');
        formData.append('payment_method', paymentMode || 'UPI');
        formData.append('guest_name', walkInName);
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
        toast.success('Walk-In Reservation created');
      }
      
      // Clear fields
      setWalkInName('');
      setWalkInMobile('');
      setWalkInCustomRate('');
      setWalkInCheckIn(getTodayDateTimeStr());
      setWalkInCheckOut(getTomorrowDateTimeStr());
      setWalkInRoomId('');
      setShowWalkInForm(false);
      
      // Auto open newly created reservation
      const newResObj = {
        id: reservationId,
        reservation_number: res.data.reservationNumber,
        guest_id: '', // dummy
        guest_name: walkInName,
        guest_mobile: walkInMobile,
        room_type_id: walkInRoomTypeId,
        room_type_name: roomTypes.find(t => t.id === walkInRoomTypeId)?.name || '',
        stay_type: walkInStayType,
        check_in_datetime: walkInCheckIn,
        check_out_datetime: walkInCheckOut,
        adults: walkInAdults,
        children: walkInChildren,
        status: walkInAutoCheckIn && walkInRoomId ? 'Checked In' : 'Reserved',
        rate_plan_id: walkInRatePlanId,
        room_number: walkInAutoCheckIn && walkInRoomId ? rooms.find(r => r.id === walkInRoomId)?.room_number : null
      };
      
      await syncAllData();
      openFolio(newResObj);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register Walk-In');
    }
  };

  const handleMockWebcam = (type) => {
    const mockFile = new File(['binary_data'], `mock-${type}.jpg`, { type: 'image/jpeg' });
    if (type === 'photo') setPhotoFile(mockFile);
    if (type === 'idFront') setIdFrontFile(mockFile);
    if (type === 'idBack') setIdBackFile(mockFile);
    toast.success(`Mock webcam capture for ${type} success`);
  };

  const executeCheckIn = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!selectedRoomId) return toast.error('Please assign a Vacant Clean room');

    const missingDocs = !photoFile || !idFrontFile || !idBackFile || !idNumber;
    if (missingDocs && user.role === 'Receptionist' && !isOverrideActive) {
      return toast.error('BLOCK ALERT: Receptionists cannot check-in guests without Guest Photo, ID Front, and ID Back. Ask Manager to override.');
    }

    const formData = new FormData();
    formData.append('room_id', selectedRoomId);
    formData.append('advance_amount', advanceAmt);
    formData.append('payment_method', paymentMode);
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

      toast.success('Check-In complete! Folio accommodation charge posted.');
      
      // Reload folio
      const updatedRes = { ...selectedRes, status: 'Checked In', room_number: rooms.find(r => r.id === selectedRoomId)?.room_number };
      await syncAllData();
      openFolio(updatedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete check-in');
    }
  };

  const handlePostCharge = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!chargeDesc || !chargeAmt || parseFloat(chargeAmt) <= 0) {
      return toast.error('Enter valid charge description and positive amount');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/charge`, {
        charge_type: chargeType,
        description: chargeDesc,
        amount: parseFloat(chargeAmt),
        tax_id: chargeTaxId
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Charge posted successfully');
      setChargeDesc('');
      setChargeAmt('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error('Failed to post charge');
    }
  };

  const handlePostPayment = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!paymentAmt || parseFloat(paymentAmt) <= 0) {
      return toast.error('Enter a valid positive payment amount');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/payment`, {
        payment_method: paymentMethod,
        description: paymentDesc || `Payment intake via ${paymentMethod}`,
        amount: parseFloat(paymentAmt)
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Payment captured successfully');
      setPaymentAmt('');
      setPaymentDesc('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error('Failed to register payment');
    }
  };

  const handlePostDeposit = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      return toast.error('Please enter a valid deposit amount');
    }
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/deposit`, {
        amount: parseFloat(depositAmount),
        payment_method: depositMethod,
        description: depositDesc || 'Security Deposit'
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Security deposit collected successfully');
      setDepositAmount('');
      setDepositDesc('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to collect deposit');
    }
  };

  const handleRequestRefund = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!refundAmount || parseFloat(refundAmount) <= 0 || !refundReason) {
      return toast.error('Please fill in all refund fields');
    }
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/refund`, {
        amount: parseFloat(refundAmount),
        payment_method: refundMethod,
        reason: refundReason
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Refund request submitted successfully');
      setRefundAmount('');
      setRefundReason('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request refund');
    }
  };

  const handleAdjustReversal = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!adjustReason) return toast.error('Provide audit reason for reversal');

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/adjust`, {
        original_entry_id: adjustEntry.id,
        reason: adjustReason,
        discount_percent: discountPercent || null
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Adjustment posted successfully');
      setAdjustEntry(null);
      setAdjustReason('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Reversal failed');
    }
  };

  const handleBlacklistToggle = async (isBlacklisted) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (isBlacklisted && !blacklistReason) {
      return toast.error('Blacklist justification reason required');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/guests/${selectedRes.guest_id}/blacklist`, {
        is_blacklisted: isBlacklisted ? 1 : 0,
        blacklist_reason: isBlacklisted ? blacklistReason : ''
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(isBlacklisted ? 'Guest blacklisted' : 'Guest unblacklisted');
      setBlacklistReason('');
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authorization failed');
    }
  };

  const handleCheckOut = async () => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      const balance = folioData.summary.balance;
      
      if (balance > 0 && user.role !== 'Admin') {
        const confirmReq = window.confirm(`Checkout Blocked: Outstanding balance of ₹${balance} remains. Direct checkout is restricted to Admins. Would you like to raise an approval request to the Admin?`);
        if (confirmReq) {
          await axios.post('/api/approvals/request', {
            type: 'CHECKOUT_WITH_BALANCE',
            details: { reservation_id: selectedRes.id, balance: balance }
          }, { headers: { Authorization: `Bearer ${token}` } });
          toast.success('Approval request raised successfully!');
        }
        return;
      }

      const res = await axios.post(`/api/reservations/${selectedRes.id}/check-out`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.warning) {
        toast(res.data.warning, { icon: '⚠️', duration: 6000 });
      } else {
        toast.success('Check-Out processed successfully! Room set to Dirty.');
      }
      handleBack();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-Out failed');
    }
  };

  const handleReopenFolio = async () => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!['Admin', 'Manager'].includes(user.role)) {
      return toast.error('Permission Denied: Reopening folios is restricted to managers and administrators only.');
    }
    if (!window.confirm('Are you sure you want to reopen this closed folio and revert guest status to Checked In?')) return;
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/folios/${folioData.folio.id}/reopen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Folio reopened successfully!');
      const updatedRes = { ...selectedRes, status: 'Checked In' };
      setSelectedRes(updatedRes);
      openFolio(updatedRes);
      await syncAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reopen folio');
    }
  };

  const handleModifyDates = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!newCheckOut) return toast.error('Please select a checkout date/time');

    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/reservations/${selectedRes.id}/dates`, {
        check_out: newCheckOut
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Check-out date extended/modified successfully!');
      const updatedRes = { ...selectedRes, check_out_datetime: newCheckOut };
      setSelectedRes(updatedRes);
      openFolio(updatedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update checkout date');
    }
  };

  const handleUpdateGuestDetails = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!editGuestName || !editGuestMobile) {
      return toast.error('Guest name and mobile are required');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/guests/${selectedRes.guest_id}`, {
        name: editGuestName,
        mobile: editGuestMobile,
        nationality: editGuestNat,
        id_type: editGuestIdType,
        id_number: editGuestIdNum
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Guest details updated successfully!');
      const updatedRes = { ...selectedRes, guest_name: editGuestName, guest_mobile: editGuestMobile };
      setSelectedRes(updatedRes);
      openFolio(updatedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update guest details');
    }
  };

  const handleEditCharge = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!editChargeDesc || !editChargeAmt || parseFloat(editChargeAmt) <= 0) {
      return toast.error('Please enter a valid description and positive amount');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/folios/charges/${editingEntry.id}`, {
        description: editChargeDesc,
        amount: parseFloat(editChargeAmt)
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Charge entry updated successfully!');
      setEditingEntry(null);
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update charge');
    }
  };

  const handleEditPayment = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!editPaymentDesc || !editPaymentAmt || parseFloat(editPaymentAmt) <= 0 || !editPaymentMethod) {
      return toast.error('Please enter a valid description, method, and positive amount');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/folios/payments/${editingPayment.id}`, {
        description: editPaymentDesc,
        amount: parseFloat(editPaymentAmt),
        payment_method: editPaymentMethod
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Payment entry updated successfully!');
      setEditingPayment(null);
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update payment');
    }
  };

  const handleVoidEntry = async (entryId) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    
    let pin = '';
    if (user.role === 'Receptionist') {
      pin = window.prompt('Compliance Warning: Voiding transactions requires Manager Approval PIN. Enter PIN:');
      if (pin === null) return; // cancel
      if (!pin) return toast.error('Manager Approval PIN is required');
    }

    if (!window.confirm('Are you sure you want to void/cancel this transaction? This action is permanent.')) return;

    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/folios/entries/${entryId}${pin ? `?pin=${pin}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Transaction voided successfully!');
      openFolio(selectedRes);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to void transaction');
    }
  };

  const handleBack = () => {
    setSelectedRes(null);
    if (onClearPreselected) onClearPreselected();
    syncAllData();
  };

  const handlePrintInvoice = () => {
    if (!folioData || !selectedRes) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return toast.error('Pop-up blocked! Please allow pop-ups to print the invoice.');
    }

    const isGstActive = propertySettings?.gstOption === 'Enter GST';
    const taxRateDivisor = isGstActive ? 1.12 : 1.0;

    const filteredEntries = folioData.entries.filter(entry => 
      selectedFolioGroup === 'A' 
        ? !(splitFolioBEntries[folioData.folio.id] || []).includes(entry.id) 
        : (splitFolioBEntries[folioData.folio.id] || []).includes(entry.id)
    );

    const totalDebit = filteredEntries
      .filter(e => e.entry_type === 'Charge' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
    const totalNetDebit = filteredEntries
      .filter(e => e.entry_type === 'Charge' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.debit || 0) / taxRateDivisor, 0);
    const totalTaxDebit = totalDebit - totalNetDebit;

    const totalCredit = filteredEntries
      .filter(e => e.entry_type === 'Payment' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
    const balance = totalDebit - totalCredit;

    const invoiceNo = `INV-${selectedRes.reservation_number.replace('RES-', '')}-${selectedFolioGroup}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const checkInDate = new Date(selectedRes.check_in_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const checkOutDate = new Date(selectedRes.check_out_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Table rows HTML
    const rowsHtml = filteredEntries.map((entry, index) => {
      const entryDate = new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const isPayment = entry.entry_type === 'Payment';
      const net = isPayment ? entry.credit : (entry.debit / taxRateDivisor);
      const tax = isPayment ? 0 : (entry.debit - net);
      const gross = isPayment ? entry.credit : entry.debit;
      const sacCode = entry.charge_type === 'Room Charge' || entry.charge_type === 'Tariff' ? '996311' : '996331';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 10px; text-align: center;">${index + 1}</td>
          <td style="padding: 10px;">${entryDate}</td>
          <td style="padding: 10px;">${entry.description} ${entry.is_voided ? '<span style="color:#ef4444; font-weight:bold;">(VOIDED)</span>' : ''}</td>
          <td style="padding: 10px; text-align: center; color: #64748b;">${isPayment ? '—' : sacCode}</td>
          <td style="padding: 10px; text-align: center; text-transform: uppercase; font-weight: 600; color: ${isPayment ? '#059669' : '#1e293b'};">
            ${isPayment ? 'Credit' : 'Debit'}
          </td>
          <td style="padding: 10px; text-align: right;">₹${parseFloat(net).toFixed(2)}</td>
          <td style="padding: 10px; text-align: right; color: #64748b;">${isPayment ? '—' : '₹' + parseFloat(tax).toFixed(2)}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">₹${parseFloat(gross).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const gstRowsHtml = isGstActive && totalTaxDebit > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 4px 0;">
        <span>CGST (6% Tax)</span>
        <span>₹${parseFloat(totalTaxDebit / 2).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 4px 0;">
        <span>SGST (6% Tax)</span>
        <span>₹${parseFloat(totalTaxDebit / 2).toFixed(2)}</span>
      </div>
    ` : `
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0;">
        <span>GST (Exempt)</span>
        <span>₹0.00</span>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              background-color: #fff;
              margin: 0;
              padding: 40px;
              line-height: 1.5;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .hotel-logo {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .hotel-details {
              font-size: 12px;
              color: #64748b;
              margin-top: 6px;
              line-height: 1.4;
            }
            .invoice-title-block {
              text-align: right;
            }
            .invoice-title {
              font-size: 20px;
              font-weight: 700;
              text-transform: uppercase;
              color: #4f46e5;
              letter-spacing: 0.5px;
              margin: 0 0 8px 0;
            }
            .invoice-meta {
              font-size: 12px;
              line-height: 1.6;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 30px;
              font-size: 12px;
            }
            .info-section-title {
              color: #475569;
              font-weight: 700;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin-bottom: 6px;
              display: block;
            }
            .table-header {
              background-color: #f1f5f9;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #475569;
            }
            .summary-container {
              display: flex;
              justify-content: flex-end;
              margin-top: 30px;
            }
            .summary-box {
              width: 320px;
              border-top: 2px solid #e2e8f0;
              padding-top: 12px;
            }
            .balance-card {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 6px;
              padding: 12px;
              margin-top: 14px;
              text-align: center;
            }
            .balance-title {
              font-size: 11px;
              font-weight: 700;
              color: #991b1b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .balance-value {
              font-size: 20px;
              font-weight: 800;
              color: #991b1b;
              margin-top: 4px;
            }
            .footer-notes {
              margin-top: 50px;
              font-size: 11px;
              color: #64748b;
              line-height: 1.6;
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
            }
            .signature-block {
              margin-top: 80px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .signature-line {
              width: 200px;
              border-top: 1.5px solid #475569;
              margin-top: 40px;
              text-align: center;
              font-weight: 600;
              color: #334155;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- HEADER -->
            <div class="header" style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 14px;">
                ${propertySettings?.logo_url ? `
                  <img src="${propertySettings.logo_url}" alt="Hotel Logo" style="width: 50px; height: 50px; object-fit: contain; border-radius: 8px;" />
                ` : `
                  <span style="font-size: 24px;">🏨</span>
                `}
                <div>
                  <div class="hotel-logo" style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${propertySettings?.name || 'Grand Hotel PMS'}</div>
                  <div class="hotel-details" style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.4;">
                    ${propertySettings?.address ? propertySettings.address + '<br>' : ''}
                    ${propertySettings?.contact1 ? 'Phone: ' + propertySettings.contact1 + (propertySettings.contact2 ? ' / ' + propertySettings.contact2 : '') + '<br>' : ''}
                    ${propertySettings?.email ? 'Email: ' + propertySettings.email + '<br>' : ''}
                    ${isGstActive && propertySettings?.gstNumber ? '<strong>GSTIN: ' + propertySettings.gstNumber + '</strong>' : ''}
                  </div>
                </div>
              </div>
              <div class="invoice-title-block">
                <div class="invoice-title">Tax Invoice</div>
                <div class="invoice-meta">
                  <strong>Invoice No:</strong> ${invoiceNo}<br>
                  <strong>Date:</strong> ${invoiceDate}<br>
                  <strong>Folio Group:</strong> Folio ${selectedFolioGroup}<br>
                  <strong>Res ID:</strong> #${selectedRes.reservation_number}
                </div>
              </div>
            </div>

            <!-- INFO GRID -->
            <div class="info-grid">
              <div>
                <span class="info-section-title">GUEST INFORMATION</span>
                <strong>Name:</strong> ${selectedRes.guest_name}<br>
                <strong>Mobile:</strong> ${selectedRes.guest_mobile}<br>
                <strong>Nationality:</strong> ${selectedRes.nationality || 'Indian'}
              </div>
              <div>
                <span class="info-section-title">STAY SUMMARY</span>
                <strong>Room:</strong> Room ${selectedRes.room_number || 'Unassigned'} (${selectedRes.room_type_name})<br>
                <strong>Stay Type:</strong> ${selectedRes.stay_type?.toUpperCase()} Stay<br>
                <strong>Duration:</strong> ${formatStayDuration(selectedRes.check_in_datetime, selectedRes.check_out_datetime)}
              </div>
              <div>
                <span class="info-section-title">STAY DATES</span>
                <strong>Check-In:</strong> ${checkInDate}<br>
                <strong>Check-Out:</strong> ${checkOutDate}<br>
                <strong>Guests:</strong> ${selectedRes.adults} Adults, ${selectedRes.children} Kids
              </div>
            </div>

            <!-- ITEMS TABLE -->
            <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #334155;">Billing Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr class="table-header">
                  <th style="padding: 10px; text-align: center; width: 40px;">#</th>
                  <th style="padding: 10px; text-align: left; width: 80px;">Date</th>
                  <th style="padding: 10px; text-align: left;">Description</th>
                  <th style="padding: 10px; text-align: center; width: 80px;">SAC Code</th>
                  <th style="padding: 10px; text-align: center; width: 70px;">Type</th>
                  <th style="padding: 10px; text-align: right; width: 100px;">Net Amt</th>
                  <th style="padding: 10px; text-align: right; width: 85px;">Tax</th>
                  <th style="padding: 10px; text-align: right; width: 100px;">Gross Amt</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- SUMMARY CONTAINER -->
            <div class="summary-container">
              <div class="summary-box">
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 4px 0;">
                  <span>Subtotal (Excl. Tax)</span>
                  <span>₹${parseFloat(totalNetDebit).toFixed(2)}</span>
                </div>
                ${gstRowsHtml}
                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 4px;">
                  <span>Total Charges (Gross)</span>
                  <span>₹${parseFloat(totalDebit).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #059669; padding: 4px 0;">
                  <span>Payments Received</span>
                  <span>- ₹${parseFloat(totalCredit).toFixed(2)}</span>
                </div>
                
                <div class="balance-card">
                  <div class="balance-title">Balance Due</div>
                  <div class="balance-value">₹${parseFloat(balance).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <!-- SIGNATURE BLOCK -->
            <div class="signature-block">
              <div>
                <div class="signature-line">Guest Signature</div>
              </div>
              <div>
                <div class="signature-line">Authorized Signatory</div>
              </div>
            </div>

            <!-- TERMS AND NOTES -->
            <div class="footer-notes">
              <strong>Terms & Conditions:</strong><br>
              1. All disputes are subject to the exclusive jurisdiction of local courts.<br>
              2. Standard checkout time is 12:00 PM. Extensions are subject to availability and surcharge.<br>
              3. The hotel is not responsible for valuables left in guest rooms. Safe deposit boxes are available.<br>
              <span style="display: block; text-align: center; margin-top: 20px; font-weight: 500; color: #94a3b8;">Thank you for choosing ${propertySettings?.name || 'us'}! Have a safe journey home.</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Wait for content to load to trigger print dialog
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const verifyManagerOverride = () => {
    if (managerPin === '1234' || user.role === 'Manager' || user.role === 'Admin') {
      setIsOverrideActive(true);
      toast.success('Manager Compliance Override Activated!');
    } else {
      toast.error('Invalid Manager PIN Code');
    }
  };

  const calculateNights = (inTime, outTime) => {
    const diffMs = new Date(outTime) - new Date(inTime);
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return Math.max(1, Math.round(diffHours / 24)) || 1;
  };

  const formatStayDuration = (inTime, outTime) => {
    if (!inTime || !outTime) return '—';
    const diffMs = new Date(outTime) - new Date(inTime);
    const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    
    let parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (parts.length === 0) return '0 hrs';
    return parts.join(' ');
  };

  const renderSummaryTab = () => {
    if (!folioData) return null;
    const folioId = folioData?.folio?.id;
    const splitIds = splitFolioBEntries[folioId] || [];
    const filteredEntries = folioData.entries.filter(entry => 
      selectedFolioGroup === 'A' ? !splitIds.includes(entry.id) : splitIds.includes(entry.id)
    );

    const isGstActive = propertySettings?.gstOption === 'Enter GST';
    const taxRateDivisor = isGstActive ? 1.12 : 1.0;

    const totalDebit = filteredEntries
      .filter(e => e.entry_type === 'Charge' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
    const totalNetDebit = filteredEntries
      .filter(e => e.entry_type === 'Charge' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.debit || 0) / taxRateDivisor, 0);
    const totalTaxDebit = totalDebit - totalNetDebit;

    const totalCredit = filteredEntries
      .filter(e => e.entry_type === 'Payment' && !e.is_voided)
      .reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);

    const totalDeposits = filteredEntries
      .filter(e => e.entry_type === 'Payment' && !e.is_voided && e.description.startsWith('Security Deposit (Held)'))
      .reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);

    const totalRefunds = filteredEntries
      .filter(e => e.entry_type === 'Adjustment' && !e.is_voided && e.description.startsWith('Refund Issued'))
      .reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);

    const balance = totalDebit - totalCredit;

    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
        {/* Folio Split Selector Tabs */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <button
            onClick={() => setSelectedFolioGroup('A')}
            className={`tab-item ${selectedFolioGroup === 'A' ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            📁 Folio A (Main Bill)
          </button>
          <button
            onClick={() => setSelectedFolioGroup('B')}
            className={`tab-item ${selectedFolioGroup === 'B' ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '6px 14px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            📁 Folio B (Extras / Split Bill)
          </button>
        </div>

        {/* PRINT HEADER VISIBLE ONLY ON PRINT */}
        <div className="print-only" style={{ marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {propertySettings?.logo_url && (
                <img src={propertySettings.logo_url} alt="Hotel Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '8px' }} />
              )}
              <div>
                <h1 style={{ margin: '0', fontSize: '1.6rem', fontWeight: 'bold', color: '#1e293b' }}>{propertySettings?.name || 'Grand Hotel PMS'}</h1>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                  {propertySettings?.address && <>{propertySettings.address}<br/></>}
                  {propertySettings?.contact1 && <>Phone: {propertySettings.contact1} {propertySettings.contact2 ? `/ ${propertySettings.contact2}` : ''}<br/></>}
                  {propertySettings?.email && <>Email: {propertySettings.email}<br/></>}
                  {propertySettings?.gstOption === 'Enter GST' && propertySettings.gstNumber && <><strong>GSTIN: {propertySettings.gstNumber}</strong><br/></>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.5 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', textTransform: 'uppercase', color: 'var(--brand-600)' }}>Tax Invoice</h2>
              <strong>Folio Group:</strong> Folio {selectedFolioGroup}<br />
              <strong>Invoice Date:</strong> {new Date().toLocaleDateString('en-IN')}<br />
              <strong>Reservation ID:</strong> #{selectedRes.reservation_number}
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.78rem' }}>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>GUEST DETAILS</span>
              <strong>{selectedRes.guest_name}</strong><br />
              {selectedRes.guest_mobile}
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>ROOM & STAY</span>
              <strong>Room {selectedRes.room_number || 'N/A'}</strong> ({selectedRes.room_type_name})<br />
              {selectedRes.stay_type?.replace('_', ' ')} stay
            </div>
            <div>
              <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>DATES & COMPLIMENT</span>
              {selectedRes.check_in_datetime.split(' ')[0]} to {selectedRes.check_out_datetime.split(' ')[0]}<br />
              {selectedRes.adults} Adults, {selectedRes.children} Children
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px' }}>Summary Details (Folio {selectedFolioGroup})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px' }}>DATE</th>
              <th style={{ padding: '10px' }}>ROOM</th>
              <th style={{ padding: '10px' }}>DESCRIPTION</th>
              <th style={{ padding: '10px' }}>TYPE</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>NET</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>TAX</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>GROSS</th>
              <th className="no-print" style={{ padding: '10px', textAlign: 'right' }}>SPLIT ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(entry => (
              <tr key={entry.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px' }}>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                <td style={{ padding: '10px' }}>Room {selectedRes.room_number || 'N/A'}</td>
                <td style={{ padding: '10px' }}>{entry.description}</td>
                <td style={{ padding: '10px' }}>{entry.entry_type === 'Payment' ? 'CREDIT' : 'DEBIT'}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{parseFloat(entry.entry_type === 'Payment' ? entry.credit : (entry.debit / taxRateDivisor)).toFixed(2)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>{entry.entry_type === 'Payment' ? '—' : `₹${(entry.debit - (entry.debit / taxRateDivisor)).toFixed(2)}`}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                  ₹{parseFloat(entry.entry_type === 'Payment' ? entry.credit : entry.debit).toFixed(2)}
                </td>
                <td className="no-print" style={{ padding: '10px', textAlign: 'right' }}>
                  <button
                    onClick={() => toggleSplitEntry(folioId, entry.id)}
                    className="btn btn-default btn-xs"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    {selectedFolioGroup === 'A' ? 'Move to B ➔' : '➔ Move to A'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transactions in Folio {selectedFolioGroup}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', borderTop: '2px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Charges</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0' }}>
              <span>SUBTOTAL (EX. TAX)</span>
              <strong>₹{parseFloat(totalNetDebit).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
              <span>{isGstActive ? 'GST (12% TAX)' : 'GST (EXEMPT)'}</span>
              <strong>₹{parseFloat(totalTaxDebit).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
              <span>TOTAL CHARGES (GROSS)</span>
              <strong>₹{parseFloat(totalDebit).toFixed(2)}</strong>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Payments & Deposits</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0' }}>
              <span>PAYMENTS RECEIVED</span>
              <strong className="text-success">₹{parseFloat(totalCredit).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
              <span>REFUNDS ISSUED</span>
              <strong className="text-info">₹{parseFloat(totalRefunds).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
              <span>DEPOSITS HELD</span>
              <strong>₹{parseFloat(totalDeposits).toFixed(2)} <span style={{ fontSize: '0.65rem', color: '#b45309', background: '#fef3c7', padding: '1px 4px', borderRadius: '3px' }}>MASTER</span></strong>
            </div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 'bold' }}>
              <AlertTriangle size={14} /> BALANCE DUE (FOLIO {selectedFolioGroup})
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>
              ₹{parseFloat(balance).toFixed(2)}
            </div>
            <button 
              onClick={() => setActiveFolioTab('Payments')}
              className="glass-btn no-print" 
              style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '8px' }}
            >
              Collect payment <ChevronDown size={14} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>

        {/* PRINT SIGNATURE BLOCK */}
        <div className="print-only" style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1.5px solid #000', marginBottom: '8px', height: '40px' }} />
            <strong>Guest Signature</strong>
          </div>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ borderBottom: '1.5px solid #000', marginBottom: '8px', height: '40px' }} />
            <strong>Authorized Signatory</strong>
          </div>
        </div>

        {/* Extend stay block */}
        <div className="no-print" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>Extend Stay / Modify Checkout Date</h4>
          <form onSubmit={handleModifyDates} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>New Checkout Date & Time</label>
              <input 
                type="datetime-local" 
                className="glass-input" 
                value={newCheckOut ? newCheckOut.slice(0, 16) : ''} 
                onChange={(e) => setNewCheckOut(e.target.value)} 
              />
            </div>
            <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: '10px 16px', height: '38px' }}>
              Update Checkout Date
            </button>
          </form>
        </div>
      </div>
    );
  };

  const filteredReservations = reservations.filter(res => 
    res.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.guest_mobile.includes(searchQuery) ||
    (res.room_number && res.room_number.includes(searchQuery))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* NO SELECTED FOLIO: LIST GUESTS & EMBED NEW WALK-IN BUTTON */}
      {!selectedRes && (
        <>
          <div className="page-header no-print">
            <div>
              <h1 className="page-title">Property Folio Registry</h1>
              <p className="page-subtitle">Front desk check-ins, walk-ins &amp; billing management</p>
            </div>
            <button
              onClick={() => setShowWalkInForm(!showWalkInForm)}
              className="btn btn-primary btn-sm"
              disabled={permission === 'read'}
            >
              <Plus size={15} /> New Walk-In
            </button>
          </div>

          {/* Inline Walk-In form */}
          {showWalkInForm && (
            <div className="glass-panel no-print animate-fade-in" style={{ padding: '24px', background: '#fff' }}>
              <BookingForm 
                onCancel={() => setShowWalkInForm(false)}
                onSuccess={() => {
                  syncAllData();
                  setShowWalkInForm(false);
                }}
                roomTypes={roomTypes}
                ratePlans={ratePlans}
                permission={permission}
                defaultMode="walkin"
              />
            </div>
          )}

          {/* Reservations & Folios list */}
          <div className="glass-panel no-print" style={{ padding: '20px', background: '#fff' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search rooms, names, mobile or reservation ID..." 
                className="glass-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>Room / Res</th>
                    <th style={{ padding: '12px' }}>Guest Details</th>
                    <th style={{ padding: '12px' }}>Check-In / Out Timings</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(res => (
                    <tr key={res.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>Room {res.room_number || 'Unassigned'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.reservation_number}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <strong>{res.guest_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.guest_mobile}</div>
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
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button onClick={() => openFolio(res)} className="glass-btn glass-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Manage Folio / Check-In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SELECTED FOLIO WORKSPACE */}
      {selectedRes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleBack} className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <ArrowLeft size={14} /> Back to Folio Registry
            </button>

            {/* Manager Override Trigger Panel in Folio */}
            {user.role === 'Receptionist' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fef2f2', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px' }}>
                <ShieldAlert className="text-danger" size={16} />
                <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  {isOverrideActive ? 'Override Active' : 'Override Required'}
                </span>
                {!isOverrideActive && (
                  <>
                    <input 
                      type="password" 
                      placeholder="PIN" 
                      className="glass-input" 
                      style={{ width: '80px', padding: '4px 8px', fontSize: '0.75rem' }}
                      value={managerPin}
                      onChange={(e) => setManagerPin(e.target.value)}
                    />
                    <button onClick={verifyManagerOverride} className="glass-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Apply</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE RESERVED STATE: RENDER FRONT-DESK CHECK-IN COMPLIANCE WIZARD */}
          {selectedRes.status === 'Reserved' && (
            <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck className="text-primary" /> Front Desk: Verify & Check-In {selectedRes.guest_name}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Upload mandatory ID documents, assign a clean room, and collect advance deposits.</p>
              </div>

              <form onSubmit={executeCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Cameras Mock verification (Mandatory) */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    Document Scan & Webcam Check (Anti-Leakage Guard)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Guest Photo</span>
                      {photoFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Snap Capture Complete</div>
                      ) : (
                        <button type="button" onClick={() => handleMockWebcam('photo')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Capture Face
                        </button>
                      )}
                    </div>
                    <div style={{ border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ID Card Front</span>
                      {idFrontFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Scan Complete</div>
                      ) : (
                        <button type="button" onClick={() => handleMockWebcam('idFront')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Scan Front
                        </button>
                      )}
                    </div>
                    <div style={{ border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ID Card Back</span>
                      {idBackFile ? (
                        <div style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Scan Complete</div>
                      ) : (
                        <button type="button" onClick={() => handleMockWebcam('idBack')} className="glass-btn" style={{ padding: '6px', fontSize: '0.75rem', width: '100%' }}>
                          <Camera size={14} /> Scan Back
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>ID Type</label>
                    <CustomSelect className="glass-input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID">Voter ID</option>
                    </CustomSelect>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>ID Number</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. 1234 5678 9012" 
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Collect Advance (Debit Folio)</label>
                    <input type="number" className="glass-input" value={advanceAmt} onChange={(e) => setAdvanceAmt(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payment Mode</label>
                    <CustomSelect className="glass-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option value="UPI">UPI QR Code</option>
                      <option value="Cash">Cash Drawer</option>
                      <option value="Card">Terminal POS</option>
                      <option value="Bank Transfer">Bank Wire</option>
                    </CustomSelect>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Assign Vacant Clean Room *</label>
                  {(() => {
                    const filteredVacantRooms = rooms.filter(rm => rm.room_type_id === selectedRes.room_type_id && (rm.status === 'Vacant Clean' || user.role !== 'Receptionist' || isOverrideActive));
                    if (filteredVacantRooms.length === 0) {
                      return (
                        <div style={{ fontSize: '0.85rem', color: 'var(--danger)', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--r-sm)', border: '1px dashed var(--danger)' }}>
                          No vacant rooms available for the selected category.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        {filteredVacantRooms.map(rm => {
                          const isSelected = selectedRoomId === rm.id;
                          return (
                            <button
                              key={rm.id}
                              type="button"
                              onClick={() => setSelectedRoomId(rm.id)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--r-md)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: isSelected ? '1px solid var(--brand-600)' : '1px solid var(--border)',
                                background: isSelected ? 'var(--brand-600)' : 'var(--surface-2)',
                                color: isSelected ? '#fff' : 'var(--text)',
                                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              Room {rm.room_number} ({rm.status})
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <button type="submit" className="glass-btn glass-btn-primary" disabled={permission === 'read'} style={{ width: '100%' }}>
                  <CheckCircle2 size={16} /> Authorize Check-In & Post Initial Tariff Charges
                </button>
              </form>
            </div>
          )}

          {/* ACTIVE CHECKED IN/OUT STATE: RENDER DETAILED FOLIO PROFILE TABS (IMAGE 1 STYLE) */}
          {selectedRes.status !== 'Reserved' && folioData && (
            <>
              {/* Header profile summary (Image 1 style) */}
              <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{selectedRes.guest_name}</h1>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                        {selectedRes.reservation_number}
                      </span>
                      <span className="badge badge-success">{selectedRes.status}</span>
                      <span className="badge badge-neutral">{selectedRes.stay_type}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', marginTop: '20px', fontSize: '0.8rem' }}>
                      <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CHECK-IN</span>
                            <strong style={{ display: 'block', fontSize: '0.85rem' }}>{new Date(selectedRes.check_in_datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>{new Date(selectedRes.check_in_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CHECK-OUT</span>
                            <strong style={{ display: 'block', fontSize: '0.85rem' }}>{new Date(selectedRes.check_out_datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>{new Date(selectedRes.check_out_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>STAY DURATION</span>
                          <strong style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>{formatStayDuration(selectedRes.check_in_datetime, selectedRes.check_out_datetime)}</strong>
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>ROOMS</span>
                        <strong>1 Room</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>OCCUPANCY</span>
                        <strong>{selectedRes.adults} adults, {selectedRes.children} children</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ROOM TYPE: </span>
                      <strong>{selectedRes.room_type_name} ({selectedRes.room_number || '206'})</strong>
                    </div>
                  </div>

                  {/* Top right financial summary widget */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL</span>
                      <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>₹{parseFloat(folioData.summary.totalDebit).toFixed(2)}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DUE</span>
                      <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>₹{parseFloat(folioData.summary.balance).toFixed(2)}</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>PAYMENTS</span>
                      <strong style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>₹{parseFloat(folioData.summary.totalCredit).toFixed(2)}</strong>
                    </div>
                    {selectedRes.status === 'Checked In' && (
                      <button 
                        onClick={handleCheckOut} 
                        className="glass-btn glass-btn-danger" 
                        disabled={permission === 'read'}
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        Check-out <LogOut size={14} style={{ marginLeft: '4px' }} />
                      </button>
                    )}
                    {selectedRes.status === 'Checked Out' && ['Admin', 'Manager'].includes(user.role) && (
                      <button 
                        onClick={handleReopenFolio} 
                        className="glass-btn glass-btn-primary" 
                        disabled={permission === 'read'}
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        Reopen Folio <RotateCcw size={14} style={{ marginLeft: '4px' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Pills Row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className="no-print">
                <button className="action-pill">BOOKING ACTIONS <ChevronDown size={12} /></button>
                <button className="action-pill">REGISTRATION CARD</button>
                <button className="action-pill">SEND PAYMENT LINK</button>
                <button className="action-pill" onClick={() => setActiveFolioTab('Itemized')}><Plus size={12} /> ADD CHARGE</button>
                <button className="action-pill" onClick={() => setActiveFolioTab('Payments')}><CreditCard size={12} /> COLLECT PAYMENT</button>
                <button onClick={handlePrintInvoice} className="action-pill"><Printer size={12} /> PRINT INVOICE</button>
              </div>

              {/* Subview Navigation Tabs (Image 1 style) */}
              <div className="tab-strip no-print">
                <button onClick={() => setActiveFolioTab('Summary')} className={`tab-item ${activeFolioTab === 'Summary' ? 'active' : ''}`}>Summary</button>
                <button onClick={() => setActiveFolioTab('Itemized')} className={`tab-item ${activeFolioTab === 'Itemized' ? 'active' : ''}`}>Itemized / Charges</button>
                <button onClick={() => setActiveFolioTab('Payments')} className={`tab-item ${activeFolioTab === 'Payments' ? 'active' : ''}`}>Payments</button>
                <button onClick={() => setActiveFolioTab('Guest Management')} className={`tab-item ${activeFolioTab === 'Guest Management' ? 'active' : ''}`}>Guest Management</button>
                <button onClick={() => setActiveFolioTab('Deposits & Refunds')} className={`tab-item ${activeFolioTab === 'Deposits & Refunds' ? 'active' : ''}`}>Deposits & Refunds</button>
                <button onClick={() => setActiveFolioTab('Documents')} className={`tab-item ${activeFolioTab === 'Documents' ? 'active' : ''}`}>Documents</button>
                <button onClick={() => setActiveFolioTab('Audit Log')} className={`tab-item ${activeFolioTab === 'Audit Log' ? 'active' : ''}`}>Audit Log</button>
                <button onClick={() => setActiveFolioTab('Notes')} className={`tab-item ${activeFolioTab === 'Notes' ? 'active' : ''}`}>Notes</button>
              </div>

              {/* TAB 1: SUMMARY DETAILS */}
              {activeFolioTab === 'Summary' && renderSummaryTab()}

              {/* TAB 2: ITEMIZED CHARGES */}
              {activeFolioTab === 'Itemized' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Post Service Add-On Extra</h3>
                      <form onSubmit={handlePostCharge} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Service Type</label>
                          <CustomSelect className="glass-input" value={chargeType} onChange={(e) => setChargeType(e.target.value)}>
                            <option value="Food">Food / Room Service</option>
                            <option value="Laundry">Laundry Services</option>
                            <option value="Transport">Cab / Airport Transfer</option>
                            <option value="Misc">Miscellaneous Extra</option>
                          </CustomSelect>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Service Description</label>
                          <input type="text" placeholder="Line item details" className="glass-input" value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Tariff Amount (₹)</label>
                          <input type="number" placeholder="Enter amount" className="glass-input" value={chargeAmt} onChange={(e) => setChargeAmt(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Applicable Tax</label>
                          <CustomSelect className="glass-input" value={chargeTaxId} onChange={(e) => setChargeTaxId(e.target.value)}>
                            <option value="">No Tax (Exempt)</option>
                            {taxes.map(tax => (
                              <option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</option>
                            ))}
                          </CustomSelect>
                        </div>
                        <button type="submit" className="glass-btn glass-btn-primary" disabled={permission === 'read'} style={{ marginTop: '8px' }}><PlusCircle size={16} /> Post Charge</button>
                      </form>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Debit Charges History</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {folioData.entries.filter(e => e.entry_type === 'Charge').map(entry => (
                          <div key={entry.id} style={{ padding: '10px 12px', background: entry.is_voided ? '#fef2f2' : 'rgba(0,0,0,0.02)', border: `1px solid ${entry.is_voided ? '#fee2e2' : '#e2e8f0'}`, borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: entry.is_voided ? 0.6 : 1 }}>
                            <div>
                              <strong style={{ textDecoration: entry.is_voided ? 'line-through' : 'none' }}>
                                {entry.description}
                              </strong>
                              {entry.is_voided === 1 && (
                                <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px' }}>VOIDED</span>
                              )}
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>posted by {entry.created_by}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>₹{parseFloat(entry.debit).toFixed(2)}</span>
                              {entry.debit > 0 && !entry.is_voided && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    onClick={() => {
                                      setEditingEntry(entry);
                                      setEditChargeDesc(entry.description);
                                      setEditChargeAmt(entry.debit);
                                    }} 
                                    className="glass-btn" 
                                    style={{ padding: '4px', border: 'none', background: 'none' }}
                                    title="Edit Charge"
                                  >
                                    <Pencil size={13} className="text-primary" />
                                  </button>
                                  <button 
                                    onClick={() => setAdjustEntry(entry)} 
                                    className="glass-btn" 
                                    style={{ padding: '4px', border: 'none', background: 'none' }}
                                    title="Reverse / Adjust"
                                  >
                                    <RotateCcw size={14} className="text-danger" />
                                  </button>
                                  <button 
                                    onClick={() => handleVoidEntry(entry.id)} 
                                    className="glass-btn" 
                                    style={{ padding: '4px', border: 'none', background: 'none' }}
                                    title="Void / Cancel Charge"
                                  >
                                    <Trash2 size={13} className="text-danger" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {adjustEntry && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#b91c1c', marginBottom: '6px' }}>Reversal Authorization & Discount (Audited)</h4>
                      <form onSubmit={handleAdjustReversal} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input 
                          type="text" 
                          placeholder="Explain correction reason..." 
                          className="glass-input" 
                          style={{ flex: 1, minWidth: '200px' }}
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                        />
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Discount % (Optional)" 
                          className="glass-input" 
                          style={{ width: '160px' }}
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                        <button type="submit" className="glass-btn glass-btn-danger">Confirm Adjustment</button>
                        <button type="button" onClick={() => { setAdjustEntry(null); setDiscountPercent(''); setAdjustReason(''); }} className="glass-btn">Cancel</button>
                      </form>
                    </div>
                  )}

                  {editingEntry && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '6px' }}>Edit Posted Charge</h4>
                      <form onSubmit={handleEditCharge} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input 
                          type="text" 
                          placeholder="Description" 
                          className="glass-input" 
                          value={editChargeDesc} 
                          onChange={(e) => setEditChargeDesc(e.target.value)} 
                          style={{ flex: 2 }} 
                        />
                        <input 
                          type="number" 
                          placeholder="Amount" 
                          className="glass-input" 
                          value={editChargeAmt} 
                          onChange={(e) => setEditChargeAmt(e.target.value)} 
                          style={{ flex: 1 }} 
                        />
                        <button type="submit" className="glass-btn glass-btn-primary">Save</button>
                        <button type="button" onClick={() => setEditingEntry(null)} className="glass-btn">Cancel</button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS */}
              {activeFolioTab === 'Payments' && (() => {
                const balance = folioData.summary?.balance || 0;
                const payments = folioData.entries.filter(e => e.entry_type === 'Payment');
                const methodColor = (m) => ({ Cash: '#059669', UPI: '#7c3aed', Card: '#0284c7', 'Bank Transfer': '#b45309', Razorpay: '#6366f1' }[m] || '#64748b');

                const handleRazorpay = async () => {
                  if (balance <= 0) return toast.error('No outstanding balance');
                  try {
                    const t = localStorage.getItem('pms_token');
                    const { data } = await axios.post('/api/razorpay/order', {
                      folio_id: folioData.folio?.id,
                      amount_paise: Math.round(balance * 100),
                      description: `Folio payment — ${selectedRes.guest_name}`,
                    }, { headers: { Authorization: `Bearer ${t}` } });

                    if (!data.keyId) return toast.error('Razorpay not configured. Set keys in Admin → Integrations.');

                    if (!window.Razorpay) {
                      await new Promise((res, rej) => {
                        const s = document.createElement('script');
                        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                        s.onload = res; s.onerror = rej;
                        document.body.appendChild(s);
                      });
                    }

                    new window.Razorpay({
                      key: data.keyId,
                      amount: data.amount,
                      currency: data.currency,
                      order_id: data.orderId,
                      name: propertySettings?.name || 'Grand Hotel PMS',
                      description: `Payment for Res #${selectedRes.reservation_number}`,
                      prefill: { name: selectedRes.guest_name, contact: selectedRes.guest_mobile },
                      theme: { color: '#0f172a' },
                      handler: async (resp) => {
                        try {
                          await axios.post('/api/razorpay/verify', {
                            razorpay_order_id:   resp.razorpay_order_id,
                            razorpay_payment_id: resp.razorpay_payment_id,
                            razorpay_signature:  resp.razorpay_signature,
                            folio_id: folioData.folio?.id,
                            amount: balance,
                          }, { headers: { Authorization: `Bearer ${t}` } });
                          toast.success(`✅ ₹${balance} collected via Razorpay`);
                          openFolio(selectedRes);
                        } catch (err) { toast.error(err.response?.data?.error || 'Verification failed'); }
                      },
                    }).open();
                  } catch (err) { toast.error(err.response?.data?.error || 'Razorpay init failed'); }
                };

                const handleGeneratePaymentLink = async () => {
                  if (balance <= 0) return toast.error('No outstanding balance');
                  setGeneratingLink(true);
                  setPaymentLinkData(null);
                  try {
                    const t = localStorage.getItem('pms_token');
                    const { data } = await axios.post('/api/razorpay/payment-link', {
                      folio_id: folioData.folio?.id,
                      amount_paise: Math.round(balance * 100),
                      description: `Hotel Folio Payment for Res #${selectedRes.reservation_number}`,
                      guest_name: selectedRes.guest_name,
                      guest_mobile: selectedRes.guest_mobile
                    }, { headers: { Authorization: `Bearer ${t}` } });
                    setPaymentLinkData(data);
                    toast.success('Razorpay Payment Link generated!');
                  } catch (err) {
                    toast.error('Failed to create payment link');
                  } finally {
                    setGeneratingLink(false);
                  }
                };

                return (
                <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                    {/* ── Left: collect payment ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Collect Payment</h3>

                      {/* Balance pill */}
                      <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: balance > 0 ? '#fef2f2' : '#d1fae5', border: `1.5px solid ${balance > 0 ? '#fca5a5' : '#6ee7b7'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: balance > 0 ? '#b91c1c' : '#065f46' }}>Outstanding Balance</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: balance > 0 ? '#dc2626' : '#059669' }}>₹{Number(balance).toLocaleString('en-IN')}</span>
                      </div>

                      {/* Manual form */}
                      <form onSubmit={handlePostPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Payment Mode</label>
                          <CustomSelect className="glass-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                            <option value="Cash">💵 Cash</option>
                            <option value="UPI">📱 UPI / QR Code</option>
                            <option value="Card">💳 Card / POS Terminal</option>
                            <option value="Bank Transfer">🏦 Bank Wire Transfer</option>
                          </CustomSelect>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Amount (₹)</label>
                          <input type="number" step="0.01" min="0.01" placeholder="0.00" className="glass-input" value={paymentAmt} onChange={e => setPaymentAmt(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Remarks</label>
                          <input type="text" placeholder="Reference / note" className="glass-input" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} />
                        </div>
                        <button type="submit" className="glass-btn glass-btn-primary" disabled={permission === 'read'}>
                          Collect Manually
                        </button>
                      </form>

                      {/* Divider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>

                      {/* Razorpay buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          onClick={handleRazorpay}
                          disabled={permission === 'read' || balance <= 0}
                          style={{
                            padding: '14px 18px', borderRadius: 'var(--r-md)', border: 'none',
                            background: balance > 0 ? 'linear-gradient(135deg,#072654,#1a3a8f)' : '#e2e8f0',
                            cursor: balance > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                            boxShadow: balance > 0 ? '0 4px 14px rgba(7,38,84,0.3)' : 'none',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => { if (balance > 0) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(7,38,84,0.4)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = balance > 0 ? '0 4px 14px rgba(7,38,84,0.3)' : 'none'; }}
                        >
                          <span style={{ color: balance > 0 ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: '0.95rem' }}>
                            💳 Pay ₹{Number(balance).toLocaleString('en-IN')} Online
                          </span>
                          <span style={{ color: balance > 0 ? 'rgba(255,255,255,0.55)' : '#cbd5e1', fontSize: '0.7rem' }}>
                            Razorpay · UPI · Cards · NetBanking · Wallets
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleGeneratePaymentLink}
                          disabled={permission === 'read' || balance <= 0 || generatingLink}
                          className="glass-btn"
                          style={{
                            padding: '12px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            borderColor: '#7c3aed', color: '#7c3aed', background: '#f5f3ff'
                          }}
                        >
                          🔗 {generatingLink ? 'Generating...' : 'Generate Razorpay Payment Link'}
                        </button>

                        {paymentLinkData && (
                          <div style={{ marginTop: '10px', padding: '14px', background: '#f5f3ff', border: '1.5px dashed #c084fc', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8' }}>
                              ✅ Payment Link Generated Successfully!
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                readOnly
                                className="glass-input"
                                value={paymentLinkData.short_url}
                                style={{ fontSize: '0.8rem', background: '#fff', color: '#1e293b' }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentLinkData.short_url);
                                  toast.success('Link copied to clipboard!');
                                }}
                                className="btn btn-default btn-sm"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                Copy Link
                              </button>
                            </div>
                            <a href={paymentLinkData.short_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' }}>
                              Open payment page manually &rarr;
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Right: receipts ── */}
                    <div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>
                        Payment Receipts
                        <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 700, background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: '10px' }}>
                          {payments.length}
                        </span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                        {editingPayment && (
                          <div style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '10px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '6px' }}>Edit Recorded Payment</h4>
                            <form onSubmit={handleEditPayment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <CustomSelect className="glass-input" value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)} style={{ flex: 1 }}>
                                  <option value="Cash">💵 Cash</option>
                                  <option value="UPI">📱 UPI</option>
                                  <option value="Card">💳 Card</option>
                                  <option value="Bank Transfer">🏦 Bank Wire</option>
                                </CustomSelect>
                                <input type="number" step="0.01" min="0.01" className="glass-input" value={editPaymentAmt} onChange={e => setEditPaymentAmt(e.target.value)} style={{ flex: 1 }} />
                              </div>
                              <input type="text" className="glass-input" value={editPaymentDesc} onChange={e => setEditPaymentDesc(e.target.value)} placeholder="Description/Remarks" />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="submit" className="glass-btn glass-btn-primary">Save</button>
                                <button type="button" onClick={() => setEditingPayment(null)} className="glass-btn">Cancel</button>
                              </div>
                            </form>
                          </div>
                        )}

                        {payments.length === 0 ? (
                          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: '#f8fafc', borderRadius: 'var(--r-md)', border: '1.5px dashed var(--border)' }}>
                            No payments collected yet
                          </div>
                        ) : (
                          <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', margin: '12px 0 12px 10px' }}>
                            {payments.map(entry => (
                              <div key={entry.id} style={{ position: 'relative' }}>
                                {/* Timeline Dot */}
                                <div style={{
                                  position: 'absolute', left: '-27px', top: '14px',
                                  width: '12px', height: '12px', borderRadius: '50%',
                                  background: entry.is_voided ? '#ef4444' : methodColor(entry.payment_method),
                                  border: '2px solid #fff'
                                }} />
                                
                                <div style={{ padding: '12px 14px', background: entry.is_voided ? '#fef2f2' : '#fafffe', border: `1.5px solid ${entry.is_voided ? '#fee2e2' : '#a7f3d0'}`, borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: entry.is_voided ? 0.6 : 1 }}>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: entry.is_voided ? '#94a3b8' : '#059669', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>
                                      ₹{Number(entry.credit).toLocaleString('en-IN')}
                                      {entry.is_voided === 1 && (
                                        <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px' }}>VOIDED</span>
                                      )}
                                      {!entry.is_voided && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button 
                                            onClick={() => {
                                              setEditingPayment(entry);
                                              setEditPaymentDesc(entry.description);
                                              setEditPaymentAmt(entry.credit);
                                              setEditPaymentMethod(entry.payment_method);
                                            }} 
                                            className="glass-btn" 
                                            style={{ padding: '2px', border: 'none', background: 'none' }}
                                            title="Edit Payment"
                                          >
                                            <Pencil size={12} className="text-primary" />
                                          </button>
                                          <button 
                                            onClick={() => handleVoidEntry(entry.id)} 
                                            className="glass-btn" 
                                            style={{ padding: '2px', border: 'none', background: 'none' }}
                                            title="Void / Cancel Payment"
                                          >
                                            <Trash2 size={12} className="text-danger" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>{entry.description} · {entry.created_by}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: `${methodColor(entry.payment_method)}18`, color: methodColor(entry.payment_method) }}>
                                      {entry.payment_method}
                                    </span>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                      {new Date(entry.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* TAB 4: GUEST CRM DETAILS */}
              {activeFolioTab === 'Guest Management' && (() => {
                const stays = guestHistory?.stays || [];
                const totalSpent = guestHistory?.totalSpent || 0;
                const outstanding = guestHistory?.outstanding || 0;
                const completedStays = stays.filter(s => s.status === 'Checked Out').length;
                const initials = selectedRes.guest_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
                const hue = selectedRes.guest_name ? (selectedRes.guest_name.charCodeAt(0) * 37) % 360 : 200;

                return (
                <div className="glass-panel animate-fade-in" style={{ overflow: 'hidden', background: '#fff' }}>

                  {/* Dark profile header */}
                  <div style={{ background: 'linear-gradient(135deg,#0f1117,#1e2030)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: `hsl(${hue},60%,92%)`, border: `2px solid hsl(${hue},60%,70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: `hsl(${hue},50%,35%)`, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{selectedRes.guest_name}</span>
                        {guestData?.is_blacklisted
                          ? <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>🚫 Blacklisted</span>
                          : <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>✓ Clean Record</span>
                        }
                      </div>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>📱 {selectedRes.guest_mobile}</span>
                        {selectedRes.id_type && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>🪪 {selectedRes.id_type} · {selectedRes.id_number || 'N/A'}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Lifetime stats */}
                  {guestHistory && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                      {[
                        { label: 'Total Stays',  value: stays.length,              color: '#6366f1', bg: '#eef2ff' },
                        { label: 'Completed',    value: completedStays,             color: '#059669', bg: '#d1fae5' },
                        { label: 'Total Spent',  value: `₹${Number(totalSpent||0).toLocaleString('en-IN')}`, color: '#d97706', bg: '#fef3c7' },
                        { label: 'Outstanding',  value: `₹${Number(outstanding||0).toLocaleString('en-IN')}`, color: outstanding > 0 ? '#dc2626' : '#059669', bg: outstanding > 0 ? '#fee2e2' : '#d1fae5' },
                      ].map(chip => (
                        <div key={chip.label} style={{ background: chip.bg, borderRadius: 'var(--r-md)', padding: '10px 14px', flex: '1 1 80px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: chip.color, lineHeight: 1 }}>{chip.value}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>{chip.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                    {/* Stay history */}
                    <div>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🕐 Stay History
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '240px', overflowY: 'auto' }}>
                        {stays.length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No past stays</div>
                        ) : stays.map(stay => {
                          const cin = new Date(stay.check_in_datetime);
                          const cout = new Date(stay.check_out_datetime);
                          const nights = Math.max(1, Math.round((cout - cin) / 86400000));
                          const isDone = stay.status === 'Checked Out';
                          return (
                            <div key={stay.id} style={{
                              padding: '10px 12px', borderRadius: 'var(--r-sm)',
                              border: '1.5px solid var(--border)',
                              borderLeft: `4px solid ${isDone ? '#10b981' : '#6366f1'}`,
                              background: isDone ? '#fafffe' : '#fafbff',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem',
                            }}>
                              <div>
                                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{stay.reservation_number}</span>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Rm {stay.room_number || '—'} · {cin.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} · {nights}N
                                </div>
                              </div>
                              <span className={`badge ${isDone ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.6rem' }}>{stay.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Blacklist control */}
                    <div>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🚫 Blacklist Control
                      </h3>
                      {guestData ? (
                        guestData.is_blacklisted ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '12px', borderRadius: 'var(--r-md)', background: '#fef2f2', border: '1.5px solid #fca5a5', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                              🚨 Blacklisted — {guestData.blacklist_reason || 'No reason on record'}
                            </div>
                            {['Admin','Manager'].includes(user.role) && permission !== 'read' && (
                              <button onClick={() => handleBlacklistToggle(false)} className="glass-btn" style={{ gap: '6px', borderColor: '#10b981', color: '#059669', fontSize: '0.8rem' }}>
                                <UserCheck size={14} /> Revoke Blacklist
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: '#d1fae5', border: '1.5px solid #6ee7b7', fontSize: '0.8rem', color: '#065f46' }}>
                              ✅ Clean record — all booking channels open
                            </div>
                            {['Admin','Manager'].includes(user.role) && permission !== 'read' ? (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" placeholder="Blacklist reason (required)…" className="glass-input"
                                  value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} style={{ fontSize: '0.82rem' }} />
                                <button onClick={() => handleBlacklistToggle(true)} className="glass-btn glass-btn-danger"
                                  disabled={!blacklistReason.trim()} style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                  Blacklist
                                </button>
                              </div>
                            ) : (
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Admin/Manager required to blacklist guests.</p>
                            )}
                          </div>
                        )
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading guest profile…</div>
                      )}
                    </div>

                    {/* Modify Guest Details Form */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '10px' }}>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✏️ Modify Guest Profile Details
                      </h3>
                      <form onSubmit={handleUpdateGuestDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Guest Name</label>
                            <input 
                              type="text" 
                              className="glass-input" 
                              value={editGuestName} 
                              onChange={(e) => setEditGuestName(e.target.value)} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mobile Phone</label>
                            <input 
                              type="text" 
                              className="glass-input" 
                              value={editGuestMobile} 
                              onChange={(e) => setEditGuestMobile(e.target.value)} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nationality</label>
                            <input 
                              type="text" 
                              className="glass-input" 
                              value={editGuestNat} 
                              onChange={(e) => setEditGuestNat(e.target.value)} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Govt ID Type</label>
                            <CustomSelect 
                              className="glass-input" 
                              value={editGuestIdType} 
                              onChange={(e) => setEditGuestIdType(e.target.value)}
                            >
                              <option value="Aadhaar">Aadhaar Card</option>
                              <option value="Driving License">Driving License</option>
                              <option value="Passport">Passport</option>
                              <option value="Voter ID">Voter ID</option>
                            </CustomSelect>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>ID Document Number</label>
                            <input 
                              type="text" 
                              className="glass-input" 
                              value={editGuestIdNum} 
                              onChange={(e) => setEditGuestIdNum(e.target.value)} 
                            />
                          </div>
                        </div>
                        <button type="submit" className="glass-btn glass-btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                          Save Profile Changes
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* TAB 5: DOCUMENTS UPLOADS */}
              {activeFolioTab === 'Documents' && (() => {
                const guestData = folioData.guest || {};
                const handleUpload = async (e, type) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append(type, file);
                  try {
                    const token = localStorage.getItem('pms_token');
                    await axios.post(`/api/guests/${guestData.id}/documents`, formData, {
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                    });
                    toast.success('Document uploaded');
                    openFolio(selectedRes);
                  } catch (err) { toast.error('Upload failed'); }
                };

                const DocCard = ({ title, type, url, desc }) => (
                  <div style={{ border: '1px dashed #cbd5e1', padding: '16px 12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {url ? (
                      <div style={{ marginBottom: '8px', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')}>
                        <img src={url} alt={title} style={{ height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                      </div>
                    ) : (
                      <ImageIcon size={32} className="text-muted" style={{ marginBottom: '8px' }} />
                    )}
                    <strong style={{ fontSize: '0.85rem' }}>{title}</strong>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '12px' }}>{desc}</p>
                    <label className="btn btn-sm" style={{ cursor: 'pointer', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '4px 8px' }}>
                      Upload / Modify
                      <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => handleUpload(e, type)} />
                    </label>
                  </div>
                );

                return (
                  <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '16px' }}>Mandatory Compliance Uploads</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', textAlign: 'center' }}>
                      <DocCard title="Guest Face Photo" type="photo" url={guestData.photo_url} desc="Webcam verified check-in frame" />
                      <DocCard title="Govt ID Front Scan" type="idFront" url={guestData.id_front_url} desc="Document front view snapshot" />
                      <DocCard title="Govt ID Back Scan" type="idBack" url={guestData.id_back_url} desc="Document back address snapshot" />
                    </div>
                  </div>
                );
              })()}

              {/* TAB 6: AUDIT LOG */}
              {activeFolioTab === 'Audit Log' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Event Audit History</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px' }}>Timestamp</th>
                          <th style={{ padding: '8px' }}>Operator</th>
                          <th style={{ padding: '8px' }}>Action</th>
                          <th style={{ padding: '8px' }}>Context Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No modifications logged for this booking</td>
                          </tr>
                        ) : (
                          resAuditLogs.map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                              <td style={{ padding: '8px' }}><strong>{log.username}</strong></td>
                              <td style={{ padding: '8px' }}><span className="badge badge-neutral">{log.action}</span></td>
                              <td style={{ padding: '8px' }}>{log.new_value}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: SPECIAL REMARKS */}
              {activeFolioTab === 'Notes' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Folio Operations Remarks</h3>
                  <textarea className="glass-input" rows="4" value={selectedRes.remarks || ''} readOnly placeholder="Remarks entered at reservation creation..."></textarea>
                </div>
              )}

              {/* TAB 8: DEPOSITS & REFUNDS */}
              {activeFolioTab === 'Deposits & Refunds' && (
                <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: '#fff' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    
                    {/* Collect Security Deposit Panel */}
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Collect Security Deposit</h3>
                      <form onSubmit={handlePostDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Deposit Amount (₹)</label>
                          <input 
                            type="number" 
                            className="glass-input" 
                            placeholder="Enter deposit amount e.g. 2000" 
                            value={depositAmount} 
                            onChange={(e) => setDepositAmount(e.target.value)}
                            min="0.01" 
                            step="0.01" 
                            required 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payment Method</label>
                          <CustomSelect className="glass-input" value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </CustomSelect>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Description / Remarks</label>
                          <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Key deposit, damage deposit, etc." 
                            value={depositDesc} 
                            onChange={(e) => setDepositDesc(e.target.value)} 
                          />
                        </div>
                        <button type="submit" className="glass-btn glass-btn-primary" style={{ alignSelf: 'flex-start' }}>
                          Collect Deposit
                        </button>
                      </form>
                    </div>

                    {/* Request Refund Panel */}
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>Request Refund</h3>
                      <form onSubmit={handleRequestRefund} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Refund Amount (₹)</label>
                          <input 
                            type="number" 
                            className="glass-input" 
                            placeholder="Enter refund amount" 
                            value={refundAmount} 
                            onChange={(e) => setRefundAmount(e.target.value)}
                            min="0.01" 
                            step="0.01" 
                            required 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payment Method</label>
                          <CustomSelect className="glass-input" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </CustomSelect>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Reason for Refund</label>
                          <textarea 
                            className="glass-input" 
                            rows="2" 
                            placeholder="Reason for guest refund payout..." 
                            value={refundReason} 
                            onChange={(e) => setRefundReason(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="glass-btn" style={{ alignSelf: 'flex-start', background: '#e2e8f0', color: '#475569', border: 'none' }}>
                          Submit Refund Request
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

    </div>
  );
}
