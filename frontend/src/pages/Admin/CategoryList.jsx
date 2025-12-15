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
    <div className="p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Category Management</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Manage product categories and subcategories</p>
        </div>
        <button className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-all" style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}>
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--bg-soft)', borderWidth: '1px', borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={20} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: 'var(--bg-soft)', 
              borderWidth: '1px',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-soft)', borderWidth: '1px', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Category Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Subcategories</th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Products</th>
                <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--text)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:opacity-90 transition-colors" style={{ backgroundColor: 'var(--bg-soft)' }}>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{category.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Package size={20} />
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{category.subcategories}</td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: category.productCount > 0 ? 'var(--info-soft)' : 'var(--bg-subtle)',
                        color: category.productCount > 0 ? 'var(--info)' : 'var(--text-muted)'
                      }}
                    >
                      {category.productCount} products
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:opacity-80 transition-colors" style={{ backgroundColor: 'var(--accent-soft)' }}>
                        <Edit2 size={18} style={{ color: 'var(--accent)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.productCount)}
                        disabled={category.productCount > 0}
                        className={`p-2 rounded-lg transition-colors ${
                          category.productCount > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:opacity-80'
                        }`}
                        style={{ 
                          backgroundColor: category.productCount > 0 ? 'transparent' : 'var(--danger-soft)'
                        }}
                      >
                        <Trash2 
                          size={18} 
                          style={{ color: category.productCount > 0 ? '#9ca3af' : 'var(--danger)' }}
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
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            No categories found
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing {filteredCategories.length} of {categories.length} categories
      </div>
    </div>
  );
}
