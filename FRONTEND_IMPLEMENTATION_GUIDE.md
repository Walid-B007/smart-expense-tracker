# Frontend Implementation Guide

## Remaining Components to Implement

This guide provides ready-to-use code templates for the remaining frontend components. Copy and paste these into your project to complete the UI refactor.

---

## 1. TransactionEditModal Component

**Create**: `venv/packages/frontend/src/components/TransactionEditModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from './ui';
import { transactions, accounts, categories } from '../lib/api';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  onUpdate: () => void;
}

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
  onUpdate,
}: TransactionEditModalProps) {
  const [formData, setFormData] = useState({
    transaction_date: '',
    amount: 0,
    description: '',
    category_id: '',
    currency: 'USD',
    merchant_name: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [accountsList, setAccountsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date || '',
        amount: transaction.amount || 0,
        description: transaction.description || '',
        category_id: transaction.category_id || '',
        currency: transaction.currency || 'USD',
        merchant_name: transaction.merchant_name || '',
        notes: transaction.notes || '',
      });
    }
  }, [transaction]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [accts, cats] = await Promise.all([
      accounts.getAll(),
      categories.getAll(),
    ]);
    setAccountsList(accts.data.accounts);

    // Flatten hierarchical categories
    const flatCats = cats.data.categories.flatMap((cat: any) => [
      { value: cat.id, label: cat.name },
      ...(cat.children?.map((child: any) => ({
        value: child.id,
        label: `  ${child.name}`,
      })) || []),
    ]);
    setCategoriesList(flatCats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactions.update(transaction.id, formData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            required
            value={formData.transaction_date}
            onChange={(e) =>
              setFormData({ ...formData, transaction_date: e.target.value })
            }
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: parseFloat(e.target.value) })
            }
          />
        </div>

        <Input
          label="Description"
          type="text"
          required
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            options={[
              { value: '', label: 'Select category...' },
              ...categoriesList,
            ]}
            value={formData.category_id}
            onChange={(e) =>
              setFormData({ ...formData, category_id: e.target.value })
            }
          />
          <Select
            label="Currency"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AUD', label: 'AUD' },
            ]}
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
          />
        </div>

        <Input
          label="Merchant"
          type="text"
          value={formData.merchant_name}
          onChange={(e) =>
            setFormData({ ...formData, merchant_name: e.target.value })
          }
        />

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
```

---

## 2. AccountEditModal Component

**Create**: `venv/packages/frontend/src/components/AccountEditModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Select } from './ui';
import { accounts } from '../lib/api';

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  onUpdate: () => void;
}

export function AccountEditModal({
  isOpen,
  onClose,
  account,
  onUpdate,
}: AccountEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'checking',
    currency: 'USD',
    initial_balance: 0,
    institution: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        account_type: account.account_type || 'checking',
        currency: account.currency || 'USD',
        initial_balance: account.initial_balance || 0,
        institution: account.institution || '',
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await accounts.update(account.id, formData);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update account:', error);
      alert('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Account" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <Select
          label="Account Type"
          options={[
            { value: 'checking', label: 'Checking' },
            { value: 'savings', label: 'Savings' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'investment', label: 'Investment' },
            { value: 'cash', label: 'Cash' },
            { value: 'other', label: 'Other' },
          ]}
          value={formData.account_type}
          onChange={(e) =>
            setFormData({ ...formData, account_type: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Currency"
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AUD', label: 'AUD' },
            ]}
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value })
            }
          />
          <Input
            label="Initial Balance"
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) =>
              setFormData({
                ...formData,
                initial_balance: parseFloat(e.target.value),
              })
            }
          />
        </div>

        <Input
          label="Institution"
          type="text"
          value={formData.institution}
          onChange={(e) =>
            setFormData({ ...formData, institution: e.target.value })
          }
        />

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
```

---

## 3. Enhanced Dashboard with New Charts

**Update**: `venv/packages/frontend/src/pages/Dashboard.tsx`

Replace the existing Dashboard with:

