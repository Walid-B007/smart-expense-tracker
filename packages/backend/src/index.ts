import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { accountRoutes } from './routes/accounts';
import { transactionRoutes } from './routes/transactions';
import { categoryRoutes } from './routes/categories';
import { importRoutes } from './routes/imports';
import { transferRoutes } from './routes/transfers';
import { dashboardRoutes } from './routes/dashboard';
import { fxRoutes } from './routes/fx';
import { startCronJobs } from './cron';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: config.FRONTEND_URL,
      credentials: true,
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    });

    await fastify.register(jwt, {
      secret: config.JWT_SECRET,
    });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(accountRoutes, { prefix: '/api/accounts' });
    await fastify.register(transactionRoutes, { prefix: '/api/transactions' });
    await fastify.register(categoryRoutes, { prefix: '/api/categories' });
    await fastify.register(importRoutes, { prefix: '/api/imports' });
    await fastify.register(transferRoutes, { prefix: '/api/transfers' });
    await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
    await fastify.register(fxRoutes, { prefix: '/api/fx' });

    // Start cron jobs
    if (config.NODE_ENV !== 'test') {
      startCronJobs();
    }

    // Start server
    const port = config.PORT;
    await fastify.listen({ port, host: '0.0.0.0' });

    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📊 Environment: ${config.NODE_ENV}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
