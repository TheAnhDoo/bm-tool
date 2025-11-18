import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '../../db/prismaClient';
import { ProfileManager } from '../../profiles/profileManager';
// Encryption removed - storing data in plain text
import { logger } from '../../utils/logger';

interface CreateProfileBody {
  type: 'VIA' | 'BM';
  proxy: string;
  fingerprint?: string;
  username?: string; // Username for both VIA and BM
  bmUid?: string; // UID BM Trung Gian (only for BM profiles)
  password?: string;
  twoFAKey?: string;
  cookie?: string;
  headless?: boolean;
}

interface UpdateProfileBody {
  username?: string;
  bmUid?: string; // UID BM Trung Gian (only for BM profiles)
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
      
      // Build WHERE clause using raw SQL to support username and bmUid fields
      let whereClause = '1=1';
      const params: any[] = [];
      
      if (type) {
        whereClause += ' AND "type" = ?';
        params.push(type.toUpperCase());
      }
      
      if (search) {
        whereClause += ' AND ("username" LIKE ? OR "bmUid" LIKE ? OR "proxy" LIKE ? OR "uid" LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      const profilesRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE ${whereClause} ORDER BY "pinned" DESC, "createdAt" DESC`,
        ...params
      );

      // Return profiles with plain text data (no decryption needed)
      const decryptedProfiles = profilesRaw.map((p) => ({
        ...p,
        password: p.password,
        twoFAKey: p.twoFAKey,
        cookie: p.cookie,
        // Map uid to username for backward compatibility
        username: p.username || p.uid,
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
      const { type, proxy, fingerprint, username, bmUid, password, twoFAKey, cookie, headless } = request.body;

      const profile = await profileManager.createProfile({
        type,
        proxy,
        fingerprint: fingerprint || 'random',
        username,
        bmUid,
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
      
      // Use raw query to get profiles with username and bmUid fields
      const profilesRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" ORDER BY "pinned" DESC, "createdAt" DESC`
      );

      if (format === 'csv') {
        const csv = [
          'id,type,username,bmUid,proxy,status,createdAt',
          ...profilesRaw.map((p) => {
            const username = p.username || p.uid || '';
            const bmUid = p.bmUid || '';
            const createdAt = p.createdAt ? new Date(p.createdAt).toISOString() : '';
            return `${p.id},${p.type},${username},${bmUid},${p.proxy},${p.status},${createdAt}`;
          }),
        ].join('\n');

        // Return as plain text, not attachment
        reply.header('Content-Type', 'text/csv');
        return csv;
      }

      return { profiles: profilesRaw };
    } catch (error: any) {
      logger.error('Failed to export profiles:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/profiles/:id - Get single profile
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      
      // Use raw query to get profile with username and bmUid fields
      const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE id = ? LIMIT 1`,
        id
      );

      if (!profileRaw || profileRaw.length === 0) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      const profile = profileRaw[0];
      
      // Fetch logs separately
      const logsRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Log" WHERE "profileId" = ? ORDER BY "createdAt" DESC LIMIT 10`,
        id
      );

      return {
        profile: {
          ...profile,
          username: profile.username || profile.uid, // Map uid to username for backward compatibility
          password: profile.password,
          twoFAKey: profile.twoFAKey,
          cookie: profile.cookie,
          logs: logsRaw || [],
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
      
      // Check if profile exists first using raw query
      const existingProfileRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE id = ? LIMIT 1`,
        id
      );
      
      if (!existingProfileRaw || existingProfileRaw.length === 0) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      const { username, bmUid, password, twoFAKey, cookie, deviceConfig } = request.body;

      // Check if bmUid column exists, if not, add it (always check, not just when bmUid is provided)
      try {
        const columns = await prisma.$queryRaw<Array<{ name: string }>>`
          PRAGMA table_info(Profile)
        `;
        const columnNames = columns.map(col => col.name);
        if (!columnNames.includes('bmUid')) {
          logger.info('Adding bmUid column to Profile table...');
          await prisma.$executeRawUnsafe(`ALTER TABLE "Profile" ADD COLUMN "bmUid" TEXT`);
          logger.info('bmUid column added successfully');
        }
      } catch (e: any) {
        logger.warn('Failed to check/add bmUid column:', e);
        // Continue anyway - column might already exist
      }

      // Build UPDATE query dynamically using raw SQL to support bmUid field
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (username !== undefined) {
        updateFields.push(`"username" = ?`);
        updateValues.push(username || null);
      }
      if (bmUid !== undefined) {
        updateFields.push(`"bmUid" = ?`);
        updateValues.push(bmUid || null);
      }
      if (password !== undefined) {
        updateFields.push(`"password" = ?`);
        updateValues.push(password || null);
      }
      if (twoFAKey !== undefined) {
        updateFields.push(`"twoFAKey" = ?`);
        updateValues.push(twoFAKey || null);
      }
      if (cookie !== undefined) {
        updateFields.push(`"cookie" = ?`);
        updateValues.push(cookie || null);
      }
      if (deviceConfig !== undefined) {
        updateFields.push(`"deviceConfig" = ?`);
        updateValues.push(deviceConfig);
      }
      
      // Always update updatedAt
      updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      
      if (updateFields.length > 0) {
        updateValues.push(id);
        const updateQuery = `UPDATE "Profile" SET ${updateFields.join(', ')} WHERE id = ?`;
        await prisma.$executeRawUnsafe(updateQuery, ...updateValues);
      }

      // Fetch updated profile using raw query
      const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE id = ? LIMIT 1`,
        id
      );
      
      if (!profileRaw || profileRaw.length === 0) {
        return reply.code(404).send({ error: 'Profile not found after update' });
      }
      
      const profile = profileRaw[0];

      return {
        profile: {
          ...profile,
          password: profile.password,
          twoFAKey: profile.twoFAKey,
          cookie: profile.cookie,
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
      
      // Check if profile exists first
      const existingProfile = await prisma.profile.findUnique({ where: { id } });
      if (!existingProfile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      
      await prisma.profile.delete({ where: { id } });
      
      // Renumber all remaining profiles to have sequential IDs
      // Wrap in try-catch to prevent delete failure if renumbering fails
      try {
        await renumberProfileIds();
      } catch (renumberError: any) {
        logger.warn('Failed to renumber profile IDs after delete (non-critical):', renumberError);
        // Don't fail the delete operation if renumbering fails
      }
      
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

