import { useState } from "react";
import { Plus, Edit2, Trash2, Search, Package } from "lucide-react";

export default function CategoryList() {
  const [categories, setCategories] = useState([
    { id: 1, name: "Electronics", subcategories: 5, productCount: 124 },
    { id: 2, name: "Fashion", subcategories: 8, productCount: 89 },
    { id: 3, name: "Home & Garden", subcategories: 6, productCount: 56 },
    { id: 4, name: "Sports", subcategories: 4, productCount: 0 },
  ]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id, productCount) => {
    if (productCount > 0) {
      alert("Cannot delete category with existing products");
      return;
    }
    if (confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="profile-name text-3xl font-bold">Category Management</h1>
          <p className="profile-text-muted mt-1">Manage product categories and subcategories</p>
        </div>
        <button className="profile-btn-primary px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-all">
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="profile-card rounded-xl p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="profile-input w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="profile-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="profile-subtle-box">
              <tr>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">ID</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Category Name</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Subcategories</th>
                <th className="profile-label px-6 py-4 text-left text-sm font-semibold">Products</th>
                <th className="profile-label px-6 py-4 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="profile-divider divide-y">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="profile-text-muted px-6 py-4 text-sm">{category.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="profile-icon-accent w-10 h-10 rounded-lg flex items-center justify-center">
                        <Package size={20} />
                      </div>
                      <span className="profile-name font-medium">{category.name}</span>
                    </div>
                  </td>
                  <td className="profile-text-muted px-6 py-4 text-sm">{category.subcategories}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      category.productCount > 0 
                        ? 'bg-[var(--info-soft)] text-[var(--info)]' 
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}>
                      {category.productCount} products
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors group">
                        <Edit2 size={18} className="profile-icon-accent" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.productCount)}
                        disabled={category.productCount > 0}
                        className={`p-2 rounded-lg transition-colors ${
                          category.productCount > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[var(--danger-soft)] group'
                        }`}
                      >
                        <Trash2 
                          size={18} 
                          className={category.productCount > 0 ? 'text-gray-400' : 'text-[var(--danger)]'}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCategories.length === 0 && (
          <div className="notification-empty-text text-center py-12">
            No categories found
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 profile-text-muted text-sm">
        Showing {filteredCategories.length} of {categories.length} categories
      </div>
    </div>
  );
}
