import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../utils/logger';

export async function registerReportRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // GET /api/reports/stats - Get report statistics
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [total, completed, pending] = await Promise.all([
        prisma.invite.count(),
        prisma.invite.count({ where: { status: 'success' } }),
        prisma.invite.count({ where: { status: { in: ['pending', 'processing'] } } }),
      ]);

      return { total, completed, pending };
    } catch (error: any) {
      logger.error('Failed to get report stats:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/reports - Get all reports
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const invites = await prisma.invite.findMany({
        where: {
          status: { in: ['success', 'failed', 'pending', 'processing'] },
        },
        include: {
          viaProfile: { select: { id: true, uid: true } },
          bmProfile: { select: { id: true, uid: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const reports = invites.map((invite) => ({
        id: invite.id,
        idVia: invite.viaProfile ? `via_${invite.viaProfile.id}` : null,
        uid: invite.viaProfile?.uid || null,
        idAdAccount: invite.adAccountId || null,
        idBM: invite.bmProfile ? `bm_${invite.bmProfile.id}` : null,
        status: invite.status === 'success' ? 'completed' : 'pending',
        time: invite.completedAt?.toISOString() || invite.createdAt.toISOString(),
      }));

      return { reports };
    } catch (error: any) {
      logger.error('Failed to get reports:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/reports/export - Export reports as CSV
  fastify.get('/export', async (request: FastifyRequest<{ Querystring: { format?: string } }>, reply: FastifyReply) => {
    try {
      const format = request.query.format || 'csv';

      const invites = await prisma.invite.findMany({
        include: {
          viaProfile: { select: { id: true, uid: true } },
          bmProfile: { select: { id: true, uid: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'csv') {
        const csv = [
          'ID Via,UID,ID Ad Account,ID BM,Status,Time',
          ...invites.map((invite) => {
            const idVia = invite.viaProfile ? `via_${invite.viaProfile.id}` : '';
            const uid = invite.viaProfile?.uid || '';
            const idAdAccount = invite.adAccountId || '';
            const idBM = invite.bmProfile ? `bm_${invite.bmProfile.id}` : '';
            const status = invite.status === 'success' ? 'completed' : 'pending';
            const time = invite.completedAt?.toISOString() || invite.createdAt.toISOString();
            return `${idVia},${uid},${idAdAccount},${idBM},${status},${time}`;
          }),
        ].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="report.csv"');
        return csv;
      }

      return { reports: invites };
    } catch (error: any) {
      logger.error('Failed to export reports:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

