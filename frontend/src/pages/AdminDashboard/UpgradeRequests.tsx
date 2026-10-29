import { useFeedback } from '../../components/ui/Feedback';
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Star, Trophy, Clock, RefreshCw } from "lucide-react";
import type { ApiError } from '../../services/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function UpgradeRequests() {
  const { confirm, notify } = useFeedback();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState("pending");
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch requests from backend
  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/seller/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError((err as ApiError).message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(req => 
    filterStatus === "all" || req.status === filterStatus
  );

  const handleApprove = async (id) => {
    const decision = await confirm({ title: 'Approve seller request?', message: 'The user will be able to create listings.', confirmLabel: 'Approve', reason: { label: 'Note' } });
    if (!decision) return;
    
    setActionLoading(id);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/seller/requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: decision.reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to approve request');
      }

      // Update local state
      setRequests(requests.map(req =>
        req.id === id ? { ...req, status: "approved" } : req
      ));
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const decision = await confirm({ title: 'Reject seller request?', message: 'The user keeps their buyer account and can apply again after 7 days.', confirmLabel: 'Reject', tone: 'danger', reason: { label: 'Reason' } });
    if (!decision) return;
    
    setActionLoading(id);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/seller/requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: decision.reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reject request');
      }

      // Update local state
      setRequests(requests.map(req =>
        req.id === id ? { ...req, status: "rejected" } : req
      ));
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-[var(--warning-soft)] text-[var(--warning)]',
      approved: 'bg-[var(--success-soft)] text-[var(--success)]',
      rejected: 'bg-[var(--danger-soft)] text-[var(--danger)]'
    };
    return styles[status] || styles.pending;
  };

  const getRatingColor = (rating) => {
    if (rating >= 95) return 'text-[var(--success)]';
    if (rating >= 85) return 'text-[var(--accent)]';
    return 'text-[var(--warning)]';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-(--ink) text-3xl font-bold">Seller Upgrade Requests</h1>
          <p className="text-(--muted) mt-1">Review and approve bidder upgrade requests</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchRequests}
            disabled={loading}
            aria-label="Refresh requests"
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RefreshCw size={20} className={`text-(--muted) ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="bg-(--surface) border-(--line) px-4 py-2 rounded-lg">
            <div className="text-sm text-(--muted)">Pending Requests</div>
            <div className="text-2xl font-bold text-(--ink)">
              {requests.filter(r => r.status === 'pending').length}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="border-(--line) flex flex-wrap gap-2 mb-6 border-b pb-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize relative ${
              filterStatus === status
                ? 'text-(--ink)'
                : 'text-(--muted) hover:bg-(--bg-hover)'
            }`}
          >
            {status}
            {filterStatus === status && (
              <div className="bg-(--ink) absolute bottom-0 left-0 right-0 h-0.5 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-(--muted)">Loading requests...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((request) => {
            const user = request.user || {};
            const ratingPercent = user.ratingCount > 0 
              ? Math.round((user.positiveRatingCount / user.ratingCount) * 100) 
              : 0;
            
            return (
              <div key={request.id} className="bg-(--surface) border-(--line) rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username || 'User')}&background=random`}
                      alt={user.fullName || user.username}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-(--ink) text-lg font-bold">{user.fullName || user.username || 'Unknown User'}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-(--muted) text-sm mb-1">{user.email}</p>
                      <div className="flex items-center gap-4 text-sm text-(--muted)">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Requested: {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                        <span>Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {request.reason && (
                        <div className="mt-3 p-3 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Reason:</p>
                          <p className="text-sm text-[var(--text)]">{request.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 justify-center mb-1">
                        <Star size={16} className={getRatingColor(ratingPercent)} />
                        <span className={`text-2xl font-bold ${getRatingColor(ratingPercent)}`}>
                          {ratingPercent}%
                        </span>
                      </div>
                      <div className="text-(--muted) text-xs">Rating ({user.ratingCount || 0} reviews)</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all bg-[var(--success-soft)] text-[var(--success)] hover:shadow-md disabled:opacity-50"
                      >
                        {actionLoading === request.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle size={18} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all bg-[var(--danger-soft)] text-[var(--danger)] hover:shadow-md disabled:opacity-50"
                      >
                        {actionLoading === request.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <XCircle size={18} />
                        )}
                        Reject
                      </button>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <div className="px-4 py-2 rounded-lg bg-[var(--success-soft)] text-[var(--success)] font-medium">
                      ✓ Approved
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="px-4 py-2 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] font-medium">
                      ✗ Rejected
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredRequests.length === 0 && (
        <div className="bg-(--surface) border-(--line) rounded-xl p-12 text-center">
          <div className="notification-empty-text text-lg mb-2">
            No {filterStatus !== 'all' && filterStatus} requests found
          </div>
          <p className="notification-empty-subtext text-sm">
            {filterStatus === 'pending' 
              ? "All upgrade requests have been processed"
              : "Try changing the filter to view other requests"}
          </p>
        </div>
      )}

      {/* Summary */}
      {filteredRequests.length > 0 && (
        <div className="mt-6 text-(--muted) text-sm">
          Showing {filteredRequests.length} {filterStatus !== 'all' && filterStatus} request(s)
        </div>
      )}
    </div>
  );
}
