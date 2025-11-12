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
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.link = { contains: search };
      }

      const invites = await prisma.invite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          viaProfile: { select: { id: true, uid: true } },
          bmProfile: { select: { id: true, uid: true } },
        },
      });

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

  // DELETE /api/invites/batch - Delete multiple invites
  fastify.delete('/batch', async (request: FastifyRequest<{ Body: { inviteIds: number[] } }>, reply: FastifyReply) => {
    try {
      const { inviteIds } = request.body;
      await prisma.invite.deleteMany({ where: { id: { in: inviteIds } } });
      return { success: true, count: inviteIds.length };
    } catch (error: any) {
      logger.error('Failed to delete invites:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}

