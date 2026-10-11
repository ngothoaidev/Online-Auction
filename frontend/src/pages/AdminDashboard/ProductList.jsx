import { useState, useEffect, useRef } from "react";
import { Eye, Trash2, Download, Filter, ChevronDown } from "lucide-react";
import Pagination from "../../components/Pagination";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;
  // Filters
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [orderBy, setOrderBy] = useState("default");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [categories, setCategories] = useState([]);
  const barRef = useRef(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        
        if (selectedCategory) {
          params.set("category", selectedCategory);
        }
        if (priceRange.min) {
          params.set("minPrice", priceRange.min);
        }
        if (priceRange.max) {
          params.set("maxPrice", priceRange.max);
        }
        if (orderBy && orderBy !== "default") {
          params.set("sortBy", orderBy);
        }
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        
        const response = await fetch(`${API_URL}/search?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const responseData = await response.json();
        
        setProducts(responseData.data || []);
        setTotalPages(responseData.metadata?.totalPages || 1);
        setTotalItems(responseData.metadata?.totalItems || 0);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, selectedCategory, priceRange, orderBy, statusFilter]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRemove = async (id, title) => {
    if (!confirm(`Are you sure you want to remove "${title}"? This action cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/auction/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete product');
      
      // Refresh the list
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setPriceRange({ min: "", max: "" });
    setOrderBy("default");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-[var(--success-soft)] text-[var(--success)]',
      ended: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
      sold: 'bg-[var(--info-soft)] text-[var(--info)]',
      cancelled: 'bg-[var(--danger-soft)] text-[var(--danger)]'
    };
    return styles[status] || styles.active;
  };

  const hasActiveFilters = selectedCategory || priceRange.min || priceRange.max || orderBy !== "default" || statusFilter !== "all";

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

      {/* Filter Bar */}
      <div ref={barRef} className="mb-6">
        <div className="profile-card rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2 profile-text-muted">
              <Filter size={18} />
              <span className="text-sm font-semibold uppercase tracking-wide">Filter</span>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('category')}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all profile-card border"
                style={{ minWidth: '160px' }}
              >
                <span className="profile-name">{selectedCategory || 'All Categories'}</span>
                <ChevronDown size={16} className={`profile-text-muted transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeDropdown === 'category' && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl z-50 profile-card border max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => { setSelectedCategory(null); setActiveDropdown(null); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'profile-text-muted hover:bg-[var(--bg-hover)]'}`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <div key={cat.id}>
                        <div className="px-3 py-2 text-xs font-semibold profile-text-muted uppercase tracking-wide mt-2">
                          {cat.name}
                        </div>
                        {cat.subcategories?.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => { setSelectedCategory(sub.name); setActiveDropdown(null); setCurrentPage(1); }}
                            className={`w-full text-left px-3 py-2 pl-6 rounded-lg text-sm transition-colors ${selectedCategory === sub.name ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'profile-name hover:bg-[var(--bg-hover)]'}`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('price')}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all profile-card border"
                style={{ minWidth: '120px' }}
              >
                <span className="profile-name">
                  {priceRange.min || priceRange.max 
                    ? `$${priceRange.min || '0'} - $${priceRange.max || '∞'}` 
                    : 'Price Range'}
                </span>
                <ChevronDown size={16} className={`profile-text-muted transition-transform ${activeDropdown === 'price' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeDropdown === 'price' && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl z-50 profile-card border p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium profile-text-muted mb-1">Min Price</label>
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg text-sm profile-input border"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium profile-text-muted mb-1">Max Price</label>
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        placeholder="No limit"
                        className="w-full px-3 py-2 rounded-lg text-sm profile-input border"
                      />
                    </div>
                    <button
                      onClick={() => { setActiveDropdown(null); setCurrentPage(1); }}
                      className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('status')}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all profile-card border"
                style={{ minWidth: '120px' }}
              >
                <span className="profile-name capitalize">{statusFilter === 'all' ? 'All Status' : statusFilter}</span>
                <ChevronDown size={16} className={`profile-text-muted transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeDropdown === 'status' && (
                <div className="absolute top-full left-0 mt-2 w-40 rounded-xl shadow-xl z-50 profile-card border p-2">
                  {['all', 'active', 'ended', 'sold', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setActiveDropdown(null); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-colors ${statusFilter === status ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'profile-name hover:bg-[var(--bg-hover)]'}`}
                    >
                      {status === 'all' ? 'All Status' : status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Selection */}
            <div className="relative ml-auto">
              <button
                onClick={() => toggleDropdown('sort')}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all profile-card border"
                style={{ minWidth: '150px' }}
              >
                <span className="profile-name">
                  {orderBy === 'default' && 'Sort By'}
                  {orderBy === 'price-asc' && 'Price: Low to High'}
                  {orderBy === 'price-desc' && 'Price: High to Low'}
                  {orderBy === 'ending-soon' && 'Ending Soon'}
                  {orderBy === 'newest' && 'Newest First'}
                </span>
                <ChevronDown size={16} className={`profile-text-muted transition-transform ${activeDropdown === 'sort' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeDropdown === 'sort' && (
                <div className="absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl z-50 profile-card border p-2">
                  {[
                    { value: 'default', label: 'Default' },
                    { value: 'price-asc', label: 'Price: Low to High' },
                    { value: 'price-desc', label: 'Price: High to Low' },
                    { value: 'ending-soon', label: 'Ending Soon' },
                    { value: 'newest', label: 'Newest First' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => { setOrderBy(option.value); setActiveDropdown(null); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${orderBy === option.value ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'profile-name hover:bg-[var(--bg-hover)]'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
              <span className="text-xs font-medium profile-text-muted">Active filters:</span>
              
              {selectedCategory && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] flex items-center gap-1">
                  {selectedCategory}
                  <button onClick={() => { setSelectedCategory(null); setCurrentPage(1); }} className="ml-1 hover:opacity-70">×</button>
                </span>
              )}
              
              {(priceRange.min || priceRange.max) && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] flex items-center gap-1">
                  ${priceRange.min || '0'} - ${priceRange.max || '∞'}
                  <button onClick={() => { setPriceRange({ min: "", max: "" }); setCurrentPage(1); }} className="ml-1 hover:opacity-70">×</button>
                </span>
              )}
              
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] flex items-center gap-1 capitalize">
                  {statusFilter}
                  <button onClick={() => { setStatusFilter('all'); setCurrentPage(1); }} className="ml-1 hover:opacity-70">×</button>
                </span>
              )}
              
              {orderBy !== 'default' && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] flex items-center gap-1">
                  Sorted
                  <button onClick={() => { setOrderBy('default'); setCurrentPage(1); }} className="ml-1 hover:opacity-70">×</button>
                </span>
              )}
              
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-[var(--danger)] hover:underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="profile-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="profile-text-muted">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-[var(--danger)]">
            Error: {error}
          </div>
        ) : (
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="profile-text-muted px-6 py-4 text-sm">#{product.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.primaryImage && (
                          <img 
                            src={product.primaryImage} 
                            alt={product.title} 
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <span className="profile-name font-medium">{product.title}</span>
                      </div>
                    </td>
                    <td className="profile-text-muted px-6 py-4 text-sm">{product.categoryName || 'N/A'}</td>
                    <td className="profile-text-muted px-6 py-4 text-sm">{product.sellerName || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="profile-name font-semibold">${parseFloat(product.currentPrice || product.startingPrice || 0).toLocaleString()}</span>
                    </td>
                    <td className="profile-text-muted px-6 py-4 text-sm">
                      {product.endTime ? new Date(product.endTime).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => window.open(`/auction/${product.id}`, '_blank')}
                          className="p-2 rounded-lg hover:bg-[var(--info-soft)] transition-colors"
                        >
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
        )}

        {!loading && !error && products.length === 0 && (
          <div className="notification-empty-text text-center py-12">
            No products found
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          
        />
      )}

      {/* Summary */}
      <div className="mt-4 profile-text-muted text-sm flex items-center justify-between">
        <span>
          {loading ? 'Loading...' : `Showing ${products.length} of ${totalItems} products`}
        </span>
        {!loading && (
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--success)]"></div>
              Active: {products.filter(p => p.status === 'active').length}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              Ended: {products.filter(p => p.status === 'ended').length}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--info)]"></div>
              Sold: {products.filter(p => p.status === 'sold').length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
