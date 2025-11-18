import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { logger } from '../utils/logger';
import { registerProfileRoutes } from './routes/profiles';
import { registerInviteRoutes } from './routes/invites';
import { registerAutomationRoutes } from './routes/automation';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerReportRoutes } from './routes/reports';

export async function startApiServer() {
  const fastify = Fastify({
    logger: false, // We use Winston for logging
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true, // Allow all origins (internal use only)
  });

  await fastify.register(multipart);

  // Register routes
  await fastify.register(registerProfileRoutes, { prefix: '/api/profiles' });
  await fastify.register(registerInviteRoutes, { prefix: '/api/invites' });
  await fastify.register(registerAutomationRoutes, { prefix: '/api/automation' });
  await fastify.register(registerDashboardRoutes, { prefix: '/api/dashboard' });
  await fastify.register(registerReportRoutes, { prefix: '/api/reports' });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  const port = 3001;
  const host = '127.0.0.1';

  try {
    await fastify.listen({ port, host });
    logger.info(`API server listening on http://${host}:${port}`);
    return fastify;
  } catch (error) {
    logger.error('Failed to start API server:', error);
    throw error;
  }
}

