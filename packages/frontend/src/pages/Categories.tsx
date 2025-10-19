import { useEffect, useState, useMemo } from 'react';
import { categories, transactions } from '../lib/api';
import { Card, Button, Modal, ModalFooter, Input, Select } from '../components/ui';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Color palette suggestions
const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DFE6E9', '#74B9FF', '#A29BFE', '#FD79A8', '#FAB1A0',
  '#E17055', '#00B894', '#00CEC9', '#6C5CE7', '#FF7675',
  '#FDCB6E', '#E84393', '#0984E3', '#00D2D3', '#55EFC4',
];

// Common category icons
const ICON_SUGGESTIONS = [
  '🍔', '🚗', '🛍️', '🎬', '💡', '🏥', '✈️', '📚',
  '💅', '🏠', '🛡️', '📱', '🎁', '📄', '💰', '💼',
  '📈', '🎉', '🔄', '🍽️', '🛒', '☕', '🍕', '⛽',
  '🚇', '🅿️', '🚕', '⚡', '💧', '🌐', '📞', '💊',
  '👨‍⚕️', '🦷', '👓', '🧘', '🏨', '🎫', '🪑', '🧹',
  '💇', '🧴', '🏋️', '💆', '📺', '📰', '☁️', '🎵',
  '🐾', '🥫', '🧸', '🍼', '👶', '🎓', '📄', '🤝',
];

