import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { logger } from './logger';

export function ensureEnvFile(): void {
  const appPath = app.getPath('userData');
  const envPath = join(appPath, '.env');

  // Don't create .env in AppData - use defaults if not exists
  // Instead, set defaults in environment
  if (!process.env.DATABASE_URL) {
    const dbPath = join(appPath, 'data', 'bminvite.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
  }

  if (!process.env.API_PORT) {
    process.env.API_PORT = '3001';
  }

  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'info';
  }

  if (!process.env.ENCRYPTION_KEY) {
    // Generate a default key (in production, this should be set)
    process.env.ENCRYPTION_KEY = 'default-key-change-in-production-' + Date.now();
  }

  logger.info('Environment variables configured');
}






