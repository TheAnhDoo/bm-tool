import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../utils/logger';

async function tableExists(prisma: PrismaClient, tableName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      tableName
    );
    return (result[0]?.count || 0) > 0;
  } catch (error) {
    logger.warn(`Failed to check if table ${tableName} exists:`, error);
    return false;
  }
}

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // GET /api/dashboard/stats - Get dashboard statistics
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Use raw queries to handle cases where tables might not exist
      const [totalProfilesRaw, viaProfilesRaw, bmProfilesRaw, runningProfilesRaw] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile"`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "type" = 'VIA'`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "type" = 'BM'`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "status" = 'running'`),
      ]);

      // Check if Invite table exists before querying
      let totalInvites = 0;
      if (await tableExists(prisma, 'Invite')) {
        const inviteCountRaw = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
          `SELECT COUNT(*) as count FROM "Invite"`
        );
        totalInvites = inviteCountRaw[0]?.count || 0;
      } else {
        logger.debug('Invite table does not exist yet');
      }

      const totalProfiles = totalProfilesRaw[0]?.count || 0;
      const viaProfiles = viaProfilesRaw[0]?.count || 0;
      const bmProfiles = bmProfilesRaw[0]?.count || 0;
      const runningProfiles = runningProfilesRaw[0]?.count || 0;

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
          profile: { select: { id: true, type: true, username: true } },
        },
      });

      const activities = recentLogs.map((log) => {
        const profileIdentifier =
          log.profile?.username || (log.profile?.id != null ? log.profile.id.toString() : null);

        return {
          action: log.message,
          time: log.createdAt.toISOString(),
          profile: log.profile && profileIdentifier
            ? `${log.profile.type}_${profileIdentifier}`
            : null,
        };
      });

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

