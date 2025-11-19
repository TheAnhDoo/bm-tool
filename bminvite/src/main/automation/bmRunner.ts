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

export class BMRunner {
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
        get: () => `BM Profile #${profileId}`,
        set: () => {},
        configurable: true,
      });
    });

    // Set profile ID and ensure title is set
    await this.page.evaluate((profileId) => {
      (window as any).__PROFILE_ID__ = profileId;
      document.title = `BM Profile #${profileId}`;
    }, this.profile.id);

    // Update title after any navigation
    this.page.on('framenavigated', async () => {
      try {
        await this.page!.evaluate((profileId) => {
          document.title = `BM Profile #${profileId}`;
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
      logger.info(`BM Profile ${this.profile.id}: Proxy authentication set for ${proxy.username}`);
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

    // If cookie is available, use it for login
    if (cookie && cookie.trim() !== '') {
      await this.loginWithCookie(cookie);
      return;
    }

    // Otherwise, use password-based login
    // Use bmUid to construct dashboard link if available
    const bmUid = (this.profile as any).bmUid;
    const targetUrl = bmUid && bmUid.trim() !== '' 
      ? `https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=${bmUid.trim()}`
      : 'https://business.facebook.com';
    await this.page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // Check if already logged in
    const isLoggedIn = await this.page.evaluate(() => {
      // @ts-ignore - document is available in browser context
      return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null;
    });

    if (isLoggedIn) {
      logger.info(`BM Profile ${this.profile.id} already logged in`);
      return;
    }

    // Enter credentials
    await this.page.type('#email', uid);
    await this.page.type('#pass', password!);
    await this.page.click('[name="login"]');

    // Wait for navigation
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Handle 2FA if needed
    if (this.profile.twoFAKey) {
      const twoFAKey = this.profile.twoFAKey;
      // TODO: Implement 2FA handling
      logger.warn('2FA not yet implemented');
    }

    await this.saveScreenshot('login');
    await this.logAction('login', 'Logged in to Business Manager', 'success');
  }

  private async loginWithCookie(cookieString: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      // Parse cookie string and convert to Puppeteer cookie format
      const cookies = this.parseCookieString(cookieString);
      
      // Navigate to facebook.com first to set cookies (cookies are created from facebook.com)
      await this.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });
      
      // Set cookies
      await this.page.setCookie(...cookies);
      
      // Wait for page to load and then wait 3 seconds to ensure cookies are set
      await new Promise(resolve => setTimeout(resolve, 2000));
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reload page to ensure cookies are applied
      await this.page.reload({ waitUntil: 'networkidle2' });
      
      // Now navigate to the specific business dashboard if bmUid is available
      const bmUid = (this.profile as any).bmUid;
      if (bmUid && bmUid.trim() !== '') {
        const targetUrl = `https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=${bmUid.trim()}`;
        await this.page.goto(targetUrl, { waitUntil: 'networkidle2' });
      } else {
        // Navigate to business.facebook.com if no bmUid
        await this.page.goto('https://business.facebook.com', { waitUntil: 'networkidle2' });
      }
      
      // Verify login
      const isLoggedIn = await this.page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null;
      });

      if (isLoggedIn) {
        logger.info(`BM Profile ${this.profile.id}: Logged in successfully using cookie`);
        await this.logAction('login', 'Logged in successfully using cookie', 'success');
        await this.saveScreenshot('login');
      } else {
        logger.warn(`BM Profile ${this.profile.id}: Cookie login may have failed - not logged in`);
        await this.logAction('login', 'Cookie login may have failed', 'warning');
        await this.saveScreenshot('login');
      }
    } catch (error: any) {
      logger.error(`BM Profile ${this.profile.id}: Failed to login with cookie:`, error);
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
          domain: 'business.facebook.com', // Use specific domain for BM
          path: '/',
          secure: true,
          httpOnly: isHttpOnly,
          sameSite: 'None' as const,
        });
      }
    }
    
    return cookies;
  }

  async setRoleForAdAccount(adAccountId: string, viaUid?: string): Promise<void> {
    if (!this.page) {
      await this.initialize();
    }

    if (!this.page) {
      throw new Error('Failed to initialize page');
    }

    await this.login();

    // Navigate to ad account settings
    // This is a placeholder - actual URL structure needs to be determined
    const adAccountUrl = `https://business.facebook.com/ads/manager/account_settings?act=${adAccountId}`;
    await this.page.goto(adAccountUrl, { waitUntil: 'networkidle2' });
    await this.saveScreenshot('ad-account-page');

    // Set role for the ad account
    // This is a placeholder - actual selectors need to be determined
    
    // If viaUid is provided, use it to assign role to that user
    if (viaUid) {
      logger.info(`BM Profile ${this.profile.id}: Assigning role to VIA UID ${viaUid} for ad account ${adAccountId}`);
      
      // Click "Assign Role" or "Add People" button
      await this.page.click('[data-testid="assign-role-button"]').catch(() => {
        // Try alternative selectors
        return Promise.race([
          this.page!.click('button:contains("Assign Role")'),
          this.page!.click('button:contains("Add People")'),
          this.page!.click('[aria-label*="Assign"]'),
        ]);
      });

      // Wait for role assignment modal
      await this.page.waitForSelector('[data-testid="role-select"]', { timeout: 5000 });

      // Enter VIA UID in the user input field
      await this.page.type('[data-testid="user-id-input"]', viaUid, { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for autocomplete

      // Select role (e.g., "Admin" or "Advertiser")
      // This needs to be configured based on requirements
      await this.page.select('[data-testid="role-select"]', 'ADMIN');

      // Confirm assignment
      await this.page.click('[data-testid="confirm-assignment-button"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      await this.logAction('set-role', `Role assigned to VIA UID ${viaUid} for ad account ${adAccountId}`, 'success');
    } else {
      // If no viaUid, just set role for the ad account (general case)
      await this.page.click('[data-testid="assign-role-button"]').catch(() => {
        return this.page!.click('button:contains("Assign Role")');
      });

      await this.page.waitForSelector('[data-testid="role-select"]', { timeout: 5000 });
      await this.page.select('[data-testid="role-select"]', 'ADMIN');
      await this.page.click('[data-testid="confirm-assignment-button"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      await this.logAction('set-role', `Role set for ad account ${adAccountId}`, 'success');
    }
    
    await this.saveScreenshot('role-assigned');
  }

  async run(): Promise<void> {
    try {
      await this.initialize();
      await this.login();

      // BM profiles wait for invite processing requests
      // The actual role assignment happens through setRoleForAdAccount()
      logger.info(`BM Profile ${this.profile.id} is ready for role assignments`);
      
      // Keep browser open - don't cleanup immediately
      // Browser will be closed when stopProfile() is called or profile status changes
    } catch (error: any) {
      logger.error(`BM runner failed for profile ${this.profile.id}:`, error);
      await this.logAction('run', `Failed: ${error.message}`, 'error');
      await this.cleanup(); // Only cleanup on error
      throw error;
    }
  }

  private async saveScreenshot(name: string): Promise<void> {
    if (!this.page) return;

    const screenshotPath = join(
      getScreenshotsPath(),
      `profile-${this.profile.id}-${name}-${Date.now()}.png`
    );

    await this.page.screenshot({ path: screenshotPath, fullPage: true });
  }

  private async logAction(action: string, message: string, status: string): Promise<void> {
    await this.prisma.log.create({
      data: {
        profileId: this.profile.id,
        action,
        message,
        status,
      },
    });
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

