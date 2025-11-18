import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../utils/logger';

interface CreateInviteBody {
  links: string[];
  notes?: string;
}

export async function registerInviteRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();

  // GET /api/invites - List all invites
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { search?: string; status?: string } }>, reply: FastifyReply) => {
    try {
      const { search, status } = request.query;
      
      // Build WHERE clause
      let whereClause = '1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ' AND "status" = ?';
        params.push(status);
      }

      if (search) {
        whereClause += ' AND "link" LIKE ?';
        params.push(`%${search}%`);
      }

      // Use raw query to handle both username and uid fields
      const invitesRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT 
          i.*,
          vp.id as via_profile_id,
          vp.username as via_username,
          bp.id as bm_profile_id,
          bp.username as bm_username,
          bp.bmUid as bm_bmUid
        FROM "Invite" i
        LEFT JOIN "Profile" vp ON i."viaId" = vp.id
        LEFT JOIN "Profile" bp ON i."bmId" = bp.id
        WHERE ${whereClause}
        ORDER BY i."createdAt" DESC`,
        ...params
      );

      // Map results to expected format
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
          username: row.via_username || null,
        } : null,
        bmProfile: row.bm_profile_id ? {
          id: row.bm_profile_id,
          username: row.bm_username || null,
          bmUid: row.bm_bmUid || null,
        } : null,
      }));

      return { invites };
    } catch (error: any) {
      logger.error('Failed to list invites:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /api/invites - Create invites
  fastify.post('/', async (request: FastifyRequest<{ Body: CreateInviteBody }>, reply: FastifyReply) => {
    try {
      const { links, notes } = request.body;

      const invites = await Promise.all(
        links.map((link) =>
          prisma.invite.create({
            data: {
              link: link.trim(),
              notes,
              status: 'pending',
            },
          })
        )
      );

      return { invites, count: invites.length };
    } catch (error: any) {
      logger.error('Failed to create invites:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/invites/upload - Upload invites from file
  fastify.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const content = buffer.toString('utf-8');
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && line.startsWith('http'));

      const invites = await Promise.all(
        lines.map((link) =>
          prisma.invite.create({
            data: {
              link,
              status: 'pending',
            },
          })
        )
      );

      return { invites, count: invites.length };
    } catch (error: any) {
      logger.error('Failed to upload invites:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/invites/start - Start invite processing
  fastify.post('/start', async (request: FastifyRequest<{ Body: { inviteIds?: number[]; bmId?: number; viaIds?: number[] } }>, reply: FastifyReply) => {
    try {
      const { inviteIds, bmId, viaIds } = request.body;

      // TODO: Implement invite automation start
      // This will be handled by the automation engine

      return { success: true, message: 'Invite processing started' };
    } catch (error: any) {
      logger.error('Failed to start invites:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // DELETE /api/invites/:id - Delete invite
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      await prisma.invite.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete invite:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /api/invites/batch/delete - Delete multiple invites (using POST to avoid body parsing issues)
  fastify.post('/batch/delete', async (request: FastifyRequest<{ Body: { inviteIds: number[] } }>, reply: FastifyReply) => {
    try {
      const { inviteIds } = request.body;
      if (!inviteIds || inviteIds.length === 0) {
        return reply.code(400).send({ error: 'No invite IDs provided' });
      }
      const result = await prisma.invite.deleteMany({ where: { id: { in: inviteIds } } });
      return { success: true, count: result.count };
    } catch (error: any) {
      logger.error('Failed to delete invites:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

