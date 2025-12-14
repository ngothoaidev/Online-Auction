import { useState } from "react";
import { Search, Eye, Edit2, Ban, CheckCircle, UserPlus, Filter } from "lucide-react";

export default function UserList({ setActiveTab }) {
  const [users, setUsers] = useState([
    { 
      id: 1, 
      name: "John Doe", 
      email: "john@example.com",
      role: "seller",
      status: "active",
      joinDate: "2024-01-15",
      totalBids: 45,
      totalSales: 12
    },
    { 
      id: 2, 
      name: "Jane Smith", 
      email: "jane@example.com",
      role: "bidder",
      status: "active",
      joinDate: "2024-03-20",
      totalBids: 23,
      totalSales: 0
    },
    { 
      id: 3, 
      name: "Mike Johnson", 
      email: "mike@example.com",
      role: "seller",
      status: "suspended",
      joinDate: "2023-12-10",
      totalBids: 67,
      totalSales: 34
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleStatusToggle = (id) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'suspended' : 'active' }
        : user
    ));
  };

  const getRoleBadge = (role) => {
    return role === 'seller' 
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'bg-[var(--info-soft)] text-[var(--info)]';
  };

  const getStatusBadge = (status) => {
    return status === 'active'
      ? 'bg-[var(--success-soft)] text-[var(--success)]'
      : 'bg-[var(--danger-soft)] text-[var(--danger)]';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="profile-name text-3xl font-bold">User Management</h1>
          <p className="profile-text-muted mt-1">Manage users, roles, and account upgrades</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('upgrades')} className="profile-btn-secondary px-4 py-2 rounded-lg font-medium flex items-center gap-2 border hover:shadow-md transition-all">
            <UserPlus size={18}  />
            Upgrade Requests
            <span className="bg-[var(--danger)] text-white px-2 py-0.5 rounded-full text-xs font-bold">3</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="profile-card rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="bidder">Bidder</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="profile-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="profile-subtle-box">
              <tr>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">ID</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">User</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Role</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Join Date</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Activity</th>
                <th className="profile-label px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="profile-divider divide-y">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="profile-text-muted px-6 py-4 text-sm">#{user.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="profile-name font-medium">{user.name}</div>
                      <div className="profile-text-muted text-sm">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="profile-text-muted px-6 py-4 text-sm">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="profile-text-muted">Bids: <span className="profile-name font-medium">{user.totalBids}</span></div>
                      {user.role === 'seller' && (
                        <div className="profile-text-muted">Sales: <span className="profile-name font-medium">{user.totalSales}</span></div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-[var(--info-soft)] transition-colors">
                        <Eye size={18} className="text-[var(--info)]" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors">
                        <Edit2 size={18} className="profile-icon-accent" />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.status === 'active'
                            ? 'hover:bg-[var(--danger-soft)]'
                            : 'hover:bg-[var(--success-soft)]'
                        }`}
                      >
                        {user.status === 'active' ? (
                          <Ban size={18} className="text-[var(--danger)]" />
                        ) : (
                          <CheckCircle size={18} className="text-[var(--success)]" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="notification-empty-text text-center py-12">
            No users found
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 profile-text-muted text-sm flex items-center justify-between">
        <span>Showing {filteredUsers.length} of {users.length} users</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--info)]"></div>
            Bidders: {users.filter(u => u.role === 'bidder').length}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
            Sellers: {users.filter(u => u.role === 'seller').length}
          </span>
        </div>
      </div>
    </div>
  );
}
