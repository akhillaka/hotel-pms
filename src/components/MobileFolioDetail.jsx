import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ReceiptText, CreditCard, Plus, Printer, Share2, LogOut,
  X, ShieldAlert, RotateCcw, Pencil, Trash2, User, Clock, FileText,
  History, AlertTriangle, CheckCircle2, ChevronDown
} from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
const CHARGE_TYPES = ['Food', 'Laundry', 'Transport', 'Misc', 'Damage', 'Room Service'];
const ID_TYPES = ['Aadhaar', 'Driving License', 'Passport', 'Voter ID'];

const methodColor = (m) => ({ Cash: '#059669', UPI: '#7c3aed', Card: '#0284c7', 'Bank Transfer': '#b45309', Razorpay: '#6366f1' }[m] || '#64748b');

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', background: '#fff'
};
const selectStyle = { ...inputStyle, appearance: 'none' };
const labelStyle = { fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' };

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', width: '100%', maxHeight: '90vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'sheetSlideUp 0.3s ease-out' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{title}</div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: 8, cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function Popup({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden', animation: 'sheetSlideUp 0.2s ease-out' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{title}</div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 6, cursor: 'pointer' }}><X size={18} color="#64748b" /></button>
        </div>
        <div style={{ padding: '16px 20px 20px' }}>{children}</div>
      </div>
    </div>
  );
}

export default function MobileFolioDetail({ reservation, folioData, onBack, onRefresh, propertySettings, user }) {
  const token = () => localStorage.getItem('pms_token');
  const authH = () => ({ Authorization: `Bearer ${token()}` });
  const res = reservation;

  const [activeTab, setActiveTab] = useState('Summary');
  const [selectedFolioGroup, setSelectedFolioGroup] = useState('A');
  const [splitFolioBEntries, setSplitFolioBEntries] = useState([]);

  // Manager override
  const [managerPin, setManagerPin] = useState('');
  const [isOverrideActive, setIsOverrideActive] = useState(false);

  // Sheet/popup state
  const [chargeSheet, setChargeSheet] = useState(false);
  const [paymentSheet, setPaymentSheet] = useState(false);
  const [depositSheet, setDepositSheet] = useState(false);
  const [refundSheet, setRefundSheet] = useState(false);
  const [extendSheet, setExtendSheet] = useState(false);
  const [guestEditSheet, setGuestEditSheet] = useState(false);
  const [entryPopup, setEntryPopup] = useState(null); // entry object
  const [adjustPopup, setAdjustPopup] = useState(null); // entry to adjust
  const [editChargePopup, setEditChargePopup] = useState(null);
  const [editPaymentPopup, setEditPaymentPopup] = useState(null);

  // Charge
  const [chargeType, setChargeType] = useState('Food');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [chargeTaxId, setChargeTaxId] = useState('');
  const [taxes, setTaxes] = useState([]);

  // Payment
  const [payMethod, setPayMethod] = useState('UPI');
  const [payAmt, setPayAmt] = useState('');
  const [payDesc, setPayDesc] = useState('');

  // Deposit
  const [depAmt, setDepAmt] = useState('');
  const [depMethod, setDepMethod] = useState('UPI');
  const [depDesc, setDepDesc] = useState('');

  // Refund
  const [refAmt, setRefAmt] = useState('');
  const [refMethod, setRefMethod] = useState('UPI');
  const [refReason, setRefReason] = useState('');

  // Extend stay
  const [newCheckOut, setNewCheckOut] = useState(res.check_out_datetime || '');

  // Adjustment
  const [adjustReason, setAdjustReason] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  // Edit charge
  const [editChargeDesc, setEditChargeDesc] = useState('');
  const [editChargeAmt, setEditChargeAmt] = useState('');

  // Edit payment
  const [editPayDesc, setEditPayDesc] = useState('');
  const [editPayAmt, setEditPayAmt] = useState('');
  const [editPayMethod, setEditPayMethod] = useState('UPI');

  // Guest edit
  const [editName, setEditName] = useState(res.guest_name || '');
  const [editMobile, setEditMobile] = useState(res.guest_mobile || '');
  const [editNat, setEditNat] = useState('');
  const [editIdType, setEditIdType] = useState('Aadhaar');
  const [editIdNum, setEditIdNum] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');

  // Void
  const [voidPin, setVoidPin] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Razorpay link
  const [payLinkData, setPayLinkData] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Guest data
  const [guestData, setGuestData] = useState(null);
  const [guestHistory, setGuestHistory] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    // Load split folios
    try {
      const saved = JSON.parse(localStorage.getItem('pms_split_folios') || '{}');
      if (folioData?.folio?.id && saved[folioData.folio.id]) {
        setSplitFolioBEntries(saved[folioData.folio.id]);
      }
    } catch (e) {}

    // Load taxes
    axios.get('/api/taxes', { headers: authH() }).then(r => setTaxes(r.data || [])).catch(() => {});

    // Load guest data
    if (res.guest_id) {
      axios.get(`/api/guests/${res.guest_id}`, { headers: authH() }).then(r => {
        setGuestData(r.data);
        setEditName(r.data.name || '');
        setEditMobile(r.data.mobile || '');
        setEditNat(r.data.nationality || '');
        setEditIdType(r.data.id_type || 'Aadhaar');
        setEditIdNum(r.data.id_number || '');
      }).catch(() => {});

      axios.get(`/api/guests/${res.guest_id}/history`, { headers: authH() }).then(r => setGuestHistory(r.data)).catch(() => {});
    }

    // Load audit logs
    axios.get('/api/audit', { headers: authH() }).then(r => {
      setAuditLogs((r.data || []).filter(l =>
        l.old_value?.includes(res.reservation_number) || l.new_value?.includes(res.reservation_number)
      ));
    }).catch(() => {});
  }, [folioData?.folio?.id]);

  if (!folioData || !folioData.folio) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Folio...</div>
        <button onClick={onBack} style={{ padding: '10px 20px', borderRadius: 12, background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>Go Back</button>
      </div>
    );
  }

  const folioId = folioData.folio.id;
  const allEntries = folioData.entries || [];
  const isGstActive = propertySettings?.gstOption === 'Enter GST';
  const taxDivisor = isGstActive ? 1.12 : 1.0;

  const toggleSplit = (entryId) => {
    setSplitFolioBEntries(prev => {
      const next = prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId];
      try {
        const saved = JSON.parse(localStorage.getItem('pms_split_folios') || '{}');
        saved[folioId] = next;
        localStorage.setItem('pms_split_folios', JSON.stringify(saved));
      } catch (e) {}
      return next;
    });
    toast.success('Folio entry moved');
  };

  const filteredEntries = allEntries.filter(e =>
    selectedFolioGroup === 'A' ? !splitFolioBEntries.includes(e.id) : splitFolioBEntries.includes(e.id)
  );
  const charges = filteredEntries.filter(e => e.entry_type === 'Charge');
  const payments = filteredEntries.filter(e => e.entry_type === 'Payment');

  const totalDebit = charges.filter(e => !e.is_voided).reduce((s, e) => s + parseFloat(e.debit || 0), 0);
  const totalCredit = payments.filter(e => !e.is_voided).reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  const totalNetDebit = charges.filter(e => !e.is_voided).reduce((s, e) => s + parseFloat(e.debit || 0) / taxDivisor, 0);
  const totalTaxDebit = totalDebit - totalNetDebit;
  const balance = totalDebit - totalCredit;
  const totalDeposits = payments.filter(e => !e.is_voided && (e.description || '').startsWith('Security Deposit')).reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  const totalRefunds = filteredEntries.filter(e => e.entry_type === 'Adjustment' && !e.is_voided && (e.description || '').startsWith('Refund')).reduce((s, e) => s + parseFloat(e.debit || 0), 0);

  const verifyManagerOverride = () => {
    if (managerPin === '1234' || user?.role === 'Manager' || user?.role === 'Admin') {
      setIsOverrideActive(true);
      toast.success('Manager Override Activated!');
    } else {
      toast.error('Invalid Manager PIN');
    }
  };

  const handlePostCharge = async () => {
    if (!chargeDesc || !chargeAmt || parseFloat(chargeAmt) <= 0) return toast.error('Enter valid description and amount');
    try {
      await axios.post(`/api/folios/${folioId}/charge`, {
        charge_type: chargeType, description: chargeDesc, amount: parseFloat(chargeAmt), tax_id: chargeTaxId || null
      }, { headers: authH() });
      toast.success('Charge posted!');
      setChargeSheet(false); setChargeDesc(''); setChargeAmt('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to post charge'); }
  };

  const handlePostPayment = async () => {
    if (!payAmt || parseFloat(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await axios.post(`/api/folios/${folioId}/payment`, {
        payment_method: payMethod, description: payDesc || `Payment via ${payMethod}`, amount: parseFloat(payAmt)
      }, { headers: authH() });
      toast.success('Payment collected!');
      setPaymentSheet(false); setPayAmt(''); setPayDesc('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to record payment'); }
  };

  const handlePostDeposit = async () => {
    if (!depAmt || parseFloat(depAmt) <= 0) return toast.error('Enter valid deposit amount');
    try {
      await axios.post(`/api/folios/${folioId}/deposit`, {
        amount: parseFloat(depAmt), payment_method: depMethod, description: depDesc || 'Security Deposit'
      }, { headers: authH() });
      toast.success('Deposit collected!');
      setDepositSheet(false); setDepAmt(''); setDepDesc('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to collect deposit'); }
  };

  const handlePostRefund = async () => {
    if (!refAmt || parseFloat(refAmt) <= 0 || !refReason) return toast.error('Enter valid amount and reason');
    try {
      await axios.post(`/api/folios/${folioId}/refund`, {
        amount: parseFloat(refAmt), payment_method: refMethod, reason: refReason
      }, { headers: authH() });
      toast.success('Refund submitted!');
      setRefundSheet(false); setRefAmt(''); setRefReason('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit refund'); }
  };

  const handleVoidEntry = async () => {
    if (!entryPopup) return;
    setVoiding(true);
    try {
      await axios.delete(`/api/folios/entries/${entryPopup.id}${voidPin ? `?pin=${voidPin}` : ''}`, { headers: authH() });
      toast.success('Entry voided!');
      setEntryPopup(null); setVoidPin('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to void'); }
    setVoiding(false);
  };

  const handleAdjust = async () => {
    if (!adjustReason) return toast.error('Provide reason for adjustment');
    try {
      await axios.post(`/api/folios/${folioId}/adjust`, {
        original_entry_id: adjustPopup.id, reason: adjustReason, discount_percent: discountPercent || null
      }, { headers: authH() });
      toast.success('Adjustment posted!');
      setAdjustPopup(null); setAdjustReason(''); setDiscountPercent('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Adjustment failed'); }
  };

  const handleEditCharge = async () => {
    if (!editChargeDesc || !editChargeAmt || parseFloat(editChargeAmt) <= 0) return toast.error('Valid description and amount required');
    try {
      await axios.patch(`/api/folios/charges/${editChargePopup.id}`, { description: editChargeDesc, amount: parseFloat(editChargeAmt) }, { headers: authH() });
      toast.success('Charge updated!');
      setEditChargePopup(null);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update charge'); }
  };

  const handleEditPayment = async () => {
    if (!editPayDesc || !editPayAmt || parseFloat(editPayAmt) <= 0 || !editPayMethod) return toast.error('All fields required');
    try {
      await axios.patch(`/api/folios/payments/${editPaymentPopup.id}`, { description: editPayDesc, amount: parseFloat(editPayAmt), payment_method: editPayMethod }, { headers: authH() });
      toast.success('Payment updated!');
      setEditPaymentPopup(null);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update payment'); }
  };

  const handleModifyDates = async () => {
    if (!newCheckOut) return toast.error('Select new checkout date');
    try {
      await axios.patch(`/api/reservations/${res.id}/dates`, { check_out: newCheckOut }, { headers: authH() });
      toast.success('Checkout date updated!');
      setExtendSheet(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to modify dates'); }
  };

  const handleUpdateGuest = async () => {
    if (!editName || !editMobile) return toast.error('Name and mobile required');
    try {
      await axios.patch(`/api/guests/${res.guest_id}`, { name: editName, mobile: editMobile, nationality: editNat, id_type: editIdType, id_number: editIdNum }, { headers: authH() });
      toast.success('Guest profile updated!');
      setGuestEditSheet(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update guest'); }
  };

  const handleBlacklist = async (isBlacklisted) => {
    if (isBlacklisted && !blacklistReason) return toast.error('Blacklist reason required');
    try {
      await axios.patch(`/api/guests/${res.guest_id}/blacklist`, { is_blacklisted: isBlacklisted ? 1 : 0, blacklist_reason: isBlacklisted ? blacklistReason : '' }, { headers: authH() });
      toast.success(isBlacklisted ? 'Guest blacklisted' : 'Blacklist revoked');
      setBlacklistReason('');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Authorization failed'); }
  };

  const handleCheckOut = async () => {
    if (balance > 0 && !isOverrideActive && user?.role === 'Receptionist') {
      return toast.error(`Balance of ₹${balance.toFixed(2)} remains. Manager override required.`);
    }
    try {
      await axios.post(`/api/reservations/${res.id}/check-out`, {}, { headers: authH() });
      toast.success('Guest checked out! Room set to Dirty.');
      onBack();
    } catch (err) { toast.error(err.response?.data?.error || 'Check-out failed'); }
  };

  const handleReopenFolio = async () => {
    if (!['Admin', 'Manager'].includes(user?.role)) return toast.error('Admin/Manager only');
    try {
      await axios.post(`/api/folios/${folioId}/reopen`, {}, { headers: authH() });
      toast.success('Folio reopened!');
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reopen'); }
  };

  const handleRazorpayLink = async () => {
    if (balance <= 0) return toast.error('No outstanding balance');
    setGeneratingLink(true);
    try {
      const { data } = await axios.post('/api/razorpay/payment-link', {
        folio_id: folioId, amount_paise: Math.round(balance * 100),
        description: `Hotel Folio Payment for Res #${res.reservation_number}`,
        guest_name: res.guest_name, guest_mobile: res.guest_mobile
      }, { headers: authH() });
      setPayLinkData(data);
      toast.success('Payment link generated!');
    } catch (err) { toast.error('Failed to generate link'); }
    setGeneratingLink(false);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error('Pop-up blocked! Allow pop-ups to print.');

    const invoiceNo = `INV-${res.reservation_number?.replace('RES-', '')}-${selectedFolioGroup}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const checkInDate = new Date(res.check_in_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const checkOutDate = new Date(res.check_out_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const rowsHtml = filteredEntries.map((entry, index) => {
      const isPayment = entry.entry_type === 'Payment';
      const net = isPayment ? entry.credit : (entry.debit / taxDivisor);
      const tax = isPayment ? 0 : (entry.debit - net);
      const gross = isPayment ? entry.credit : entry.debit;
      const sacCode = entry.charge_type === 'Room Charge' || entry.charge_type === 'Tariff' ? '996311' : '996331';
      return `<tr style="border-bottom:1px solid #e2e8f0;font-size:13px;">
        <td style="padding:10px;text-align:center;">${index + 1}</td>
        <td style="padding:10px;">${new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
        <td style="padding:10px;">${entry.description}${entry.is_voided ? ' <span style="color:#ef4444;font-weight:bold;">(VOIDED)</span>' : ''}</td>
        <td style="padding:10px;text-align:center;color:#64748b;">${isPayment ? '—' : sacCode}</td>
        <td style="padding:10px;text-align:center;font-weight:600;color:${isPayment ? '#059669' : '#1e293b'};">${isPayment ? 'Credit' : 'Debit'}</td>
        <td style="padding:10px;text-align:right;">₹${parseFloat(net).toFixed(2)}</td>
        <td style="padding:10px;text-align:right;color:#64748b;">${isPayment ? '—' : '₹' + parseFloat(tax).toFixed(2)}</td>
        <td style="padding:10px;text-align:right;font-weight:600;">₹${parseFloat(gross).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const gstHtml = isGstActive && totalTaxDebit > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;padding:4px 0;"><span>CGST (6%)</span><span>₹${(totalTaxDebit / 2).toFixed(2)}</span></div>
         <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;padding:4px 0;"><span>SGST (6%)</span><span>₹${(totalTaxDebit / 2).toFixed(2)}</span></div>`
      : `<div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;padding:4px 0;"><span>GST (Exempt)</span><span>₹0.00</span></div>`;

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice - ${invoiceNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body{font-family:'Inter',sans-serif;color:#1e293b;background:#fff;margin:0;padding:40px;line-height:1.5;}
        .container{max-width:800px;margin:0 auto;}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:24px;}
        .table-header{background:#f1f5f9;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569;}
        @media print{body{padding:0;}}
      </style></head><body><div class="container">
      <div class="header">
        <div>
          <div style="font-size:24px;font-weight:800;color:#0f172a;">🏨 ${propertySettings?.name || 'Grand Hotel PMS'}</div>
          <div style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.4;">
            ${propertySettings?.address ? propertySettings.address + '<br>' : ''}
            ${propertySettings?.contact1 ? 'Phone: ' + propertySettings.contact1 + '<br>' : ''}
            ${propertySettings?.email ? 'Email: ' + propertySettings.email + '<br>' : ''}
            ${isGstActive && propertySettings?.gstNumber ? '<strong>GSTIN: ' + propertySettings.gstNumber + '</strong>' : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px;font-weight:700;text-transform:uppercase;color:#4f46e5;letter-spacing:.5px;margin-bottom:8px;">Tax Invoice</div>
          <div style="font-size:12px;line-height:1.6;">
            <strong>Invoice No:</strong> ${invoiceNo}<br>
            <strong>Date:</strong> ${invoiceDate}<br>
            <strong>Folio Group:</strong> Folio ${selectedFolioGroup}<br>
            <strong>Res ID:</strong> #${res.reservation_number}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:30px;font-size:12px;">
        <div><span style="color:#475569;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;display:block;">GUEST INFORMATION</span>
          <strong>Name:</strong> ${res.guest_name}<br><strong>Mobile:</strong> ${res.guest_mobile}<br><strong>Nationality:</strong> ${res.nationality || 'Indian'}</div>
        <div><span style="color:#475569;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;display:block;">STAY SUMMARY</span>
          <strong>Room:</strong> Room ${res.room_number || 'N/A'} (${res.room_type_name})<br><strong>Stay Type:</strong> ${(res.stay_type || '').toUpperCase()}</div>
        <div><span style="color:#475569;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;display:block;">STAY DATES</span>
          <strong>Check-In:</strong> ${checkInDate}<br><strong>Check-Out:</strong> ${checkOutDate}<br><strong>Guests:</strong> ${res.adults} Adults, ${res.children} Kids</div>
      </div>
      <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em;color:#334155;">Billing Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr class="table-header">
          <th style="padding:10px;text-align:center;width:40px;">#</th>
          <th style="padding:10px;text-align:left;width:80px;">Date</th>
          <th style="padding:10px;text-align:left;">Description</th>
          <th style="padding:10px;text-align:center;width:80px;">SAC Code</th>
          <th style="padding:10px;text-align:center;width:70px;">Type</th>
          <th style="padding:10px;text-align:right;width:100px;">Net Amt</th>
          <th style="padding:10px;text-align:right;width:85px;">Tax</th>
          <th style="padding:10px;text-align:right;width:100px;">Gross Amt</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:30px;">
        <div style="width:320px;border-top:2px solid #e2e8f0;padding-top:12px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;padding:4px 0;"><span>Subtotal (Excl. Tax)</span><span>₹${totalNetDebit.toFixed(2)}</span></div>
          ${gstHtml}
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px;"><span>Total Charges (Gross)</span><span>₹${totalDebit.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#059669;padding:4px 0;"><span>Payments Received</span><span>- ₹${totalCredit.toFixed(2)}</span></div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin-top:14px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.05em;">Balance Due</div>
            <div style="font-size:20px;font-weight:800;color:#991b1b;margin-top:4px;">₹${balance.toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div style="margin-top:80px;display:flex;justify-content:space-between;font-size:12px;">
        <div style="width:200px;border-top:1.5px solid #475569;margin-top:40px;text-align:center;font-weight:600;color:#334155;">Guest Signature</div>
        <div style="width:200px;border-top:1.5px solid #475569;margin-top:40px;text-align:center;font-weight:600;color:#334155;">Authorized Signatory</div>
      </div>
      <div style="margin-top:50px;font-size:11px;color:#64748b;line-height:1.6;border-top:1px solid #e2e8f0;padding-top:16px;">
        <strong>Terms & Conditions:</strong><br>
        1. All disputes subject to local court jurisdiction.<br>
        2. Standard checkout time is 12:00 PM.<br>
        3. Hotel not responsible for valuables left in rooms.<br>
        <span style="display:block;text-align:center;margin-top:20px;font-weight:500;color:#94a3b8;">Thank you for choosing ${propertySettings?.name || 'us'}! Have a safe journey.</span>
      </div>
    </div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const TABS = ['Summary', 'Itemized', 'Payments', 'Guest', 'Deposits & Refunds', 'Documents', 'Audit Log', 'Notes'];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#f4f6fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: 10, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <ChevronLeft size={20} color="#0f172a" />
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.guest_name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Room {res.room_number || 'TBD'} · {res.reservation_number} · <span style={{ fontWeight: 700, color: res.status === 'Checked In' ? '#059669' : res.status === 'Checked Out' ? '#64748b' : '#d97706' }}>{res.status}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrintInvoice} title="Print Invoice" style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer' }}><Printer size={17} color="#475569" /></button>
          <button onClick={handleRazorpayLink} title="Share Payment Link" style={{ background: '#eef2ff', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', opacity: generatingLink ? 0.6 : 1 }}><Share2 size={17} color="#4f46e5" /></button>
        </div>
      </div>

      {/* Balance summary strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>BALANCE DUE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: balance > 0 ? '#dc2626' : '#059669' }}>₹{Math.abs(balance).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>CHARGED</div>
          <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>₹{totalDebit.toLocaleString('en-IN')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>PAID</div>
          <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>₹{totalCredit.toLocaleString('en-IN')}</div>
        </div>
        <div>
          {res.status === 'Checked In' && (
            <button onClick={handleCheckOut} style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '8px 14px', color: '#dc2626', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <LogOut size={15} /> Out
            </button>
          )}
          {res.status === 'Checked Out' && ['Admin', 'Manager'].includes(user?.role) && (
            <button onClick={handleReopenFolio} style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '8px 14px', color: '#1d4ed8', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={15} /> Reopen
            </button>
          )}
        </div>
      </div>

      {/* Manager Override (Receptionist only) */}
      {user?.role === 'Receptionist' && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ShieldAlert size={14} color="#b91c1c" />
          <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600, flex: 1 }}>{isOverrideActive ? '✓ Manager Override Active' : 'Manager Override Required'}</span>
          {!isOverrideActive && (
            <>
              <input type="password" placeholder="PIN" value={managerPin} onChange={e => setManagerPin(e.target.value)} style={{ width: 70, padding: '4px 8px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: '0.8rem', outline: 'none' }} />
              <button onClick={verifyManagerOverride} style={{ padding: '4px 10px', borderRadius: 8, background: '#dc2626', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
        {[
          { label: '+ Charge', action: () => setChargeSheet(true), bg: '#4f46e5', color: '#fff' },
          { label: '💳 Payment', action: () => setPaymentSheet(true), bg: '#059669', color: '#fff' },
          { label: '🔒 Deposit', action: () => setDepositSheet(true), bg: '#d97706', color: '#fff' },
          { label: '↩ Refund', action: () => setRefundSheet(true), bg: '#64748b', color: '#fff' },
          { label: '📅 Extend Stay', action: () => setExtendSheet(true), bg: '#0284c7', color: '#fff' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ padding: '8px 14px', borderRadius: 12, background: btn.bg, border: 'none', color: btn.color, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Folio A/B selector */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', flexShrink: 0 }}>
        {['A', 'B'].map(g => (
          <button key={g} onClick={() => setSelectedFolioGroup(g)} style={{
            flex: 1, padding: '10px', border: 'none', background: 'transparent',
            borderBottom: selectedFolioGroup === g ? '3px solid #4f46e5' : '3px solid transparent',
            color: selectedFolioGroup === g ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer'
          }}>📁 Folio {g}{g === 'B' ? ' (Extras)' : ' (Main)'}</button>
        ))}
      </div>

      {/* Tab strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 14px', border: 'none', background: 'transparent', whiteSpace: 'nowrap', flexShrink: 0,
            borderBottom: activeTab === tab ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === tab ? '#4f46e5' : '#64748b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
          }}>{tab}</button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 80 }}>

        {/* SUMMARY TAB */}
        {activeTab === 'Summary' && (
          <div>
            {/* Summary table */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>FOLIO {selectedFolioGroup} ENTRIES</div>
              {filteredEntries.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No transactions in Folio {selectedFolioGroup}</div>
              ) : filteredEntries.map((entry, i) => (
                <div key={entry.id} onClick={() => setEntryPopup(entry)} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: entry.is_voided ? '#fef9f9' : '#fff' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>{entry.description}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>
                      {formatDate(entry.created_at)} · {entry.entry_type}
                      {entry.is_voided ? <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 4 }}>VOIDED</span> : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem', color: entry.entry_type === 'Payment' ? '#059669' : '#ef4444', marginLeft: 12, textDecoration: entry.is_voided ? 'line-through' : 'none' }}>
                    {entry.entry_type === 'Payment' ? `+₹${Number(entry.credit).toLocaleString('en-IN')}` : `-₹${Number(entry.debit).toLocaleString('en-IN')}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary breakdown */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 12 }}>FOLIO {selectedFolioGroup} SUMMARY</div>
              {[
                { label: 'Subtotal (Excl. Tax)', value: `₹${totalNetDebit.toFixed(2)}`, color: '#0f172a' },
                ...(isGstActive ? [
                  { label: 'CGST (6%)', value: `₹${(totalTaxDebit / 2).toFixed(2)}`, color: '#475569' },
                  { label: 'SGST (6%)', value: `₹${(totalTaxDebit / 2).toFixed(2)}`, color: '#475569' },
                ] : [{ label: 'GST (Exempt)', value: '₹0.00', color: '#94a3b8' }]),
                { label: 'Total Charges (Gross)', value: `₹${totalDebit.toFixed(2)}`, color: '#0f172a', bold: true },
                { label: 'Payments Received', value: `₹${totalCredit.toFixed(2)}`, color: '#059669' },
                { label: 'Deposits Held', value: `₹${totalDeposits.toFixed(2)}`, color: '#d97706' },
                { label: 'Refunds Issued', value: `₹${totalRefunds.toFixed(2)}`, color: '#0284c7' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: row.bold ? '1px solid #e2e8f0' : 'none', marginTop: row.bold ? 4 : 0 }}>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>{row.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: 'monospace' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ background: balance > 0 ? '#fef2f2' : '#d1fae5', border: `1px solid ${balance > 0 ? '#fecaca' : '#6ee7b7'}`, borderRadius: 12, padding: '14px 16px', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#065f46' }}>BALANCE DUE</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'monospace', color: balance > 0 ? '#dc2626' : '#059669' }}>₹{Math.abs(balance).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ITEMIZED TAB */}
        {activeTab === 'Itemized' && (
          <div>
            <button onClick={() => setChargeSheet(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Plus size={18} /> Post New Charge
            </button>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>DEBIT CHARGES · Tap to Edit / Adjust / Void</div>
              {charges.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No charges posted</div>
              ) : charges.map(entry => (
                <div key={entry.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', opacity: entry.is_voided ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>{entry.description}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Posted by {entry.created_by} · {formatDate(entry.created_at)}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#ef4444', fontSize: '0.95rem', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>₹{parseFloat(entry.debit).toFixed(2)}</div>
                  </div>
                  {!entry.is_voided && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditChargePopup(entry); setEditChargeDesc(entry.description); setEditChargeAmt(entry.debit); }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setAdjustPopup(entry); setAdjustReason(''); setDiscountPercent(''); }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <RotateCcw size={12} /> Adjust
                      </button>
                      <button onClick={() => { setEntryPopup(entry); setVoidPin(''); }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Trash2 size={12} /> Void
                      </button>
                      <button onClick={() => toggleSplit(entry.id)} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer' }}>
                        Move {selectedFolioGroup === 'A' ? '→B' : '→A'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'Payments' && (
          <div>
            <button onClick={() => setPaymentSheet(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#059669', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CreditCard size={18} /> Collect Payment Manually
            </button>
            <button onClick={handleRazorpayLink} disabled={balance <= 0 || generatingLink} style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#f5f3ff', border: '1.5px solid #c084fc', color: '#7c3aed', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: balance <= 0 ? 0.5 : 1 }}>
              🔗 {generatingLink ? 'Generating...' : 'Generate Razorpay Payment Link'}
            </button>

            {payLinkData && (
              <div style={{ background: '#f5f3ff', border: '1.5px dashed #c084fc', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b21a8', marginBottom: 8 }}>✅ Payment Link Generated!</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input readOnly value={payLinkData.short_url} style={{ ...inputStyle, fontSize: '0.8rem', flex: 1 }} />
                  <button onClick={() => { navigator.clipboard.writeText(payLinkData.short_url); toast.success('Copied!'); }} style={{ padding: '0 14px', borderRadius: 10, background: '#7c3aed', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Copy</button>
                </div>
                <button onClick={() => {
                  const text = `Dear ${res.guest_name}, please pay ₹${balance.toFixed(2)} via: ${payLinkData.short_url}`;
                  window.open(`https://wa.me/${res.guest_mobile}?text=${encodeURIComponent(text)}`, '_blank');
                }} style={{ width: '100%', padding: 10, borderRadius: 10, background: '#25D366', border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  📲 Send via WhatsApp
                </button>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>PAYMENT RECEIPTS · Tap to Edit / Void</div>
              {payments.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No payments collected yet</div>
              ) : payments.map(entry => (
                <div key={entry.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', opacity: entry.is_voided ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: !entry.is_voided ? 8 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem', color: '#059669', textDecoration: entry.is_voided ? 'line-through' : 'none' }}>+₹{Number(entry.credit).toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: methodColor(entry.payment_method) + '18', color: methodColor(entry.payment_method) }}>{entry.payment_method}</span>
                        {entry.is_voided && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '1px 6px', borderRadius: 4 }}>VOIDED</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{entry.description} · {formatDateTime(entry.created_at)}</div>
                    </div>
                  </div>
                  {!entry.is_voided && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditPaymentPopup(entry); setEditPayDesc(entry.description); setEditPayAmt(entry.credit); setEditPayMethod(entry.payment_method); }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setEntryPopup(entry); setVoidPin(''); }} style={{ flex: 1, padding: '7px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Trash2 size={12} /> Void
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GUEST MANAGEMENT TAB */}
        {activeTab === 'Guest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Guest Profile Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f1117,#1e2030)', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#4f46e5', flexShrink: 0 }}>
                {res.guest_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>{res.guest_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 2 }}>📱 {res.guest_mobile}</div>
                {guestData?.is_blacklisted && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fca5a5', background: 'rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: 8, marginTop: 4, display: 'inline-block' }}>🚫 Blacklisted</span>}
              </div>
              <button onClick={() => setGuestEditSheet(true)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                ✏️ Edit
              </button>
            </div>

            {/* Stay history stats */}
            {guestHistory && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { label: 'Total Stays', value: (guestHistory.stays || []).length, bg: '#eef2ff', color: '#6366f1' },
                  { label: 'Total Spent', value: `₹${Number(guestHistory.totalSpent || 0).toLocaleString('en-IN')}`, bg: '#fef3c7', color: '#d97706' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Stay history */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>STAY HISTORY</div>
              {!(guestHistory?.stays?.length) ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No past stays</div>
              ) : guestHistory.stays.map(stay => (
                <div key={stay.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace', color: '#0f172a' }}>{stay.reservation_number}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Rm {stay.room_number || '—'} · {formatDate(stay.check_in_datetime)}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: stay.status === 'Checked Out' ? '#d1fae5' : '#eef2ff', color: stay.status === 'Checked Out' ? '#059669' : '#6366f1' }}>{stay.status}</span>
                </div>
              ))}
            </div>

            {/* Blacklist control */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: 12 }}>🚫 Blacklist Control</div>
              {guestData?.is_blacklisted ? (
                <div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: '#b91c1c', marginBottom: 10 }}>
                    🚨 Blacklisted — {guestData.blacklist_reason || 'No reason recorded'}
                  </div>
                  {['Admin', 'Manager'].includes(user?.role) && (
                    <button onClick={() => handleBlacklist(false)} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46', fontWeight: 700, cursor: 'pointer' }}>
                      ✓ Revoke Blacklist
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: '#065f46', marginBottom: 10 }}>
                    ✅ Clean record — all booking channels open
                  </div>
                  {['Admin', 'Manager'].includes(user?.role) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} placeholder="Blacklist reason (required)..." style={{ ...inputStyle, flex: 1, fontSize: '0.85rem' }} />
                      <button onClick={() => handleBlacklist(true)} disabled={!blacklistReason.trim()} style={{ padding: '0 14px', borderRadius: 12, background: '#dc2626', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Blacklist</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEPOSITS & REFUNDS TAB */}
        {activeTab === 'Deposits & Refunds' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setDepositSheet(true)} style={{ width: '100%', padding: 14, borderRadius: 14, background: '#d97706', border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              🔒 Collect Security Deposit
            </button>
            <button onClick={() => setRefundSheet(true)} style={{ width: '100%', padding: 14, borderRadius: 14, background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ↩ Submit Refund Request
            </button>
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: 10 }}>DEPOSIT & REFUND SUMMARY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Deposits Held</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#d97706' }}>₹{totalDeposits.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Total Refunds Issued</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0284c7' }}>₹{totalRefunds.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'Documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ label: 'Guest Face Photo', note: 'Webcam verified check-in frame' }, { label: 'Govt ID Front Scan', note: 'Document front view snapshot' }, { label: 'Govt ID Back Scan', note: 'Document back address snapshot' }].map(doc => (
              <div key={doc.label} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
                <FileText size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{doc.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{doc.note}</div>
              </div>
            ))}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'Audit Log' && (
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.8rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>EVENT AUDIT HISTORY</div>
            {auditLogs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No modifications logged for this booking</div>
            ) : auditLogs.map(log => (
              <div key={log.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{log.action}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDateTime(log.timestamp)}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>By: {log.username} · {log.new_value}</div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'Notes' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: 12 }}>📝 Reservation Remarks</div>
            <textarea readOnly value={res.remarks || ''} placeholder="No remarks entered at reservation creation." style={{ ...inputStyle, minHeight: 120, resize: 'none', color: '#475569' }} />
          </div>
        )}
      </div>

      {/* ─── SHEETS ─── */}

      {/* Add Charge Sheet */}
      <Sheet open={chargeSheet} onClose={() => setChargeSheet(false)} title="Post New Charge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Service Type</label>
            <select value={chargeType} onChange={e => setChargeType(e.target.value)} style={selectStyle}>
              {CHARGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Description</label>
            <input value={chargeDesc} onChange={e => setChargeDesc(e.target.value)} placeholder="e.g. Dinner via Room Service" style={inputStyle} />
          </div>
          <div><label style={labelStyle}>Amount (₹)</label>
            <input type="number" value={chargeAmt} onChange={e => setChargeAmt(e.target.value)} placeholder="0.00" style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
          </div>
          <div><label style={labelStyle}>Applicable Tax</label>
            <select value={chargeTaxId} onChange={e => setChargeTaxId(e.target.value)} style={selectStyle}>
              <option value="">No Tax (Exempt)</option>
              {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
            </select>
          </div>
          <button onClick={handlePostCharge} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Post Charge</button>
        </div>
      </Sheet>

      {/* Payment Sheet */}
      <Sheet open={paymentSheet} onClose={() => setPaymentSheet(false)} title="Collect Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: balance > 0 ? '#fef2f2' : '#d1fae5', border: `1.5px solid ${balance > 0 ? '#fca5a5' : '#6ee7b7'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: balance > 0 ? '#b91c1c' : '#065f46' }}>Outstanding Balance</span>
            <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '1rem', color: balance > 0 ? '#dc2626' : '#059669' }}>₹{Number(balance).toLocaleString('en-IN')}</span>
          </div>
          <div><label style={labelStyle}>Payment Mode</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={selectStyle}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Amount (₹)</label>
            <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="0.00" style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
          </div>
          <div><label style={labelStyle}>Remarks (Optional)</label>
            <input value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="Reference / note" style={inputStyle} />
          </div>
          <button onClick={handlePostPayment} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#059669', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Collect Payment</button>
        </div>
      </Sheet>

      {/* Deposit Sheet */}
      <Sheet open={depositSheet} onClose={() => setDepositSheet(false)} title="Collect Security Deposit">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Deposit Amount (₹)</label>
            <input type="number" value={depAmt} onChange={e => setDepAmt(e.target.value)} placeholder="e.g. 2000" style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
          </div>
          <div><label style={labelStyle}>Payment Method</label>
            <select value={depMethod} onChange={e => setDepMethod(e.target.value)} style={selectStyle}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Description / Remarks</label>
            <input value={depDesc} onChange={e => setDepDesc(e.target.value)} placeholder="Key deposit, damage deposit, etc." style={inputStyle} />
          </div>
          <button onClick={handlePostDeposit} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#d97706', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Collect Deposit</button>
        </div>
      </Sheet>

      {/* Refund Sheet */}
      <Sheet open={refundSheet} onClose={() => setRefundSheet(false)} title="Submit Refund Request">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Refund Amount (₹)</label>
            <input type="number" value={refAmt} onChange={e => setRefAmt(e.target.value)} placeholder="0.00" style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
          </div>
          <div><label style={labelStyle}>Payment Method</label>
            <select value={refMethod} onChange={e => setRefMethod(e.target.value)} style={selectStyle}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Reason for Refund *</label>
            <textarea value={refReason} onChange={e => setRefReason(e.target.value)} placeholder="Reason for guest refund payout..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <button onClick={handlePostRefund} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#475569', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Submit Refund</button>
        </div>
      </Sheet>

      {/* Extend Stay Sheet */}
      <Sheet open={extendSheet} onClose={() => setExtendSheet(false)} title="Extend Stay / Modify Checkout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>New Checkout Date & Time</label>
            <input type="datetime-local" value={newCheckOut ? newCheckOut.slice(0, 16) : ''} onChange={e => setNewCheckOut(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={handleModifyDates} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#0284c7', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Update Checkout Date</button>
        </div>
      </Sheet>

      {/* Edit Guest Sheet */}
      <Sheet open={guestEditSheet} onClose={() => setGuestEditSheet(false)} title="Edit Guest Profile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Guest Name</label><input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Mobile Phone</label><input value={editMobile} onChange={e => setEditMobile(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Nationality</label><input value={editNat} onChange={e => setEditNat(e.target.value)} placeholder="Indian" style={inputStyle} /></div>
          <div><label style={labelStyle}>Govt ID Type</label>
            <select value={editIdType} onChange={e => setEditIdType(e.target.value)} style={selectStyle}>
              {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>ID Document Number</label><input value={editIdNum} onChange={e => setEditIdNum(e.target.value)} placeholder="e.g. 1234 5678 9012" style={inputStyle} /></div>
          <button onClick={handleUpdateGuest} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Save Profile</button>
        </div>
      </Sheet>

      {/* ─── POPUPS ─── */}

      {/* Entry Detail / Void Popup */}
      <Popup open={!!entryPopup} onClose={() => { setEntryPopup(null); setVoidPin(''); }} title="Entry Details">
        {entryPopup && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Description</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{entryPopup.description}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Amount</div>
                <div style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '1.3rem', color: entryPopup.entry_type === 'Payment' ? '#059669' : '#ef4444' }}>
                  {entryPopup.entry_type === 'Payment' ? `+₹${Number(entryPopup.credit).toLocaleString('en-IN')}` : `-₹${Number(entryPopup.debit).toLocaleString('en-IN')}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Date</div>
                <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>{formatDate(entryPopup.created_at)}</div>
              </div>
            </div>
            {!entryPopup.is_voided && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Manager PIN (If Required)</label>
                <input type="password" placeholder="Enter PIN to void..." value={voidPin} onChange={e => setVoidPin(e.target.value)} style={inputStyle} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setEntryPopup(null); setVoidPin(''); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Close</button>
              {!entryPopup.is_voided && (
                <button onClick={handleVoidEntry} disabled={voiding} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 800, cursor: 'pointer' }}>
                  {voiding ? 'Voiding...' : 'Void Entry'}
                </button>
              )}
            </div>
          </div>
        )}
      </Popup>

      {/* Adjustment Popup */}
      <Popup open={!!adjustPopup} onClose={() => { setAdjustPopup(null); setAdjustReason(''); setDiscountPercent(''); }} title="Reversal / Adjustment">
        {adjustPopup && (
          <div>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: '0.85rem', color: '#b91c1c' }}>
              Adjusting: <strong>{adjustPopup.description}</strong> (₹{parseFloat(adjustPopup.debit).toFixed(2)})
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Correction Reason *</label>
              <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Explain correction reason..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Discount % (Optional)</label>
              <input type="number" min="0" max="100" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="0 – 100" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setAdjustPopup(null); setAdjustReason(''); setDiscountPercent(''); }} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdjust} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#dc2626', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Confirm Adjustment</button>
            </div>
          </div>
        )}
      </Popup>

      {/* Edit Charge Popup */}
      <Popup open={!!editChargePopup} onClose={() => setEditChargePopup(null)} title="Edit Charge Entry">
        {editChargePopup && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Description</label>
              <input value={editChargeDesc} onChange={e => setEditChargeDesc(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Amount (₹)</label>
              <input type="number" value={editChargeAmt} onChange={e => setEditChargeAmt(e.target.value)} style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditChargePopup(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditCharge} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        )}
      </Popup>

      {/* Edit Payment Popup */}
      <Popup open={!!editPaymentPopup} onClose={() => setEditPaymentPopup(null)} title="Edit Payment Entry">
        {editPaymentPopup && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Payment Method</label>
              <select value={editPayMethod} onChange={e => setEditPayMethod(e.target.value)} style={selectStyle}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Amount (₹)</label>
              <input type="number" value={editPayAmt} onChange={e => setEditPayAmt(e.target.value)} style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description / Remarks</label>
              <input value={editPayDesc} onChange={e => setEditPayDesc(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditPaymentPopup(null)} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditPayment} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#059669', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        )}
      </Popup>

    </div>
  );
}
