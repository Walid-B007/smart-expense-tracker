import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'investment', 'cash', 'other']),
  currency: z.string().length(3).default('USD'),
  initial_balance: z.number().default(0),
  institution: z.string().optional(),
  account_number: z.string().optional(),
});

const updateAccountSchema = createAccountSchema.partial();

export const accountRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Get all accounts
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', request.user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { accounts: data };
  });

  // Get account by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Account not found' });
    }

    return { account: data };
  });

  // Create account
  fastify.post('/', async (request, reply) => {
    try {
      const body = createAccountSchema.parse(request.body);

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...body,
          user_id: request.user!.id,
          current_balance: body.initial_balance,
        })
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(201).send({ account: data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update account
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateAccountSchema.parse(request.body);

      const { data, error } = await supabase
        .from('accounts')
        .update(body)
        .eq('id', id)
        .eq('user_id', request.user!.id)
        .select()
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      return { account: data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Delete account (soft delete)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .select()
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Account not found' });
    }

    return { message: 'Account deleted successfully' };
  });

  // Get account balance history
  fastify.get('/:id/balance-history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { days = 30 } = request.query as { days?: number };

    // Verify ownership
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (!account) {
      return reply.status(404).send({ error: 'Account not found' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, amount, transaction_type, current_balance:metadata->current_balance')
      .eq('account_id', id)
      .gte('transaction_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('transaction_date', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { history: data };
  });
};
