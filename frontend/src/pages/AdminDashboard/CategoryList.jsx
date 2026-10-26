import { useFeedback } from '../../components/ui/Feedback.jsx';
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Package, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import { categorySchema } from '../../schemas/admin.schemas';
import { validateForm } from '../../utils/validation';
import { Dialog } from '../../components/ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CategoryList() {
  const { confirm, notify } = useFeedback();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/categories/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Toggle category expansion
  const toggleExpand = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Handle add category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setModalError('');
    
    // Zod Validation
    const validation = validateForm(categorySchema, {
      name: newCategoryName,
      description: newCategoryDescription || undefined,
    });
    
    if (!validation.success) {
      setModalError(validation.message);
      return;
    }
    
    setModalLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create category');
      }

      setShowAddModal(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchCategories();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle add subcategory
  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    setModalError('');
    
    // Zod Validation
    const validation = validateForm(categorySchema, {
      name: newCategoryName,
      description: newCategoryDescription || undefined,
    });
    
    if (!validation.success) {
      setModalError(validation.message);
      return;
    }
    
    setModalLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          parentId: selectedParentCategory.id,
          description: newCategoryDescription || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subcategory');
      }

      setShowAddSubModal(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setSelectedParentCategory(null);
      // Expand the parent category to show the new subcategory
      setExpandedCategories(prev => ({ ...prev, [selectedParentCategory.id]: true }));
      fetchCategories();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Handle delete category/subcategory
  const handleDelete = async (categoryId, isSubcategory = false) => {
    const confirmMsg = isSubcategory 
      ? 'Are you sure you want to delete this subcategory?' 
      : 'Are you sure you want to delete this category and all its subcategories?';
    
    if (!(await confirm({ title: 'Delete category?', message: confirmMsg, confirmLabel: 'Delete', tone: 'danger' }))) return;

    setActionLoading(categoryId);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete category');
      }

      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setActionLoading(null);
    }
  };

  // Check if a main category can be deleted
  const canDeleteCategory = (category) => {
    if (category.productCount > 0) return false;
    if (category.subcategories && category.subcategories.length > 0) {
      return category.subcategories.every(sub => sub.productCount === 0);
    }
    return true;
  };

  // Pagination
  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const paginatedCategories = categories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle rename category
  const handleRenameCategory = () => {
    notify('Renaming categories is not available yet.');
  };

  // Count total subcategories
  const totalSubcategories = categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);

  return (
    <div className="p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Category Management</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
            {categories.length} categories, {totalSubcategories} subcategories
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-all" 
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Categories Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-soft)', borderWidth: '1px', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading categories...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Subcategories</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--text)' }}>Products</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: 'var(--text)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {paginatedCategories.map((category) => (
                  <>
                    {/* Main Category Row */}
                    <tr key={category.id} className="hover:opacity-90 transition-colors" style={{ backgroundColor: 'var(--bg-soft)' }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {category.subcategories && category.subcategories.length > 0 ? (
                            <button 
                              aria-label={`Show or hide subcategories of ${category.name}`}
                              onClick={() => toggleExpand(category.id)}
                              className="p-1 rounded hover:bg-opacity-80 transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {expandedCategories[category.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                          ) : (
                            <div className="w-7"></div>
                          )}
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <Package size={20} />
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text)' }}>{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {category.subcategories?.length || 0} subcategories
                      </td>
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
                          <button 
                            onClick={() => {
                              setSelectedParentCategory(category);
                              setShowAddSubModal(true);
                            }}
                            className="p-2 rounded-lg hover:opacity-80 transition-colors" 
                            style={{ backgroundColor: 'var(--success-soft)' }}
                            title="Add Subcategory" aria-label="Add Subcategory"
                          >
                            <FolderPlus size={18} style={{ color: 'var(--success)' }} />
                          </button>
                          <button 
                            className="p-2 rounded-lg hover:opacity-80 transition-colors" 
                            style={{ backgroundColor: 'var(--accent-soft)' }}
                            title="Edit Category" aria-label="Edit Category"
                            onClick={() => handleRenameCategory()}
                          >
                            <Edit2 size={18} style={{ color: 'var(--accent)' }} />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, false)}
                            disabled={!canDeleteCategory(category) || actionLoading === category.id}
                            className={`p-2 rounded-lg transition-colors ${
                              !canDeleteCategory(category)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:opacity-80'
                            }`}
                            style={{ 
                              backgroundColor: canDeleteCategory(category) ? 'var(--danger-soft)' : 'transparent'
                            }}
                            title={!canDeleteCategory(category) ? 'Cannot delete: has products' : 'Delete Category'}
                          >
                            {actionLoading === category.id ? (
                              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--danger)', borderTopColor: 'transparent' }} />
                            ) : (
                              <Trash2 
                                size={18} 
                                style={{ color: canDeleteCategory(category) ? 'var(--danger)' : 'var(--muted)' }}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Subcategories Rows */}
                    {expandedCategories[category.id] && category.subcategories?.map((subcategory) => (
                      <tr key={`sub-${subcategory.id}`} className="transition-colors" style={{ backgroundColor: 'var(--bg)' }}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3 pl-14">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                              <Package size={16} />
                            </div>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{subcategory.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-subtle)' }}>—</td>
                        <td className="px-6 py-3">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: subcategory.productCount > 0 ? 'var(--info-soft)' : 'var(--bg-subtle)',
                              color: subcategory.productCount > 0 ? 'var(--info)' : 'var(--text-muted)'
                            }}
                          >
                            {subcategory.productCount} products
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-2 rounded-lg hover:opacity-80 transition-colors" 
                              style={{ backgroundColor: 'var(--accent-soft)' }}
                              title="Edit Subcategory" aria-label="Edit Subcategory"
                            >
                              <Edit2 size={16} style={{ color: 'var(--accent)' }} />
                            </button>
                            <button
                              onClick={() => handleDelete(subcategory.id, true)}
                              disabled={subcategory.productCount > 0 || actionLoading === subcategory.id}
                              className={`p-2 rounded-lg transition-colors ${
                                subcategory.productCount > 0
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:opacity-80'
                              }`}
                              style={{ 
                                backgroundColor: subcategory.productCount === 0 ? 'var(--danger-soft)' : 'transparent'
                              }}
                              title={subcategory.productCount > 0 ? 'Cannot delete: has products' : 'Delete Subcategory'}
                            >
                              {actionLoading === subcategory.id ? (
                                <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--danger)', borderTopColor: 'transparent' }} />
                              ) : (
                                <Trash2 
                                  size={16} 
                                  style={{ color: subcategory.productCount === 0 ? 'var(--danger)' : 'var(--muted)' }}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            No categories found. Click "Add Category" to create one.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: currentPage === page ? 'var(--accent)' : 'var(--bg-soft)', 
                  color: currentPage === page ? 'white' : 'var(--text)',
                  border: '1px solid var(--border)'
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      <Dialog open={showAddModal} onClose={() => { setShowAddModal(false); setModalError(''); setNewCategoryName(''); setNewCategoryDescription(''); }} title="Add new category" pending={modalLoading}>

            {modalError && (
              <div role="alert" className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label htmlFor="new-category-name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Category Name *</label>
                <input
                  id="new-category-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  placeholder="e.g., Electronics"
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    border: '1px solid var(--input-border)', 
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description (Optional)</label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Brief description of the category..."
                  aria-label="Description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 resize-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    border: '1px solid var(--input-border)', 
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setModalError(''); setNewCategoryName(''); setNewCategoryDescription(''); }}
                  className="flex-1 py-3 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !newCategoryName.trim()}
                  className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {modalLoading ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
      </Dialog>

      {/* Add Subcategory Modal */}
      <Dialog open={showAddSubModal && Boolean(selectedParentCategory)} onClose={() => { setShowAddSubModal(false); setModalError(''); setNewCategoryName(''); setNewCategoryDescription(''); setSelectedParentCategory(null); }} title="Add subcategory" description={`Under: ${selectedParentCategory?.name ?? ''}`} pending={modalLoading}>

            {modalError && (
              <div role="alert" className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <div>
                <label htmlFor="new-subcategory-name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Subcategory Name *</label>
                <input
                  id="new-subcategory-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                  placeholder="e.g., Smartphones"
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    border: '1px solid var(--input-border)', 
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description (Optional)</label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Brief description of the subcategory..."
                  aria-label="Description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 resize-none"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    border: '1px solid var(--input-border)', 
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddSubModal(false); setModalError(''); setNewCategoryName(''); setNewCategoryDescription(''); setSelectedParentCategory(null); }}
                  className="flex-1 py-3 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !newCategoryName.trim()}
                  className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {modalLoading ? 'Creating...' : 'Create Subcategory'}
                </button>
              </div>
            </form>
      </Dialog>
    </div>
  );
}
