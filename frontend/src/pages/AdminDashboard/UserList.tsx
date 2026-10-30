import { useFeedback } from '../../components/ui/Feedback';
import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { Button, Dialog } from '../../components/ui';
import { Search, Eye, Ban, CheckCircle, UserPlus, Filter, ChevronLeft, ChevronRight, X, User } from "lucide-react";
import type { ApiError } from '../../services/apiClient';
import type { AdminUser, AdminUserStats } from "../../types/api";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function UserList() {
  const { confirm, notify } = useFeedback();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userStats, setUserStats] = useState<{ totalAuctions: number; totalBids: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter
      });

      const response = await fetch(`${API_URL}/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/users/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
        setUserStats(data.stats);
        setShowUserModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err);
    }
  };

  const handleBanUser = async (userId: number) => {
    const decision = await confirm({ title: 'Ban this user?', message: 'They are signed out everywhere and cannot bid, list or order until unbanned.', confirmLabel: 'Ban user', tone: 'danger', reason: { label: 'Reason for the ban', required: true } });
    if (!decision) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: decision.reason }),
      });

      if (response.ok) {
        await fetchUsers();
        await fetchStats();
        setShowUserModal(false);
      } else {
        const data = await response.json();
        notify(data.message || 'Failed to ban user', 'error');
      }
    } catch (err) {
      notify('Failed to ban user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    const decision = await confirm({ title: 'Unban this user?', message: 'They can sign in and trade again.', confirmLabel: 'Unban', reason: { label: 'Note' } });
    if (!decision) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: decision.reason }),
      });

      if (response.ok) {
        await fetchUsers();
        await fetchStats();
        setShowUserModal(false);
      } else {
        const data = await response.json();
        notify(data.message || 'Failed to unban user', 'error');
      }
    } catch (err) {
      notify('Failed to unban user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'seller':
        return 'bg-[var(--accent-soft)] text-[var(--accent)]';
      case 'buyer':
        return 'bg-[var(--info-soft)] text-[var(--info)]';
      case 'admin':
        return 'bg-(--brand-soft) text-(--brand-strong)';
      default:
        return 'bg-(--surface-sunken) text-(--muted)';
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    return status === 'active' || !status
      ? 'bg-[var(--success-soft)] text-[var(--success)]'
      : 'bg-[var(--danger-soft)] text-[var(--danger)]';
  };

  const handleFilterChange = (type: 'role' | 'status', value: string) => {
    if (type === 'role') setRoleFilter(value);
    if (type === 'status') setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-(--ink) text-3xl font-bold">User Management</h1>
          <p className="text-(--muted) mt-1">Manage users, roles, and account status</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/upgrades" className="bg-(--surface) text-(--ink) border-(--input-border) hover:bg-(--surface-hover) px-4 py-2 rounded-lg font-medium flex items-center gap-2 border hover:shadow-md transition-all">
            <UserPlus size={18} />
            Upgrade Requests
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-(--surface) border-(--line) rounded-xl p-4">
            <div className="text-2xl font-bold text-(--ink)">{stats.total}</div>
            <div className="text-sm text-(--muted)">Total Users</div>
          </div>
          <div className="bg-(--surface) border-(--line) rounded-xl p-4">
            <div className="text-2xl font-bold text-[var(--info)]">{stats.byRole.buyer}</div>
            <div className="text-sm text-(--muted)">Buyers</div>
          </div>
          <div className="bg-(--surface) border-(--line) rounded-xl p-4">
            <div className="text-2xl font-bold text-[var(--accent)]">{stats.byRole.seller}</div>
            <div className="text-sm text-(--muted)">Sellers</div>
          </div>
          <div className="bg-(--surface) border-(--line) rounded-xl p-4">
            <div className="text-2xl font-bold text-[var(--danger)]">{stats.byStatus.banned}</div>
            <div className="text-sm text-(--muted)">Banned</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-(--surface) border-(--line) rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-(--input-bg) text-(--ink) border-(--input-border) w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-(--accent)"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" size={20} />
            <select
              value={roleFilter}
              aria-label="Filter by role"
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="bg-(--input-bg) text-(--ink) border-(--input-border) w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-(--accent) appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="unauthorized">Unauthorized</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" size={20} />
            <select
              value={statusFilter}
              aria-label="Filter by status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="bg-(--input-bg) text-(--ink) border-(--input-border) w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-(--accent) appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-(--surface) border-(--line) rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-(--muted)">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-(--surface-sunken)">
                <tr>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">User</th>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">Role</th>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">Verified</th>
                  <th className="text-(--muted) px-6 py-4 text-left text-sm font-semibold">Join Date</th>
                  <th className="text-(--muted) px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-(--line) divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-(--bg-hover) transition-colors">
                    <td className="text-(--muted) px-6 py-4 text-sm">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                            <User size={20} className="text-[var(--accent)]" />
                          </div>
                        )}
                        <div>
                          <div className="text-(--ink) font-medium">{user.fullName || user.username}</div>
                          <div className="text-(--muted) text-sm">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isVerified ? (
                        <CheckCircle size={20} className="text-[var(--success)]" />
                      ) : (
                        <X size={20} className="text-(--muted)" />
                      )}
                    </td>
                    <td className="text-(--muted) px-6 py-4 text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => fetchUserDetails(user.id)}
                          className="p-2 rounded-lg hover:bg-(--info-soft) transition-colors"
                          title="View Details" aria-label="View Details"
                        >
                          <Eye size={18} className="text-(--info)" />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => user.status === 'banned' ? handleUnbanUser(user.id) : handleBanUser(user.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.status === 'banned'
                                ? 'hover:bg-(--success-soft)'
                                : 'hover:bg-(--danger-soft)'
                            }`}
                            title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                          >
                            {user.status === 'banned' ? (
                              <CheckCircle size={18} className="text-(--success)" />
                            ) : (
                              <Ban size={18} className="text-(--danger)" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="notification-empty-text text-center py-12">
            No users found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-(--muted) text-sm">
            Showing {users.length} of {totalCount} users (Page {currentPage} of {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border bg-(--surface) border-(--line) hover:bg-(--bg-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg border transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-(--surface) border-(--line) hover:bg-(--bg-hover)'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border bg-(--surface) border-(--line) hover:bg-(--bg-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open={showUserModal} onClose={() => setShowUserModal(false)} title="User details" pending={actionLoading}>

              {/* User Info */}
              <div className="flex items-center gap-4 mb-6">
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                    <User size={32} className="text-[var(--accent)]" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-(--ink)">{selectedUser.fullName || selectedUser.username}</h3>
                  <p className="text-(--muted)">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedUser.status)}`}>
                      {selectedUser.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted)">User ID</div>
                    <div className="font-medium text-(--ink)">#{selectedUser.id}</div>
                  </div>
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted)">Username</div>
                    <div className="font-medium text-(--ink)">@{selectedUser.username}</div>
                  </div>
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted)">Verified</div>
                    <div className="font-medium text-(--ink)">{selectedUser.isVerified ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted)">Join Date</div>
                    <div className="font-medium text-(--ink)">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedUser.bio && (
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted) mb-1">Bio</div>
                    <div className="text-(--ink)">{selectedUser.bio}</div>
                  </div>
                )}

                {userStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-(--surface-sunken) rounded-lg p-3">
                      <div className="text-sm text-(--muted)">Total Bids</div>
                      <div className="text-xl font-bold text-[var(--info)]">{userStats.totalBids}</div>
                    </div>
                    <div className="bg-(--surface-sunken) rounded-lg p-3">
                      <div className="text-sm text-(--muted)">Total Auctions</div>
                      <div className="text-xl font-bold text-[var(--accent)]">{userStats.totalAuctions}</div>
                    </div>
                  </div>
                )}

                {(selectedUser.ratingCount ?? 0) > 0 && (
                  <div className="bg-(--surface-sunken) rounded-lg p-3">
                    <div className="text-sm text-(--muted) mb-1">Rating</div>
                    <div className="font-medium text-(--ink)">
                      {selectedUser.positiveRatingCount}/{selectedUser.ratingCount} positive reviews
                      ({Math.round(((selectedUser.positiveRatingCount ?? 0) / (selectedUser.ratingCount ?? 1)) * 100)}%)
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedUser.role !== 'admin' && (
                <div className="flex gap-3">
                  {selectedUser.status === 'banned' ? (
                    <button
                      onClick={() => handleUnbanUser(selectedUser.id)}
                      disabled={actionLoading}
                      className="flex-1 py-3 rounded-lg bg-[var(--success)] text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Unban User
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBanUser(selectedUser.id)}
                      disabled={actionLoading}
                      className="flex-1 py-3 rounded-lg bg-[var(--danger)] text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Ban size={18} />
                          Ban User
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button variant="secondary" onClick={() => setShowUserModal(false)} disabled={actionLoading}>Close</Button>
              </div>
        </Dialog>
      )}
    </div>
  );
}
