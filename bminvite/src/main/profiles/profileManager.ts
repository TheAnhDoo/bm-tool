import { getPrismaClient } from '../db/prismaClient';
import { generateFingerprint } from './fingerprintGenerator';
import { getChromeProfilesPath } from '../utils/fileHelpers';
// Encryption removed - storing data in plain text
import { join } from 'path';
import { mkdirSync } from 'fs';
import { logger } from '../utils/logger';
import { LocalQueue } from '../jobs/localQueue';

// Helper function to parse cookie string
function parseCookieString(cookieString: string, targetDomain: string = 'facebook.com'): Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> {
  const cookies: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> = [];
  
  // Split by semicolon to get individual cookies
  const cookiePairs = cookieString.split(';').map(c => c.trim()).filter(c => c);
  
  // Facebook cookies that should be httpOnly
  const httpOnlyCookies = ['xs', 'c_user', 'datr', 'sb'];
  
  for (const pair of cookiePairs) {
    const equalIndex = pair.indexOf('=');
    if (equalIndex === -1) continue; // Skip if no '=' found
    
    const name = pair.substring(0, equalIndex).trim();
    const value = pair.substring(equalIndex + 1).trim();
    
    if (name && value) {
      // Try to decode, but if it fails, use original value
      let decodedValue = value;
      try {
        decodedValue = decodeURIComponent(value);
      } catch (e) {
        // If decoding fails, use original value
        decodedValue = value;
      }
      
      // Determine if cookie should be httpOnly (Facebook security cookies)
      const isHttpOnly = httpOnlyCookies.includes(name);
      
      cookies.push({
        name: name.trim(),
        value: decodedValue,
        domain: targetDomain, // Use 'facebook.com' (without dot) for better compatibility
        path: '/',
        secure: true,
        httpOnly: isHttpOnly,
        sameSite: 'None' as const,
      });
    }
  }
  
  return cookies;
}

interface CreateProfileOptions {
  type: 'VIA' | 'BM';
  proxy: string; // Format: ip:port:user:pass
  fingerprint?: string;
  username?: string; // Username for both VIA and BM
  bmUid?: string; // UID BM Trung Gian (only for BM profiles)
  password?: string;
  twoFAKey?: string;
  cookie?: string; // Facebook cookies for login
  headless?: boolean;
}

export class ProfileManager {
  private _prisma: ReturnType<typeof getPrismaClient> | null = null;
  private openBrowsers: Map<number, any> = new Map(); // Track manually opened browsers
  private queue: LocalQueue | null = null;
  private browserWindowCount: number = 0; // Track number of open browser windows for auto-arrangement

  private get prisma() {
    if (!this._prisma) {
      this._prisma = getPrismaClient();
    }
    return this._prisma;
  }

  private getQueue(): LocalQueue {
    if (!this.queue) {
      this.queue = new LocalQueue();
    }
    return this.queue;
  }

