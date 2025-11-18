import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../utils/logger';

export async function registerReportRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // GET /api/reports/stats - Get report statistics (only for used invites)
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [total, completed, pending] = await Promise.all([
        prisma.invite.count({
          where: {
            OR: [
              { viaId: { not: null } },
              { bmId: { not: null } },
              { status: { in: ['success', 'failed'] } },
            ],
          },
        }),
        prisma.invite.count({ 
          where: { 
            status: 'success',
            OR: [
              { viaId: { not: null } },
              { bmId: { not: null } },
            ],
          },
        }),
        prisma.invite.count({ 
          where: { 
            status: { in: ['pending', 'processing'] },
            OR: [
              { viaId: { not: null } },
              { bmId: { not: null } },
            ],
          },
        }),
      ]);

      return { total, completed, pending };
    } catch (error: any) {
      logger.error('Failed to get report stats:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/reports - Get all reports (only invites that have been used)
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Only show invites that have been used: have viaId/bmId OR status is success/failed
      // This ensures reports are separate from pending link invites
      const invitesRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT 
          i.*,
          vp.id as via_profile_id,
          vp.username as via_username,
          vp.uid as via_uid,
          bp.id as bm_profile_id,
          bp.username as bm_username,
          bp.uid as bm_uid,
          bp.bmUid as bm_bmUid
        FROM "Invite" i
        LEFT JOIN "Profile" vp ON i."viaId" = vp.id
        LEFT JOIN "Profile" bp ON i."bmId" = bp.id
        WHERE (i."viaId" IS NOT NULL OR i."bmId" IS NOT NULL OR i."status" IN ('success', 'failed'))
        ORDER BY i."createdAt" DESC`
      );

      const reports = invitesRaw.map((row: any) => ({
        id: row.id,
        idVia: row.via_profile_id ? `via_${row.via_profile_id}` : null,
        username: row.via_username || row.via_uid || null,
        idAdAccount: row.adAccountId || null,
        idBM: row.bm_profile_id ? `bm_${row.bm_profile_id}` : null,
        bmUid: row.bm_bmUid || null,
        status: row.status === 'success' ? 'completed' : 'pending',
        time: row.completedAt ? new Date(row.completedAt).toISOString() : new Date(row.createdAt).toISOString(),
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

      // Use raw query to handle both username and uid fields
      const invitesRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT 
          i.*,
          vp.id as via_profile_id,
          vp.username as via_username,
          vp.uid as via_uid,
          bp.id as bm_profile_id,
          bp.username as bm_username,
          bp.uid as bm_uid,
          bp.bmUid as bm_bmUid
        FROM "Invite" i
        LEFT JOIN "Profile" vp ON i."viaId" = vp.id
        LEFT JOIN "Profile" bp ON i."bmId" = bp.id
        ORDER BY i."createdAt" DESC`
      );

      if (format === 'csv') {
        const csv = [
          'ID Via,Username,ID Ad Account,ID BM,BM UID,Status,Time',
          ...invitesRaw.map((row: any) => {
            const idVia = row.via_profile_id ? `via_${row.via_profile_id}` : '';
            const username = row.via_username || row.via_uid || '';
            const idAdAccount = row.adAccountId || '';
            const idBM = row.bm_profile_id ? `bm_${row.bm_profile_id}` : '';
            const bmUid = row.bm_bmUid || '';
            const status = row.status === 'success' ? 'completed' : 'pending';
            const time = row.completedAt ? new Date(row.completedAt).toISOString() : new Date(row.createdAt).toISOString();
            return `${idVia},${username},${idAdAccount},${idBM},${bmUid},${status},${time}`;
          }),
        ].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="report.csv"');
        return csv;
      }

      // Map for JSON format
      const invites = invitesRaw.map((row: any) => ({
        id: row.id,
        link: row.link,
        status: row.status,
        notes: row.notes,
        viaId: row.viaId,
        bmId: row.bmId,
        adAccountId: row.adAccountId,
        result: row.result,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
        viaProfile: row.via_profile_id ? {
          id: row.via_profile_id,
          username: row.via_username || row.via_uid || null,
        } : null,
        bmProfile: row.bm_profile_id ? {
          id: row.bm_profile_id,
          username: row.bm_username || row.bm_uid || null,
          bmUid: row.bm_bmUid || null,
        } : null,
      }));

      return { reports: invites };
    } catch (error: any) {
      logger.error('Failed to export reports:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // DELETE /api/reports/batch - Delete selected reports (by IDs)
  // Only delete reports that have been used (have viaId/bmId or status success/failed)
  // This prevents accidentally deleting pending link invites
  fastify.delete('/batch', {
    schema: {
      body: {
        type: 'object',
        required: ['reportIds'],
        properties: {
          reportIds: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { reportIds: number[] } }>, reply: FastifyReply) => {
    try {
      const { reportIds } = request.body;
      if (!reportIds || reportIds.length === 0) {
        return reply.code(400).send({ error: 'No report IDs provided' });
      }

      // Only delete invites that are actually reports (have been used)
      const result = await prisma.invite.deleteMany({
        where: {
          id: { in: reportIds },
          OR: [
            { viaId: { not: null } },
            { bmId: { not: null } },
            { status: { in: ['success', 'failed'] } },
          ],
        },
      });

      logger.info(`Deleted ${result.count} reports`);
      return { success: true, count: result.count };
    } catch (error: any) {
      logger.error('Failed to delete reports:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