export default function Categories() {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [mergingCategory, setMergingCategory] = useState<any>(null);
  const [targetMergeCategory, setTargetMergeCategory] = useState<string>('');
  const [categoryUsage, setCategoryUsage] = useState<Map<string, number>>(new Map());

  // View and filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [showSystemCategories, setShowSystemCategories] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'type'>('name');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    category_type: 'expense',
    parent_id: '',
    icon: '📁',
    color: '#3b82f6',
  });

  useEffect(() => {
    loadCategories();
    loadCategoryUsage();
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

  const loadCategoryUsage = async () => {
    try {
      // Get all transactions to count usage
      const response = await transactions.getAll({ limit: 10000 });
      const txList = response.data.transactions || [];

      const usageMap = new Map<string, number>();
      txList.forEach((tx: any) => {
        if (tx.category_id) {
          usageMap.set(tx.category_id, (usageMap.get(tx.category_id) || 0) + 1);
        }
      });

      setCategoryUsage(usageMap);
    } catch (error) {
      console.error('Failed to load category usage:', error);
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

    // Check if category has transactions
    const usage = categoryUsage.get(category.id) || 0;
    if (usage > 0) {
      setDeletingCategory(category);
      setIsDeleteModalOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await categories.delete(category.id);
      await loadCategories();
      await loadCategoryUsage();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDeleteWithReassignment = async (reassignToCategoryId: string) => {
    try {
      // Get all transactions with this category
      const response = await transactions.getAll({ limit: 10000 });
      const txList = response.data.transactions || [];
      const txToUpdate = txList.filter((tx: any) => tx.category_id === deletingCategory.id);

      // Reassign all transactions
      for (const tx of txToUpdate) {
        await transactions.update(tx.id, {
          category_id: reassignToCategoryId || null
        });
      }

      // Delete the category
      await categories.delete(deletingCategory.id);
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      await loadCategories();
      await loadCategoryUsage();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDuplicate = async (category: any) => {
    try {
      const newCategory = {
        name: `${category.name} (Copy)`,
        category_type: category.category_type,
        parent_id: category.parent_id,
        icon: category.icon,
        color: category.color,
      };
      await categories.create(newCategory);
      await loadCategories();
    } catch (error) {
      console.error('Failed to duplicate category:', error);
      alert('Failed to duplicate category');
    }
  };

  const handleMerge = async () => {
    if (!targetMergeCategory) {
      alert('Please select a target category');
      return;
    }

    try {
      // Get all transactions with the source category
      const response = await transactions.getAll({ limit: 10000 });
      const txList = response.data.transactions || [];
      const txToUpdate = txList.filter((tx: any) => tx.category_id === mergingCategory.id);

      // Update all transactions to new category
      for (const tx of txToUpdate) {
        await transactions.update(tx.id, {
          category_id: targetMergeCategory
        });
      }

      // Delete the source category
      await categories.delete(mergingCategory.id);
      setIsMergeModalOpen(false);
      setMergingCategory(null);
      setTargetMergeCategory('');
      await loadCategories();
      await loadCategoryUsage();
    } catch (error: any) {
      console.error('Failed to merge categories:', error);
      alert(error.response?.data?.error || 'Failed to merge categories');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) return;

    const systemCats = selectedCategories.filter(id =>
      categoriesList.find(c => c.id === id)?.is_system
    );

    if (systemCats.length > 0) {
      alert('Cannot delete system categories');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCategories.length} categories?`)) {
      return;
    }

    try {
      for (const catId of selectedCategories) {
        await categories.delete(catId);
      }
      setSelectedCategories([]);
      await loadCategories();
      await loadCategoryUsage();
    } catch (error: any) {
      console.error('Failed to bulk delete:', error);
      alert(error.response?.data?.error || 'Failed to delete some categories');
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

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let filtered = categoriesList.filter(cat => {
      // Search filter
      if (searchQuery && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && cat.category_type !== filterType) {
        return false;
      }

      // System categories filter
      if (!showSystemCategories && cat.is_system) {
        return false;
      }

      return true;
    });

    // Sort categories
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'usage') {
        const usageA = categoryUsage.get(a.id) || 0;
        const usageB = categoryUsage.get(b.id) || 0;
        return usageB - usageA; // Descending
      } else if (sortBy === 'type') {
        return a.category_type.localeCompare(b.category_type);
      }
      return 0;
    });

    return filtered;
  }, [categoriesList, searchQuery, filterType, showSystemCategories, sortBy, categoryUsage]);

  const parentCategories = filteredCategories.filter(cat => !cat.parent_id);

  // Get category statistics
  const stats = useMemo(() => {
    const total = categoriesList.length;
    const expense = categoriesList.filter(c => c.category_type === 'expense').length;
    const income = categoriesList.filter(c => c.category_type === 'income').length;
    const system = categoriesList.filter(c => c.is_system).length;
    const custom = total - system;
    return { total, expense, income, system, custom };
  }, [categoriesList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Categories
          </h1>
          <p className="text-gray-600 mt-1">Organize and manage your transaction categories</p>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.expense}</div>
          <div className="text-sm text-gray-600">Expense</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.income}</div>
          <div className="text-sm text-gray-600">Income</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.system}</div>
          <div className="text-sm text-gray-600">System</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.custom}</div>
          <div className="text-sm text-gray-600">Custom</div>
        </Card>
      </div>

      {/* Search, Filter, and View Controls */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setViewMode('grid')}
                className={viewMode !== 'grid' ? 'border border-gray-300' : ''}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setViewMode('list')}
                className={viewMode !== 'list' ? 'border border-gray-300' : ''}
              >
                <ListBulletIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Type Filter */}
            <Select
              label="Type"
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            />

            {/* Sort By */}
            <Select
              label="Sort By"
              options={[
                { value: 'name', label: 'Name' },
                { value: 'usage', label: 'Usage Count' },
                { value: 'type', label: 'Type' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            />

            {/* Show System Categories Toggle */}
            <div className="flex items-end">
              <Button
                variant={showSystemCategories ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setShowSystemCategories(!showSystemCategories)}
                className={`w-full ${!showSystemCategories ? 'border border-gray-300' : ''}`}
              >
                {showSystemCategories ? <EyeIcon className="h-5 w-5 mr-2" /> : <EyeSlashIcon className="h-5 w-5 mr-2" />}
                {showSystemCategories ? 'Hide' : 'Show'} System
              </Button>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600 py-2">
                Showing <span className="font-semibold text-primary-600">{filteredCategories.length}</span> of{' '}
                <span className="font-semibold">{categoriesList.length}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedCategories.length > 0 && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full px-4 py-2">
                <span className="text-sm font-bold text-primary-600">
                  {selectedCategories.length} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategories([])}
                className="text-white hover:bg-white/20"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Clear
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Categories Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {parentCategories.map((parent, index) => {
            const children = filteredCategories.filter(cat => cat.parent_id === parent.id);
            const usage = categoryUsage.get(parent.id) || 0;

            return (
              <Card
                key={parent.id}
                hover
                padding="lg"
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Parent Category Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {!parent.is_system && (
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(parent.id)}
                        onChange={() => {
                          setSelectedCategories(prev =>
                            prev.includes(parent.id)
                              ? prev.filter(id => id !== parent.id)
                              : [...prev, parent.id]
                          );
                        }}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                      />
                    )}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md"
                      style={{ backgroundColor: parent.color || '#3b82f6' }}
                    >
                      {parent.icon || '📁'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{parent.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {parent.category_type}
                        </span>
                        {parent.is_system && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            System
                          </span>
                        )}
                        {usage > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {usage} txs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!parent.is_system && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(parent)}
                          className="hover:bg-purple-50"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMergingCategory(parent);
                            setIsMergeModalOpen(true);
                          }}
                          className="hover:bg-orange-50"
                          title="Merge"
                        >
                          <ArrowsRightLeftIcon className="h-4 w-4 text-orange-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(parent)}
                          className="hover:bg-primary-50"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4 text-primary-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(parent)}
                          className="hover:bg-red-50"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Subcategories */}
                {children.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Subcategories ({children.length})
                    </p>
                    {children.map((child) => {
                      const childUsage = categoryUsage.get(child.id) || 0;
                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {!child.is_system && (
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(child.id)}
                                onChange={() => {
                                  setSelectedCategories(prev =>
                                    prev.includes(child.id)
                                      ? prev.filter(id => id !== child.id)
                                      : [...prev, child.id]
                                  );
                                }}
                                className="w-3 h-3 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                              />
                            )}
                            <span className="text-lg">{child.icon || '📄'}</span>
                            <span className="text-sm font-medium text-gray-700">{child.name}</span>
                            {child.is_system && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                System
                              </span>
                            )}
                            {childUsage > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                {childUsage}
                              </span>
                            )}
                          </div>
                          {!child.is_system && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(child)}
                                className="hover:bg-purple-50"
                                title="Duplicate"
                              >
                                <DocumentDuplicateIcon className="h-3 w-3 text-purple-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMergingCategory(child);
                                  setIsMergeModalOpen(true);
                                }}
                                className="hover:bg-orange-50"
                                title="Merge"
                              >
                                <ArrowsRightLeftIcon className="h-3 w-3 text-orange-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(child)}
                                className="hover:bg-primary-50"
                                title="Edit"
                              >
                                <PencilIcon className="h-3 w-3 text-primary-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(child)}
                                className="hover:bg-red-50"
                                title="Delete"
                              >
                                <TrashIcon className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        // List View
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left w-12"></th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No categories found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, index) => {
                    const usage = categoryUsage.get(cat.id) || 0;
                    const parent = categoriesList.find(c => c.id === cat.parent_id);

                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all"
                        style={{ animationDelay: `${index * 0.02}s` }}
                      >
                        <td className="px-6 py-4">
                          {!cat.is_system && (
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.id)}
                              onChange={() => {
                                setSelectedCategories(prev =>
                                  prev.includes(cat.id)
                                    ? prev.filter(id => id !== cat.id)
                                    : [...prev, cat.id]
                                );
                              }}
                              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm"
                              style={{ backgroundColor: cat.color || '#3b82f6' }}
                            >
                              {cat.icon || '📁'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                              {cat.is_system && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  System
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            cat.category_type === 'expense' ? 'bg-red-100 text-red-800' :
                            cat.category_type === 'income' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {cat.category_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {usage > 0 ? (
                            <span className="text-sm font-semibold text-green-600">{usage} transactions</span>
                          ) : (
                            <span className="text-sm text-gray-400">0 transactions</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {parent ? (
                            <span className="text-sm text-gray-600">{parent.icon} {parent.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">Top Level</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {!cat.is_system && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicate(cat)}
                                  className="hover:bg-purple-50"
                                  title="Duplicate"
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4 text-purple-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setMergingCategory(cat);
                                    setIsMergeModalOpen(true);
                                  }}
                                  className="hover:bg-orange-50"
                                  title="Merge"
                                >
                                  <ArrowsRightLeftIcon className="h-4 w-4 text-orange-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(cat)}
                                  className="hover:bg-primary-50"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4 text-primary-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(cat)}
                                  className="hover:bg-red-50"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

          <div className="space-y-4">
            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="flex items-center gap-3 mb-2">
                <Input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📁"
                  maxLength={2}
                  className="w-20 text-center text-2xl"
                />
                <span className="text-sm text-gray-500">or choose one:</span>
              </div>
              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {ICON_SUGGESTIONS.map((icon, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded hover:bg-white transition ${
                      formData.icon === icon ? 'bg-primary-100 ring-2 ring-primary-500' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="w-32"
                />
                <span className="text-sm text-gray-500">or choose one:</span>
              </div>
              <div className="grid grid-cols-10 gap-2 p-3 bg-gray-50 rounded-lg">
                {COLOR_PALETTE.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition hover:scale-110 ${
                      formData.color === color ? 'ring-2 ring-gray-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
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

          <div className="space-y-4">
            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="flex items-center gap-3 mb-2">
                <Input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📁"
                  maxLength={2}
                  className="w-20 text-center text-2xl"
                />
                <span className="text-sm text-gray-500">or choose one:</span>
              </div>
              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {ICON_SUGGESTIONS.map((icon, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded hover:bg-white transition ${
                      formData.icon === icon ? 'bg-primary-100 ring-2 ring-primary-500' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="w-32"
                />
                <span className="text-sm text-gray-500">or choose one:</span>
              </div>
              <div className="grid grid-cols-10 gap-2 p-3 bg-gray-50 rounded-lg">
                {COLOR_PALETTE.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition hover:scale-110 ${
                      formData.color === color ? 'ring-2 ring-gray-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
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

      {/* Merge Category Modal */}
      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false);
          setMergingCategory(null);
          setTargetMergeCategory('');
        }}
        title="Merge Category"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This will move all transactions from "{mergingCategory?.name}" to another category and then delete "{mergingCategory?.name}". This action cannot be undone.
            </p>
          </div>

          {mergingCategory && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: mergingCategory.color }}
                >
                  {mergingCategory.icon}
                </div>
                <div>
                  <div className="font-medium">{mergingCategory.name}</div>
                  <div className="text-sm text-gray-600">
                    {categoryUsage.get(mergingCategory.id) || 0} transactions will be moved
                  </div>
                </div>
              </div>
            </div>
          )}

          <Select
            label="Merge into category"
            options={[
              { value: '', label: 'Select target category...' },
              ...categoriesList
                .filter(c => c.id !== mergingCategory?.id && c.category_type === mergingCategory?.category_type)
                .map(c => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}${c.parent ? ` (${c.parent.name})` : ''}`
                }))
            ]}
            value={targetMergeCategory}
            onChange={(e) => setTargetMergeCategory(e.target.value)}
          />

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsMergeModalOpen(false);
                setMergingCategory(null);
                setTargetMergeCategory('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleMerge}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Merge Category
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete with Reassignment Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingCategory(null);
        }}
        title="Delete Category with Transactions"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> "{deletingCategory?.name}" has {categoryUsage.get(deletingCategory?.id) || 0} transaction(s). You must reassign them before deleting.
            </p>
          </div>

          {deletingCategory && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: deletingCategory.color }}
                >
                  {deletingCategory.icon}
                </div>
                <div>
                  <div className="font-medium">{deletingCategory.name}</div>
                  <div className="text-sm text-gray-600">
                    {categoryUsage.get(deletingCategory.id) || 0} transactions
                  </div>
                </div>
              </div>
            </div>
          )}

          <Select
            label="Reassign transactions to"
            options={[
              { value: '', label: 'Uncategorized (No category)' },
              ...categoriesList
                .filter(c => c.id !== deletingCategory?.id)
                .map(c => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}${c.parent ? ` (${c.parent.name})` : ''}`
                }))
            ]}
            value={targetMergeCategory}
            onChange={(e) => setTargetMergeCategory(e.target.value)}
          />

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingCategory(null);
                setTargetMergeCategory('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleDeleteWithReassignment(targetMergeCategory)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete & Reassign
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
