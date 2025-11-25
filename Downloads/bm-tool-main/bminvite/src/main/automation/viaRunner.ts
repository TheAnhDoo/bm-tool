import puppeteer, { Browser, Page } from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Profile } from '@prisma/client';
import { getPrismaClient } from '../db/prismaClient';
// Encryption removed - using plain text
import { getScreenshotsPath, findSystemChromePath } from '../utils/fileHelpers';
import { logger } from '../utils/logger';
import { join } from 'path';
import { parseProxy } from '../utils/proxyParser';

puppeteerExtra.use(StealthPlugin());

interface InviteData {
  viaUid?: string;
  adAccountUid?: string;
}

export class ViaRunner {
  private profile: Profile;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private prisma = getPrismaClient();

  constructor(profile: Profile) {
    this.profile = profile;
  }

  async initialize(windowConfig?: { width: number; height: number; x: number; y: number }, headlessOverride?: boolean): Promise<void> {
    const deviceConfig = JSON.parse(this.profile.deviceConfig);
    const proxy = parseProxy(this.profile.proxy);

    // Check if headless mode is enabled - use override if provided, otherwise use deviceConfig
    const isHeadless = headlessOverride !== undefined ? headlessOverride : ((deviceConfig as any).headless === true);

    // Default window size (smaller for multiple windows)
    const defaultWidth = 800;
    const defaultHeight = 600;
    
    const width = windowConfig?.width || defaultWidth;
    const height = windowConfig?.height || defaultHeight;
    const x = windowConfig?.x || 50;
    const y = windowConfig?.y || 50;

    const args = [
      `--proxy-server=${proxy.host}:${proxy.port}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      `--user-agent=${deviceConfig.userAgent}`,
      // Remove automation banner and make it look like regular Chrome
      '--disable-infobars',
      '--disable-notifications',
    ];

    // Only add window size/position args if not headless
    if (!isHeadless) {
      args.push(`--window-size=${width},${height}`);
      args.push(`--window-position=${x},${y}`);
    }

    // Try to use system Chrome first (looks more normal), fall back to Puppeteer's Chromium
    const chromePath = findSystemChromePath();
    const launchOptions: any = {
      headless: isHeadless,
      userDataDir: this.profile.chromeProfile,
      args,
      // Exclude the enable-automation flag to remove the banner
      ignoreDefaultArgs: ['--enable-automation'],
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    this.browser = await puppeteerExtra.launch(launchOptions);

    this.page = await this.browser.newPage();

    // Remove webdriver property and automation indicators
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override chrome runtime
      (window as any).chrome = {
        runtime: {},
      };

      // Remove automation indicators
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Set custom window title that persists
      const profileId = (window as any).__PROFILE_ID__ || '';
      Object.defineProperty(document, 'title', {
        get: () => `VIA Profile #${profileId}`,
        set: () => {},
        configurable: true,
      });
    });

    // Set profile ID and ensure title is set
    await this.page.evaluate((profileId) => {
      (window as any).__PROFILE_ID__ = profileId;
      document.title = `VIA Profile #${profileId}`;
    }, this.profile.id);

    // Update title after any navigation
    this.page.on('framenavigated', async () => {
      try {
        await this.page!.evaluate((profileId) => {
          document.title = `VIA Profile #${profileId}`;
        }, this.profile.id);
      } catch (e) {
        // Ignore errors
      }
    });

    // Set proxy authentication if credentials are provided
    if (proxy.username && proxy.password) {
      await this.page.authenticate({
        username: proxy.username,
        password: proxy.password,
      });
      logger.info(`Profile ${this.profile.id}: Proxy authentication set for ${proxy.username}`);
    }

    // Set viewport (use smaller size if window config provided)
    const viewportWidth = windowConfig?.width || deviceConfig.screen.width;
    const viewportHeight = windowConfig?.height || deviceConfig.screen.height;
    
    await this.page.setViewport({
      width: Math.min(viewportWidth, deviceConfig.screen.width),
      height: Math.min(viewportHeight, deviceConfig.screen.height),
    });

    // Set user agent
    await this.page.setUserAgent(deviceConfig.userAgent);

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': deviceConfig.languages?.join(',') || deviceConfig.language || 'en-US,en;q=0.9',
    });

    // Comprehensive fingerprint override
    await this.page.evaluateOnNewDocument((config: any) => {
      // Override userAgent first - this is critical
      Object.defineProperty(navigator, 'userAgent', {
        get: () => config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });

      Object.defineProperty(navigator, 'appVersion', {
        get: () => {
          const ua = config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          // Extract version from user agent
          const match = ua.match(/Chrome\/([\d.]+)/);
          return match ? `5.0 (${config.platform || 'Win32'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${match[1]} Safari/537.36` : ua;
        },
        configurable: true,
      });

      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override navigator properties
      Object.defineProperty(navigator, 'platform', {
        get: () => config.platform || 'Win32',
        configurable: true,
      });

      Object.defineProperty(navigator, 'language', {
        get: () => config.language || 'en-US',
        configurable: true,
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => config.languages || ['en-US', 'en'],
        configurable: true,
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => config.hardware?.hardwareConcurrency || config.hardware?.cpuCores || 8,
        configurable: true,
      });

      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => config.hardware?.deviceMemory || config.hardware?.memory || 8,
        configurable: true,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = config.plugins || [];
          const pluginArray = [];
          for (let i = 0; i < plugins.length; i++) {
            pluginArray.push({
              name: plugins[i],
              description: '',
              filename: '',
              length: 1,
            });
          }
          return pluginArray;
        },
        configurable: true,
      });

      // Override screen properties
      Object.defineProperty(screen, 'width', {
        get: () => config.screen?.width || 1920,
        configurable: true,
      });

      Object.defineProperty(screen, 'height', {
        get: () => config.screen?.height || 1080,
        configurable: true,
      });

      Object.defineProperty(screen, 'availWidth', {
        get: () => config.screen?.availWidth || config.screen?.width || 1920,
        configurable: true,
      });

      Object.defineProperty(screen, 'availHeight', {
        get: () => config.screen?.availHeight || config.screen?.height || 1080,
        configurable: true,
      });

      Object.defineProperty(screen, 'colorDepth', {
        get: () => config.screen?.colorDepth || 24,
        configurable: true,
      });

      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => config.screen?.pixelRatio || 1,
        configurable: true,
      });

      // Override timezone
      if (config.timezone) {
        try {
          const originalToLocaleString = Date.prototype.toLocaleString;
          Date.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
            if (!options && (!locales || typeof locales === 'string')) {
              return originalToLocaleString.call(this, locales || 'en-US', { timeZone: config.timezone });
            }
            return originalToLocaleString.call(this, locales, { ...options, timeZone: config.timezone });
          };
        } catch (e) {
          // Ignore
        }
      }

      // Override WebGL fingerprint
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return config.webgl?.vendor || 'Google Inc. (Intel)';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return config.webgl?.renderer || 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };

      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter: number) {
        if (parameter === 37445) {
          return config.webgl?.vendor || 'Google Inc. (Intel)';
        }
        if (parameter === 37446) {
          return config.webgl?.renderer || 'Intel Iris OpenGL Engine';
        }
        return getParameter2.call(this, parameter);
      };

      // Override Canvas fingerprint
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: number) {
        const context = this.getContext('2d');
        if (context && config.canvas) {
          // Add noise to canvas
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] ^ (config.canvas.charCodeAt(i % config.canvas.length) % 256);
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.call(this, type, quality);
      };

      // Override Audio fingerprint
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext && config.audio) {
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.call(this);
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
          analyser.getFloatFrequencyData = function(array: Float32Array<ArrayBuffer>) {
            originalGetFloatFrequencyData.call(this, array);
            // Add noise based on audio fingerprint
            for (let i = 0; i < array.length; i++) {
              array[i] += (config.audio.charCodeAt(i % config.audio.length) % 100) / 1000;
            }
          };
          return analyser;
        };
      }

      // Override chrome object
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {},
      };

      // Override permissions
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = function(parameters: PermissionDescriptor): Promise<PermissionStatus> {
        return originalQuery.call(this, parameters).catch(() => {
          // Return a mock PermissionStatus object
          return {
            state: 'granted',
            name: parameters.name,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          } as PermissionStatus;
        });
      };

      // Override plugins length
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          const mimeTypes = [];
          const plugins = config.plugins || [];
          for (const plugin of plugins) {
            mimeTypes.push({
              type: 'application/pdf',
              suffixes: 'pdf',
              description: '',
              enabledPlugin: { name: plugin },
            });
          }
          return mimeTypes;
        },
        configurable: true,
      });
    }, deviceConfig);
  }

  async login(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Use username (new) or uid (old) for backward compatibility
    const uid = (this.profile as any).username || this.profile.uid;
    const password = this.profile.password || null;
    const cookie = (this.profile as any).cookie || null;

    if (!uid) {
      throw new Error('UID required for login');
    }

    if (!cookie && (!password || password.trim() === '')) {
      throw new Error('Either cookie or password required for login');
    }

    await this.logAction('login-start', 'Starting login process', 'info');
    logger.info(`Profile ${this.profile.id}: Attempting login for UID ${uid}`);

    // If cookie is available, use it for login
    if (cookie && cookie.trim() !== '') {
      await this.loginWithCookie(cookie);
      return;
    }

    // Otherwise, use password-based login
    await this.page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });

    // Check if already logged in
    const isLoggedIn = await this.page.evaluate(() => {
      // @ts-ignore - document is available in browser context
      return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null;
    });

    if (isLoggedIn) {
      logger.info(`Profile ${this.profile.id} already logged in`);
      await this.logAction('login', 'Already logged in', 'success');
      return;
    }

    // Enter credentials
    await this.page.waitForSelector('#email', { timeout: 10000 });
    await this.page.type('#email', uid, { delay: 100 });
    await this.page.type('#pass', password!, { delay: 100 });
    
    await this.saveScreenshot('before-login');
    await this.page.click('[name="login"]');

    // Wait for navigation
    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Handle 2FA if needed
    if (this.profile.twoFAKey) {
      const twoFAKey = this.profile.twoFAKey;
      await this.logAction('2fa-required', '2FA code required', 'info');
      // TODO: Implement 2FA handling
      logger.warn('2FA not yet implemented - manual intervention may be required');
    }

    await this.saveScreenshot('after-login');
    await this.logAction('login', 'Logged in successfully', 'success');
    logger.info(`Profile ${this.profile.id}: Login successful`);
  }

  private async loginWithCookie(cookieString: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      // Parse cookie string and convert to Puppeteer cookie format
      const cookies = this.parseCookieString(cookieString);
      
      // Navigate to Facebook first to set domain
      await this.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });
      
      // Set cookies
      await this.page.setCookie(...cookies);
      
      // Reload page to apply cookies
      await this.page.reload({ waitUntil: 'networkidle2' });
      
      // Verify login
      const isLoggedIn = await this.page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null;
      });

      if (isLoggedIn) {
        logger.info(`Profile ${this.profile.id}: Logged in successfully using cookie`);
        await this.logAction('login', 'Logged in successfully using cookie', 'success');
        await this.saveScreenshot('after-login');
      } else {
        logger.warn(`Profile ${this.profile.id}: Cookie login may have failed - not logged in`);
        await this.logAction('login', 'Cookie login may have failed', 'warning');
        await this.saveScreenshot('after-login');
      }
    } catch (error: any) {
      logger.error(`Profile ${this.profile.id}: Failed to login with cookie:`, error);
      await this.logAction('login', `Cookie login failed: ${error.message}`, 'error');
      throw error;
    }
  }

  private parseCookieString(cookieString: string): Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> {
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
          decodedValue = value;
        }
        
        // Determine if cookie should be httpOnly
        const isHttpOnly = httpOnlyCookies.includes(name);
        
        cookies.push({
          name: name.trim(),
          value: decodedValue,
          domain: 'facebook.com', // Use 'facebook.com' (without dot) for better compatibility
          path: '/',
          secure: true,
          httpOnly: isHttpOnly,
          sameSite: 'None' as const,
        });
      }
    }
    
    return cookies;
  }

  async extractInviteData(inviteLink: string): Promise<InviteData> {
    if (!this.page) {
      await this.initialize();
    }

    if (!this.page) {
      throw new Error('Failed to initialize page');
    }

    await this.logAction('extract-start', `Starting extraction from ${inviteLink}`, 'info');
    logger.info(`Profile ${this.profile.id}: Extracting invite data from ${inviteLink}`);

    await this.login();

    await this.page.goto(inviteLink, { waitUntil: 'networkidle2' });
    await this.saveScreenshot('invite-page');

    // Extract data from invite page
    // ⚠️ EDIT THIS SECTION TO MATCH YOUR FACEBOOK PAGE STRUCTURE ⚠️
    const inviteData = await this.page.evaluate(() => {
      // @ts-ignore - document and window are available in browser context
      // Method 1: Extract from data attributes
      let viaUid = document.querySelector('[data-via-uid]')?.getAttribute('data-via-uid') || '';
      let adAccountUid = document.querySelector('[data-ad-account-uid]')?.getAttribute('data-ad-account-uid') || '';

      // Method 2: Extract from URL parameters
      if (!adAccountUid) {
        // @ts-ignore
        const urlParams = new URLSearchParams(window.location.search);
        adAccountUid = urlParams.get('act') || urlParams.get('ad_account_id') || '';
      }

      // Method 3: Extract from page text using regex
      if (!viaUid || !adAccountUid) {
        // @ts-ignore
        const pageText = document.body.innerText;
        const viaMatch = pageText.match(/via[_-]?uid[:\s]+(\d+)/i);
        const adAccountMatch = pageText.match(/ad[_-]?account[:\s]+(\d+)/i) || 
                              pageText.match(/act[:\s]+(\d+)/i);
        
        if (viaMatch) viaUid = viaMatch[1];
        if (adAccountMatch) adAccountUid = adAccountMatch[1];
      }

      // Method 4: Extract from specific elements by ID or class
      if (!adAccountUid) {
        // @ts-ignore
        const adAccountElement = document.querySelector('#ad-account-id, .ad-account-id, [id*="ad_account"]');
        adAccountUid = adAccountElement?.textContent?.trim() || adAccountElement?.getAttribute('value') || '';
      }

      return { viaUid, adAccountUid };
    });

    await this.logAction('extract-complete', 
      `Extracted: viaUid=${inviteData.viaUid?.substring(0, 5)}..., adAccount=${inviteData.adAccountUid?.substring(0, 5)}...`, 
      inviteData.viaUid && inviteData.adAccountUid ? 'success' : 'warning'
    );

    logger.info(`Profile ${this.profile.id}: Extracted data`, {
      viaUid: inviteData.viaUid,
      adAccountUid: inviteData.adAccountUid,
    });

    if (!inviteData.viaUid || !inviteData.adAccountUid) {
      logger.warn(`Profile ${this.profile.id}: Incomplete data extracted`, inviteData);
      await this.logAction('extract-warning', 'Incomplete data extracted - check selectors', 'warning');
    }

    return {
      viaUid: inviteData.viaUid || undefined,
      adAccountUid: inviteData.adAccountUid || undefined,
    };
  }

  async acceptInvite(inviteLink: string): Promise<void> {
    if (!this.page) {
      await this.initialize();
    }

    if (!this.page) {
      throw new Error('Failed to initialize page');
    }

    await this.logAction('accept-start', `Starting invite acceptance for ${inviteLink}`, 'info');
    logger.info(`Profile ${this.profile.id}: Accepting invite ${inviteLink}`);

    await this.page.goto(inviteLink, { waitUntil: 'networkidle2' });

    // ⚠️ EDIT THIS SECTION TO MATCH YOUR FACEBOOK ACCEPT BUTTON SELECTORS ⚠️
    const acceptSelectors = [
      '[data-testid="accept-invite-button"]',
      'button:contains("Accept")',
      'button[aria-label*="Accept"]',
      'button[aria-label*="accept"]',
      '.accept-button',
      '#accept-btn',
      'button[type="submit"]',
    ];

    let clicked = false;
    for (const selector of acceptSelectors) {
      try {
        const button = await this.page.$(selector);
        if (button) {
          await button.click();
          clicked = true;
          await this.logAction('accept-click', `Clicked accept button: ${selector}`, 'info');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!clicked) {
      // Try clicking any button with "Accept" text
      try {
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await button.evaluate((el: any) => el.textContent);
          if (text && text.toLowerCase().includes('accept')) {
            await button.click();
            clicked = true;
            break;
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    if (!clicked) {
      const error = 'Accept button not found';
      await this.logAction('accept-error', error, 'error');
      throw new Error(error);
    }

    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {
      logger.warn('Navigation timeout after accept click');
    });
    
    await this.saveScreenshot('invite-accepted');
    await this.logAction('accept-invite', 'Invite accepted successfully', 'success');
    logger.info(`Profile ${this.profile.id}: Invite accepted`);
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.login();

      // Get pending invites for this VIA profile
      const invites = await this.prisma.invite.findMany({
        where: {
          viaId: this.profile.id,
          status: 'pending',
        },
        take: 10,
      });

      logger.info(`Profile ${this.profile.id}: Processing ${invites.length} invites`);

      for (const invite of invites) {
        try {
          await this.extractInviteData(invite.link);
          // Invite processing will be handled by the flow controller
        } catch (error: any) {
          logger.error(`Profile ${this.profile.id}: Failed to process invite ${invite.id}:`, error);
          await this.logAction('process-invite', `Failed: ${error.message}`, 'error');
        }
      }
      
      // Keep browser open - don't cleanup immediately
      // Browser will be closed when stopProfile() is called or profile status changes
    } catch (error: any) {
      logger.error(`VIA runner failed for profile ${this.profile.id}:`, error);
      await this.logAction('run', `Failed: ${error.message}`, 'error');
      await this.cleanup(); // Only cleanup on error
      throw error;
    }
  }

  private async saveScreenshot(name: string): Promise<string> {
    if (!this.page) return '';

    const screenshotPath = join(
      getScreenshotsPath(),
      `profile-${this.profile.id}-${name}-${Date.now()}.png`
    );

    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      logger.debug(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error: any) {
      logger.error(`Failed to save screenshot: ${error.message}`);
      return '';
    }
  }

  private async logAction(action: string, message: string, status: string): Promise<void> {
    try {
      await this.prisma.log.create({
        data: {
          profileId: this.profile.id,
          action,
          message,
          status,
        },
      });
    } catch (error: any) {
      logger.error(`Failed to log action: ${error.message}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        // Try to close all pages first
        try {
          const pages = await this.browser.pages();
          for (const page of pages) {
            try {
              if (!page.isClosed()) {
                await page.close();
              }
            } catch (e) {
              // Ignore errors closing individual pages
            }
          }
        } catch (e) {
          // Ignore errors getting pages
        }
        
        // Close browser
        await this.browser.close();
      } catch (error: any) {
        // Browser might already be closed, that's okay
        console.warn('Error during cleanup:', error);
      } finally {
        this.browser = null;
        this.page = null;
      }
    }
  }
}
