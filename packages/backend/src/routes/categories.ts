import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../db/supabase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().optional().nullable(),
  category_type: z.enum(['income', 'expense', 'transfer']),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

const updateCategorySchema = createCategorySchema.partial();

export const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', authMiddleware);

  // Get all categories (system + user's custom)
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`is_system.eq.true,user_id.eq.${request.user!.id}`)
      .order('name');

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    // Build hierarchical structure
    const categoryMap = new Map(data.map((cat) => [cat.id, { ...cat, children: [] }]));
    const rootCategories: any[] = [];

    data.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return { categories: rootCategories };
  });

  // Get single category by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .or(`is_system.eq.true,user_id.eq.${request.user!.id}`)
      .single();

    if (error || !data) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    return { category: data };
  });

  // Create custom category
  fastify.post('/', async (request, reply) => {
    try {
      const body = createCategorySchema.parse(request.body);

      // If parent_id is provided, verify it exists and is accessible
      if (body.parent_id) {
        const { data: parent } = await supabase
          .from('categories')
          .select('id, category_type')
          .eq('id', body.parent_id)
          .or(`is_system.eq.true,user_id.eq.${request.user!.id}`)
          .single();

        if (!parent) {
          return reply.status(400).send({ error: 'Parent category not found' });
        }

        // Verify category type matches parent
        if (parent.category_type !== body.category_type) {
          return reply.status(400).send({ error: 'Subcategory must match parent category type' });
        }
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...body,
          user_id: request.user!.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(201).send({ category: data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update custom category
  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = updateCategorySchema.parse(request.body);

      // Verify category exists and is owned by user (not system)
      const { data: existing } = await supabase
        .from('categories')
        .select('id, is_system')
        .eq('id', id)
        .eq('user_id', request.user!.id)
        .single();

      if (!existing) {
        return reply.status(404).send({ error: 'Category not found or cannot be modified' });
      }

      if (existing.is_system) {
        return reply.status(403).send({ error: 'System categories cannot be modified' });
      }

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', request.user!.id)
        .select()
        .single();

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { category: data };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Delete custom category
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify category exists and is owned by user (not system)
    const { data: existing } = await supabase
      .from('categories')
      .select('id, is_system')
      .eq('id', id)
      .eq('user_id', request.user!.id)
      .single();

    if (!existing) {
      return reply.status(404).send({ error: 'Category not found or cannot be deleted' });
    }

    if (existing.is_system) {
      return reply.status(403).send({ error: 'System categories cannot be deleted' });
    }

    // Check if category is in use
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if (count && count > 0) {
      return reply.status(400).send({
        error: `Cannot delete category with ${count} transactions. Please reassign them first.`
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', request.user!.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { message: 'Category deleted successfully' };
  });
};
