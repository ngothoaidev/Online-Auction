import { useState } from "react";
import { Search, Eye, Trash2, Filter, Download } from "lucide-react";

export default function ProductList() {
  const [products, setProducts] = useState([
    { 
      id: 1, 
      title: "Vintage Camera", 
      category: "Electronics", 
      seller: "John Doe",
      status: "active",
      endTime: "2025-12-20T10:00:00",
      currentBid: 250
    },
    { 
      id: 2, 
      title: "Designer Watch", 
      category: "Fashion", 
      seller: "Jane Smith",
      status: "active",
      endTime: "2025-12-18T15:30:00",
      currentBid: 500
    },
    { 
      id: 3, 
      title: "Gaming Laptop", 
      category: "Electronics", 
      seller: "Tech Store",
      status: "ended",
      endTime: "2025-12-10T12:00:00",
      currentBid: 1200
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.seller.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleRemove = (id, title) => {
    if (confirm(`Are you sure you want to remove "${title}"? This action cannot be undone.`)) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-[var(--success-soft)] text-[var(--success)]',
      ended: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
      cancelled: 'bg-[var(--danger-soft)] text-[var(--danger)]'
    };
    return styles[status] || styles.active;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="profile-name text-3xl font-bold">Product Management</h1>
          <p className="profile-text-muted mt-1">Monitor and manage all auction products</p>
        </div>
        <button className="profile-btn-secondary px-4 py-2 rounded-lg font-medium flex items-center gap-2 border hover:shadow-md transition-all">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="profile-card rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by product name or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)] appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Home">Home</option>
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
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="profile-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="profile-subtle-box">
              <tr>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">ID</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Product</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Category</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Seller</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Status</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Current Bid</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">End Time</th>
                <th className="profile-label px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="profile-divider divide-y">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="profile-text-muted px-6 py-4 text-sm">#{product.id}</td>
                  <td className="px-6 py-4">
                    <span className="profile-name font-medium">{product.title}</span>
                  </td>
                  <td className="profile-text-muted px-6 py-4 text-sm">{product.category}</td>
                  <td className="profile-text-muted px-6 py-4 text-sm">{product.seller}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="profile-name font-semibold">${product.currentBid}</span>
                  </td>
                  <td className="profile-text-muted px-6 py-4 text-sm">
                    {new Date(product.endTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-[var(--info-soft)] transition-colors">
                        <Eye size={18} className="text-[var(--info)]" />
                      </button>
                      <button
                        onClick={() => handleRemove(product.id, product.title)}
                        className="p-2 rounded-lg hover:bg-[var(--danger-soft)] transition-colors"
                      >
                        <Trash2 size={18} className="text-[var(--danger)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="notification-empty-text text-center py-12">
            No products found
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 profile-text-muted text-sm flex items-center justify-between">
        <span>Showing {filteredProducts.length} of {products.length} products</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[var(--success)]"></div>
            Active: {products.filter(p => p.status === 'active').length}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            Ended: {products.filter(p => p.status === 'ended').length}
          </span>
        </div>
      </div>
    </div>
  );
}
