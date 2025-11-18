import { join } from 'path';
import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';

export async function ensureDirectories(): Promise<void> {
  const appDataPath = app.getPath('userData');
  const directories = [
    join(appDataPath, 'data'),
    join(appDataPath, 'logs'),
    join(appDataPath, 'artifacts'),
    join(appDataPath, 'artifacts', 'screenshots'),
    join(appDataPath, 'chrome-profiles'),
  ];

  for (const dir of directories) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function getAppDataPath(): string {
  return app.getPath('userData');
}

export function getArtifactsPath(): string {
  return join(app.getPath('userData'), 'artifacts');
}

export function getScreenshotsPath(): string {
  return join(app.getPath('userData'), 'artifacts', 'screenshots');
}

export function getChromeProfilesPath(): string {
  return join(app.getPath('userData'), 'chrome-profiles');
}

/**
 * Finds the system Chrome executable path on Windows
 * Returns null if not found, which will make Puppeteer use its bundled Chromium
 */
export function findSystemChromePath(): string | null {
  const possiblePaths = [
    // Common Chrome installation paths on Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];

  for (const path of possiblePaths) {
    if (path && existsSync(path)) {
      return path;
    }
  }

  return null;
}

