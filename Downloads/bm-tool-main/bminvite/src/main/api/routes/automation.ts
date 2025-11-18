import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AutomationController } from '../../automation/flowController';
import { logger } from '../../utils/logger';

export async function registerAutomationRoutes(fastify: FastifyInstance) {
  const controller = AutomationController.getInstance();

  // POST /api/automation/run - Start automation
  fastify.post('/run', async (request: FastifyRequest<{ Body: { inviteIds?: number[]; bmId?: number; viaIds?: number[] } }>, reply: FastifyReply) => {
    try {
      const { inviteIds, bmId, viaIds } = request.body;
      await controller.startAutomation({ inviteIds, bmId, viaIds });
      return { success: true, message: 'Automation started' };
    } catch (error: any) {
      logger.error('Failed to start automation:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/automation/stop - Stop automation
  fastify.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await controller.stopAutomation();
      return { success: true, message: 'Automation stopped' };
    } catch (error: any) {
      logger.error('Failed to stop automation:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/automation/status - Get automation status
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = controller.getStatus();
      return status;
    } catch (error: any) {
      logger.error('Failed to get automation status:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

