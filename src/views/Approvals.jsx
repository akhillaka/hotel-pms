import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Approvals({ user, permission }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const token = localStorage.getItem('pms_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.get('/api/approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to load override approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Request approved and action executed successfully!');
      fetchApprovals();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('pms_token');
      await axios.post(`/api/approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Request rejected');
      fetchApprovals();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading approval requests…</span>
      </div>
    );
  }

  const userRole = user?.role || '';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} style={{ color: 'var(--brand-500)' }} />
            Approvals Dashboard
          </h1>
          <p className="page-subtitle">Track and authorize critical overrides, rate updates, refunds, and cancellations</p>
        </div>
        <button onClick={fetchApprovals} className="btn btn-default btn-sm">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Details / Parameters</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Requested By / Date</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                {userRole === 'Admin' && <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'Admin' ? 5 : 4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-faint)' }}>
                    No pending override requests found.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  let typeLabel = req.type;
                  let badgeColor = 'badge-indigo';
                  let detailsText = '';

                  // Safely handle details parsing
                  let details = req.details;
                  if (typeof details === 'string') {
                    try {
                      details = JSON.parse(details);
                    } catch (e) {}
                  }

                  if (req.type === 'CHECKOUT_WITH_BALANCE') {
                    typeLabel = 'Checkout with Balance';
                    badgeColor = 'badge-red';
                    detailsText = `Reservation ID: #${details?.reservation_id || 'N/A'} | Outstanding: ₹${details?.balance || 0}`;
                  } else if (req.type === 'REFUND') {
                    typeLabel = 'Refund Payout';
                    badgeColor = 'badge-indigo';
                    detailsText = `Folio: ${details?.folio_id?.substring(0, 8)}... | Amount: ₹${details?.amount} (${details?.payment_method || 'Cash'}) | Reason: ${details?.reason || 'None'}`;
                  } else if (req.type === 'CANCELLATION') {
                    typeLabel = 'Stay Cancellation';
                    badgeColor = 'badge-slate';
                    detailsText = `Reservation ID: #${details?.reservation_id || 'N/A'} | Reason: ${details?.reason || 'None'}`;
                  } else if (req.type === 'RATE_MODIFY') {
                    typeLabel = 'Rate Modification';
                    badgeColor = 'badge-green';
                    if (details?.rate_plan_id) {
                      detailsText = `Rate Plan: ${details.rate_plan_id} | Proposed: Night ₹${details.new_night_price}, Day ₹${details.new_day_price}`;
                    } else {
                      detailsText = `Reservation ID: #${details?.reservation_id || 'N/A'} | Proposed Rate: ₹${details?.new_rate || 0} | Reason: ${details?.reason || 'None'}`;
                    }
                  }

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${badgeColor}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {typeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px', maxWidth: '350px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {detailsText}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{req.requested_by}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                          {new Date(req.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span className={`badge ${
                          req.status === 'Approved' ? 'badge-green' :
                          req.status === 'Rejected' ? 'badge-slate' : 'badge-indigo'
                        }`}>
                          <span className="badge-dot" />
                          {req.status}
                        </span>
                        {req.approved_by && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '4px' }}>
                            by {req.approved_by}
                          </div>
                        )}
                      </td>
                      {userRole === 'Admin' && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {req.status === 'Pending Approval' ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="glass-btn glass-btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="glass-btn"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#ef4444', borderColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>Resolved</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
