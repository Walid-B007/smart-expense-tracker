import { FastifyPluginAsync } from 'fastify';
import { supabaseClient } from '../db/supabase';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Sign up
  fastify.post('/signup', async (request, reply) => {
    try {
      const body = signUpSchema.parse(request.body);

      const { data, error } = await supabaseClient.auth.signUp({
        email: body.email,
        password: body.password,
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabaseClient
          .from('users')
          .insert({
            id: data.user.id,
            email: body.email,
            display_name: body.display_name,
          });

        if (profileError) {
          console.error('Failed to create user profile:', profileError);
        }
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Sign in
  fastify.post('/signin', async (request, reply) => {
    try {
      const body = signInSchema.parse(request.body);

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error) {
        return reply.status(401).send({ error: error.message });
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: error.message });
    }
  });

  // Sign out
  fastify.post('/signout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(200).send({ message: 'Signed out' });
    }

    const token = authHeader.replace('Bearer ', '');
    await supabaseClient.auth.signOut();

    return { message: 'Signed out successfully' };
  });

  // Get current user
  fastify.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    return { user: data.user };
  });
};
