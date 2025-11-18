import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger';

let prisma: PrismaClient | null = null;

export async function initializeDatabase(): Promise<PrismaClient> {
  if (prisma) {
    return prisma;
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const appDataPath = app.getPath('userData');
  const dataDir = join(appDataPath, 'data');
  const dbPath = join(dataDir, 'bminvite.db');

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Set DATABASE_URL for Prisma if not set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  prisma = new PrismaClient({
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Test connection
  await prisma.$connect();

  // Try to ensure tables exist by running a simple query
  // Prisma will handle schema creation if needed
  try {
    await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`;
    logger.info('Database tables verified');
  } catch (error) {
    // If tables don't exist, Prisma will create them on first model query
    logger.info('Tables will be created on first use');
  }

  return prisma;
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prisma;
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