  async createProfile(options: CreateProfileOptions) {
    const { type, proxy, fingerprint, username, bmUid, password, twoFAKey, cookie, headless } = options;

    // Validate proxy format
    this.validateProxy(proxy);

    // Generate device fingerprint
    let deviceConfig: any;
    if (!fingerprint || fingerprint === 'random') {
      deviceConfig = generateFingerprint();
    } else if (fingerprint.startsWith('{')) {
      // Custom fingerprint provided as JSON string
      try {
        deviceConfig = JSON.parse(fingerprint);
      } catch (e) {
        logger.warn('Failed to parse custom fingerprint, using random');
        deviceConfig = generateFingerprint();
      }
    } else {
      // Preset fingerprint
      deviceConfig = generateFingerprint(fingerprint);
    }

    // Add headless setting to deviceConfig
    (deviceConfig as any).headless = headless || false;

    // Create Chrome profile directory
    const profileId = Date.now().toString();
    const chromeProfilePath = join(getChromeProfilesPath(), `profile-${profileId}`);
    mkdirSync(chromeProfilePath, { recursive: true });

    // Ensure bmUid column exists (needed for BM profiles)
    try {
      const columns = await this.prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info(Profile)
      `;
      const columnNames = columns.map(col => col.name);
      if (!columnNames.includes('bmUid')) {
        logger.info('Adding bmUid column to Profile table...');
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "Profile" ADD COLUMN "bmUid" TEXT`);
        logger.info('bmUid column added successfully');
      }
    } catch (e: any) {
      logger.warn('Failed to check/add bmUid column:', e);
      // Continue anyway - column might already exist
    }

    // Store sensitive data in plain text (no encryption)
    // Create profile in database using raw SQL to support bmUid field
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Profile" (
        "type", "username", "bmUid", "password", "twoFAKey", "cookie", 
        "proxy", "chromeProfile", "deviceConfig", "pinned", "status", 
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      type,
      username || null,
      type === 'BM' ? (bmUid || null) : null, // Only set bmUid for BM profiles
      password || null,
      twoFAKey || null,
      cookie || null,
      proxy,
      chromeProfilePath,
      JSON.stringify(deviceConfig),
      type === 'BM' ? 1 : 0, // BM profiles are pinned by default
      'idle'
    );
    
    // Fetch the created profile using raw query
    const profileRaw = await this.prisma.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "Profile" WHERE "chromeProfile" = ? ORDER BY "id" DESC LIMIT 1`,
      chromeProfilePath
    );
    
    if (!profileRaw || profileRaw.length === 0) {
      throw new Error('Failed to create profile');
    }
    
    const profile = profileRaw[0];

    logger.info(`Created profile ${profile.id} (${type})`);
    return profile;
  }

  async createProfilesFromBatch(type: 'VIA' | 'BM', accounts: string[]) {
    const profiles = [];

    for (const accountLine of accounts) {
      try {
        const parts = accountLine.split('|');
        // Format: UID|Pass|2FA|Proxy
        if (parts.length < 4) {
          logger.warn(`Invalid account format: ${accountLine}`);
          continue;
        }

        const [username, password, twoFA, proxy] = parts;

        const profile = await this.createProfile({
          type,
          proxy: proxy.trim(),
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          twoFAKey: twoFA.trim() || undefined,
        });

        profiles.push(profile);
      } catch (error: any) {
        logger.error(`Failed to create profile from line: ${accountLine}`, error);
      }
    }

    return profiles;
  }

  async startProfile(profileId: number) {
    // Use raw query to get both uid and username for backward compatibility
    const profileRaw = await this.prisma.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "Profile" WHERE id = ? LIMIT 1`,
      profileId
    );
    
    if (!profileRaw || profileRaw.length === 0) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const profile = profileRaw[0];

    if (profile.status === 'running') {
      logger.warn(`Profile ${profileId} is already running`);
      return;
    }

    // Validate that profile has required fields
    if (!profile.proxy || profile.proxy.trim() === '') {
      throw new Error(`Profile ${profileId} (${profile.type}) must have a proxy configured before opening`);
    }

    // Validate proxy format
    const proxyParts = profile.proxy.split(':');
    if (proxyParts.length < 4) {
      throw new Error(`Profile ${profileId} (${profile.type}) proxy format is invalid. Expected: ip:port:username:password`);
    }

    // Check for username (new) or uid (old) for backward compatibility
    const username = profile.username || profile.uid;
    if (!username || username.trim() === '') {
      throw new Error(`Profile ${profileId} (${profile.type}) must have a username configured before opening`);
    }

    // Check if profile has either cookie or password (plain text, no decryption needed)
    const password = profile.password;
    const cookie = (profile as any).cookie;
    
    if ((!password || password.trim() === '') && (!cookie || cookie.trim() === '')) {
      throw new Error(`Profile ${profileId} (${profile.type}) must have either a password or cookie configured before opening`);
    }

    // Just open browser without running automation
    // This is for manual testing/observation only
    await this.openBrowserProfile(profileId);

    // Update status
    await this.prisma.profile.update({
      where: { id: profileId },
      data: { status: 'running', lastUsedAt: new Date() },
    });

    logger.info(`Opened browser for profile ${profileId}`);
  }

  /**
   * Helper method to close blank tabs without closing the main page
   */
  private async closeBlankTabs(browser: any, mainPage: any, profileId: number): Promise<void> {
    try {
      const pages = await browser.pages();
      for (const page of pages) {
        // Only close blank tabs that are NOT the main page
        if (page !== mainPage) {
          const url = page.url();
          if (url === 'about:blank' || url === 'chrome://newtab/' || url === '' || url.startsWith('chrome://')) {
            try {
              await page.close();
              logger.debug(`Profile ${profileId}: Closed blank tab`);
            } catch (e) {
              // Ignore errors closing tabs
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  private async openBrowserProfile(profileId: number): Promise<void> {
    // Use raw query to get both uid and username for backward compatibility
    const profileRaw = await this.prisma.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "Profile" WHERE id = ? LIMIT 1`,
      profileId
    );
    
    if (!profileRaw || profileRaw.length === 0) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const profile = profileRaw[0];

    // Calculate window position and size for auto-arrangement
    const windowConfig = this.calculateWindowPosition(this.browserWindowCount);
    this.browserWindowCount++;

    // Import runners dynamically to avoid circular dependencies
    const { ViaRunner } = await import('../automation/viaRunner');
    const { BMRunner } = await import('../automation/bmRunner');

    let runner: InstanceType<typeof ViaRunner> | InstanceType<typeof BMRunner>;
    if (profile.type === 'VIA') {
      runner = new ViaRunner(profile);
    } else {
      runner = new BMRunner(profile);
    }

    // Just initialize browser and open it, don't run automation
    await runner.initialize(windowConfig);
    
    // Navigate to Facebook but don't login or run automation
    // For BM profiles, use bmUid to construct dashboard link if available
    // Determine base URL and final target URL
    // For BM profiles, navigate to facebook.com first to set cookies, then to business.facebook.com
    let baseUrl: string;
    let targetUrl: string;
    if (profile.type === 'BM') {
      baseUrl = 'https://www.facebook.com'; // Navigate to facebook.com first to set cookies
      const bmUid = (profile as any).bmUid;
      if (bmUid && bmUid.trim() !== '') {
        targetUrl = `https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=${bmUid.trim()}`;
      } else {
        targetUrl = 'https://business.facebook.com';
      }
    } else {
      baseUrl = 'https://www.facebook.com';
      targetUrl = baseUrl;
    }
    
    // Access page via type assertion (runners have private page property)
    const runnerAny = runner as any;
    if (runnerAny.page) {
      try {
        // If cookie is available, set it BEFORE navigation (plain text, no decryption needed)
        const cookie = (profile as any).cookie;
        if (cookie && cookie.trim() !== '') {
          try {
            // Determine target domain based on profile type
            const targetDomain = profile.type === 'BM' ? 'business.facebook.com' : 'facebook.com';
            
            // Parse cookies
            const cookies = parseCookieString(cookie, targetDomain);
            
            if (cookies.length > 0) {
              // Navigate to base URL first to establish context and set cookies
              await runnerAny.page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
              
              // Set cookies with specific domain
              await runnerAny.page.setCookie(...cookies);
              
              // Also set cookies with .facebook.com domain for cross-subdomain compatibility
              const dotDomainCookies = cookies.map(c => ({
                ...c,
                domain: '.facebook.com'
              }));
              try {
                await runnerAny.page.setCookie(...dotDomainCookies);
              } catch (e) {
                // Some cookies might fail with dot domain, that's okay
                logger.debug(`Profile ${profileId}: Some cookies couldn't be set with .facebook.com domain`);
              }
              
              logger.info(`Profile ${profileId}: Set ${cookies.length} cookies successfully for ${targetDomain}`);
              logger.debug(`Profile ${profileId}: Cookie names: ${cookies.map(c => c.name).join(', ')}`);
              
              // Wait for page to load and then wait 3 seconds to ensure cookies are set
              await new Promise(resolve => setTimeout(resolve, 2000));
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Reload page to ensure cookies are applied
              await runnerAny.page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
              
              // Now navigate to the target URL (with business_id if available)
              if (targetUrl !== baseUrl) {
                await runnerAny.page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
              }
              
              // Verify if logged in
              const isLoggedIn = await runnerAny.page.evaluate(() => {
                // @ts-ignore
                return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null || 
                       document.querySelector('[aria-label*="Account"]') !== null ||
                       document.cookie.includes('c_user=');
              });
              
              if (isLoggedIn) {
                logger.info(`Profile ${profileId}: Successfully logged in using cookies`);
              } else {
                logger.warn(`Profile ${profileId}: Cookies set but login status unclear`);
              }
              
              // Close any remaining blank tabs after navigation (but not the main page)
              await this.closeBlankTabs(runnerAny.browser, runnerAny.page, profileId);
            } else {
              logger.warn(`Profile ${profileId}: No valid cookies parsed from cookie string`);
              // Navigate anyway
              await runnerAny.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
              
              // Close any remaining blank tabs (but not the main page)
              await this.closeBlankTabs(runnerAny.browser, runnerAny.page, profileId);
            }
          } catch (cookieError: any) {
            logger.error(`Profile ${profileId}: Failed to set cookies:`, cookieError);
            // Navigate anyway even if cookie setting fails
            await runnerAny.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
            
            // Close any remaining blank tabs
            const pagesAfter = await runnerAny.browser.pages();
            for (const page of pagesAfter) {
              const url = page.url();
              if ((url === 'about:blank' || url === 'chrome://newtab/' || url === '') && page !== runnerAny.page) {
                try {
                  await page.close();
                } catch (e) {
                  // Ignore errors
                }
              }
            }
          }
        } else {
          // No cookie, just navigate
          await runnerAny.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
          
          // Close any remaining blank tabs after navigation (but not the main page)
          await this.closeBlankTabs(runnerAny.browser, runnerAny.page, profileId);
        }
      } catch (error: any) {
        logger.warn(`Failed to navigate browser for profile ${profileId}:`, error);
        // Browser is still open, which is fine
      }
    }

    // Store runner instance so we can close browser later
    this.openBrowsers.set(profileId, runner);

    // Listen for browser close event and update status
    // runnerAny is already declared above, reuse it
    if (runnerAny.browser) {
      runnerAny.browser.on('disconnected', async () => {
        // Browser was closed, update status to idle
        try {
          await this.prisma.profile.update({
            where: { id: profileId },
            data: { status: 'idle' },
          });
          this.openBrowsers.delete(profileId);
          this.browserWindowCount = Math.max(0, this.browserWindowCount - 1);
          logger.info(`Profile ${profileId}: Browser closed, status set to idle`);
        } catch (error: any) {
          logger.error(`Profile ${profileId}: Failed to update status on browser close:`, error);
        }
      });
    }

    logger.info(`Browser opened for profile ${profileId} (manual mode)`);
  }

  /**
   * Reset all "running" profiles to "idle" on app startup
   * This is called when the app starts to clean up stale status
   */
  async resetRunningProfilesOnStartup(): Promise<void> {
    try {
      const runningProfiles = await this.prisma.profile.findMany({
        where: { status: 'running' },
      });

      if (runningProfiles.length > 0) {
        await this.prisma.profile.updateMany({
          where: { status: 'running' },
          data: { status: 'idle' },
        });
        logger.info(`Reset ${runningProfiles.length} profile(s) from "running" to "idle" on startup`);
      }
    } catch (error: any) {
      logger.error('Failed to reset running profiles on startup:', error);
    }
  }

  async stopProfile(profileId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Close manually opened browser if exists
    const openBrowser = this.openBrowsers.get(profileId);
    if (openBrowser) {
      try {
        // Access browser via type assertion
        const runnerAny = openBrowser as any;
        if (runnerAny.browser) {
          try {
            // Try to close all pages first
            const pages = await runnerAny.browser.pages();
            for (const page of pages) {
              try {
                await page.close();
              } catch (e) {
                // Ignore errors closing individual pages
              }
            }
          } catch (e) {
            // Ignore errors getting pages
          }
          
          // Close browser
          await runnerAny.browser.close();
        }
        
        // Call cleanup method if available
        if (typeof openBrowser.cleanup === 'function') {
          try {
            await openBrowser.cleanup();
          } catch (e) {
            // Ignore cleanup errors, browser might already be closed
          }
        }
        
        this.openBrowsers.delete(profileId);
        this.browserWindowCount = Math.max(0, this.browserWindowCount - 1);
        logger.info(`Closed browser for profile ${profileId}`);
      } catch (error: any) {
        logger.error(`Failed to close browser for profile ${profileId}:`, error);
        // Still remove from map even if cleanup failed
        this.openBrowsers.delete(profileId);
        this.browserWindowCount = Math.max(0, this.browserWindowCount - 1);
      }
    }

    // Remove from automation queue (in case it was added)
    try {
      await this.getQueue().removeProfileJob(profileId);
    } catch (error: any) {
      logger.warn(`Failed to remove profile ${profileId} from queue:`, error);
    }

    // Always update status to idle, even if cleanup failed
    try {
      await this.prisma.profile.update({
        where: { id: profileId },
        data: { status: 'idle' },
      });
      logger.info(`Updated profile ${profileId} status to idle`);
    } catch (error: any) {
      logger.error(`Failed to update profile ${profileId} status:`, error);
      throw error; // Re-throw if status update fails
    }

    logger.info(`Stopped profile ${profileId}`);
  }

  async testProxy(proxy: string): Promise<boolean> {
    // Basic validation
    this.validateProxy(proxy);

    // TODO: Implement actual proxy test
    // This would require making a test HTTP request through the proxy
    // For now, just validate format
    return true;
  }

  private validateProxy(proxy: string): void {
    const parts = proxy.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid proxy format. Expected: ip:port:user:pass');
    }

    const [ip, port] = parts;
    const portNum = parseInt(port);
    
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('Invalid proxy port');
    }

    // Basic IP validation
    const ipParts = ip.split('.');
    if (ipParts.length !== 4) {
      throw new Error('Invalid proxy IP address');
    }
  }

  /**
   * Calculate window position and size for auto-arrangement
   * Arranges windows in a grid pattern (2 columns max per row)
   */
  private calculateWindowPosition(index: number): { width: number; height: number; x: number; y: number } {
    // Smaller window size
    const windowWidth = 800;
    const windowHeight = 600;
    
    // Grid arrangement: 2 columns
    const colsPerRow = 2;
    const row = Math.floor(index / colsPerRow);
    const col = index % colsPerRow;
    
    // Starting position (top-left corner)
    const startX = 50;
    const startY = 50;
    
    // Spacing between windows
    const spacingX = 30;
    const spacingY = 30;
    
    // Calculate position
    const x = startX + col * (windowWidth + spacingX);
    const y = startY + row * (windowHeight + spacingY);
    
    return {
      width: windowWidth,
      height: windowHeight,
      x,
      y,
    };
  }
}

