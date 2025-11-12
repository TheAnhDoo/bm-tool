import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../utils/logger';

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // GET /api/dashboard/stats - Get dashboard statistics
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [totalProfiles, viaProfiles, bmProfiles, totalInvites, runningProfiles] = await Promise.all([
        prisma.profile.count(),
        prisma.profile.count({ where: { type: 'VIA' } }),
        prisma.profile.count({ where: { type: 'BM' } }),
        prisma.invite.count(),
        prisma.profile.count({ where: { status: 'running' } }),
      ]);

      return {
        totalProfiles,
        viaActive: viaProfiles,
        bmTrungGian: bmProfiles,
        linkInvites: totalInvites,
        runningNow: runningProfiles,
      };
    } catch (error: any) {
      logger.error('Failed to get dashboard stats:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/dashboard/activity - Get recent activity
  fastify.get('/activity', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recentLogs = await prisma.log.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { id: true, type: true, uid: true } },
        },
      });

      const activities = recentLogs.map((log) => ({
        action: log.message,
        time: log.createdAt.toISOString(),
        profile: log.profile ? `${log.profile.type}_${log.profile.id}` : null,
      }));

      return { activities };
    } catch (error: any) {
      logger.error('Failed to get dashboard activity:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/dashboard/system - Get system status
  fastify.get('/system', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const runningProfiles = await prisma.profile.count({ where: { status: 'running' } });
      const totalProfiles = await prisma.profile.count();

      // Get system metrics (simplified - in production, use actual system monitoring)
      const cpuUsage = Math.floor(Math.random() * 50) + 20; // Mock data
      const memoryUsage = Math.floor(Math.random() * 40) + 40; // Mock data
      const profilesRunning = totalProfiles > 0 ? Math.round((runningProfiles / totalProfiles) * 100) : 0;

      return {
        cpuUsage,
        memoryUsage,
        profilesRunning,
      };
    } catch (error: any) {
      logger.error('Failed to get system status:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

