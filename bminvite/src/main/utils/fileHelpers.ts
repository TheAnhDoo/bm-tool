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

