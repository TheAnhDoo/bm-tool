import { ipcMain, BrowserWindow } from 'electron';
import { makeRequest } from '../api/client';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../db/prismaClient';
import { ProfileManager } from '../profiles/profileManager';
import { AutomationController } from '../automation/flowController';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// Lazy-load ProfileManager to avoid initialization order issues
let profileManagerInstance: ProfileManager | null = null;

function getProfileManager(): ProfileManager {
  if (!profileManagerInstance) {
    profileManagerInstance = new ProfileManager();
  }
  return profileManagerInstance;
}

/**
 * Complete IPC handler implementation matching all Fastify routes
 */
export function setupIPCHandlers(mainWindow: BrowserWindow | null) {
  // ============================================
  // PROFILES
  // ============================================

  // GET /api/profiles -> profiles:list
  ipcMain.handle('profiles:list', async (_event, filters?: { type?: string; search?: string }) => {
    try {
      const response = await makeRequest('/api/profiles', 'GET', undefined, filters);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:list failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles -> profiles:create
  ipcMain.handle('profiles:create', async (_event, data: {
    type: 'VIA' | 'BM';
    proxy: string;
    fingerprint?: string;
    username?: string;
    bmUid?: string;
    password?: string;
    twoFAKey?: string;
    headless?: boolean;
  }) => {
    try {
      const response = await makeRequest('/api/profiles', 'POST', data);
      sendEvent(mainWindow, 'profile:created', response.profile);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:create failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/import -> profiles:import
  ipcMain.handle('profiles:import', async (_event, data: { filePath?: string; type?: string; accounts?: string[] }) => {
    try {
      let accounts: string[] = [];

      // If accounts are provided directly, use them
      if (data.accounts && data.accounts.length > 0) {
        accounts = data.accounts;
      } 
      // Otherwise, read from file
      else if (data.filePath && data.filePath.trim() !== '') {
        // Read file content
        const fileContent = readFileSync(data.filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        // Parse accounts
        for (const line of lines) {
          if (line.includes('|')) {
            accounts.push(line.trim());
          } else if (line.includes(',')) {
            const parts = line.split(',');
            if (parts.length >= 4) {
              accounts.push(parts.join('|'));
            }
          }
        }
      } else {
        throw new Error('Either filePath or accounts must be provided');
      }

      if (accounts.length === 0) {
        throw new Error('No valid accounts found');
      }

      const type = (data.type || 'VIA').toUpperCase() as 'VIA' | 'BM';
      const response = await makeRequest('/api/profiles/batch', 'POST', { type, accounts });
      
      sendEvent(mainWindow, 'profiles:imported', { count: response.count });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:import failed:', error);
      return { success: false, error: error.message };
    }
  });

  // PUT /api/profiles/:id -> profiles:update
  ipcMain.handle('profiles:update', async (_event, id: number, data: {
    username?: string;
    bmUid?: string;
    password?: string;
    twoFAKey?: string;
    cookie?: string;
    deviceConfig?: string;
  }) => {
    try {
      const response = await makeRequest(`/api/profiles/${id}`, 'PUT', data);
      sendEvent(mainWindow, 'profile:updated', { id, ...response.profile });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:update failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/:id/start -> profiles:start
  ipcMain.handle('profiles:start', async (_event, id: number) => {
    try {
      const response = await makeRequest(`/api/profiles/${id}/start`, 'POST');
      sendEvent(mainWindow, 'profile:started', { id });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:start failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/:id/stop -> profiles:stop
  ipcMain.handle('profiles:stop', async (_event, id: number) => {
    try {
      const response = await makeRequest(`/api/profiles/${id}/stop`, 'POST');
      sendEvent(mainWindow, 'profile:stopped', { id });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:stop failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/start -> profiles:startBatch
  ipcMain.handle('profiles:startBatch', async (_event, profileIds?: number[]) => {
    try {
      const response = await makeRequest('/api/profiles/start', 'POST', { profileIds });
      sendEvent(mainWindow, 'profiles:started', { count: profileIds?.length || 'all' });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:startBatch failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/stop -> profiles:stopBatch
  ipcMain.handle('profiles:stopBatch', async (_event, profileIds?: number[]) => {
    try {
      const response = await makeRequest('/api/profiles/stop', 'POST', { profileIds });
      sendEvent(mainWindow, 'profiles:stopped', { count: profileIds?.length || 'all' });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:stopBatch failed:', error);
      return { success: false, error: error.message };
    }
  });

  // DELETE /api/profiles/:id -> profiles:delete
  ipcMain.handle('profiles:delete', async (_event, id: number) => {
    try {
      const response = await makeRequest(`/api/profiles/${id}`, 'DELETE');
      sendEvent(mainWindow, 'profile:deleted', { id });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:delete failed:', error);
      return { success: false, error: error.message };
    }
  });

  // GET /api/profiles/export -> profiles:export
  ipcMain.handle('profiles:export', async (_event, format: string = 'csv') => {
    try {
      const response = await makeRequest('/api/profiles/export', 'GET', undefined, { format });
      const exportsDir = join(app.getPath('userData'), 'exports');
      mkdirSync(exportsDir, { recursive: true });
      const exportPath = join(exportsDir, `profiles-${Date.now()}.${format}`);
      const fs = require('fs');
      // Response is either CSV string or JSON object
      const content = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
      fs.writeFileSync(exportPath, content);
      return { success: true, data: { path: exportPath } };
    } catch (error: any) {
      logger.error('profiles:export failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/profiles/test-proxy -> profiles:testProxy
  ipcMain.handle('profiles:testProxy', async (_event, proxy: string) => {
    try {
      const response = await makeRequest('/api/profiles/test-proxy', 'POST', { proxy });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('profiles:testProxy failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // INVITES
  // ============================================

  // GET /api/invites -> invites:list
  ipcMain.handle('invites:list', async (_event, filters?: { search?: string; status?: string }) => {
    try {
      const response = await makeRequest('/api/invites', 'GET', undefined, filters);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:list failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/invites -> invites:create
  ipcMain.handle('invites:create', async (_event, data: { links: string[]; notes?: string }) => {
    try {
      const response = await makeRequest('/api/invites', 'POST', data);
      sendEvent(mainWindow, 'invites:created', { count: response.count });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:create failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/invites/upload -> invites:upload
  ipcMain.handle('invites:upload', async (_event, filePath: string) => {
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const lines = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));
      
      const response = await makeRequest('/api/invites', 'POST', { links: lines });
      sendEvent(mainWindow, 'invites:uploaded', { count: response.count });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:upload failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/invites/start -> invites:start
  ipcMain.handle('invites:start', async (_event, data: {
    inviteIds?: number[];
    bmId?: number;
    viaIds?: number[];
  }) => {
    try {
      const response = await makeRequest('/api/invites/start', 'POST', data);
      sendEvent(mainWindow, 'automation:started', data);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:start failed:', error);
      return { success: false, error: error.message };
    }
  });

  // DELETE /api/invites/:id -> invites:delete
  ipcMain.handle('invites:delete', async (_event, id: number) => {
    try {
      const response = await makeRequest(`/api/invites/${id}`, 'DELETE');
      sendEvent(mainWindow, 'invite:deleted', { id });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:delete failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/invites/batch/delete -> invites:deleteBatch
  ipcMain.handle('invites:deleteBatch', async (_event, inviteIds: number[]) => {
    try {
      const response = await makeRequest('/api/invites/batch/delete', 'POST', { inviteIds });
      sendEvent(mainWindow, 'invites:deleted', { count: inviteIds.length });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('invites:deleteBatch failed:', error);
      return { success: false, error: error.message || error.toString() };
    }
  });

  // ============================================
  // AUTOMATION
  // ============================================

  // POST /api/automation/run -> automation:run
  ipcMain.handle('automation:run', async (_event, data: {
    inviteIds?: number[];
    bmId?: number;
    viaIds?: number[];
  }) => {
    try {
      const response = await makeRequest('/api/automation/run', 'POST', data);
      sendEvent(mainWindow, 'automation:started', data);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('automation:run failed:', error);
      return { success: false, error: error.message };
    }
  });

  // POST /api/automation/stop -> automation:stop
  ipcMain.handle('automation:stop', async () => {
    try {
      const response = await makeRequest('/api/automation/stop', 'POST');
      sendEvent(mainWindow, 'automation:stopped', {});
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('automation:stop failed:', error);
      return { success: false, error: error.message };
    }
  });

  // GET /api/automation/status -> automation:status
  ipcMain.handle('automation:status', async () => {
    try {
      const response = await makeRequest('/api/automation/status', 'GET');
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('automation:status failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // DASHBOARD
  // ============================================

  // GET /api/dashboard/stats -> dashboard:stats
  ipcMain.handle('dashboard:stats', async () => {
    try {
      const prisma = getPrismaClient();
      
      // Use raw queries to handle cases where tables might not exist
      const [totalProfilesRaw, viaProfilesRaw, bmProfilesRaw, runningProfilesRaw] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile"`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "type" = 'VIA'`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "type" = 'BM'`),
        prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Profile" WHERE "status" = 'running'`),
      ]);

      // Check if Invite table exists before querying
      let totalInvites = 0;
      try {
        const inviteCountRaw = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*) as count FROM "Invite"`);
        totalInvites = inviteCountRaw[0]?.count || 0;
      } catch (e) {
        // Table doesn't exist, use 0
        logger.debug('Invite table does not exist yet');
      }

      const totalProfiles = totalProfilesRaw[0]?.count || 0;
      const viaProfiles = viaProfilesRaw[0]?.count || 0;
      const bmProfiles = bmProfilesRaw[0]?.count || 0;
      const runningProfiles = runningProfilesRaw[0]?.count || 0;

      return {
        success: true,
        data: {
          totalProfiles,
          viaActive: viaProfiles,
          bmTrungGian: bmProfiles,
          linkInvites: totalInvites,
          runningNow: runningProfiles,
        },
      };
    } catch (error: any) {
      logger.error('dashboard:stats failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // REPORTS
  // ============================================

  // GET /api/reports -> reports:list
  ipcMain.handle('reports:list', async () => {
    try {
      const response = await makeRequest('/api/reports', 'GET');
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('reports:list failed:', error);
      return { success: false, error: error.message };
    }
  });

  // GET /api/reports/export -> reports:export
  ipcMain.handle('reports:export', async (_event, format: string = 'csv') => {
    try {
      const prisma = getPrismaClient();
      const invites = await prisma.invite.findMany({
        include: {
          viaProfile: { select: { username: true } },
          bmProfile: { select: { username: true, bmUid: true } },
        },
      });

      if (format === 'csv') {
        const csv = [
          'id,link,status,viaUsername,bmUsername,bmUid,adAccountId,result,createdAt,completedAt',
          ...invites.map(i => [
            i.id,
            i.link,
            i.status,
            i.viaProfile?.username || '',
            i.bmProfile?.username || '',
            (i.bmProfile as any)?.bmUid || '',
            i.adAccountId || '',
            i.result || '',
            i.createdAt.toISOString(),
            i.completedAt?.toISOString() || '',
          ].join(',')),
        ].join('\n');

        const exportsDir = join(app.getPath('userData'), 'exports');
        mkdirSync(exportsDir, { recursive: true });
        const exportPath = join(exportsDir, `reports-${Date.now()}.csv`);
        require('fs').writeFileSync(exportPath, csv);
        return { success: true, data: { path: exportPath } };
      }

      const exportsDir = join(app.getPath('userData'), 'exports');
      mkdirSync(exportsDir, { recursive: true });
      const exportPath = join(exportsDir, `reports-${Date.now()}.json`);
      require('fs').writeFileSync(exportPath, JSON.stringify(invites, null, 2));
      return { success: true, data: { path: exportPath } };
    } catch (error: any) {
      logger.error('reports:export failed:', error);
      return { success: false, error: error.message };
    }
  });

  // DELETE /api/reports/batch -> reports:deleteBatch
  ipcMain.handle('reports:deleteBatch', async (_event, reportIds: number[]) => {
    try {
      const response = await makeRequest('/api/reports/batch', 'DELETE', { reportIds });
      sendEvent(mainWindow, 'reports:deleted', { count: reportIds.length });
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('reports:deleteBatch failed:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // AUTO BM SCRIPT
  // ============================================

  let autoBmScriptCancelled = false;
  let autoBmScriptRunning = false;

  ipcMain.handle('autoBm:run', async (_event, data: { bmId: number; viaIds: number[]; inviteLinks: string[]; headless?: boolean }) => {
    if (autoBmScriptRunning) {
      return { success: false, error: 'Script is already running' };
    }

    try {
      autoBmScriptRunning = true;
      autoBmScriptCancelled = false;

      // Get profiles from database using raw SQL to ensure bmUid and username are included
      const prisma = getPrismaClient();
      
      // Get BM profile with bmUid and username
      const bmRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE id = ? AND type = 'BM' LIMIT 1`,
        data.bmId
      );
      
      if (!bmRaw || bmRaw.length === 0) {
        throw new Error('BM profile not found');
      }
      
      const bm = bmRaw[0];
      
      // Check if bmUid is set
      if (!bm.bmUid || bm.bmUid.trim() === '') {
        throw new Error('BM profile must have bmUid set. Please update the BM profile with bmUid in the profile settings.');
      }

      // Get VIA profiles with username
      if (data.viaIds.length === 0) {
        throw new Error('No VIA profiles selected');
      }
      
      const placeholders = data.viaIds.map(() => '?').join(',');
      const viasRaw = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "Profile" WHERE id IN (${placeholders}) AND type = 'VIA'`,
        ...data.viaIds
      );

      if (viasRaw.length === 0) {
        throw new Error('No VIA profiles found');
      }
      
      const vias = viasRaw;

      // Map uid to username for backward compatibility
      const bmWithUsername = {
        ...bm,
        username: bm.username || bm.uid || null,
      };
      
      const viasWithUsername = vias.map(via => ({
        ...via,
        username: via.username || via.uid || null,
      }));

      // Import and run script
      const { runAutoBmScript } = await import('../modules/autoBmScript');
      
      await runAutoBmScript({
        bm: bmWithUsername as any,
        vias: viasWithUsername as any,
        inviteLinks: data.inviteLinks,
        headless: data.headless || false,
        onLog: (log) => {
          sendEvent(mainWindow, 'autoBm:log', log);
        },
        onProgress: (done, total) => {
          sendEvent(mainWindow, 'autoBm:progress', { done, total });
        },
        isCancelled: () => autoBmScriptCancelled,
      });

      sendEvent(mainWindow, 'autoBm:complete', {});
      autoBmScriptRunning = false;
      return { success: true };
    } catch (error: any) {
      autoBmScriptRunning = false;
      logger.error('autoBm:run failed:', error);
      sendEvent(mainWindow, 'autoBm:error', error.message || 'Unknown error');
      return { success: false, error: error.message || error.toString() };
    }
  });

  ipcMain.handle('autoBm:stop', async () => {
    autoBmScriptCancelled = true;
    autoBmScriptRunning = false;
    return { success: true };
  });

  // ============================================
  // FILE OPERATIONS
  // ============================================

  // File selection (reuse existing)
  // App paths (reuse existing)
}

function sendEvent(window: BrowserWindow | null, eventName: string, data: any) {
  if (window && !window.isDestroyed()) {
    window.webContents.send('automation:event', eventName, data);
  }
}

