import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

/**
 * Initialize database schema by creating tables if they don't exist
 * Uses SQL directly to avoid needing Prisma CLI in packaged apps
 */
export async function initializeSchema(databaseUrl?: string): Promise<void> {
  let tempPrisma: PrismaClient | null = null;
  
  try {
    // Create a temporary Prisma client for schema initialization
    const dbUrl = databaseUrl || process.env.DATABASE_URL || 'file:./data/bminvite.db';
    
    tempPrisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
    
    await tempPrisma.$connect();
    const prisma = tempPrisma;
    
    // Check if tables exist
    const tables = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('Profile', 'Invite', 'Log')
    `;

    if (tables.length === 3) {
      logger.info('Database tables already exist');
      
      // Check if cookie column exists in Profile table, add it if missing
      const columns = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info(Profile)
      `;
      
      const hasCookieColumn = columns.some(col => col.name === 'cookie');
      if (!hasCookieColumn) {
        logger.info('Adding cookie column to Profile table...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Profile" ADD COLUMN "cookie" TEXT;
        `);
        logger.info('Cookie column added successfully');
      }
      
      return;
    }

    logger.info('Creating database tables...');
    
    // Create tables using SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Profile" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "type" TEXT NOT NULL,
        "uid" TEXT,
        "password" TEXT,
        "twoFAKey" TEXT,
        "cookie" TEXT,
        "proxy" TEXT NOT NULL,
        "chromeProfile" TEXT NOT NULL,
        "deviceConfig" TEXT NOT NULL,
        "pinned" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'idle',
        "lastUsedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Invite" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "link" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "viaId" INTEGER,
        "bmId" INTEGER,
        "adAccountId" TEXT,
        "result" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" DATETIME,
        FOREIGN KEY ("viaId") REFERENCES "Profile"("id") ON DELETE SET NULL,
        FOREIGN KEY ("bmId") REFERENCES "Profile"("id") ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS "Log" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "profileId" INTEGER,
        "action" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "screenshot" TEXT,
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "Profile_type_idx" ON "Profile"("type");
      CREATE INDEX IF NOT EXISTS "Profile_status_idx" ON "Profile"("status");
      CREATE INDEX IF NOT EXISTS "Profile_pinned_idx" ON "Profile"("pinned");
      CREATE INDEX IF NOT EXISTS "Invite_status_idx" ON "Invite"("status");
      CREATE INDEX IF NOT EXISTS "Invite_viaId_idx" ON "Invite"("viaId");
      CREATE INDEX IF NOT EXISTS "Invite_bmId_idx" ON "Invite"("bmId");
      CREATE INDEX IF NOT EXISTS "Log_profileId_idx" ON "Log"("profileId");
      CREATE INDEX IF NOT EXISTS "Log_createdAt_idx" ON "Log"("createdAt");
      CREATE INDEX IF NOT EXISTS "Log_status_idx" ON "Log"("status");
    `);

    logger.info('Database tables created successfully');
  } catch (error: any) {
    logger.error('Failed to initialize database schema:', error);
    // Don't throw - app might still work if tables exist
  } finally {
    // Clean up temporary client
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
  }
}
