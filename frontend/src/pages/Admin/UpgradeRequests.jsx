import { useState } from "react";
import { CheckCircle, XCircle, Eye, Star, Trophy, Clock } from "lucide-react";

export default function UpgradeRequests() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      user: {
        name: "Alice Cooper",
        email: "alice@example.com",
        avatar: "https://i.pravatar.cc/150?img=1",
        joinDate: "2024-01-15"
      },
      requestDate: "2025-12-10T10:30:00",
      stats: {
        auctionsWon: 45,
        rating: 98,
        totalSpent: 5420
      },
      status: "pending"
    },
    {
      id: 2,
      user: {
        name: "Bob Williams",
        email: "bob@example.com",
        avatar: "https://i.pravatar.cc/150?img=2",
        joinDate: "2024-03-20"
      },
      requestDate: "2025-12-11T14:20:00",
      stats: {
        auctionsWon: 32,
        rating: 95,
        totalSpent: 3200
      },
      status: "pending"
    },
    {
      id: 3,
      user: {
        name: "Carol Martinez",
        email: "carol@example.com",
        avatar: "https://i.pravatar.cc/150?img=3",
        joinDate: "2024-02-10"
      },
      requestDate: "2025-12-09T09:15:00",
      stats: {
        auctionsWon: 28,
        rating: 92,
        totalSpent: 2800
      },
      status: "approved"
    },
  ]);

  const [filterStatus, setFilterStatus] = useState("pending");

  const filteredRequests = requests.filter(req => 
    filterStatus === "all" || req.status === filterStatus
  );

  const handleApprove = (id) => {
    if (confirm("Approve this upgrade request? The user will become a seller.")) {
      setRequests(requests.map(req =>
        req.id === id ? { ...req, status: "approved" } : req
      ));
    }
  };

  const handleReject = (id) => {
    if (confirm("Reject this upgrade request?")) {
      setRequests(requests.map(req =>
        req.id === id ? { ...req, status: "rejected" } : req
      ));
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="profile-name text-3xl font-bold">Seller Upgrade Requests</h1>
          <p className="profile-text-muted mt-1">Review and approve bidder upgrade requests</p>
        </div>
        <div className="profile-card px-4 py-2 rounded-lg">
          <div className="text-sm profile-text-muted">Pending Requests</div>
          <div className="text-2xl font-bold profile-name">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="profile-tabs-border flex gap-2 mb-6 border-b pb-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize relative ${
              filterStatus === status
                ? 'profile-name'
                : 'profile-text-muted hover:bg-[var(--bg-hover)]'
            }`}
          >
            {status}
            {filterStatus === status && (
              <div className="profile-tab-indicator absolute bottom-0 left-0 right-0 h-0.5 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.map((request) => (
          <div key={request.id} className="profile-card rounded-xl p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between gap-4">
              {/* User Info */}
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={request.user.avatar}
                  alt={request.user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="profile-name text-lg font-bold">{request.user.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="profile-text-muted text-sm mb-1">{request.user.email}</p>
                  <div className="flex items-center gap-4 text-sm profile-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Requested: {new Date(request.requestDate).toLocaleDateString()}
                    </span>
                    <span>Member since: {new Date(request.user.joinDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center mb-1">
                    <Trophy size={16} className="text-[var(--accent)]" />
                    <span className="profile-name text-2xl font-bold">{request.stats.auctionsWon}</span>
                  </div>
                  <div className="profile-text-muted text-xs">Auctions Won</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center mb-1">
                    <Star size={16} className={getRatingColor(request.stats.rating)} />
                    <span className={`text-2xl font-bold ${getRatingColor(request.stats.rating)}`}>
                      {request.stats.rating}%
                    </span>
                  </div>
                  <div className="profile-text-muted text-xs">Rating</div>
                </div>

                <div className="text-center">
                  <div className="profile-name text-2xl font-bold mb-1">
                    ${request.stats.totalSpent.toLocaleString()}
                  </div>
                  <div className="profile-text-muted text-xs">Total Spent</div>
                </div>
              </div>

              {/* Actions */}
              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all bg-[var(--success-soft)] text-[var(--success)] hover:shadow-md"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all bg-[var(--danger-soft)] text-[var(--danger)] hover:shadow-md"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                  <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <Eye size={18} className="profile-text-muted" />
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
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="profile-card rounded-xl p-12 text-center">
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
        <div className="mt-6 profile-text-muted text-sm">
          Showing {filteredRequests.length} {filterStatus !== 'all' && filterStatus} request(s)
        </div>
      )}
    </div>
  );
}
