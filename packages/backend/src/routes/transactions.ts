import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { classifier } from '../services/llm/classifier';
import { z } from 'zod';

const createTransactionSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  transaction_date: z.string(),
  description: z.string().min(1),
  amount: z.number(),
  currency: z.string().length(3).default('USD'),
  transaction_type: z.enum(['debit', 'credit']),
  merchant_name: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTransactionSchema = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional().nullable(),
  transaction_date: z.string().optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  transaction_type: z.enum(['debit', 'credit']).optional(),
  merchant_name: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Get all transactions with filters
  fastify.get('/', async (request, reply) => {
    const {
      account_id,
      category_id,
      start_date,
      end_date,
      search,
      limit = 100,
      offset = 0,
    } = request.query as any;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(name, currency),
        category:categories(name, icon, color)
      `)
      .eq('user_id', request.user!.id);

    if (account_id) query = query.eq('account_id', account_id);
    if (category_id) query = query.eq('category_id', category_id);
    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);
    if (search) {
      query = query.or(`description.ilike.%${search}%,merchant_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return {
      transactions: data,
      total: count,
      limit,
      offset,
    };
  });

  // Get transaction by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(name, currency),
        category:categories(name, icon, color),
        suggestions:category_suggestions(*, category:categories(name))
      `)
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    return { transaction: data };
  });

  // Create transaction
  fastify.post('/', async (request, reply) => {
    try {
      const body = createTransactionSchema.parse(request.body);

      // Verify account ownership
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', body.account_id)
        .eq('user_id', request.user!.id)
        .single();

      if (!account) {
        return reply.status(403).send({ error: 'Account not found or access denied' });
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...body,
          user_id: request.user!.id,
        })
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      // Trigger async classification if no category provided
      if (!body.category_id) {
        classifier.classifyTransaction(data).catch((err) => {
          console.error('Failed to classify transaction:', err);
        });
      }

      return reply.status(201).send({ transaction: data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update transaction
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = updateTransactionSchema.parse(request.body);

      // If account_id is being changed, verify ownership
      if (updates.account_id) {
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', updates.account_id)
          .eq('user_id', request.user!.id)
          .single();

        if (!account) {
          return reply.status(403).send({ error: 'Account not found or access denied' });
        }
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', request.user!.id)
        .select(`
          *,
          account:accounts(name, currency),
          category:categories(name, icon, color)
        `)
        .single();

      if (error || !data) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      return { transaction: data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Delete transaction
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', request.user!.id);

    if (error) {
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    return { message: 'Transaction deleted successfully' };
  });

  // Batch classify transactions
  fastify.post('/classify/batch', async (request, reply) => {
    const { transaction_ids, auto_apply = true, min_confidence = 0.8 } = request.body as {
      transaction_ids: string[];
      auto_apply?: boolean;
      min_confidence?: number;
    };

    console.log(`🤖 [AI Classification] Starting for ${transaction_ids.length} transactions`);
    console.log(`⚙️ [AI Classification] Auto-apply: ${auto_apply}, Min confidence: ${min_confidence}`);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .in('id', transaction_ids)
      .eq('user_id', request.user!.id);

    if (error || !transactions) {
      console.error('❌ [AI Classification] Failed to fetch transactions:', error);
      return reply.status(400).send({ error: 'Failed to fetch transactions' });
    }

    console.log(`✅ [AI Classification] Fetched ${transactions.length} transactions`);
    console.log(`🔑 [AI Classification] DeepSeek API configured: ${process.env.DEEPSEEK_API_KEY ? 'YES' : 'NO'}`);

    try {
      const suggestions = await classifier.classifyBatch(transactions);

      console.log(`✅ [AI Classification] Generated ${suggestions.length} suggestions`);
      if (suggestions.length > 0) {
        console.log(`📊 [AI Classification] Sample suggestion:`, {
          transaction_id: suggestions[0].transaction_id,
          category_id: suggestions[0].category_id,
          confidence: suggestions[0].confidence_score,
        });
      }

      // Auto-apply high confidence suggestions if enabled
      let appliedCount = 0;
      if (auto_apply && suggestions.length > 0) {
        console.log(`🔄 [AI Classification] Auto-applying suggestions with confidence >= ${min_confidence}`);

        // Filter suggestions that meet minimum confidence
        const highConfidenceSuggestions = suggestions.filter(
          s => s.confidence_score >= min_confidence
        );

        console.log(`📊 [AI Classification] ${highConfidenceSuggestions.length}/${suggestions.length} suggestions meet confidence threshold`);

        // Apply categories to transactions
        for (const suggestion of highConfidenceSuggestions) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ category_id: suggestion.category_id })
            .eq('id', suggestion.transaction_id)
            .eq('user_id', request.user!.id);

          if (updateError) {
            console.error(`❌ [AI Classification] Failed to update transaction ${suggestion.transaction_id}:`, updateError);
          } else {
            // Mark suggestion as accepted
            await supabase
              .from('category_suggestions')
              .update({ is_accepted: true })
              .eq('id', suggestion.id);

            appliedCount++;
            console.log(`✅ [AI Classification] Applied category ${suggestion.category_id} to transaction ${suggestion.transaction_id} (confidence: ${suggestion.confidence_score})`);
          }
        }

        console.log(`✨ [AI Classification] Auto-applied ${appliedCount}/${highConfidenceSuggestions.length} categories`);
      }

      return {
        suggestions,
        count: suggestions.length,
        applied: appliedCount,
        auto_apply,
        min_confidence
      };
    } catch (classificationError: any) {
      console.error('❌ [AI Classification] Error during classification:', classificationError);
      return reply.status(500).send({
        error: 'Classification failed',
        details: classificationError.message || 'Unknown error',
      });
    }
  });

  // Auto-apply existing suggestions
  fastify.post('/classify/auto-apply', async (request, reply) => {
    const { min_confidence = 0.8 } = request.body as { min_confidence?: number };

    console.log(`🔄 [Auto-Apply] Starting auto-apply for user ${request.user!.id} with min confidence ${min_confidence}`);

    try {
      const appliedCount = await classifier.autoApplySuggestions(request.user!.id, min_confidence);

      return {
        message: 'Auto-apply completed',
        applied: appliedCount,
        min_confidence
      };
    } catch (error: any) {
      console.error('❌ [Auto-Apply] Error:', error);
      return reply.status(500).send({
        error: 'Auto-apply failed',
        details: error.message || 'Unknown error',
      });
    }
  });

  // Apply category suggestion
  fastify.post('/:id/apply-suggestion', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { suggestion_id } = request.body as { suggestion_id: string };

    // Get suggestion
    const { data: suggestion, error: suggError } = await supabase
      .from('category_suggestions')
      .select('category_id')
      .eq('id', suggestion_id)
      .eq('transaction_id', id)
      .single();

    if (suggError || !suggestion) {
      return reply.status(404).send({ error: 'Suggestion not found' });
    }

    // Update transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({ category_id: suggestion.category_id })
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .select()
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Transaction not found' });
    }

    // Mark suggestion as accepted
    await supabase
      .from('category_suggestions')
      .update({ is_accepted: true })
      .eq('id', suggestion_id);

    return { transaction: data };
  });
};
