import { useEffect, useState, useMemo } from 'react';
import { transactions, categories as categoriesApi, accounts as accountsApi } from '../lib/api';
import { Card, Button } from '../components/ui';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { PencilIcon, TrashIcon, ArrowsRightLeftIcon, XMarkIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../lib/currency';

export default function Transactions() {
  const [txList, setTxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Categories and accounts for filters
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions();
    loadCategories();
    loadAccounts();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactions.getAll({ limit: 100 });
      setTxList(response.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategoriesList(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountsApi.getAll();
      setAccountsList(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleEdit = (tx: any) => {
    setEditingTransaction(tx);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (tx: any) => {
    if (!confirm(`Are you sure you want to delete the transaction "${tx.description || tx.merchant_name}"?`)) {
      return;
    }

    try {
      await transactions.delete(tx.id);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleMarkAsTransfer = async (tx: any) => {
    // The Transfer category ID from the backend seed data
    const TRANSFER_CATEGORY_ID = '00000000-0000-0000-0000-000000000201';

    try {
      await transactions.update(tx.id, {
        category_id: TRANSFER_CATEGORY_ID
      });
      await loadTransactions();
    } catch (error) {
      console.error('Failed to mark as transfer:', error);
      alert('Failed to mark transaction as transfer');
    }
  };

  const handleUpdateComplete = () => {
    loadTransactions();
  };

  const isTransfer = (tx: any) => {
    return tx.category?.id === '00000000-0000-0000-0000-000000000201' ||
           tx.category?.category_type === 'transfer';
  };

  const handleSelectTransaction = (txId: string) => {
    setSelectedTransactions(prev => {
      if (prev.includes(txId)) {
        return prev.filter(id => id !== txId);
      } else {
        return [...prev, txId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(tx => tx.id));
    }
  };

  // Filter transactions based on all criteria
  const filteredTransactions = useMemo(() => {
    return txList.filter(tx => {
      // Search filter (merchant name, description, notes)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          tx.merchant_name?.toLowerCase().includes(query) ||
          tx.description?.toLowerCase().includes(query) ||
          tx.notes?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'uncategorized') {
          if (tx.category_id) return false;
        } else {
          if (tx.category_id !== selectedCategory) return false;
        }
      }

      // Account filter
      if (selectedAccount !== 'all') {
        if (tx.account_id !== selectedAccount) return false;
      }

      // Date range filter
      if (startDate) {
        const txDate = new Date(tx.transaction_date);
        const filterStart = new Date(startDate);
        if (txDate < filterStart) return false;
      }

      if (endDate) {
        const txDate = new Date(tx.transaction_date);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999); // Include the entire end date
        if (txDate > filterEnd) return false;
      }

      return true;
    });
  }, [txList, searchQuery, selectedCategory, selectedAccount, startDate, endDate]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setStartDate('');
    setEndDate('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || selectedCategory !== 'all' ||
    selectedAccount !== 'all' || startDate || endDate;

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingBulk(true);
    try {
      // Delete all selected transactions in parallel
      await Promise.all(
        selectedTransactions.map(txId => transactions.delete(txId))
      );
      setSelectedTransactions([]);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete transactions:', error);
      alert('Failed to delete some transactions');
    } finally {
      setDeletingBulk(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Transactions
          </h1>
          <p className="text-gray-600 mt-1">View and manage all your transactions</p>
        </div>
        <div className="text-sm text-gray-600">
          {hasActiveFilters ? (
            <>
              Showing <span className="font-semibold text-primary-600">{filteredTransactions.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{txList.length}</span> transactions
            </>
          ) : (
            <>
              Total: <span className="font-semibold text-gray-900">{txList.length}</span> transactions
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card hover padding="md" className="bg-gradient-to-br from-white to-gray-50">
        <div className="space-y-4">
          {/* Search Bar and Filter Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions by merchant, description, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'ghost'}
              size="md"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 ${showFilters ? '' : 'border border-gray-300'}`}
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasActiveFilters && !showFilters && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                  •
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="md"
                onClick={handleResetFilters}
                className="border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 animate-slide-down">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                >
                  <option value="all">All Categories</option>
                  <option value="uncategorized">Uncategorized</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                      {cat.parent && ` (${cat.parent.name})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                >
                  <option value="all">All Accounts</option>
                  {accountsList.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filters */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                    placeholder="Start"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm transition"
                    placeholder="End"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedTransactions.length > 0 && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg p-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full px-4 py-2">
                <span className="text-sm font-bold text-primary-600">
                  {selectedTransactions.length} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransactions([])}
                className="text-white hover:bg-white/20"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Clear Selection
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              loading={deletingBulk}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete {selectedTransactions.length} Transaction{selectedTransactions.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      <Card hover padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {txList.length === 0 ? (
                      'No transactions found. Import some data to get started!'
                    ) : (
                      'No transactions match your filters. Try adjusting your search criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, index) => {
                  const isSelected = selectedTransactions.includes(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`
                        transition-all duration-200
                        ${isSelected
                          ? 'bg-primary-50 ring-2 ring-inset ring-primary-400'
                          : 'hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50'
                        }
                      `}
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectTransaction(tx.id)}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(tx.transaction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.merchant_name || tx.description}</span>
                        {tx.notes && (
                          <span className="text-xs text-gray-500 mt-1">{tx.notes}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tx.category ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tx.category.icon}</span>
                          <div className="flex flex-col">
                            <span className={`font-medium ${isTransfer(tx) ? 'text-blue-700' : 'text-gray-900'}`}>
                              {tx.category.name}
                            </span>
                            {tx.category.parent && (
                              <span className="text-xs text-gray-500">{tx.category.parent.name}</span>
                            )}
                          </div>
                          {isTransfer(tx) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Transfer
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.account?.name || 'N/A'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                      tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!isTransfer(tx) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsTransfer(tx)}
                            className="hover:bg-blue-50"
                            title="Mark as Transfer"
                          >
                            <ArrowsRightLeftIcon className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tx)}
                          className="hover:bg-primary-50"
                          title="Edit Transaction"
                        >
                          <PencilIcon className="h-4 w-4 text-primary-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tx)}
                          className="hover:bg-red-50"
                          title="Delete Transaction"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
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

      {/* Edit Modal */}
      <TransactionEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onUpdate={handleUpdateComplete}
      />
    </div>
  );
}
