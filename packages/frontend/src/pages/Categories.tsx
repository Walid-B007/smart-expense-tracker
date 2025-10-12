import { useEffect, useState } from 'react';
import { categories } from '../lib/api';
import { Card, Button, Modal, ModalFooter, Input, Select } from '../components/ui';
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

export default function Categories() {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_type: 'expense',
    parent_id: '',
    icon: '📁',
    color: '#3b82f6',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categories.getAll();
      setCategoriesList(response.data.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categories.create(formData);
      setIsCreateModalOpen(false);
      resetForm();
      await loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category');
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      category_type: category.category_type || 'expense',
      parent_id: category.parent_id || '',
      icon: category.icon || '📁',
      color: category.color || '#3b82f6',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await categories.update(editingCategory.id, formData);
      setIsEditModalOpen(false);
      setEditingCategory(null);
      resetForm();
      await loadCategories();
    } catch (error: any) {
      console.error('Failed to update category:', error);
      alert(error.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDelete = async (category: any) => {
    if (category.is_system) {
      alert('System categories cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await categories.delete(category.id);
      await loadCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_type: 'expense',
      parent_id: '',
      icon: '📁',
      color: '#3b82f6',
    });
  };

  const getParentCategories = () => {
    return categoriesList.filter(cat => !cat.parent_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const parentCategories = categoriesList.filter(cat => !cat.parent_id);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Categories
          </h1>
          <p className="text-gray-600 mt-1">Organize your transactions with custom categories</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {parentCategories.map((parent, index) => {
          const children = categoriesList.filter(cat => cat.parent_id === parent.id);

          return (
            <Card
              key={parent.id}
              hover
              padding="lg"
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Parent Category Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md"
                    style={{ backgroundColor: parent.color || '#3b82f6' }}
                  >
                    {parent.icon || '📁'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{parent.name}</h3>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {parent.category_type}
                      {parent.is_system && ' • System'}
                    </span>
                  </div>
                </div>
                {!parent.is_system && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parent)}
                      className="hover:bg-primary-50"
                    >
                      <PencilIcon className="h-4 w-4 text-primary-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(parent)}
                      className="hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Subcategories */}
              {children.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Subcategories ({children.length})
                  </p>
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{child.icon || '📄'}</span>
                        <span className="text-sm font-medium text-gray-700">{child.name}</span>
                        {child.is_system && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            System
                          </span>
                        )}
                      </div>
                      {!child.is_system && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(child)}
                            className="hover:bg-primary-50"
                          >
                            <PencilIcon className="h-3 w-3 text-primary-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(child)}
                            className="hover:bg-red-50"
                          >
                            <TrashIcon className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Category"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Category Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Entertainment"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
              value={formData.category_type}
              onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
            />

            <Select
              label="Parent Category (Optional)"
              options={[
                { value: '', label: 'None (Top Level)' },
                ...getParentCategories().map(cat => ({
                  value: cat.id,
                  label: cat.name
                }))
              ]}
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (Emoji)"
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="📁"
              maxLength={2}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Category
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
          resetForm();
        }}
        title="Edit Category"
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Category Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Entertainment"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (Emoji)"
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="📁"
              maxLength={2}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCategory(null);
                resetForm();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