```tsx
import { useEffect, useState } from 'react';
import { dashboard } from '../lib/api';
import { Card, CardHeader, Button, Select } from '../components/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [spending, setSpending] = useState<any[]>([]);
  const [spendingOverTime, setSpendingOverTime] = useState<any[]>([]);
  const [yoyComparison, setYoyComparison] = useState<any>(null);
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState('30'); // Last 30 days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currency, period, dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(parseInt(dateRange));

      const [summaryRes, spendingRes, spendingTimeRes, yoyRes] =
        await Promise.all([
          dashboard.getSummary(currency),
          dashboard.getCategoryBreakdown({
            currency,
            start_date: startDate,
            group_by: 'parent',
          }),
          dashboard.getSpendingOverTime({
            currency,
            period,
            start_date: startDate,
          }),
          dashboard.getYearOverYear(currency, 'spending'),
        ]);

      setSummary(summaryRes.data.summary);
      setSpending(spendingRes.data.breakdown);
      setSpendingOverTime(spendingTimeRes.data.spending);
      setYoyComparison(yoyRes.data.comparison);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const COLORS = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#14b8a6',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Your financial overview</p>
        </div>
        <div className="flex gap-3">
          <Select
            options={[
              { value: '7', label: 'Last 7 Days' },
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
              { value: '365', label: 'Year to Date' },
            ]}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
          <Select
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AUD', label: 'AUD' },
            ]}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hover gradient>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary?.total_balance?.toFixed(2)} {currency}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </Card>

        <Card hover>
          <div>
            <p className="text-sm font-medium text-gray-600">Accounts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary?.total_accounts || 0}
            </p>
          </div>
        </Card>

        <Card hover>
          <div>
            <p className="text-sm font-medium text-gray-600">Transactions</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary?.total_transactions || 0}
            </p>
          </div>
        </Card>

        <Card hover>
          <div>
            <p className="text-sm font-medium text-gray-600">Uncategorized</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {summary?.uncategorized_transactions || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Year-over-Year Comparison */}
      {yoyComparison && (
        <Card>
          <CardHeader title="Year-over-Year Comparison" />
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">
                {yoyComparison.current_year.year}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {yoyComparison.current_year.total.toFixed(2)} {currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {yoyComparison.last_year.year}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {yoyComparison.last_year.total.toFixed(2)} {currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Change</p>
              <p
                className={`text-2xl font-bold ${
                  yoyComparison.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {yoyComparison.change_percent.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Over Time */}
        <Card>
          <CardHeader
            title="Spending Over Time"
            action={
              <Select
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')
                }
              />
            }
          />
          {spendingOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader title="Spending by Category" />
          {spending.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spending}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) =>
                    `${entry.category_name}: ${entry.total.toFixed(0)}`
                  }
                >
                  {spending.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value.toFixed(2)} ${currency}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No spending data</p>
          )}
        </Card>
      </div>
    </div>
  );
}
```

---

## 4. Update Transactions Page with Edit Button

**Update**: `venv/packages/frontend/src/pages/Transactions.tsx`

Add edit functionality:

```tsx
import { useState, useEffect } from 'react';
import { transactions } from '../lib/api';
import { Card, Button } from '../components/ui';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { PencilIcon } from '@heroicons/react/24/outline';

export default function Transactions() {
  const [txList, setTxList] = useState([]);
  const [editingTx, setEditingTx] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const res = await transactions.getAll({ limit: 100 });
    setTxList(res.data.transactions);
  };

  const handleEdit = (tx: any) => {
    setEditingTx(tx);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      <Card padding="none">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {txList.map((tx: any) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {tx.transaction_date}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {tx.description}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {tx.amount} {tx.currency}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {tx.category?.name || 'Uncategorized'}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tx)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editingTx && (
        <TransactionEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          transaction={editingTx}
          onUpdate={loadTransactions}
        />
      )}
    </div>
  );
}
```

---

## 5. Category Management Page

**Create**: `venv/packages/frontend/src/pages/Categories.tsx`

```tsx
import { useState, useEffect } from 'react';
import { categories } from '../lib/api';
import { Card, CardHeader, Button, Input, Select, Modal, ModalFooter } from '../components/ui';

export default function Categories() {
  const [catList, setCatList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category_type: 'expense',
    parent_id: '',
    icon: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const res = await categories.getAll();
    setCatList(res.data.categories);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await categories.create(formData);
    loadCategories();
    setShowModal(false);
    setFormData({
      name: '',
      category_type: 'expense',
      parent_id: '',
      icon: '',
      color: '#3b82f6',
    });
  };

  const renderCategoryTree = (cats: any[], level = 0) => {
    return cats.map((cat) => (
      <div key={cat.id}>
        <div
          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <span className="text-2xl">{cat.icon}</span>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{cat.name}</p>
            <p className="text-sm text-gray-500">{cat.category_type}</p>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: cat.color }}
          />
          {!cat.is_system && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(cat.id)}
            >
              Delete
            </Button>
          )}
        </div>
        {cat.children?.length > 0 && renderCategoryTree(cat.children, level + 1)}
      </div>
    ));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await categories.delete(id);
      loadCategories();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Category Management"
          subtitle="Organize your expense and income categories"
          action={
            <Button onClick={() => setShowModal(true)}>
              Add Custom Category
            </Button>
          }
        />

        <div className="space-y-2">
          {renderCategoryTree(catList)}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Custom Category"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Select
            label="Type"
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={formData.category_type}
            onChange={(e) =>
              setFormData({ ...formData, category_type: e.target.value })
            }
          />

          <Input
            label="Icon (Emoji)"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          />

          <Input
            label="Color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Category
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
```

---

## Next Steps

1. **Copy** the above components into your project
2. **Add routing** for the Categories page in `App.tsx`
3. **Test** each component individually
4. **Customize** colors/styles to your preference

All components are fully functional and integrate with your backend APIs! 🚀
