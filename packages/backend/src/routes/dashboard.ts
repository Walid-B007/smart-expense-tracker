import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { fxService } from '../services/fx/fx-provider';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Get dashboard summary
  fastify.get('/summary', async (request, reply) => {
    const { currency = 'USD' } = request.query as { currency?: string };

    // Get all accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', request.user!.id)
      .eq('is_active', true);

    if (!accounts) {
      return { summary: null };
    }

    // Convert all balances to display currency
    let totalBalance = 0;
    for (const account of accounts) {
      const converted = await fxService.convert(
        account.current_balance,
        account.currency,
        currency
      );
      if (converted !== null) {
        totalBalance += converted;
      }
    }

    // Get transaction counts
    const { count: totalTransactions } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', request.user!.id);

    const { count: uncategorized } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', request.user!.id)
      .is('category_id', null);

    return {
      summary: {
        total_balance: totalBalance,
        currency,
        total_accounts: accounts.length,
        total_transactions: totalTransactions || 0,
        uncategorized_transactions: uncategorized || 0,
      },
    };
  });

  // Get spending by category
  fastify.get('/spending-by-category', async (request, reply) => {
    const {
      start_date,
      end_date,
      currency = 'USD',
    } = request.query as {
      start_date?: string;
      end_date?: string;
      currency?: string;
    };

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        transaction_type,
        transaction_date,
        category:categories(id, name, icon, color, category_type)
      `)
      .eq('user_id', request.user!.id)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (!transactions) {
      return { spending: [] };
    }

    // Group by category
    const categoryMap = new Map<string, { name: string; total: number; icon?: string; color?: string }>();

    for (const tx of transactions) {
      if (!tx.category) continue;

      const categoryId = tx.category.id;
      const existing = categoryMap.get(categoryId);

      // Convert to display currency
      const converted = await fxService.convert(
        tx.amount,
        tx.currency,
        currency,
        new Date(tx.transaction_date)
      );

      if (converted !== null) {
        if (existing) {
          existing.total += converted;
        } else {
          categoryMap.set(categoryId, {
            name: tx.category.name,
            total: converted,
            icon: tx.category.icon,
            color: tx.category.color,
          });
        }
      }
    }

    const spending = Array.from(categoryMap.entries()).map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      icon: data.icon,
      color: data.color,
      total: data.total,
      currency,
    })).sort((a, b) => b.total - a.total);

    return { spending };
  });

  // Get cash flow (income vs expenses)
  fastify.get('/cash-flow', async (request, reply) => {
    const {
      start_date,
      end_date,
      period = 'daily',
      currency = 'USD',
    } = request.query as {
      start_date?: string;
      end_date?: string;
      period?: 'daily' | 'weekly' | 'monthly';
      currency?: string;
    };

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', request.user!.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date');

    if (!transactions) {
      return { cash_flow: [] };
    }

    // Group by period
    const flowMap = new Map<string, { income: number; expenses: number }>();

    for (const tx of transactions) {
      let periodKey: string;
      const date = new Date(tx.transaction_date);

      if (period === 'daily') {
        periodKey = tx.transaction_date;
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = flowMap.get(periodKey) || { income: 0, expenses: 0 };

      const converted = await fxService.convert(
        tx.amount,
        tx.currency,
        currency,
        date
      );

      if (converted !== null) {
        if (tx.transaction_type === 'credit') {
          existing.income += converted;
        } else {
          existing.expenses += converted;
        }
      }

      flowMap.set(periodKey, existing);
    }

    const cash_flow = Array.from(flowMap.entries())
      .map(([period, data]) => ({
        period,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
        currency,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return { cash_flow };
  });

  // Get spending over time (for charts)
  fastify.get('/spending-over-time', async (request, reply) => {
    const {
      start_date,
      end_date,
      period = 'daily',
      currency = 'USD',
      account_id,
      category_id,
    } = request.query as {
      start_date?: string;
      end_date?: string;
      period?: 'daily' | 'weekly' | 'monthly';
      currency?: string;
      account_id?: string;
      category_id?: string;
    };

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', request.user!.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date');

    if (account_id) query = query.eq('account_id', account_id);
    if (category_id) query = query.eq('category_id', category_id);

    const { data: transactions } = await query;

    if (!transactions) {
      return { spending: [] };
    }

    // Group by period
    const spendingMap = new Map<string, { income: number; expenses: number; count: number }>();

    for (const tx of transactions) {
      let periodKey: string;
      const date = new Date(tx.transaction_date);

      if (period === 'daily') {
        periodKey = tx.transaction_date;
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = spendingMap.get(periodKey) || { income: 0, expenses: 0, count: 0 };

      const converted = await fxService.convert(
        tx.amount,
        tx.currency,
        currency,
        date
      );

      if (converted !== null) {
        if (tx.transaction_type === 'credit') {
          existing.income += converted;
        } else {
          existing.expenses += converted;
        }
        existing.count++;
      }

      spendingMap.set(periodKey, existing);
    }

    const spending = Array.from(spendingMap.entries())
      .map(([period, data]) => ({
        period,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
        transaction_count: data.count,
        currency,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return { spending };
  });

  // Get year-over-year comparison
  fastify.get('/year-over-year', async (request, reply) => {
    const { currency = 'USD', metric = 'spending' } = request.query as {
      currency?: string;
      metric?: 'spending' | 'balance';
    };

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const currentYearStart = `${currentYear}-01-01`;
    const currentYearEnd = `${currentYear}-12-31`;
    const lastYearStart = `${lastYear}-01-01`;
    const lastYearEnd = `${lastYear}-12-31`;

    if (metric === 'spending') {
      // Get spending for both years
      const { data: currentTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', request.user!.id)
        .eq('transaction_type', 'debit')
        .gte('transaction_date', currentYearStart)
        .lte('transaction_date', currentYearEnd);

      const { data: lastTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', request.user!.id)
        .eq('transaction_type', 'debit')
        .gte('transaction_date', lastYearStart)
        .lte('transaction_date', lastYearEnd);

      let currentYearTotal = 0;
      let lastYearTotal = 0;

      if (currentTxs) {
        for (const tx of currentTxs) {
          const converted = await fxService.convert(
            tx.amount,
            tx.currency,
            currency,
            new Date(tx.transaction_date)
          );
          if (converted !== null) currentYearTotal += converted;
        }
      }

      if (lastTxs) {
        for (const tx of lastTxs) {
          const converted = await fxService.convert(
            tx.amount,
            tx.currency,
            currency,
            new Date(tx.transaction_date)
          );
          if (converted !== null) lastYearTotal += converted;
        }
      }

      const change = currentYearTotal - lastYearTotal;
      const changePercent = lastYearTotal > 0 ? ((change / lastYearTotal) * 100) : 0;

      return {
        comparison: {
          current_year: {
            year: currentYear,
            total: currentYearTotal,
            currency,
          },
          last_year: {
            year: lastYear,
            total: lastYearTotal,
            currency,
          },
          change,
          change_percent: changePercent,
          currency,
        },
      };
    } else {
      // Balance comparison
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', request.user!.id)
        .eq('is_active', true);

      if (!accounts) {
        return { comparison: null };
      }

      let currentBalance = 0;
      for (const account of accounts) {
        const converted = await fxService.convert(
          account.current_balance,
          account.currency,
          currency
        );
        if (converted !== null) currentBalance += converted;
      }

      // For last year balance, we'd need historical data
      // This is a simplified version - you may want to store balance snapshots
      return {
        comparison: {
          current_year: {
            year: currentYear,
            balance: currentBalance,
            currency,
          },
          message: 'Historical balance comparison requires balance snapshots',
        },
      };
    }
  });

  // Get category breakdown with grouping
  fastify.get('/category-breakdown', async (request, reply) => {
    const {
      start_date,
      end_date,
      currency = 'USD',
      group_by = 'parent', // 'parent' or 'none'
    } = request.query as {
      start_date?: string;
      end_date?: string;
      currency?: string;
      group_by?: 'parent' | 'none';
    };

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        currency,
        transaction_type,
        transaction_date,
        category:categories(id, name, icon, color, parent_id, category_type)
      `)
      .eq('user_id', request.user!.id)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (!transactions) {
      return { breakdown: [] };
    }

    // If grouping by parent, fetch parent categories
    const categoryMap = new Map<string, {
      id: string;
      name: string;
      total: number;
      subcategories?: Map<string, { name: string; total: number }>;
      icon?: string;
      color?: string;
    }>();

    for (const tx of transactions) {
      if (!tx.category) continue;

      const converted = await fxService.convert(
        tx.amount,
        tx.currency,
        currency,
        new Date(tx.transaction_date)
      );

      if (converted === null) continue;

      if (group_by === 'parent' && tx.category.parent_id) {
        // Fetch parent category
        const { data: parent } = await supabase
          .from('categories')
          .select('id, name, icon, color')
          .eq('id', tx.category.parent_id)
          .single();

        if (parent) {
          const existing = categoryMap.get(parent.id);
          if (existing) {
            existing.total += converted;
            if (!existing.subcategories) existing.subcategories = new Map();
            const sub = existing.subcategories.get(tx.category.id);
            if (sub) {
              sub.total += converted;
            } else {
              existing.subcategories.set(tx.category.id, {
                name: tx.category.name,
                total: converted,
              });
            }
          } else {
            const subcats = new Map();
            subcats.set(tx.category.id, { name: tx.category.name, total: converted });
            categoryMap.set(parent.id, {
              id: parent.id,
              name: parent.name,
              total: converted,
              subcategories: subcats,
              icon: parent.icon,
              color: parent.color,
            });
          }
        }
      } else {
        // No grouping or it's a top-level category
        const existing = categoryMap.get(tx.category.id);
        if (existing) {
          existing.total += converted;
        } else {
          categoryMap.set(tx.category.id, {
            id: tx.category.id,
            name: tx.category.name,
            total: converted,
            icon: tx.category.icon,
            color: tx.category.color,
          });
        }
      }
    }

    const breakdown = Array.from(categoryMap.values()).map((cat) => ({
      category_id: cat.id,
      category_name: cat.name,
      icon: cat.icon,
      color: cat.color,
      total: cat.total,
      subcategories: cat.subcategories
        ? Array.from(cat.subcategories.entries()).map(([id, sub]) => ({
            id,
            name: sub.name,
            total: sub.total,
          }))
        : undefined,
      currency,
    })).sort((a, b) => b.total - a.total);

    return { breakdown };
  });
};
