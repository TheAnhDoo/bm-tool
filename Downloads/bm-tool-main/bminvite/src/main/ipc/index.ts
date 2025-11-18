import { BrowserWindow, ipcMain, dialog } from 'electron';
import { logger } from '../utils/logger';
import { setupIPCHandlers } from './handlers';

export function setupIPC(mainWindow: BrowserWindow | null) {
  // Setup all specific IPC handlers
  setupIPCHandlers(mainWindow);

  // Generic API request handler (fallback)
  ipcMain.handle('api:request', async (_event, { route, method, data, query }) => {
    try {
      const { makeRequest } = require('../api/client');
      const response = await makeRequest(route, method, data, query);
      return { success: true, data: response };
    } catch (error: any) {
      logger.error('API request failed:', error);
      return { success: false, error: error.message || 'Request failed' };
    }
  });

  // File selection handler
  ipcMain.handle('file:select', async (_event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      return { success: true, filePath: result.filePaths[0] };
    } catch (error: any) {
      logger.error('File selection failed:', error);
      return { success: false, error: error.message };
    }
  });

  // App path handlers
  ipcMain.handle('app:getPath', () => {
    return require('electron').app.getAppPath();
  });

  ipcMain.handle('app:getAppDataPath', () => {
    return require('electron').app.getPath('userData');
  });
}

export function sendAutomationEvent(mainWindow: BrowserWindow | null, eventName: string, data: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('automation:event', eventName, data);
  }
}

