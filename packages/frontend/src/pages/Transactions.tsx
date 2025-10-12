import { useEffect, useState } from 'react';
import { transactions } from '../lib/api';
import { Card, Button } from '../components/ui';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { PencilIcon, TrashIcon, ArrowsRightLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Transactions() {
  const [txList, setTxList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  useEffect(() => {
    loadTransactions();
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
    if (selectedTransactions.length === txList.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(txList.map(tx => tx.id));
    }
  };

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
          Total: <span className="font-semibold text-gray-900">{txList.length}</span> transactions
        </div>
      </div>

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
                    checked={txList.length > 0 && selectedTransactions.length === txList.length}
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
              {txList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No transactions found. Import some data to get started!
                  </td>
                </tr>
              ) : (
                txList.map((tx, index) => {
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
                      <div className="flex items-center justify-end gap-1">
                        <span>{tx.transaction_type === 'credit' ? '+' : '-'}</span>
                        <span>{tx.amount.toFixed(2)}</span>
                        <span className="text-xs font-normal text-gray-500">{tx.currency}</span>
                      </div>
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
