import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { ProfileManager } from '../../profiles/profileManager';
import { encrypt, decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';

interface CreateProfileBody {
  type: 'VIA' | 'BM';
  proxy: string;
  fingerprint?: string;
  uid?: string;
  password?: string;
  twoFAKey?: string;
  cookie?: string;
  headless?: boolean;
}

interface UpdateProfileBody {
  uid?: string;
  password?: string;
  twoFAKey?: string;
  cookie?: string;
  deviceConfig?: string;
}

interface BatchCreateBody {
  type: 'VIA' | 'BM';
  accounts: string[]; // Format: "UID|PASS|2FA|PROXY"
}

interface StartProfileBody {
  profileIds?: number[];
}

export async function registerProfileRoutes(fastify: FastifyInstance) {
  const prisma = getPrismaClient();
  const profileManager = new ProfileManager(); // Safe now - Prisma is lazy-loaded

  // GET /api/profiles - List all profiles
  fastify.get('/', async (request: FastifyRequest<{ Querystring: { type?: string; search?: string } }>, reply: FastifyReply) => {
    try {
      const { type, search } = request.query;
      const where: any = {};

      if (type) {
        where.type = type.toUpperCase();
      }

      if (search) {
        where.OR = [
          { uid: { contains: search } },
          { proxy: { contains: search } },
        ];
      }

      const profiles = await prisma.profile.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      });

      // Decrypt sensitive data
      const decryptedProfiles = profiles.map((p) => ({
        ...p,
        password: p.password ? decrypt(p.password) : null,
        twoFAKey: p.twoFAKey ? decrypt(p.twoFAKey) : null,
        cookie: p.cookie ? decrypt(p.cookie) : null,
      }));

      return { profiles: decryptedProfiles };
    } catch (error: any) {
      logger.error('Failed to list profiles:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /api/profiles - Create a single profile
  fastify.post('/', async (request: FastifyRequest<{ Body: CreateProfileBody }>, reply: FastifyReply) => {
    try {
      const { type, proxy, fingerprint, uid, password, twoFAKey, cookie, headless } = request.body;

      const profile = await profileManager.createProfile({
        type,
        proxy,
        fingerprint: fingerprint || 'random',
        uid,
        password,
        twoFAKey,
        cookie,
        headless: headless || false,
      });

      return { profile };
    } catch (error: any) {
      logger.error('Failed to create profile:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/batch - Create multiple profiles
  fastify.post('/batch', async (request: FastifyRequest<{ Body: BatchCreateBody }>, reply: FastifyReply) => {
    try {
      const { type, accounts } = request.body;

      const profiles = await profileManager.createProfilesFromBatch(type, accounts);

      return { profiles, count: profiles.length };
    } catch (error: any) {
      logger.error('Failed to create batch profiles:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/import - Import profiles from file
  fastify.post('/import', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      const buffer = await data.toBuffer();
      const content = buffer.toString('utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      const accounts: string[] = [];
      for (const line of lines) {
        // Support both CSV and pipe-delimited formats
        if (line.includes('|')) {
          accounts.push(line.trim());
        } else if (line.includes(',')) {
          const parts = line.split(',');
          if (parts.length >= 7) {
            // CSV format: uid,pass,2fa,proxy_ip,proxy_port,proxy_user,proxy_pass
            accounts.push(`${parts[0]}|${parts[1]}|${parts[2]}|${parts[3]}:${parts[4]}:${parts[5]}:${parts[6]}`);
          }
        }
      }

      const type = (request.query as any).type || 'VIA';
      const profiles = await profileManager.createProfilesFromBatch(type.toUpperCase() as 'VIA' | 'BM', accounts);

      return { profiles, count: profiles.length };
    } catch (error: any) {
      logger.error('Failed to import profiles:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // GET /api/profiles/export - Export profiles
  fastify.get('/export', async (request: FastifyRequest<{ Querystring: { format?: string } }>, reply: FastifyReply) => {
    try {
      const format = request.query.format || 'csv';
      const profiles = await prisma.profile.findMany();

      if (format === 'csv') {
        const csv = [
          'id,type,uid,proxy,status,createdAt',
          ...profiles.map((p) => `${p.id},${p.type},${p.uid || ''},${p.proxy},${p.status},${p.createdAt.toISOString()}`),
        ].join('\n');

        // Return as plain text, not attachment
        reply.header('Content-Type', 'text/csv');
        return csv;
      }

      return { profiles };
    } catch (error: any) {
      logger.error('Failed to export profiles:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/profiles/:id - Get single profile
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      const profile = await prisma.profile.findUnique({
        where: { id },
        include: { logs: { take: 10, orderBy: { createdAt: 'desc' } } },
      });

      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return {
        profile: {
          ...profile,
          password: profile.password ? decrypt(profile.password) : null,
          twoFAKey: profile.twoFAKey ? decrypt(profile.twoFAKey) : null,
          cookie: profile.cookie ? decrypt(profile.cookie) : null,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get profile:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // PUT /api/profiles/:id - Update profile
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProfileBody }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      const { uid, password, twoFAKey, cookie, deviceConfig } = request.body;

      const updateData: any = {};
      if (uid !== undefined) updateData.uid = uid;
      if (password !== undefined) updateData.password = password ? encrypt(password) : null;
      if (twoFAKey !== undefined) updateData.twoFAKey = twoFAKey ? encrypt(twoFAKey) : null;
      if (cookie !== undefined) updateData.cookie = cookie ? encrypt(cookie) : null;
      if (deviceConfig !== undefined) updateData.deviceConfig = deviceConfig;

      const profile = await prisma.profile.update({
        where: { id },
        data: updateData,
      });

      return {
        profile: {
          ...profile,
          password: profile.password ? decrypt(profile.password) : null,
          twoFAKey: profile.twoFAKey ? decrypt(profile.twoFAKey) : null,
          cookie: profile.cookie ? decrypt(profile.cookie) : null,
        },
      };
    } catch (error: any) {
      logger.error('Failed to update profile:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // Helper function to renumber profile IDs sequentially
  async function renumberProfileIds(): Promise<void> {
    try {
      // Get all profiles ordered by current ID
      const allProfiles = await prisma.profile.findMany({
        orderBy: { id: 'asc' },
      });

      if (allProfiles.length === 0) {
        // Reset sequence if no profiles left
        await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Profile'`);
        return;
      }

      // Create a mapping of old ID to new ID
      const idMapping = new Map<number, number>();
      allProfiles.forEach((profile, index) => {
        const newId = index + 1;
        if (profile.id !== newId) {
          idMapping.set(profile.id, newId);
        }
      });

      if (idMapping.size === 0) {
        return; // No renumbering needed
      }

      // Disable foreign key constraints temporarily
      await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`);

      try {
        // Step 1: Update foreign keys in Invite table first
        for (const [oldId, newId] of idMapping.entries()) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Invite" SET "viaId" = ${newId} WHERE "viaId" = ${oldId}
          `);
          await prisma.$executeRawUnsafe(`
            UPDATE "Invite" SET "bmId" = ${newId} WHERE "bmId" = ${oldId}
          `);
        }

        // Step 2: Update foreign keys in Log table
        for (const [oldId, newId] of idMapping.entries()) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Log" SET "profileId" = ${newId} WHERE "profileId" = ${oldId}
          `);
        }

        // Step 3: Renumber profiles (work backwards to avoid conflicts)
        const sortedMapping = Array.from(idMapping.entries()).sort((a, b) => b[0] - a[0]);
        for (const [oldId, newId] of sortedMapping) {
          // First, set ID to a temporary negative value to avoid conflicts
          await prisma.$executeRawUnsafe(`
            UPDATE "Profile" SET "id" = -${oldId} WHERE "id" = ${oldId}
          `);
        }

        // Now set to final IDs
        for (const [oldId, newId] of sortedMapping) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Profile" SET "id" = ${newId} WHERE "id" = -${oldId}
          `);
        }

        // Step 4: Reset sequence to next available ID
        const maxId = allProfiles.length;
        await prisma.$executeRawUnsafe(`
          DELETE FROM sqlite_sequence WHERE name='Profile';
          INSERT INTO sqlite_sequence (name, seq) VALUES ('Profile', ${maxId});
        `);
      } finally {
        // Re-enable foreign key constraints
        await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=ON`);
      }

      logger.info(`Renumbered ${idMapping.size} profile IDs`);
    } catch (error: any) {
      logger.error('Failed to renumber profile IDs:', error);
      throw error;
    }
  }

  // DELETE /api/profiles/:id - Delete profile
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      await prisma.profile.delete({ where: { id } });
      
      // Renumber all remaining profiles to have sequential IDs
      await renumberProfileIds();
      
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete profile:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // POST /api/profiles/:id/start - Start profile automation
  fastify.post('/:id/start', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      await profileManager.startProfile(id);
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to start profile:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/:id/stop - Stop profile automation
  fastify.post('/:id/stop', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      await profileManager.stopProfile(id);
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to stop profile:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/start - Start multiple profiles
  fastify.post('/start', async (request: FastifyRequest<{ Body: StartProfileBody }>, reply: FastifyReply) => {
    try {
      const { profileIds } = request.body;
      if (profileIds && profileIds.length > 0) {
        await Promise.all(profileIds.map((id) => profileManager.startProfile(id)));
      } else {
        // Start all profiles
        const profiles = await prisma.profile.findMany({ where: { status: { not: 'running' } } });
        await Promise.all(profiles.map((p) => profileManager.startProfile(p.id)));
      }
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to start profiles:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/stop - Stop multiple profiles
  fastify.post('/stop', async (request: FastifyRequest<{ Body: StartProfileBody }>, reply: FastifyReply) => {
    try {
      const { profileIds } = request.body;
      if (profileIds && profileIds.length > 0) {
        await Promise.all(profileIds.map((id) => profileManager.stopProfile(id)));
      } else {
        // Stop all profiles
        const profiles = await prisma.profile.findMany({ where: { status: 'running' } });
        await Promise.all(profiles.map((p) => profileManager.stopProfile(p.id)));
      }
      return { success: true };
    } catch (error: any) {
      logger.error('Failed to stop profiles:', error);
      reply.code(400).send({ error: error.message });
    }
  });

  // POST /api/profiles/test-proxy - Test proxy connection
  fastify.post('/test-proxy', async (request: FastifyRequest<{ Body: { proxy: string } }>, reply: FastifyReply) => {
    try {
      const { proxy } = request.body;
      const isValid = await profileManager.testProxy(proxy);
      return { valid: isValid };
    } catch (error: any) {
      logger.error('Failed to test proxy:', error);
      reply.code(400).send({ error: error.message });
    }
  });
}

