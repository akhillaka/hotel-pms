import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, ShieldAlert, Users, Layers, Tag, Landmark, Sparkles, Plus, Trash2, Save, Shield, Building, CreditCard, Activity, Bell, Edit, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Admin({ user, permission }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeSubTab, setActiveSubTab] = useState('property');

  // Master Data
  const [rooms, setRooms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Property Details State
  const [propertyName, setPropertyName] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2, setContact2] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [gstOption, setGstOption] = useState('No GST');
  const [gstNumber, setGstNumber] = useState('');
  const [taxCalculationMode, setTaxCalculationMode] = useState('Exempt');
  const [defaultAccommodationTaxId, setDefaultAccommodationTaxId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Integrations State
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waTestMobile, setWaTestMobile] = useState('');



  // Tax form state
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('');

  // Room type form state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeCapacity, setNewTypeCapacity] = useState(2);

  // Rate plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanRoomTypeId, setNewPlanRoomTypeId] = useState('');
  const [newPlanNightPrice, setNewPlanNightPrice] = useState('');
  const [newPlanDayUsePrice, setNewPlanDayUsePrice] = useState('');
  const [newPlanHourlyPrices, setNewPlanHourlyPrices] = useState({});
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRatePlan, setEditingRatePlan] = useState(null);

  // Rooms Master State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1');
  const [newRoomCapacity, setNewRoomCapacity] = useState('2'); // e.g. { 'rt_std': 500, 'rt_dlx': 800 }

  // Payments form state
  const [newPaymentName, setNewPaymentName] = useState('');
  const [gatewayMerchantId, setGatewayMerchantId] = useState('');
  const [gatewayVpa, setGatewayVpa] = useState('');
  const [gatewaySandbox, setGatewaySandbox] = useState('Yes');

  // RBAC State
  const [rbacMatrix, setRbacMatrix] = useState([]);

  // Staff Users State
  const [staffUsers, setStaffUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Receptionist');
  const [newUserName, setNewUserName] = useState('');
  const [newUserDiscountLimit, setNewUserDiscountLimit] = useState('0');
  const [editingUser, setEditingUser] = useState(null);

  // Refund Requests State
  const [refundRequests, setRefundRequests] = useState([]);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) return;

      const [rmRes, plRes, typeRes, taxRes, payRes, propRes, permRes] = await Promise.all([
        axios.get('/api/rooms', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/rate-plans', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/room-types', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/taxes', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/payment-methods', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/property', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/permissions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setRooms(rmRes.data);
      setPlans(plRes.data);
      setRoomTypes(typeRes.data);
      setTaxes(taxRes.data);
      setPaymentMethods(payRes.data);
      setRbacMatrix(permRes.data);

      // Load staff users (Admin/Manager only)
      try {
        const usersRes = await axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        setStaffUsers(usersRes.data);
      } catch {
        setStaffUsers([]); // Non-admin roles won't have access
      }

      // Load refund requests (Admin/Manager only)
      if (['Admin', 'Manager'].includes(user.role)) {
        try {
          const refundRes = await axios.get('/api/refunds', { headers: { Authorization: `Bearer ${token}` } });
          setRefundRequests(refundRes.data);
        } catch (err) {
          console.error('Failed to load refund requests', err);
        }
        try {
          const approvalsRes = await axios.get('/api/approvals', { headers: { Authorization: `Bearer ${token}` } });
          setApprovalRequests(approvalsRes.data);
        } catch (err) {
          console.error('Failed to load approval requests', err);
        }
      }

      // Load property configs
      if (propRes.data) {
        setPropertyName(propRes.data.name || '');
        setContact1(propRes.data.contact1 || '');
        setContact2(propRes.data.contact2 || '');
        setEmailAddress(propRes.data.email || '');
        setPhysicalAddress(propRes.data.address || '');
        setGstOption(propRes.data.gstOption || 'No GST');
        setGstNumber(propRes.data.gstNumber || '');
        setTaxCalculationMode(propRes.data.tax_calculation_mode || 'Exempt');
        setDefaultAccommodationTaxId(propRes.data.default_accommodation_tax_id || '');
        setTgToken(propRes.data.tgToken || '');
        setTgChatId(propRes.data.tgChatId || '');
        setWaToken(propRes.data.waToken || '');
        setWaPhoneId(propRes.data.waPhoneId || '');
        setLogoUrl(propRes.data.logo_url || '');
      }
    } catch (err) {
      toast.error('Failed to load masters registries');
    }
  };

  const handleApproveRefund = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/refunds/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Refund request approved successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve refund request');
    }
  };

  const handleRejectRefund = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/refunds/${id}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Refund request rejected successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject refund request');
    }
  };

  const handleApproveApprovalRequest = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/approvals/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Approval request approved successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectApprovalRequest = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/approvals/${id}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Approval request rejected');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  useEffect(() => {
    if (!isMobile) {
      fetchData();
    }
  }, [isMobile]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/property/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('Logo uploaded successfully');
      setLogoUrl(res.data.logo_url);
      fetchData();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload logo');
    }
  };

  const savePropertyDetails = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/property', {
        name: propertyName,
        contact1,
        contact2,
        email: emailAddress,
        address: physicalAddress,
        gstOption,
        gstNumber,
        tax_calculation_mode: taxCalculationMode,
        default_accommodation_tax_id: defaultAccommodationTaxId
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Property settings updated successfully');
      fetchData();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      toast.error('Failed to update property details');
    }
  };

  const saveIntegrationDetails = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/property', {
        tgToken,
        tgChatId,
        waToken,
        waPhoneId
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Integrations config updated successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to update integrations configuration');
    }
  };

  const handleTestTelegram = async () => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/integrations/test-telegram', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Telegram test message dispatched!');
      } else {
        toast.error('Telegram test failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch Telegram test. Ensure token and chat ID are saved first.');
    }
  };

  const handleTestWhatsApp = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!waTestMobile) {
      toast.error('Please enter a mobile number for testing');
      return;
    }
    try {
      const token = localStorage.getItem('pms_token');
      const res = await axios.post('/api/integrations/test-whatsapp', { mobile: waTestMobile }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message || 'WhatsApp test message dispatched!');
      } else {
        toast.error('WhatsApp test failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch WhatsApp test. Ensure credentials are saved first.');
    }
  };

  const handleCreateTax = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/taxes', { name: taxName, rate: taxRate }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tax rule created');
      setTaxName('');
      setTaxRate('');
      fetchData();
    } catch (err) {
      toast.error('Failed to add tax rule');
    }
  };

  const handleDeleteTax = async (id) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/taxes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tax rule removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete tax rule');
    }
  };

  const handleCreateRoomType = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/room-types', {
        name: newTypeName,
        code: newTypeCode,
        capacity: newTypeCapacity
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Room Category registered');
      setNewTypeName('');
      setNewTypeCode('');
      fetchData();
    } catch (err) {
      toast.error('Failed to register room category');
    }
  };

  const handleDeleteRoomType = async (id) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/room-types/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Room category deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const handleUpdateRoomType = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!editingRoomType) return;
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/room-types/${editingRoomType.id}`, {
        name: editingRoomType.name,
        code: editingRoomType.code,
        capacity: editingRoomType.capacity
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Room Category updated');
      setEditingRoomType(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update room category');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/rooms', {
        room_number: newRoomNumber,
        room_type_id: newRoomTypeId,
        floor: newRoomFloor,
        capacity: newRoomCapacity
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Room mapped successfully');
      setNewRoomNumber('');
      fetchData();
    } catch (err) {
      toast.error('Failed to map room');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Room deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete room');
    }
  };

  const handleCreateRatePlan = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');

    if (!newPlanRoomTypeId) {
      return toast.error('Please select a Room Category');
    }

    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/rate-plans', {
        name: newPlanName,
        room_type_id: newPlanRoomTypeId,
        night_price: newPlanNightPrice,
        day_use_price: newPlanDayUsePrice,
        hourly_prices: newPlanHourlyPrices
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Rate Plan successfully created');
      setNewPlanName('');
      setNewPlanRoomTypeId('');
      setNewPlanNightPrice('');
      setNewPlanDayUsePrice('');
      setNewPlanHourlyPrices({});
      fetchData();
    } catch (err) {
      toast.error('Failed to configure rate plan');
    }
  };

  const handleDeleteRatePlan = async (id) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/rate-plans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rate plan removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove plan');
    }
  };

  const handleUpdateRatePlan = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!editingRatePlan) return;
    try {
      const token = localStorage.getItem('pms_token');
      await axios.patch(`/api/rate-plans/${editingRatePlan.id}`, {
        name: editingRatePlan.name,
        night_price: editingRatePlan.night_price,
        day_use_price: editingRatePlan.day_use_price,
        hourly_prices: editingRatePlan.hourly_prices
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Rate Plan updated');
      setEditingRatePlan(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update rate plan');
    }
  };

  const handleAddPaymentType = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/payment-methods', { name: newPaymentName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Payment method registered');
      setNewPaymentName('');
      fetchData();
    } catch (err) {
      toast.error('Failed to add payment type');
    }
  };

  const handleDeletePaymentType = async (id) => {
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.delete(`/api/payment-methods/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Payment method removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove payment method');
    }
  };

  const saveGatewaySettings = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/gateway', {
        merchantId: gatewayMerchantId,
        vpa: gatewayVpa,
        sandbox: gatewaySandbox
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Gateway settings updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to save gateway details');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (permission === 'read') return toast.error('Permission Denied: Read-only access');
    if (!newUsername || !newUserPassword || !newUserName) {
      return toast.error('Username, password, and full name are required');
    }
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post('/api/users', {
        username: newUsername,
        password: newUserPassword,
        role: newUserRole,
        name: newUserName,
        discount_limit: parseFloat(newUserDiscountLimit) || 0
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Staff user "${newUsername}" created successfully`);
      setNewUsername('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserDiscountLimit('0');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const token = localStorage.getItem('pms_token');
      const payload = {
        role: editingUser.role,
        name: editingUser.name,
        discount_limit: parseFloat(editingUser.discount_limit) || 0
      };
      if (editingUser.newPassword) {
        payload.password = editingUser.newPassword;
      }
      await axios.patch(`/api/users/${editingUser.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Staff user updated successfully');
      setEditingUser(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  if (isMobile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', textAlign: 'center', padding: '16px' }}>
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '450px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={48} className="text-danger" style={{ marginBottom: '16px', display: 'inline-block' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>PMS Security Guard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.4' }}>
            Compliance Alert: <strong>Configuration & Administration Masters</strong> are restricted to Desktop viewports only.
            Mobile editing is locked to prevent unauthorized price or room modifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Configuration</h1>
          <p className="page-subtitle">Masters, rate plans, taxes &amp; gateway settings</p>
        </div>
      </div>

      {/* Admin configuration subtabs */}
      <div className="filter-pills no-print" style={{ flexWrap: 'wrap' }}>
        <button onClick={() => setActiveSubTab('property')} className={`filter-pill ${activeSubTab === 'property' ? 'active' : ''}`}><Landmark size={14} /> Property &amp; Taxes</button>
        <button onClick={() => setActiveSubTab('rooms')} className={`filter-pill ${activeSubTab === 'rooms' ? 'active' : ''}`}><Layers size={14} /> Room Categories</button>
        <button onClick={() => setActiveSubTab('plans')} className={`filter-pill ${activeSubTab === 'plans' ? 'active' : ''}`}><Tag size={14} /> Rate Packages</button>
        <button onClick={() => setActiveSubTab('payments')} className={`filter-pill ${activeSubTab === 'payments' ? 'active' : ''}`}><Landmark size={14} /> Payments</button>
        {user.role === 'Admin' && (
          <>
            <button onClick={() => setActiveSubTab('staff')} className={`filter-pill ${activeSubTab === 'staff' ? 'active' : ''}`}><Users size={14} /> Staff Users</button>
            <button onClick={() => setActiveSubTab('rbac')} className={`filter-pill ${activeSubTab === 'rbac' ? 'active' : ''}`}><ShieldAlert size={14} /> Role Permissions</button>
          </>
        )}
      </div>

      {permission === 'read' && (
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>
          ⚠️ Notice: You have Read-Only access to Configuration Masters. All settings are locked.
        </div>
      )}

      {/* SUBTAB 1: PROPERTY & TAXES */}
      {activeSubTab === 'property' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Property Form */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Property Details</h2>
            <form onSubmit={savePropertyDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Property Name</label>
                <input type="text" className="glass-input" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Hotel Logo (PNG)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  {logoUrl && (
                    <img src={logoUrl} alt="Hotel Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '2px', background: '#f8fafc' }} />
                  )}
                  <input type="file" accept="image/png" onChange={handleLogoUpload} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Option 1</label>
                  <input type="tel" className="glass-input" value={contact1} onChange={(e) => setContact1(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Option 2</label>
                  <input type="tel" className="glass-input" value={contact2} onChange={(e) => setContact2(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input type="email" className="glass-input" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Physical Address</label>
                <textarea className="glass-input" rows="2" value={physicalAddress} onChange={(e) => setPhysicalAddress(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>GST configuration</label>
                  <select className="glass-input" value={gstOption} onChange={(e) => setGstOption(e.target.value)}>
                    <option value="No GST">No GST (GST Exempt)</option>
                    <option value="Enter GST">Apply GST (Enter number)</option>
                  </select>
                </div>
                {gstOption === 'Enter GST' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>GSTIN Number</label>
                    <input type="text" className="glass-input" placeholder="e.g. 22AAAAA0000A1Z5" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Default Tax Calculation Mode</label>
                  <select className="glass-input" value={taxCalculationMode} onChange={(e) => setTaxCalculationMode(e.target.value)}>
                    <option value="Exempt">Exempt (No taxes applied)</option>
                    <option value="Inclusive">Inclusive (Charge amount includes tax)</option>
                    <option value="Exclusive">Exclusive (Tax added on top of charge)</option>
                  </select>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>This mode is used when applying taxes to folio charges.</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Default Accommodation Tax</label>
                  <select className="glass-input" value={defaultAccommodationTaxId} onChange={(e) => setDefaultAccommodationTaxId(e.target.value)}>
                    <option value="">-- No Default Tax --</option>
                    {taxes.map(tx => (
                      <option key={tx.id} value={tx.id}>{tx.name} ({tx.rate}%)</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Automatically applies this tax to room tariffs during Check-in.</p>
                </div>
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '8px' }}><Save size={16} /> Save Property Config</button>
            </form>
          </div>

          {/* Tax Module */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Tax Rates Master</h2>
            <form onSubmit={handleCreateTax} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input type="text" placeholder="Tax name (e.g. CGST)" className="glass-input" value={taxName} onChange={(e) => setTaxName(e.target.value)} />
              <input type="number" placeholder="Rate %" className="glass-input" style={{ width: '90px' }} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              <button type="submit" className="glass-btn glass-btn-primary"><Plus size={16} /></button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {taxes.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No active tax configuration rules</div>
              ) : (
                taxes.map(tx => (
                  <div key={tx.id} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span>{tx.name} <strong>({tx.rate}%)</strong></span>
                    <button onClick={() => handleDeleteTax(tx.id)} className="glass-btn" style={{ padding: '4px', border: 'none', background: 'none' }}><Trash2 size={14} className="text-danger" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ROOM CATEGORIES */}
      {activeSubTab === 'rooms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Create Room Category</h2>
            <form onSubmit={handleCreateRoomType} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category Name</label>
                <input type="text" placeholder="e.g. Executive Deluxe" className="glass-input" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Type Code (3 letters)</label>
                <input type="text" maxLength="3" placeholder="e.g. EXD" className="glass-input" value={newTypeCode} onChange={(e) => setNewTypeCode(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Capacity Count</label>
                <input type="number" className="glass-input" value={newTypeCapacity} onChange={(e) => setNewTypeCapacity(e.target.value)} />
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '8px' }}>Create Room Category</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Active Room Categories</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roomTypes.map(type => (
                <div key={type.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  {editingRoomType?.id === type.id ? (
                    <form onSubmit={handleUpdateRoomType} style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                      <input className="glass-input" style={{ width: '120px' }} value={editingRoomType.name} onChange={e => setEditingRoomType({...editingRoomType, name: e.target.value})} />
                      <input className="glass-input" style={{ width: '60px' }} value={editingRoomType.code} onChange={e => setEditingRoomType({...editingRoomType, code: e.target.value})} />
                      <input type="number" className="glass-input" style={{ width: '60px' }} value={editingRoomType.capacity} onChange={e => setEditingRoomType({...editingRoomType, capacity: e.target.value})} />
                      <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: '4px 8px' }}>Save</button>
                      <button type="button" onClick={() => setEditingRoomType(null)} className="glass-btn" style={{ padding: '4px 8px' }}>X</button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <strong>{type.name} ({type.code})</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Capacity: {type.capacity} pax</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setEditingRoomType(type)} className="glass-btn" style={{ padding: '6px', border: 'none', background: 'none' }}>
                          <Edit size={16} style={{ color: 'var(--primary)' }} />
                        </button>
                        <button onClick={() => handleDeleteRoomType(type.id)} className="glass-btn" style={{ padding: '6px', border: 'none', background: 'none' }}>
                          <Trash2 size={16} className="text-danger" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <hr style={{ borderColor: 'var(--border-glass)', margin: '10px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Add Physical Room</h2>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Number *</label>
                <input type="text" placeholder="e.g. 101" className="glass-input" value={newRoomNumber} onChange={(e) => setNewRoomNumber(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Category *</label>
                <select className="glass-input" value={newRoomTypeId} onChange={(e) => setNewRoomTypeId(e.target.value)} required>
                  <option value="">-- Select Category --</option>
                  {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Floor Level</label>
                  <input type="number" className="glass-input" value={newRoomFloor} onChange={(e) => setNewRoomFloor(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pax Capacity</label>
                  <input type="number" className="glass-input" value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '8px' }}>Assign Physical Room</button>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Active Rooms Directory</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {rooms.map(room => (
                <div key={room.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '1rem' }}>Rm {room.room_number}</strong>
                    <button onClick={() => handleDeleteRoom(room.id)} className="glass-btn" style={{ padding: '4px', border: 'none', background: 'none' }}>
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>Cat: {room.room_type_code}</div>
                    <div>Floor {room.floor} | {room.capacity} Pax</div>
                    <div><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: room.status === 'Vacant Clean' ? 'var(--success)' : room.status === 'Occupied' ? 'var(--primary)' : 'var(--warning)', marginRight: '4px' }}></span>{room.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RATE PLANS */}
      {activeSubTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* Rate plan creation */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Create Master Rate Plan</h2>
            <form onSubmit={handleCreateRatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Rate Plan Name</label>
                  <input type="text" placeholder="e.g. Standard AC Rate" className="glass-input" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Room Category</label>
                  <select className="glass-input" value={newPlanRoomTypeId} onChange={(e) => setNewPlanRoomTypeId(e.target.value)} required>
                    <option value="">-- Select Category --</option>
                    {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Base Night Price (₹)</label>
                  <input type="number" className="glass-input" value={newPlanNightPrice} onChange={(e) => setNewPlanNightPrice(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Base Day Use Price (₹)</label>
                  <input type="number" className="glass-input" value={newPlanDayUsePrice} onChange={(e) => setNewPlanDayUsePrice(e.target.value)} required />
                </div>
              </div>

              {/* Hourly Pricing Grid */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Hourly Price Configuration (₹)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(hour => (
                    <div key={hour} style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px', textAlign: 'center' }}>{hour} Hr</label>
                      <input 
                        type="number" 
                        className="glass-input" 
                        style={{ padding: '4px', textAlign: 'center', fontSize: '0.85rem' }}
                        value={newPlanHourlyPrices[hour] || ''}
                        onChange={(e) => setNewPlanHourlyPrices({ ...newPlanHourlyPrices, [hour]: e.target.value ? parseFloat(e.target.value) : '' })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '12px' }}>Save Rate Plan</button>
            </form>
          </div>

          {/* Active plan packages list */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Active Tariff Matrix</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  {editingRatePlan?.id === plan.id ? (
                    <form onSubmit={handleUpdateRatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input className="glass-input" style={{ width: '100%' }} value={editingRatePlan.name} onChange={e => setEditingRatePlan({...editingRatePlan, name: e.target.value})} placeholder="Name" />
                        <input type="number" className="glass-input" style={{ width: '120px' }} value={editingRatePlan.night_price} onChange={e => setEditingRatePlan({...editingRatePlan, night_price: e.target.value})} title="Night Price" placeholder="Night ₹" />
                        <input type="number" className="glass-input" style={{ width: '120px' }} value={editingRatePlan.day_use_price} onChange={e => setEditingRatePlan({...editingRatePlan, day_use_price: e.target.value})} title="Day Use Price" placeholder="Day Use ₹" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
                        {Array.from({ length: 24 }, (_, i) => i + 1).map(hour => (
                          <input 
                            key={hour}
                            type="number" 
                            className="glass-input" 
                            style={{ padding: '2px', textAlign: 'center', fontSize: '0.75rem' }}
                            placeholder={`${hour}Hr`}
                            value={editingRatePlan.hourly_prices?.[hour] || ''}
                            onChange={(e) => setEditingRatePlan({
                              ...editingRatePlan, 
                              hourly_prices: { ...editingRatePlan.hourly_prices, [hour]: e.target.value ? parseFloat(e.target.value) : '' }
                            })}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: '4px 8px' }}>Save</button>
                        <button type="button" onClick={() => setEditingRatePlan(null)} className="glass-btn" style={{ padding: '4px 8px' }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>{plan.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room: {plan.room_type_name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button onClick={() => setEditingRatePlan(plan)} className="glass-btn" style={{ padding: '4px', border: 'none', background: 'none' }}>
                              <Edit size={14} style={{ color: 'var(--primary)' }} />
                            </button>
                            <button onClick={() => handleDeleteRatePlan(plan.id)} className="glass-btn" style={{ padding: '4px', border: 'none', background: 'none' }}>
                              <Trash2 size={14} className="text-danger" />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Night: ₹{plan.night_price}</span>
                          <span>Day Use: ₹{plan.day_use_price}</span>
                          <span>Hourly Configured: {Object.keys(plan.hourly_prices || {}).filter(k => plan.hourly_prices[k] !== '').length}/24</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PAYMENTS CONFIG */}
      {activeSubTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Redirect banner to Integrations page */}
          <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg,#eef2ff,#f0fdf4)', border: '1.5px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '1.6rem' }}>🔗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3730a3' }}>WhatsApp, Telegram & Razorpay are now in Integrations</div>
              <div style={{ fontSize: '0.78rem', color: '#6366f1', marginTop: '2px' }}>Go to <strong>Administration → Integrations</strong> in the sidebar to configure all notification and payment channels.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
            {/* Payment method types */}
            <div className="glass-panel" style={{ padding: '24px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Payment Method Types</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>These appear in the Folio → Payments tab when collecting manual payments.</p>
              <form onSubmit={handleAddPaymentType} style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="e.g. Net Banking" className="glass-input" value={newPaymentName} onChange={(e) => setNewPaymentName(e.target.value)} />
                <button type="submit" className="glass-btn glass-btn-primary"><Plus size={16} /></button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paymentMethods.map(pm => (
                  <div key={pm.id} style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span>{pm.name}</span>
                    <button onClick={() => handleDeletePaymentType(pm.id)} className="glass-btn" style={{ padding: '4px', border: 'none', background: 'none' }}><Trash2 size={14} className="text-danger" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick status cards */}
            <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Integration Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Razorpay Gateway', desc: 'Online payments · UPI · Cards', icon: '💳', color: '#6366f1' },
                  { label: 'WhatsApp Cloud API', desc: 'Guest notifications & 2-way chat', icon: '💬', color: '#25d366' },
                  { label: 'Telegram Alerts', desc: 'Owner real-time event notifications', icon: '🤖', color: '#2196f3' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: `${item.color}08`, border: `1.5px solid ${item.color}22`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700, background: `${item.color}15`, padding: '3px 8px', borderRadius: '10px' }}>→ Integrations</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: STAFF USERS MANAGEMENT */}
      {activeSubTab === 'staff' && user.role === 'Admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>

          {/* Create User Form */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Create Staff Account
            </h2>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" className="glass-input" placeholder="e.g. Rahul Sharma" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Username (Login ID) *</label>
                <input type="text" className="glass-input" placeholder="e.g. rahul.reception" value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, '.'))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Password *</label>
                <input type="password" className="glass-input" placeholder="Min 6 characters" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>System Role *</label>
                  <select className="glass-input" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Manager">Manager</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Max Discount Limit (%)</label>
                  <input type="number" min="0" max="100" className="glass-input" value={newUserDiscountLimit} onChange={e => setNewUserDiscountLimit(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Create Staff Account
              </button>
            </form>
          </div>

          {/* Staff List */}
          <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>Active Staff Accounts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {staffUsers.map(u => (
                <div key={u.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {editingUser?.id === u.id ? (
                    <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input className="glass-input" style={{ flex: 1, minWidth: '120px' }} placeholder="Full name" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        <select className="glass-input" style={{ width: '140px' }} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                          <option value="Receptionist">Receptionist</option>
                          <option value="Manager">Manager</option>
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <input type="number" className="glass-input" style={{ width: '80px' }} placeholder="Disc %" value={editingUser.discount_limit} onChange={e => setEditingUser({...editingUser, discount_limit: e.target.value})} />
                        <input type="password" className="glass-input" style={{ flex: 1, minWidth: '120px' }} placeholder="New password (optional)" value={editingUser.newPassword || ''} onChange={e => setEditingUser({...editingUser, newPassword: e.target.value})} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: '4px 12px' }}>Save</button>
                        <button type="button" onClick={() => setEditingUser(null)} className="glass-btn" style={{ padding: '4px 12px' }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          @{u.username} &bull; Discount limit: {u.discount_limit}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-danger' : u.role === 'Manager' ? 'badge-info' : 'badge-neutral'}`}>{u.role}</span>
                        <button onClick={() => setEditingUser({...u, newPassword: ''})} className="glass-btn" style={{ padding: '4px 8px', border: 'none', background: 'none' }}>
                          <Edit size={14} style={{ color: 'var(--primary)' }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {staffUsers.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '16px' }}>No staff accounts found</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB 6: ROLE PERMISSIONS RBAC */}
      {activeSubTab === 'rbac' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: '#fff' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>Role Access Control Matrix</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>
            Configure view and edit permissions for each system role. Access levels defined as: 
            <strong> Full Edit</strong> (Allows reads & database mutations), 
            <strong> Read Only</strong> (Restricts user to viewing, disables forms & edit buttons), or 
            <strong> Disabled</strong> (Completely hides the module from the user's interface).
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Module</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Admin</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Manager</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Receptionist</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Housekeeping</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'dashboard', label: 'Dashboard View' },
                  { id: 'rooms', label: 'Room Board / Inventory' },
                  { id: 'guests', label: 'Guest CRM Directory' },
                  { id: 'billing', label: 'Folio Registry & Billing' },
                  { id: 'transactions', label: 'Money Manager (Ledger)' },
                  { id: 'chat', label: 'Comms Desk (WhatsApp)' },
                  { id: 'reports', label: 'Analytics Reports' },
                  { id: 'admin', label: 'Config Masters (Admin)' },
                  { id: 'audit', label: 'Audit & Compliance Logs' }
                ].map(mod => {
                  return (
                    <tr key={mod.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{mod.label}</td>
                      {['Admin', 'Manager', 'Receptionist', 'Housekeeping'].map(role => {
                        const current = rbacMatrix.find(r => r.role === role && r.module === mod.id);
                        const level = current ? current.access_level : 'disabled';
                        
                        return (
                          <td key={role} style={{ padding: '8px', textAlign: 'center' }}>
                            <select 
                              className="glass-input" 
                              style={{ width: '130px', padding: '6px', fontSize: '0.8rem', display: 'inline-block' }}
                              value={level}
                              disabled={role === 'Admin'}
                              onChange={(e) => {
                                const newMatrix = [...rbacMatrix];
                                const idx = newMatrix.findIndex(r => r.role === role && r.module === mod.id);
                                if (idx > -1) {
                                  newMatrix[idx] = { ...newMatrix[idx], access_level: e.target.value };
                                } else {
                                  newMatrix.push({ role, module: mod.id, access_level: e.target.value });
                                }
                                setRbacMatrix(newMatrix);
                              }}
                            >
                              <option value="edit">Full Edit</option>
                              <option value="read">Read Only</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button 
              onClick={async () => {
                try {
                  const token = localStorage.getItem('pms_token');
                  await axios.post('/api/permissions', { matrix: rbacMatrix }, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  toast.success('Access matrix updated successfully');
                  fetchData();
                } catch (err) {
                  toast.error('Failed to update access control matrix');
                }
              }}
              className="glass-btn glass-btn-primary"
            >
              <Save size={16} /> Save Access Levels
            </button>
            <button onClick={fetchData} className="glass-btn">Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
