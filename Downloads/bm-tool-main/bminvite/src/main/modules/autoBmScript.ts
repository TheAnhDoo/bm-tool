import { ViaRunner } from '../automation/viaRunner';
import { BMRunner } from '../automation/bmRunner';
import { Profile } from '@prisma/client';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../db/prismaClient';
import randomFirstName from 'random-firstname';
import randomLastName from 'random-lastname';

// Helper function to parse cookie string - giống hệt ProfileManager
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
        domain: targetDomain, // Use targetDomain for better compatibility
        path: '/',
        secure: true,
        httpOnly: isHttpOnly,
        sameSite: 'None' as const,
      });
    }
  }
  
  return cookies;
}

export const BM_RATE_LIMIT_PER_ROUND = 2 as const;

export type TaskResultStatus = 'pending' | 'running' | 'success' | 'error';

export interface TaskResult {
  id: string;
  viaUid: string;
  bmUid: string;
  inviteLink: string;
  viaBmId?: string;          // business_id của BM trên VIA (Via-BM-ID)
  viaAdAccountUid?: string;  // UID ad account lấy được từ VIA
  status: TaskResultStatus;
  errorMessage?: string;
  timestamp: number;
}

export interface AutoBmOptions {
  bm: Profile & { bmUid?: string | null };
  vias: (Profile & { password?: string | null })[];
  inviteLinks: string[];
  headless?: boolean;
  onLog?: (log: TaskResult) => void;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}

/**
 * Calculate window position for browser windows (same as ProfileManager)
 */
function calculateWindowPosition(index: number): { width: number; height: number; x: number; y: number } {
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
  
  return { width: windowWidth, height: windowHeight, x, y };
}

/**
 * Selector Builder - Helper để dễ dàng thêm selectors khi test và cải tiến
 */
class SelectorBuilder {
  private selectors: string[] = [];

  /**
   * Thêm XPath selector
   * @example xpath('//*[@id="u_0_3_RL"]/img[1]')
   */
  xpath(selector: string): SelectorBuilder {
    this.selectors.push(selector);
    return this;
  }

  /**
   * Thêm CSS selector
   * @example css('#u_0_3_RL > img')
   */
  css(selector: string): SelectorBuilder {
    this.selectors.push(selector);
    return this;
  }

  /**
   * Thêm nhiều XPath selectors cùng lúc
   * @example xpaths('//div[@id="test"]', '//span[@class="test"]')
   */
  xpaths(...selectors: string[]): SelectorBuilder {
    this.selectors.push(...selectors);
    return this;
  }

  /**
   * Thêm nhiều CSS selectors cùng lúc
   * @example csss('#test', '.test', 'div.test')
   */
  csss(...selectors: string[]): SelectorBuilder {
    this.selectors.push(...selectors);
    return this;
  }

  /**
   * Build và trả về array selectors
   */
  build(): string[] {
    return this.selectors;
  }

  /**
   * Reset selectors
   */
  reset(): SelectorBuilder {
    this.selectors = [];
    return this;
  }
}

/**
 * Helper function để tạo SelectorBuilder mới
 * @example selectors().css('#test').xpath('//div').build()
 */
function selectors(): SelectorBuilder {
  return new SelectorBuilder();
}

/**
 * Find elements by CSS selector - GIỐNG HỆT extension contentScript.js
 * Sử dụng document.querySelectorAll() trong browser context
 */
async function findByCss(page: any, selector: string): Promise<any[]> {
  try {
    // Dùng page.evaluate để chạy trong browser context giống extension
    const elements = await page.evaluate((sel: string) => {
      return Array.from(document.querySelectorAll(sel));
    }, selector);
    
    // Convert DOM elements sang Puppeteer ElementHandle
    if (!elements || elements.length === 0) {
      return [];
    }
    
    // Tìm lại bằng Puppeteer để có ElementHandle
    const puppeteerElements = await page.$$(selector);
    return puppeteerElements || [];
  } catch (e) {
    return [];
  }
}

/**
 * Find elements by XPath - GIỐNG HỆT extension contentScript.js
 * Sử dụng document.evaluate() trong browser context
 */
async function findByXPath(page: any, xpath: string): Promise<any[]> {
  try {
    // Dùng page.evaluate để chạy trong browser context giống extension
    const elementCount = await page.evaluate((xpathStr: string) => {
      const result = document.evaluate(
        xpathStr,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotLength;
    }, xpath);
    
    if (elementCount === 0) {
      return [];
    }
    
    // Tìm lại bằng Puppeteer để có ElementHandle
    const puppeteerElements = await page.$x(xpath);
    return puppeteerElements || [];
  } catch (e) {
    return [];
  }
}

/**
 * Helper: Wait for element with multiple selector strategies
 * Tìm và click TRỰC TIẾP trong browser context - nhanh, không đợi timeout
 * Giống extension: tìm -> scroll -> click ngay
 * @param timeout - Không dùng, giữ lại để tương thích với code cũ
 */
async function waitAndClick(page: any, selectors: string[], _timeout?: number): Promise<boolean> {
  // Tìm và click trực tiếp trong browser context - không đợi Puppeteer wait
  const result = await page.evaluate((selectorsList: string[]) => {
    // Thử từng selector cho đến khi tìm thấy và click được
    for (const selector of selectorsList) {
      try {
        let elements: Element[] = [];
        
        if (selector.startsWith('//')) {
          // XPath - giống extension
          const xpathResult = document.evaluate(
            selector,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          for (let i = 0; i < xpathResult.snapshotLength; i++) {
            const node = xpathResult.snapshotItem(i);
            if (node instanceof Element) {
              elements.push(node);
            }
          }
        } else {
          // CSS selector - giống extension
          elements = Array.from(document.querySelectorAll(selector));
        }

        if (elements.length === 0) {
          continue; // Thử selector tiếp theo
        }

        // Lấy element đầu tiên
        const target = elements[0];

        // Scroll vào view - giống extension
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        // Click ngay - giống extension
        try {
          (target as HTMLElement).click();
          return { success: true, selector };
        } catch (e) {
          // Nếu click fail, thử selector tiếp theo
          continue;
        }
      } catch (e) {
        // Thử selector tiếp theo
        continue;
      }
    }
    return { success: false };
  }, selectors);

  if (result.success) {
    logger.debug(`Successfully clicked element with selector: ${result.selector}`);
    // Đợi một chút để action được xử lý
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  return false;
}

async function readClipboardText(page: any): Promise<string> {
  return page.evaluate(async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return '';
    }
    try {
      const text = await navigator.clipboard.readText();
      return text?.trim() || '';
    } catch {
      return '';
    }
  });
}

async function selectAndCopyByXPath(page: any, xpath: string): Promise<string> {
  return page.evaluate(async (xpathStr: string) => {
    const xpathResult = document.evaluate(
      xpathStr,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const element = xpathResult.singleNodeValue as HTMLElement | null;
    if (!element) {
      return '';
    }

    const selection = window.getSelection();
    if (!selection) {
      return '';
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);

    document.execCommand('copy');

    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) {
          return text.trim();
        }
      } catch {
        // ignore clipboard read errors
      }
    }

    return selection.toString().trim();
  }, xpath);
}

