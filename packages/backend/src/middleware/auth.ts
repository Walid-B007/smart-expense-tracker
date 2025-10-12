import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../db/supabase';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = {
      id: data.user.id,
      email: data.user.email || '',
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Authentication failed' });
  }
}
