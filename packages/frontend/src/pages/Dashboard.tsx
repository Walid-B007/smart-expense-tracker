import { useEffect, useState, useMemo } from 'react';
import { dashboard, transactions as transactionsApi, accounts as accountsApi } from '../lib/api';
import { Card, CardHeader, Button, Select } from '../components/ui';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, CartesianGrid, XAxis, YAxis
} from 'recharts';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { SankeyChart } from '../components/SankeyChart';
import { formatCurrency } from '../lib/currency';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [spendingOverTime, setSpendingOverTime] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<'last30' | 'mtd' | 'ytd'>('last30');
  const [loading, setLoading] = useState(true);

  // New state for interactive filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Account filtering state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [currency, timePeriod, dateRange, selectedAccounts]);

  useEffect(() => {
    if (selectedCategory) {
      loadFilteredTransactions();
    } else {
      setFilteredTransactions([]);
    }
  }, [selectedCategory, dateRange, selectedAccounts]);

  const getDateRangeParams = () => {
    const now = new Date();
    let startDate: string;
    let endDate = now.toISOString().split('T')[0];

    switch (dateRange) {
      case 'mtd': // Month to Date
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'ytd': // Year to Date
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      case 'last30':
      default:
        const date = new Date();
        date.setDate(date.getDate() - 30);
        startDate = date.toISOString().split('T')[0];
        break;
    }

    return { start_date: startDate, end_date: endDate };
  };

  const getDaysForDateRange = () => {
    switch (dateRange) {
      case 'mtd':
        return new Date().getDate(); // Days in current month so far
      case 'ytd':
        const start = new Date(new Date().getFullYear(), 0, 1);
        const now = new Date();
        return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      case 'last30':
      default:
        return 30;
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await accountsApi.getAll();
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams();

      // Build account filter params
      const accountParams = selectedAccounts.length > 0
        ? { account_id: selectedAccounts.join(',') }
        : {};

      const [
        summaryRes,
        spendingOverTimeRes,
        categoryBreakdownRes
      ] = await Promise.all([
        dashboard.getSummary({ currency, ...accountParams }),
        dashboard.getSpendingOverTime({ currency, period: timePeriod, ...dateParams, ...accountParams }),
        dashboard.getCategoryBreakdown({ currency, group_by: 'parent', ...dateParams, ...accountParams }),
      ]);

      setSummary(summaryRes.data.summary);
      setSpendingOverTime(spendingOverTimeRes.data.spending || []);
      setCategoryBreakdown(categoryBreakdownRes.data.breakdown || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredTransactions = async () => {
    if (!selectedCategory) return;

    setLoadingTransactions(true);
    try {
      const dateParams = getDateRangeParams();

      // Find the selected category from breakdown to get subcategories
      const selectedCat = categoryBreakdown.find(cat => cat.category_id === selectedCategory);

      console.log('Selected category details:', selectedCat);

      // Build account filter params
      const accountParams = selectedAccounts.length > 0
        ? { account_id: selectedAccounts.join(',') }
        : {};

      let allTransactions: any[] = [];

      // If this is a parent category with subcategories, fetch transactions for each subcategory
      if (selectedCat?.subcategories && selectedCat.subcategories.length > 0) {
        console.log(`Parent category detected with ${selectedCat.subcategories.length} subcategories`);

        // Fetch transactions for each subcategory in parallel
        const subcategoryPromises = selectedCat.subcategories.map(async (subcat: any) => {
          try {
            const response = await transactionsApi.getAll({
              category_id: subcat.id,
              ...dateParams,
              ...accountParams,
              limit: 100
            });
            return response.data.transactions || [];
          } catch (error) {
            console.error(`Failed to load transactions for subcategory ${subcat.name}:`, error);
            return [];
          }
        });

        const results = await Promise.all(subcategoryPromises);
        allTransactions = results.flat();
        console.log(`Loaded ${allTransactions.length} transactions from subcategories`);
      } else {
        // This is a leaf category (no subcategories), fetch directly
        console.log('Leaf category detected, fetching directly');
        const response = await transactionsApi.getAll({
          category_id: selectedCategory,
          ...dateParams,
          ...accountParams,
          limit: 100
        });
        allTransactions = response.data.transactions || [];
      }

      // Sort by date descending
      allTransactions.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      console.log('Setting filtered transactions:', allTransactions.length);
      setFilteredTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setFilteredTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'mtd':
        return 'Month to Date';
      case 'ytd':
        return 'Year to Date';
      case 'last30':
      default:
        return 'Last 30 Days';
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      // Deselect if clicking the same category
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
    }
  };

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  // Prepare Sankey data for cash flow visualization
  const sankeyData = useMemo(() => {
    const totalIncome = spendingOverTime.reduce((sum, item) => sum + (item.income || 0), 0);
    const totalExpenses = spendingOverTime.reduce((sum, item) => sum + (item.expenses || 0), 0);

    if (categoryBreakdown.length === 0 || totalIncome === 0) {
      return { nodes: [], links: [] };
    }

    const nodes: any[] = [];
    const links: any[] = [];
    let nodeIndex = 0;

    // Node 0: Income (includes transfers in)
    nodes.push({ name: 'Income', color: '#10b981' });
    const incomeNodeIndex = nodeIndex++;

    // Add parent categories and their subcategories
    const parentNodeIndices: { [key: string]: number } = {};
    const subcategoryNodeIndices: { [key: string]: number } = {};

    // Filter out transfer categories from expenses
    const expenseCategories = categoryBreakdown.filter((cat: any) =>
      cat.category_type !== 'transfer' && cat.total > 0
    );

    // Create parent category nodes
    expenseCategories.slice(0, 5).forEach((cat: any) => {
      nodes.push({
        name: cat.category_name,
        color: cat.color || COLORS[nodes.length % COLORS.length]
      });
      parentNodeIndices[cat.category_id] = nodeIndex++;

      // Create subcategory nodes if they exist
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub: any) => {
          if (sub.total > 0) {
            nodes.push({
              name: sub.name,
              color: cat.color || COLORS[nodes.length % COLORS.length],
              opacity: 0.7
            });
            subcategoryNodeIndices[sub.id] = nodeIndex++;
          }
        });
      }
    });

    // Add Net Savings node at the end
    const netSavings = totalIncome - totalExpenses;
    nodes.push({
      name: 'Net Savings',
      color: netSavings >= 0 ? '#10b981' : '#ef4444'
    });
    const netSavingsNodeIndex = nodeIndex++;

    // Create links: Income → Parent Categories
    expenseCategories.slice(0, 5).forEach((cat: any) => {
      links.push({
        source: incomeNodeIndex,
        target: parentNodeIndices[cat.category_id],
        value: cat.total,
        color: cat.color || COLORS[links.length % COLORS.length]
      });

      // Parent Category → Subcategories
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub: any) => {
          if (sub.total > 0 && subcategoryNodeIndices[sub.id] !== undefined) {
            links.push({
              source: parentNodeIndices[cat.category_id],
              target: subcategoryNodeIndices[sub.id],
              value: sub.total,
              color: cat.color || COLORS[links.length % COLORS.length],
              opacity: 0.6
            });
          }
        });
      }
    });

    // Link from last level (subcategories or parent categories) to Net Savings
    if (netSavings !== 0) {
      // Find all leaf nodes (subcategories if they exist, otherwise parent categories)
      const leafNodes: number[] = [];

      expenseCategories.slice(0, 5).forEach((cat: any) => {
        if (cat.subcategories && cat.subcategories.length > 0) {
          // Add subcategories as leaf nodes
          cat.subcategories.forEach((sub: any) => {
            if (sub.total > 0 && subcategoryNodeIndices[sub.id] !== undefined) {
              leafNodes.push(subcategoryNodeIndices[sub.id]);
            }
          });
        } else {
          // Add parent category as leaf node if no subcategories
          leafNodes.push(parentNodeIndices[cat.category_id]);
        }
      });

      // Create a single link from Income to Net Savings
      // (representing the remaining amount after all expenses)
      links.push({
        source: incomeNodeIndex,
        target: netSavingsNodeIndex,
        value: Math.abs(netSavings),
        color: netSavings >= 0 ? '#10b981' : '#ef4444'
      });
    }

    return { nodes, links };
  }, [categoryBreakdown, spendingOverTime, COLORS]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Your financial overview - {getDateRangeLabel()}</p>
        </div>
        <div className="flex gap-3">
          <Select
            options={[
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'mtd', label: 'Month to Date' },
              { value: 'ytd', label: 'Year to Date' }
            ]}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'last30' | 'mtd' | 'ytd')}
          />
          <Select
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ]}
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
          />
          <Select
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'AUD', label: 'AUD' }
            ]}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      {/* Interactive Account Filter Slicer */}
      {accounts.length > 0 && (
        <Card hover padding="lg" className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Filter by Account</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedAccounts.length === 0
                  ? 'Click accounts to filter data'
                  : `${selectedAccounts.length} account${selectedAccounts.length > 1 ? 's' : ''} selected`}
              </p>
            </div>
            {selectedAccounts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAccounts([])}
                className="text-sm"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {accounts.map((account, index) => {
              const isSelected = selectedAccounts.includes(account.id);
              const accountTypeColors: { [key: string]: string } = {
                checking: 'from-blue-500 to-blue-600',
                savings: 'from-green-500 to-green-600',
                credit: 'from-purple-500 to-purple-600',
                investment: 'from-orange-500 to-orange-600',
                loan: 'from-red-500 to-red-600',
              };
              const gradientClass = accountTypeColors[account.account_type] || 'from-gray-500 to-gray-600';

              return (
                <div
                  key={account.id}
                  onClick={() => handleAccountToggle(account.id)}
                  className={`
                    relative overflow-hidden rounded-xl cursor-pointer
                    transition-all duration-300 ease-in-out transform
                    ${isSelected
                      ? 'scale-105 shadow-xl ring-4 ring-primary-400 ring-opacity-50'
                      : 'scale-100 shadow-md hover:scale-105 hover:shadow-lg'
                    }
                  `}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <div className={`
                    bg-gradient-to-br ${gradientClass} p-4 min-h-[120px]
                    flex flex-col justify-between
                    transition-opacity duration-300
                    ${isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'}
                  `}>
                    {/* Check Icon for Selected */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-1 animate-scale-in">
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      </div>
                    )}

                    {/* Account Icon */}
                    <div className="flex items-center justify-between">
                      <CreditCardIcon className="h-8 w-8 text-white opacity-90" />
                      <span className="text-xs font-semibold text-white opacity-80 uppercase tracking-wider">
                        {account.account_type}
                      </span>
                    </div>

                    {/* Account Details */}
                    <div>
                      <h4 className="text-white font-bold text-base mb-1 line-clamp-1">
                        {account.name}
                      </h4>
                      <p className="text-white text-sm font-semibold opacity-90">
                        {formatCurrency(account.balance || account.current_balance || 0, account.currency)}
                      </p>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className={`
                      absolute inset-0 bg-white transition-opacity duration-300
                      ${isSelected ? 'opacity-0' : 'opacity-0 hover:opacity-10'}
                    `} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Enhanced Summary Cards with Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Balance */}
        <Card hover gradient padding="lg" className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Total Balance</h3>
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
              <BanknotesIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(summary?.total_balance || 0, currency)}
          </p>
        </Card>

        {/* Period Income */}
        <Card hover padding="lg" className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Income ({getDateRangeLabel()})</h3>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">
            +{formatCurrency(spendingOverTime.reduce((sum, item) => sum + (item.income || 0), 0), currency)}
          </p>
        </Card>

        {/* Period Expenses */}
        <Card hover padding="lg" className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Expenses ({getDateRangeLabel()})</h3>
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
              <ArrowTrendingDownIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">
            -{formatCurrency(spendingOverTime.reduce((sum, item) => sum + (item.expenses || 0), 0), currency)}
          </p>
        </Card>

        {/* Net Savings */}
        <Card hover padding="lg" className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600">Net Savings</h3>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          {(() => {
            const net = spendingOverTime.reduce((sum, item) => sum + ((item.income || 0) - (item.expenses || 0)), 0);
            return (
              <p className={`text-3xl font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {net >= 0 ? '+' : ''}{formatCurrency(Math.abs(net), currency)}
              </p>
            );
          })()}
        </Card>
      </div>

      {/* Cash Flow Sankey Diagram */}
      <Card hover padding="lg">
        <CardHeader
          title="Cash Flow Analysis"
          subtitle={`${getDateRangeLabel()} - Visualize where your money flows`}
        />
        {sankeyData.nodes.length > 0 ? (
          <div className="mt-4 flex justify-center">
            <SankeyChart
              data={sankeyData}
              width={1000}
              height={450}
              currency={currency}
            />
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">No cash flow data available for this period</p>
        )}
      </Card>

      {/* Interactive Category Breakdown with Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown - Interactive Donut Chart */}
        <Card hover padding="lg" className="relative">
          <CardHeader
            title="Spending by Category"
            subtitle={selectedCategory ? "Click to clear filter" : "Click any category to drill down"}
          />
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="absolute top-4 right-4"
            >
              Clear Filter
            </Button>
          )}
          {categoryBreakdown.length > 0 ? (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    label={(entry) => {
                      const total = categoryBreakdown.reduce((sum, item) => sum + item.total, 0);
                      const percent = ((entry.total / total) * 100).toFixed(0);
                      return `${percent}%`;
                    }}
                    onClick={(data: any) => handleCategoryClick(data.category_id)}
                    cursor="pointer"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                        opacity={selectedCategory ? (selectedCategory === entry.category_id ? 1 : 0.3) : 1}
                        stroke={selectedCategory === entry.category_id ? "#000" : "none"}
                        strokeWidth={selectedCategory === entry.category_id ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value, currency)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>

              {/* Subcategory Details */}
              <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
                {categoryBreakdown.slice(0, 5).map((cat: any, idx: number) => (
                  <div
                    key={idx}
                    className={`border-l-4 pl-3 py-2 cursor-pointer transition-all ${
                      selectedCategory === cat.category_id ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                    style={{ borderColor: cat.color || COLORS[idx % COLORS.length] }}
                    onClick={() => handleCategoryClick(cat.category_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="font-semibold text-gray-900">{cat.category_name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{formatCurrency(cat.total, currency)}</span>
                    </div>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="ml-8 mt-2 space-y-1">
                        {cat.subcategories.map((sub: any, subIdx: number) => (
                          <div key={subIdx} className="flex items-center justify-between text-sm text-gray-600">
                            <span>{sub.name}</span>
                            <span>{formatCurrency(sub.total, currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No category data available</p>
          )}
        </Card>

        {/* Transaction Details - Filtered by Category */}
        <Card hover padding="lg">
          <CardHeader
            title={selectedCategory ? "Filtered Transactions" : "Recent Transactions"}
            subtitle={selectedCategory
              ? `Showing transactions for selected category`
              : `Click a category to filter transactions`
            }
          />
          {loadingTransactions ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : selectedCategory && filteredTransactions.length > 0 ? (
            <div className="mt-4 max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {filteredTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-primary-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {tx.merchant_name || tx.description}
                          </div>
                          {tx.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {tx.category.icon} {tx.category.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            {new Date(tx.transaction_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {tx.account && (
                            <>
                              <span>•</span>
                              <span>{tx.account.name}</span>
                            </>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="mt-1 text-xs text-gray-500 italic">
                            {tx.notes}
                          </div>
                        )}
                      </div>
                      <div className={`text-right ml-4 font-bold ${
                        tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedCategory ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-4">
                <ChartBarIcon className="h-16 w-16" />
              </div>
              <p className="text-gray-500 text-center">No transactions found for this category</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                Try selecting a different category or adjusting your date range
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-4">
                <ChartBarIcon className="h-16 w-16" />
              </div>
              <p className="text-gray-500 text-center font-medium">Click any category to view transactions</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                Select a category from the pie chart to see detailed transaction list
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