function isRunnerPageActive(runner: { [key: string]: any } | null | undefined): boolean {
  if (!runner) {
    return false;
  }
  const page = runner['page'];
  if (!page) {
    return false;
  }
  if (typeof page.isClosed === 'function') {
    try {
      return !page.isClosed();
    } catch {
      return false;
    }
  }
  return true;
}

async function elementExists(page: any, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (selector.startsWith('//')) {
        const elements = await page.$x(selector);
        if (elements && elements.length > 0) {
          return true;
        }
      } else {
        const element = await page.$(selector);
        if (element) {
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  return false;
}

/**
 * Helper: Type text into input with clear
 */
async function typeIntoInput(page: any, selectors: string[], text: string, timeout: number = 5000): Promise<boolean> {
  for (const selector of selectors) {
    try {
      let element;
      if (selector.startsWith('//')) {
        await page.waitForXPath(selector, { timeout });
        const [el] = await page.$x(selector);
        element = el;
      } else {
        await page.waitForSelector(selector, { timeout });
        element = await page.$(selector);
      }
      
      if (element) {
        // Focus and clear existing value
        await (element as any).focus();
        await (element as any).click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await new Promise(resolve => setTimeout(resolve, 200));
        // Type new value
        await (element as any).type(text, { delay: 100 });
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  return false;
}

/**
 * Prepare VIA session - login với password
 * Theo flow 1.1: Vào facebook.com, đợi 5s, refresh, click avatar, điền password, Enter, đợi 5s
 * Sử dụng ViaRunner.initialize() với windowConfig giống ProfileManager
 */
export async function prepareViaSession(
  via: Profile & { password?: string | null },
  windowIndex: number = 0,
  headless: boolean = false
): Promise<ViaRunner> {
  // Lấy profile trực tiếp từ database - giống hệt ProfileManager.openBrowserProfile()
  // Đảm bảo sử dụng đúng profile đã tạo trong ProfileDashboard
  const prisma = getPrismaClient();
  const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM "Profile" WHERE id = ? AND type = 'VIA' LIMIT 1`,
    via.id
  );
  
  if (!profileRaw || profileRaw.length === 0) {
    throw new Error(`VIA Profile ${via.id} not found in database`);
  }
  
  // Sử dụng profile trực tiếp từ database - KHÔNG modify
  const profile = profileRaw[0];
  
  logger.info(`VIA Profile ${profile.id}: Opening Chrome profile at path: ${profile.chromeProfile}`);
  
  // Tạo runner với profile từ database (mở trực tiếp Chrome profile đã có sẵn)
  // chromeProfile path được lấy trực tiếp từ database (không bị thay đổi)
  const runner = new ViaRunner(profile);
  
  // Tính toán window position giống ProfileManager
  const windowConfig = calculateWindowPosition(windowIndex);
  
  // Initialize runner với headless override - sẽ mở đúng Chrome profile path từ database
  // KHÔNG modify profile object, chỉ override headless mode khi initialize
  await runner.initialize(windowConfig, headless);

  if (!runner['page']) {
    throw new Error('Failed to initialize VIA page');
  }

  const page = runner['page'];

  // Sử dụng cùng flow như ProfileManager.openBrowserProfile() - set cookies trước
  // Determine base URL and final target URL (giống ProfileManager)
  let baseUrl: string;
  let targetUrl: string;
  baseUrl = 'https://www.facebook.com';
  targetUrl = baseUrl;

  // Set cookie (nếu có) - sử dụng cùng helper function và flow như ProfileManager
  const cookie = (profile as any).cookie;
  if (cookie && cookie.trim() !== '') {
    try {
      // Determine target domain based on profile type (giống ProfileManager)
      const targetDomain = 'facebook.com';
      
      // Parse cookies using same helper function as ProfileManager
      const cookies = parseCookieString(cookie, targetDomain);
      
      if (cookies.length > 0) {
        // Navigate to base URL first to establish context (giống ProfileManager)
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Set cookies with specific domain (giống ProfileManager)
        await page.setCookie(...cookies);
        
        // Also set cookies with .facebook.com domain for cross-subdomain compatibility (giống ProfileManager)
        const dotDomainCookies = cookies.map(c => ({
          ...c,
          domain: '.facebook.com'
        }));
        try {
          await page.setCookie(...dotDomainCookies);
        } catch (e) {
          // Some cookies might fail with dot domain, that's okay
          logger.debug(`VIA Profile ${profile.id}: Some cookies couldn't be set with .facebook.com domain`);
        }
        
        logger.info(`VIA Profile ${profile.id}: Set ${cookies.length} cookies successfully for ${targetDomain}`);
        
        // Wait for page to load and then wait 3 seconds to ensure cookies are set (giống ProfileManager)
        await new Promise(resolve => setTimeout(resolve, 2000));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Reload page to ensure cookies are applied (giống ProfileManager)
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Verify if logged in
        const isLoggedIn = await page.evaluate(() => {
          // @ts-ignore
          return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null || 
                 document.querySelector('[aria-label*="Account"]') !== null ||
                 document.cookie.includes('c_user=');
        });
        
        if (isLoggedIn) {
          logger.info(`VIA Profile ${profile.id}: Successfully logged in using cookies`);
          // Already logged in, no need to login with password
          return runner;
        } else {
          logger.warn(`VIA Profile ${profile.id}: Cookies set but login status unclear, will try password login`);
        }
      } else {
        logger.warn(`VIA Profile ${profile.id}: No valid cookies parsed from cookie string`);
        // Navigate anyway
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    } catch (cookieError: any) {
      logger.error(`VIA Profile ${profile.id}: Failed to set cookies:`, cookieError);
      // Navigate anyway even if cookie setting fails
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
  } else {
    // No cookie, just navigate (giống ProfileManager)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  // Sau khi set cookies và navigate, nếu chưa logged in thì mới login với password
  // Đợi page load hoàn toàn
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bước 1: Refresh trang một lần để đảm bảo page đã load
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2000));
//   //*[@id="mount_0_0_Bg"]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div[2]/div/div/div/div[2]/div/div[2]/div  khi refresh trang, nếu như facebook có element này thì đã login thành công, skip đến bước dán link invite
// const isLoggedIn = await page.evaluate(() => {
//   // @ts-ignore
//   .xpath('//*[@id="mount_0_0_Bg"]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div[2]/div/div/div/div[2]/div/div[2]/div')
//   .build();
// });
// if (isLoggedIn) {
//   logger.info(`VIA Profile ${profile.id}: Successfully logged in using cookies`);
//   return runner;
// }
  // Bước 2: Click avatar để hiện form login
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const avatarSelectors = selectors()
    .xpath('/html/body/div[1]/div[1]/div[1]/div/div/div/div[1]/div[4]/div[1]/div/div/a[1]/img')
    .build();
  const avatarClicked = await waitAndClick(page, avatarSelectors, 10000);

  if (!avatarClicked) {
    logger.warn('Could not find avatar, trying to find username and password field directly');
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Bước 3: Điền password từ profile.password (từ database)
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  if (profile.password && profile.password.trim() !== '') {
    const passwordSelectors = selectors()
      .css('#pass')
      .xpath('//*[@id="u_0_q_CD"]/div[2]/div[1]/input[1]')
      .build();
    const passwordTyped = await typeIntoInput(page, passwordSelectors, profile.password, 10000);

    if (!passwordTyped) {
      throw new Error('Could not find password input field');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Bước 4: Nhấn Enter
    await page.keyboard.press('Enter');

    // Bước 5: Đợi khoảng 5s
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    logger.warn('VIA profile has no password, skipping password login');
  }

  return runner;
}

/**
 * Prepare BM session - setup với bmUid
 * Theo flow 1.2: Navigate đến facebook.com, đợi 2s, đợi thêm 3s, set cookie, reload, navigate đến business.facebook.com với business_id
 * Sử dụng BMRunner.initialize() với windowConfig giống ProfileManager
 */
export async function prepareBmSession(
  bm: Profile & { bmUid?: string | null },
  windowIndex: number = 0,
  headless: boolean = false
): Promise<BMRunner> {
  // Lấy profile trực tiếp từ database - giống hệt ProfileManager.openBrowserProfile()
  // Đảm bảo sử dụng đúng profile đã tạo trong ProfileDashboard
  const prisma = getPrismaClient();
  const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM "Profile" WHERE id = ? AND type = 'BM' LIMIT 1`,
    bm.id
  );
  
  if (!profileRaw || profileRaw.length === 0) {
    throw new Error(`BM Profile ${bm.id} not found in database`);
  }
  
  // Sử dụng profile trực tiếp từ database - KHÔNG modify
  const profile = profileRaw[0];
  
  logger.info(`BM Profile ${profile.id}: Opening Chrome profile at path: ${profile.chromeProfile}`);
  
  // Tạo runner với profile từ database (mở trực tiếp Chrome profile đã có sẵn)
  // chromeProfile path được lấy trực tiếp từ database (không bị thay đổi)
  const runner = new BMRunner(profile);
  
  // Tính toán window position giống ProfileManager
  const windowConfig = calculateWindowPosition(windowIndex);
  
  // Initialize runner với headless override - sẽ mở đúng Chrome profile path từ database
  // KHÔNG modify profile object, chỉ override headless mode khi initialize
  await runner.initialize(windowConfig, headless);

  if (!runner['page']) {
    throw new Error('Failed to initialize BM page');
  }

  const page = runner['page'];

  // Sử dụng cùng flow như ProfileManager.openBrowserProfile()
  // Determine base URL and final target URL (giống ProfileManager)
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

  // Set cookie (nếu có) - sử dụng cùng helper function và flow như ProfileManager
  const cookie = (profile as any).cookie;
  if (cookie && cookie.trim() !== '') {
    try {
      // Determine target domain based on profile type (giống ProfileManager)
      const targetDomain = profile.type === 'BM' ? 'business.facebook.com' : 'facebook.com';
      
      // Parse cookies using same helper function as ProfileManager
      const cookies = parseCookieString(cookie, targetDomain);
      
      if (cookies.length > 0) {
        // Navigate to base URL first to establish context (giống ProfileManager)
        await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Set cookies with specific domain (giống ProfileManager)
        await page.setCookie(...cookies);
        
        // Also set cookies with .facebook.com domain for cross-subdomain compatibility (giống ProfileManager)
        const dotDomainCookies = cookies.map(c => ({
          ...c,
          domain: '.facebook.com'
        }));
        try {
          await page.setCookie(...dotDomainCookies);
        } catch (e) {
          // Some cookies might fail with dot domain, that's okay
          logger.debug(`BM Profile ${profile.id}: Some cookies couldn't be set with .facebook.com domain`);
        }
        
        logger.info(`BM Profile ${profile.id}: Set ${cookies.length} cookies successfully for ${targetDomain}`);
        
        // Wait for page to load and then wait 3 seconds to ensure cookies are set (giống ProfileManager)
        await new Promise(resolve => setTimeout(resolve, 2000));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Reload page to ensure cookies are applied (giống ProfileManager)
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Now navigate to the target URL (with business_id if available) - giống ProfileManager
        if (targetUrl !== baseUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          const bmUid = (profile as any).bmUid;
          if (bmUid && bmUid.trim() !== '') {
            logger.info(`BM Profile ${profile.id}: Navigated to BM dashboard with business_id=${bmUid}`);
          }
        }
      } else {
        logger.warn(`BM Profile ${profile.id}: No valid cookies parsed from cookie string`);
        // Navigate anyway
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    } catch (cookieError: any) {
      logger.error(`BM Profile ${profile.id}: Failed to set cookies:`, cookieError);
      // Navigate anyway even if cookie setting fails
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
  } else {
    // No cookie, just navigate (giống ProfileManager)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  return runner;
}

/**
 * Test Mode: Mở VIA và BM profiles đến các bước được chỉ định để test selectors
 * - VIA: Chạy đến bước click avatar (sau khi set cookies và reload)
 * - BM: Chạy đến bước set cookies và navigate xong
 * Sau đó treo nguyên browser để user có thể test và lấy lại elements
 */
export async function testAutoBmProfiles(
  via: Profile & { password?: string | null },
  bm: Profile & { bmUid?: string | null },
  headless: boolean = false
): Promise<{ viaRunner: ViaRunner; bmRunner: BMRunner }> {
  logger.info('🧪 Test Mode: Opening VIA and BM profiles for testing...');

  // Prepare VIA session - chỉ đến bước click avatar
  const viaRunner = await prepareViaSessionForTest(via, 0, headless);
  logger.info(`✅ VIA Profile ${via.id}: Opened and ready for testing (at avatar click step)`);

  // Prepare BM session - chỉ đến bước set cookies và navigate xong
  const bmRunner = await prepareBmSessionForTest(bm, 1, headless);
  logger.info(`✅ BM Profile ${bm.id}: Opened and ready for testing (at cookies set step)`);

  logger.info('🎯 Test Mode: Both browsers are open and ready. You can now test selectors.');
  logger.info('⚠️  Note: Browsers will remain open. Close them manually when done testing.');

  return { viaRunner, bmRunner };
}

/**
 * Prepare VIA session for testing - chỉ đến bước click avatar
 */
async function prepareViaSessionForTest(
  via: Profile & { password?: string | null },
  windowIndex: number = 0,
  headless: boolean = false
): Promise<ViaRunner> {
  // Lấy profile trực tiếp từ database
  const prisma = getPrismaClient();
  const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM "Profile" WHERE id = ? AND type = 'VIA' LIMIT 1`,
    via.id
  );

  if (!profileRaw || profileRaw.length === 0) {
    throw new Error(`VIA Profile ${via.id} not found in database`);
  }

  const profile = profileRaw[0];
  logger.info(`VIA Profile ${profile.id}: Opening Chrome profile at path: ${profile.chromeProfile}`);

  const runner = new ViaRunner(profile);
  const windowConfig = calculateWindowPosition(windowIndex);
  await runner.initialize(windowConfig, headless);

  if (!runner['page']) {
    throw new Error('Failed to initialize VIA page');
  }

  const page = runner['page'];

  // Set cookies và navigate (giống prepareViaSession)
  let baseUrl: string;
  let targetUrl: string;
  baseUrl = 'https://www.facebook.com';
  targetUrl = baseUrl;

  const cookie = (profile as any).cookie;
  if (cookie && cookie.trim() !== '') {
    try {
      const targetDomain = 'facebook.com';
      const cookies = parseCookieString(cookie, targetDomain);

      if (cookies.length > 0) {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.setCookie(...cookies);

        const dotDomainCookies = cookies.map(c => ({
          ...c,
          domain: '.facebook.com'
        }));
        try {
          await page.setCookie(...dotDomainCookies);
        } catch (e) {
          logger.debug(`VIA Profile ${profile.id}: Some cookies couldn't be set with .facebook.com domain`);
        }

        logger.info(`VIA Profile ${profile.id}: Set ${cookies.length} cookies successfully for ${targetDomain}`);

        await new Promise(resolve => setTimeout(resolve, 2000));
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });

        const isLoggedIn = await page.evaluate(() => {
          // @ts-ignore
          return document.querySelector('[data-testid="blue_bar_profile_link"]') !== null || 
                 document.querySelector('[aria-label*="Account"]') !== null ||
                 document.cookie.includes('c_user=');
        });

        if (isLoggedIn) {
          logger.info(`VIA Profile ${profile.id}: Successfully logged in using cookies`);
          return runner;
        } else {
          logger.warn(`VIA Profile ${profile.id}: Cookies set but login status unclear, will try password login`);
        }
      } else {
        logger.warn(`VIA Profile ${profile.id}: No valid cookies parsed from cookie string`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    } catch (cookieError: any) {
      logger.error(`VIA Profile ${profile.id}: Failed to set cookies:`, cookieError);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  // Đợi page load và reload
  await new Promise(resolve => setTimeout(resolve, 3000));
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // DỪNG Ở ĐÂY - Chỉ đến bước click avatar, không click
  logger.info(`VIA Profile ${profile.id}: Ready at avatar click step. You can now test selectors.`);

  return runner;
}

/**
 * Prepare BM session for testing - chỉ đến bước set cookies và navigate xong
 */
async function prepareBmSessionForTest(
  bm: Profile & { bmUid?: string | null },
  windowIndex: number = 0,
  headless: boolean = false
): Promise<BMRunner> {
  // Lấy profile trực tiếp từ database
  const prisma = getPrismaClient();
  const profileRaw = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM "Profile" WHERE id = ? AND type = 'BM' LIMIT 1`,
    bm.id
  );

  if (!profileRaw || profileRaw.length === 0) {
    throw new Error(`BM Profile ${bm.id} not found in database`);
  }

  const profile = profileRaw[0];
  logger.info(`BM Profile ${profile.id}: Opening Chrome profile at path: ${profile.chromeProfile}`);

  const runner = new BMRunner(profile);
  const windowConfig = calculateWindowPosition(windowIndex);
  await runner.initialize(windowConfig, headless);

  if (!runner['page']) {
    throw new Error('Failed to initialize BM page');
  }

  const page = runner['page'];

  // Set cookies và navigate (giống prepareBmSession)
  let baseUrl: string;
  let targetUrl: string;
  if (profile.type === 'BM') {
    baseUrl = 'https://www.facebook.com';
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

  const cookie = (profile as any).cookie;
  if (cookie && cookie.trim() !== '') {
    try {
      const targetDomain = profile.type === 'BM' ? 'business.facebook.com' : 'facebook.com';
      const cookies = parseCookieString(cookie, targetDomain);

      if (cookies.length > 0) {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.setCookie(...cookies);

        const dotDomainCookies = cookies.map(c => ({
          ...c,
          domain: '.facebook.com'
        }));
        try {
          await page.setCookie(...dotDomainCookies);
        } catch (e) {
          logger.debug(`BM Profile ${profile.id}: Some cookies couldn't be set with .facebook.com domain`);
        }

        logger.info(`BM Profile ${profile.id}: Set ${cookies.length} cookies successfully for ${targetDomain}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });

        if (targetUrl !== baseUrl) {
          await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          const bmUid = (profile as any).bmUid;
          if (bmUid && bmUid.trim() !== '') {
            logger.info(`BM Profile ${profile.id}: Navigated to BM dashboard with business_id=${bmUid}`);
          }
        }
      } else {
        logger.warn(`BM Profile ${profile.id}: No valid cookies parsed from cookie string`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }
    } catch (cookieError: any) {
      logger.error(`BM Profile ${profile.id}: Failed to set cookies:`, cookieError);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
  } else {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  // DỪNG Ở ĐÂY - Đã set cookies và navigate xong
  logger.info(`BM Profile ${profile.id}: Ready at cookies set step. You can now test selectors.`);

  return runner;
}

/**
 * VIA xử lý link invite, tạo Via-BM-ID & lấy Via-UID-Ad-Account
 * Theo flow 2.1: Paste link, click accept, điền first/last name, continue x2, accept invitation, lấy Via-BM-ID và Via-UID-Ad-Account
 */
export async function viaHandleInviteAndExtractIds(
  viaRunner: ViaRunner,
  inviteLink: string
): Promise<{ viaBmId: string; viaAdAccountUid: string }> {
  const page = viaRunner['page'];
  if (!page) {
    throw new Error('VIA page not initialized');
  }

  // Bước 1: Paste link invite từ database, click vào accept block
  await page.goto(inviteLink, { waitUntil: 'networkidle2', timeout: 30000 });
  // await new Promise(resolve => setTimeout(resolve, 3000));

  // // Đợi page load hoàn toàn
  // await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 1.5: Click "Login Facebook" hoặc "Continue with Facebook" button (nếu có)
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const loginFacebookSelectors = selectors()
    .css('div#login-panel-container > div.x1ey2m1c:nth-of-type(1) > div.x1n2onr6:nth-of-type(1) > div.x9f619:nth-of-type(1) > div.x9f619:nth-of-type(3) > div.x3nfvp2:nth-of-type(1) > div.x1i10hfl:nth-of-type(1) > div.x1ja2u2z:nth-of-type(1) > div.html-div:nth-of-type(1) > div.x9f619:nth-of-type(2) > span.x1lliihq:nth-of-type(1) > span.x1lliihq:nth-of-type(1)')
    .xpath('//*[@id="login-panel-container"]/div[1]/div[1]/div[1]/div[3]/div[1]/div[1]/div[1]/div[1]/div[2]/span[1]/span[1]')
    .build();

  const loginFacebookClicked = await waitAndClick(page, loginFacebookSelectors, 15000);

  if (loginFacebookClicked) {
    logger.info('Clicked "Login" button');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    logger.warn('Could not find "Login" button, continuing...');
  }

  // Bước 2: Điền first name & last name
  const rawFirstName = randomFirstName();
  const rawLastName = randomLastName();
  const firstNameValue =
    typeof rawFirstName === 'string' && rawFirstName.trim().length > 0 ? rawFirstName.trim() : 'Ok';
  const lastNameValue =
    typeof rawLastName === 'string' && rawLastName.trim().length > 0 ? rawLastName.trim() : 'Oka';

  logger.info(`Using VIA name: ${firstNameValue} ${lastNameValue}`);

  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const firstNameSelectors = selectors()
    .css('#js_5')
    .xpath('//*[@id="js_5"]')
    .build();
  const firstNameTyped = await typeIntoInput(page, firstNameSelectors, firstNameValue, 10000);

  if (!firstNameTyped) {
    logger.warn('Could not find first name input');
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const lastNameSelectors = selectors()
    .css('#js_a')
    .xpath('//*[@id="js_a"]')
    .build();
  const lastNameTyped = await typeIntoInput(page, lastNameSelectors, lastNameValue, 10000);

  if (!lastNameTyped) {
    logger.warn('Could not find last name input');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Bước 3: Bấm continue lần 1
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const continue1Selectors = selectors()
    .xpath('//*[@id="js_t"]/span[1]/div[1]/div[1]/div[1]')
    .xpath('//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]')
    .build();
  const continue1Clicked = await waitAndClick(page, continue1Selectors, 10000);

  if (continue1Clicked) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    logger.warn('Could not find first continue button');
  }

  // Bước 4: Continue tiếp
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const continue2Selectors = selectors()
    .xpath('//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]')
    .xpath('//*[@id="js_t"]/span[1]/div[1]/div[1]/div[1]')
    .xpath('//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]')
    .build();
  const continue2Clicked = await waitAndClick(page, continue2Selectors, 10000);

  if (continue2Clicked) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    logger.warn('Could not find second continue button');
  }

  // Bước 5: Accept invitation
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const acceptSelectors = selectors()
    .xpath('//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/div')
    .build();
  const acceptClicked = await waitAndClick(page, acceptSelectors, 10000);

  if (acceptClicked) {
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    logger.warn('Could not find accept invitation button');
  }

  const postAcceptBlockSelectors = selectors()
    .xpath('//*[@id="globalContainer"]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]')
    .css('div#globalContainer > div:nth-of-type(1) > div:nth-of-type(1) > div.x78zum5:nth-of-type(1) > div.x6s0dn4:nth-of-type(2) > div:nth-of-type(1) > div.x78zum5:nth-of-type(1)')
    .build();

  const blockDetected = await elementExists(page, postAcceptBlockSelectors);

  if (blockDetected) {
    logger.warn('Detected block screen after accepting invite, skipping to next link');
    await new Promise(resolve => setTimeout(resolve, 30000));

    throw new Error('Invite blocked after accept, continue with next link');
    
  }

  // Bước 6: Đợi khi nào page chuyển qua thành
  // https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id={Via-BM-ID}
  // Parse {Via-BM-ID} từ query
  let viaBmId = '';
  try {
    await page.waitForFunction(
      () => window.location.href.includes('business_id='),
      { timeout: 30000 }
    );
    const url = page.url();
    const urlObj = new URL(url);
    viaBmId = urlObj.searchParams.get('business_id') || '';
    if (!viaBmId) {
      throw new Error('Could not extract Via-BM-ID from URL');
    }
    logger.info(`Extracted Via-BM-ID: ${viaBmId}`);
  } catch (e) {
    throw new Error(`Failed to get Via-BM-ID: ${(e as Error).message}`);
  }

  // Bước 7: Từ Via-BM-ID đó, vào link settings/ad_accounts
  // https://business.facebook.com/latest/settings/ad_accounts?business_id={Via-BM-ID}
  await page.goto(
    `https://business.facebook.com/latest/settings/ad_accounts?business_id=${viaBmId}`,
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bước 8: Lấy Via-UID-Ad-Account
  // CSS: #js_6g hoặc #js_6g > a
  // Xpath: //*[@id="js_6g"]/a hoặc //*[@id="js_6g"]
  // Copy text ở đó hoặc click vào đó để copy
  let viaAdAccountUid = '';
  try {
    await page.waitForSelector('#js_6g', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const viaAdAccountXPath =
      '/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[1]/div/div[2]/div[2]/div/a';

    const viaAdAccountSelectors = selectors()
      .xpath(viaAdAccountXPath)
      .build();

    const viaAdAccountClicked = await waitAndClick(page, viaAdAccountSelectors, 10000);

    if (!viaAdAccountClicked) {
      throw new Error('Could not click Via-UID-Ad-Account element for manual copy');
    }

    viaAdAccountUid = await readClipboardText(page);

    if (!viaAdAccountUid) {
      viaAdAccountUid = await selectAndCopyByXPath(page, viaAdAccountXPath);
    }

    if (!viaAdAccountUid) {
      throw new Error('Could not copy Via-UID-Ad-Account from element');
    }

    logger.info(`Extracted Via-UID-Ad-Account: ${viaAdAccountUid}`);
  } catch (e) {
    throw new Error(`Failed to get Via-UID-Ad-Account: ${(e as Error).message}`);
  }

  return { viaBmId, viaAdAccountUid };
}

/**
 * BM trung gian add ad account & set role (RATE LIMIT = 2)
 * Theo flow 2.2: Vào settings/ad_accounts, click +Add, chọn "Add an ad account", nhập Via-UID-Ad-Account, Next, toggle full access, confirm, Done
 */
export async function bmAddAdAccountAndSetRole(
  bmRunner: BMRunner,
  bmUid: string,
  viaAdAccountUid: string
): Promise<void> {
  const page = bmRunner['page'];
  if (!page) {
    throw new Error('BM page not initialized');
  }

  // Bước 1: Lấy Via-UID-Ad-Account vừa được chuyển qua, vào link:
  // https://business.facebook.com/latest/settings/ad_accounts?business_id=YOUR_BM_UID
  await page.goto(
    `https://business.facebook.com/latest/settings/ad_accounts?business_id=${bmUid}`,
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bước 2: Nhấn vào +Add
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const addSelectors = selectors()
    .xpath('//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div')
    .xpath('//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div')
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div')
    .build();
  const addClicked = await waitAndClick(page, addSelectors, 15000);

  if (!addClicked) {
    // Try finding by text "Add" or "+"
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div, span, button'));
        const addButton = buttons.find((btn: any) => {
          const text = btn.textContent || '';
          return text.includes('Add') || text.includes('+') || btn.getAttribute('aria-label')?.includes('Add');
        });
        if (addButton) {
          (addButton as HTMLElement).click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      throw new Error(`Failed to click +Add button: ${(e as Error).message}`);
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Bước 3: Click vào "Add an ad account"
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const addAdAccountSelectors = selectors()
    .css('#js_7l')
    .css('#js_7m')
    .xpath('//*[@id="js_7m"]')
    .xpath('//*[@id="js_7l"]')
    .xpath('//*[@id="js_7k"]/div/div/div/div/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]/div/div/div/div/div/div/div/div/div/div/div[3]/div[2]')
    .build();
  const addAdAccountClicked = await waitAndClick(page, addAdAccountSelectors, 10000);

  if (!addAdAccountClicked) {
    throw new Error('Could not find "Add an ad account" option');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 4: Nhập Via-UID-Ad-Account vừa nhận được vào:
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const accountIdSelectors = selectors()
    .css('#js_8m')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[2]/div[2]/div[1]/div[2]/div/div/div/div[1]/div[2]/div/div/input')
    .build();
  const accountIdTyped = await typeIntoInput(page, accountIdSelectors, viaAdAccountUid, 10000);

  if (!accountIdTyped) {
    throw new Error('Could not find ad account input field');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Sau đó nhấn next
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const nextSelectors = selectors()
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div')
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span')
    .build();
  const nextClicked = await waitAndClick(page, nextSelectors, 10000);

  if (!nextClicked) {
    // Try finding by text "Next"
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div, span, button'));
        const nextButton = buttons.find((btn: any) => 
          btn.textContent?.toLowerCase().includes('next')
        );
        if (nextButton) {
          (nextButton as HTMLElement).click();
        }
      });
    } catch (e) {
      logger.warn('Could not find Next button, continuing...');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 5: Click vào để toggle full access role
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const toggleSelectors = selectors()
    .css('#js_95')
    .xpath('//*[@id="js_95"]')
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[1]')
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[2]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div[2]/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/input')
    .build();
  const toggleClicked = await waitAndClick(page, toggleSelectors, 10000);

  if (!toggleClicked) {
    logger.warn('Could not find full access toggle');
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sau đó, click confirm để hoàn thành
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const confirmSelectors = selectors()
    .css('#js_8y')
    .xpath('//*[@id="js_8y"]/span/div/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div/div')
    .build();
  const confirmClicked = await waitAndClick(page, confirmSelectors, 10000);

  if (!confirmClicked) {
    logger.warn('Could not find confirm button');
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Bước 6: Click done để hoàn tất
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const doneSelectors = selectors()
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div')
    .xpath('//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div/span/div/div/div')
    .build();
  const doneClicked = await waitAndClick(page, doneSelectors, 10000);

  if (!doneClicked) {
    // Try finding by text "Done"
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div, span, button'));
        const doneButton = buttons.find((btn: any) => 
          btn.textContent?.toLowerCase().includes('done')
        );
        if (doneButton) {
          (doneButton as HTMLElement).click();
        }
      });
    } catch (e) {
      logger.warn('Could not find Done button');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * VIA approve role setup
 * Theo flow 2.3: Vào requests page, click request trong bảng, click Approve
 */
export async function viaApproveRoleSetup(
  viaRunner: ViaRunner,
  viaBmId: string
): Promise<void> {
  const page = viaRunner['page'];
  if (!page) {
    throw new Error('VIA page not initialized');
  }

  // Về profile via sau khi BM hoàn tất set role, truy cập link
  // https://business.facebook.com/latest/settings/requests?business_id={Via-BM-ID}
  await page.goto(
    `https://business.facebook.com/latest/settings/requests?business_id=${viaBmId}`,
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Đợi load xong, click vào request trong bảng
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const requestRowSelectors = selectors()
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[1]/div/div/div/span')
    .xpath('//table/tbody/tr[1]')
    .xpath('//*[@id="mount_0_0_OJ"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr')
    .xpath('//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[1]')
    .xpath('//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[2]')
    .build();
  const requestRowClicked = await waitAndClick(page, requestRowSelectors, 15000);

  if (!requestRowClicked) {
    throw new Error('Could not find request in table');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 2: Chọn approve
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const approveSelectors = selectors()
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div/span/div/div/div')
    .xpath('//div[contains(text(), "Approve")]')
    .xpath('//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div')
    .xpath('//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div/span/div/div/div')
    .build();
  const approveClicked = await waitAndClick(page, approveSelectors, 15000);

  if (!approveClicked) {
    throw new Error('Could not find Approve button');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Main function: runAutoBmScript
 * Chia link cho VIA theo round-robin, chạy theo cặp 2 VIA, mỗi round tối đa 2 link
 */
export async function runAutoBmScript(opts: AutoBmOptions): Promise<void> {
  const { bm, vias, inviteLinks, headless = false, onLog, onProgress, isCancelled } = opts;

  if (!bm.bmUid || bm.bmUid.trim() === '') {
    throw new Error('BM profile must have bmUid set');
  }

  const bmUid = bm.bmUid.trim();

  const viaRunnerMap = new Map<number, ViaRunner>();
  const viaWindowIndexMap = new Map<number, number>();
  vias.forEach((via, idx) => {
    viaWindowIndexMap.set(via.id, idx + 1);
  });

  // Chia inviteLinks cho các VIA theo round-robin
  const viaTasks: Array<{ via: Profile; link: string; index: number }> = [];
  inviteLinks.forEach((link, index) => {
    const viaIndex = index % vias.length;
    viaTasks.push({
      via: vias[viaIndex],
      link,
      index,
    });
  });

  // Tạo danh sách cặp VIA: [ [via1, via2], [via3, via4], ... ]
  const viaPairs: Array<Array<Profile>> = [];
  for (let i = 0; i < vias.length; i += BM_RATE_LIMIT_PER_ROUND) {
    viaPairs.push(vias.slice(i, i + BM_RATE_LIMIT_PER_ROUND));
  }

  const activeViaIds = new Set<number>(viaTasks.map(task => task.via.id));

  for (const via of vias) {
    if (!activeViaIds.has(via.id)) {
      continue;
    }

    const windowIndex =
      viaWindowIndexMap.get(via.id) ??
      (1 + Math.max(0, vias.findIndex((v) => v.id === via.id)));

    try {
      logger.info(`Preparing VIA session (initial) for profile ${via.id}`);
      const viaRunner = await prepareViaSession(via as any, windowIndex, headless);
      viaRunnerMap.set(via.id, viaRunner);
    } catch (initError: any) {
      logger.error(`Failed to prepare VIA session for profile ${via.id}: ${initError.message || initError}`);
      // Leave entry absent; corresponding tasks will fail with clear error
    }
  }

  // Prepare BM session một lần (window index 0)
  logger.info(`Preparing BM session for profile ${bm.id} with bmUid=${bmUid}`);
  const bmRunner = await prepareBmSession(bm, 0, headless);

  let doneCount = 0;
  const totalLinks = inviteLinks.length;

  // Duyệt từng cặp VIA
  for (const pair of viaPairs) {
    if (isCancelled && isCancelled()) {
      logger.info('Script cancelled by user');
      break;
    }

    // Lấy tasks cho cặp này
    const pairTasks = viaTasks.filter((task) => pair.some((p) => p.id === task.via.id));

    // Chạy nhiều round cho cặp này (mỗi round tối đa 2 link)
    let roundIndex = 0;
    while (pairTasks.length > 0 && (!isCancelled || !isCancelled())) {
      // Mỗi round: lấy tối đa 2 tasks (1 cho mỗi VIA trong cặp)
      const roundTasks: Array<{ via: Profile; link: string; index: number }> = [];
      for (const via of pair) {
        const taskIndex = pairTasks.findIndex((t) => t.via.id === via.id);
        if (taskIndex >= 0) {
          roundTasks.push(pairTasks[taskIndex]);
          pairTasks.splice(taskIndex, 1);
        }
      }

      if (roundTasks.length === 0) {
        break; // No more tasks for this pair
      }

      logger.info(`Round ${roundIndex + 1} for pair: processing ${roundTasks.length} tasks`);

      // Process round: chạy tuần tự cho các VIA trong round (không song song để tránh conflict)
      for (const task of roundTasks) {
        if (isCancelled && isCancelled()) {
          logger.info('Script cancelled during round processing');
          break;
        }

        const taskId = `${task.via.id}-${task.index}-${Date.now()}`;
        const viaUid = (task.via as any).username || (task.via as any).uid || '';

        const result: TaskResult = {
          id: taskId,
          viaUid,
          bmUid,
          inviteLink: task.link,
          status: 'running',
          timestamp: Date.now(),
        };

        onLog?.(result);

        let viaRunner: ViaRunner | null = null;
        try {
          logger.info(`Processing task ${taskId}: VIA ${viaUid}, link ${task.link}`);

          const viaId = task.via.id;
          const existingRunner = viaRunnerMap.get(viaId) || null;

          if (existingRunner && isRunnerPageActive(existingRunner)) {
            viaRunner = existingRunner;
            logger.info(`Reusing VIA session for profile ${viaId}`);
          } else {
            if (existingRunner) {
              logger.warn(`Existing VIA session for ${viaId} is not usable, recreating...`);
              try {
                await existingRunner['browser']?.close();
              } catch (e) {
                // ignore cleanup errors
              }
              viaRunnerMap.delete(viaId);
            }

            const viaWindowIndex =
              viaWindowIndexMap.get(viaId) ??
              (1 + Math.max(0, vias.findIndex((v) => v.id === viaId)));

            logger.info(`Preparing VIA session for profile ${viaId}`);
            viaRunner = await prepareViaSession(task.via as any, viaWindowIndex, headless);
            viaRunnerMap.set(viaId, viaRunner);
          }

          if (!viaRunner) {
            throw new Error(`Unable to initialize VIA session for ${viaId}`);
          }

          // VIA xử lý invite và lấy IDs
          logger.info(`VIA ${task.via.id}: Handling invite and extracting IDs`);
          const { viaBmId, viaAdAccountUid } = await viaHandleInviteAndExtractIds(
            viaRunner,
            task.link
          );

          result.viaBmId = viaBmId;
          result.viaAdAccountUid = viaAdAccountUid;
          onLog?.(result);

          logger.info(`VIA ${task.via.id}: Extracted viaBmId=${viaBmId}, viaAdAccountUid=${viaAdAccountUid}`);

          // BM add ad account và set role (rate limit: chỉ 2 lần per round)
          logger.info(`BM ${bm.id}: Adding ad account ${viaAdAccountUid} and setting role`);
          await bmAddAdAccountAndSetRole(bmRunner, bmUid, viaAdAccountUid);

          // VIA approve role setup
          logger.info(`VIA ${task.via.id}: Approving role setup for viaBmId=${viaBmId}`);
          await viaApproveRoleSetup(viaRunner, viaBmId);

          result.status = 'success';
          onLog?.(result);

          doneCount++;
          onProgress?.(doneCount, totalLinks);

          logger.info(`Task ${taskId} completed successfully`);
        } catch (error: any) {
          result.status = 'error';
          result.errorMessage = error.message || 'Unknown error';
          onLog?.(result);

          doneCount++;
          onProgress?.(doneCount, totalLinks);

          logger.error(`Task ${taskId} failed:`, error);

          if (viaRunner && !isRunnerPageActive(viaRunner)) {
            viaRunnerMap.delete(task.via.id);
          } else if (viaRunner) {
            try {
              await viaRunner['page']?.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 });
            } catch (resetError) {
              logger.warn(`Failed to reset VIA session for ${task.via.id}: ${resetError}`);
              viaRunnerMap.delete(task.via.id);
            }
          }
        }
      }

      roundIndex++;
    }
  }

  for (const runner of viaRunnerMap.values()) {
    try {
      await runner['browser']?.close();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  viaRunnerMap.clear();

  // Cleanup BM browser
  try {
    await bmRunner['browser']?.close();
  } catch (e) {
    // Ignore cleanup errors
  }

  logger.info(`Auto BM Script completed: ${doneCount}/${totalLinks} links processed`);
}
