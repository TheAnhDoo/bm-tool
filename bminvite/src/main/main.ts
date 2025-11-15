import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { startApiServer } from './api/server';
import { setupIPC } from './ipc';
import { initializeDatabase } from './db/prismaClient';
import { logger } from './utils/logger';
import { ensureDirectories } from './utils/fileHelpers';
import { ensureEnvFile } from './utils/envSetup';
import { initializeSchema } from './db/schemaInit';
import { ProfileManager } from './profiles/profileManager';

let mainWindow: BrowserWindow | null = null;
let apiServer: any = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: 'default',
    backgroundColor: '#F8F9FA',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize() {
  try {
    // Setup environment variables (auto-configure if needed)
    ensureEnvFile();
    
    // Ensure required directories exist
    await ensureDirectories();

    // Initialize database first (sets up DATABASE_URL)
    const db = await initializeDatabase();
    
    // Initialize database schema (auto-setup on first launch)
    await initializeSchema(process.env.DATABASE_URL);
    logger.info('Database initialized');

    // Reset any "running" profiles to "idle" on startup (browsers aren't actually running)
    const profileManager = new ProfileManager();
    await profileManager.resetRunningProfilesOnStartup();

    // Start API server
    apiServer = await startApiServer();
    logger.info('API server started on port 3001');

    // Create window first
    await createWindow();

    // Setup IPC handlers after window is created
    setupIPC(mainWindow);
    logger.info('IPC handlers registered');

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    app.quit();
  }
}

app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  logger.info('Application shutting down...');
  if (apiServer) {
    await apiServer.close();
  }
});

