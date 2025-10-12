import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { fxService } from '../services/fx/fx-provider';

export const transferRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Detect potential transfers
  fastify.get('/detect', async (request, reply) => {
    const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, account:accounts(name, currency)')
      .eq('user_id', request.user!.id)
      .is('category_id', null)
      .gte('transaction_date', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('transaction_date', end_date || new Date().toISOString())
      .order('transaction_date', { ascending: false });

    if (!transactions) {
      return { potential_transfers: [] };
    }

    // Find matching pairs (same amount, opposite types, within 3 days)
    const potential: any[] = [];
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const tx1 = transactions[i];
        const tx2 = transactions[j];

        const dateDiff = Math.abs(new Date(tx1.transaction_date).getTime() - new Date(tx2.transaction_date).getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

        if (
          daysDiff <= 3 &&
          tx1.account_id !== tx2.account_id &&
          tx1.transaction_type !== tx2.transaction_type &&
          Math.abs(tx1.amount - tx2.amount) < 0.01
        ) {
          potential.push({
            from_transaction: tx1.transaction_type === 'debit' ? tx1 : tx2,
            to_transaction: tx1.transaction_type === 'credit' ? tx1 : tx2,
            confidence: daysDiff === 0 ? 0.95 : 0.8,
          });
        }
      }
    }

    return { potential_transfers: potential };
  });

  // Create transfer
  fastify.post('/', async (request, reply) => {
    const {
      from_transaction_id,
      to_transaction_id,
      notes,
    } = request.body as {
      from_transaction_id: string;
      to_transaction_id: string;
      notes?: string;
    };

    // Get both transactions
    const { data: fromTx } = await supabase
      .from('transactions')
      .select('*, account:accounts(currency)')
      .eq('id', from_transaction_id)
      .eq('user_id', request.user!.id)
      .single();

    const { data: toTx } = await supabase
      .from('transactions')
      .select('*, account:accounts(currency)')
      .eq('id', to_transaction_id)
      .eq('user_id', request.user!.id)
      .single();

    if (!fromTx || !toTx) {
      return reply.status(404).send({ error: 'Transactions not found' });
    }

    // Calculate FX rate if different currencies
    let fxRate = 1.0;
    if (fromTx.currency !== toTx.currency) {
      const rate = await fxService.getRate(
        fromTx.currency,
        toTx.currency,
        new Date(fromTx.transaction_date)
      );
      if (rate) fxRate = rate;
    }

    // Create transfer
    const { data, error } = await supabase
      .from('transfers')
      .insert({
        user_id: request.user!.id,
        from_transaction_id,
        to_transaction_id,
        from_account_id: fromTx.account_id,
        to_account_id: toTx.account_id,
        transfer_date: fromTx.transaction_date,
        amount: fromTx.amount,
        currency: fromTx.currency,
        fx_rate: fxRate,
        notes,
      })
      .select()
      .single();

    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    // Update transactions to use transfer category
    const transferCategoryId = '00000000-0000-0000-0000-000000000201';
    await supabase
      .from('transactions')
      .update({ category_id: transferCategoryId })
      .in('id', [from_transaction_id, to_transaction_id]);

    return reply.status(201).send({ transfer: data });
  });

  // Get all transfers
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('transfers')
      .select(`
        *,
        from_transaction:transactions!from_transaction_id(*),
        to_transaction:transactions!to_transaction_id(*),
        from_account:accounts!from_account_id(name),
        to_account:accounts!to_account_id(name)
      `)
      .eq('user_id', request.user!.id)
      .order('transfer_date', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { transfers: data };
  });

  // Delete transfer
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Get transfer to unlink transactions
    const { data: transfer } = await supabase
      .from('transfers')
      .select('from_transaction_id, to_transaction_id')
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (!transfer) {
      return reply.status(404).send({ error: 'Transfer not found' });
    }

    // Delete transfer
    await supabase
      .from('transfers')
      .delete()
      .eq('id', id);

    // Reset transaction categories
    await supabase
      .from('transactions')
      .update({ category_id: null })
      .in('id', [transfer.from_transaction_id, transfer.to_transaction_id]);

    return { message: 'Transfer deleted successfully' };
  });
};
