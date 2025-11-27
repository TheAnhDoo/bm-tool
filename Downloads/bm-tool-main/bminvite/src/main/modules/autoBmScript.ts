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

type ViaTask = { via: Profile; link: string; index: number };

interface RoundTaskContext {
  task: ViaTask;
  taskId: string;
  viaRunner: ViaRunner | null;
  viaBmId?: string;
  viaAdAccountUid?: string;
  extractionError?: Error;
  result: TaskResult;
}

/**
 * Calculate window position for browser windows (same as ProfileManager)
 */
function calculateWindowPosition(index: number): { width: number; height: number; x: number; y: number } {
  const isBmWindow = index === 0;
  const windowWidth = isBmWindow ? 1280 : 800;
  const windowHeight = isBmWindow ? 900 : 600;
  
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

/**
 * Helper: Get trimmed text/label from first selector match
 */
async function getTextFromSelector(page: any, selector: string): Promise<string> {
  try {
    const elements = selector.startsWith('//') ? await findByXPath(page, selector) : await findByCss(page, selector);
    const element = elements[0];
    if (!element) {
      return '';
    }

    const text =
      (await page.evaluate((el: Element) => {
        const textContent = el.textContent?.trim();
        if (textContent) {
          return textContent;
        }
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel?.trim()) {
          return ariaLabel.trim();
        }
        return el.getAttribute('data-auto-logging-id')?.trim() || '';
      }, element)) || '';

    await element.dispose?.();
    return text.trim();
  } catch {
    return '';
  }
}

/**
 * Helper: Extract text/label via absolute XPaths (mimic extension capture)
 */
async function getTextByFullXPaths(page: any, xpaths: string[]): Promise<string> {
  for (const xpath of xpaths) {
    try {
      const text = await page.evaluate((xpathStr: string) => {
        const result = document.evaluate(
          xpathStr,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const node = result.singleNodeValue as Element | null;
        if (!node) {
          return '';
        }
        const textContent = node.textContent?.trim();
        if (textContent) {
          return textContent;
        }
        const ariaLabel = node.getAttribute('aria-label');
        if (ariaLabel?.trim()) {
          return ariaLabel.trim();
        }
        return node.getAttribute('data-auto-logging-id')?.trim() || '';
      }, xpath);

      if (text) {
        return text;
      }
    } catch {
      continue;
    }
  }

  return '';
}

async function ensureBmSpanCleaner(page: any): Promise<void> {
  if (!page || typeof page.evaluateOnNewDocument !== 'function') {
    return;
  }
  try {
    await page.evaluateOnNewDocument(() => {
      const win = window as any;

      const removeSpan = () => {
        try {
          const span = document.querySelector('body > span');
          if (span) {
            span.remove();
          }
        } catch (e) {
          // ignore
        }
      };

      if (!win.__bmSpanCleanerInterval) {
        removeSpan();
        win.__bmSpanCleanerInterval = window.setInterval(removeSpan, 5000);
        window.addEventListener('unload', () => {
          if (win.__bmSpanCleanerInterval) {
            clearInterval(win.__bmSpanCleanerInterval);
            win.__bmSpanCleanerInterval = null;
          }
        });
      }
    });

    await page.evaluate(() => {
      const span = document.querySelector('body > span');
      if (span) {
        span.remove();
      }
    });
  } catch (e) {
    logger.warn(`Failed to inject BM span cleaner: ${(e as Error).message}`);
  }
}

async function ensureBodySpanRemoved(page: any): Promise<void> {
  if (!page || typeof page.evaluateOnNewDocument !== 'function') {
    return;
  }
  try {
    const injectRemovalScript = `
      (() => {
        const win = window as any;
        const hasVerificationPopup = () => {
          try {
            const span = document.querySelector('body > span');
            if (!span) {
              return false;
            }
            const text = (span.textContent || '').toLowerCase();
            if (text.includes('verification needed') || text.includes('verify your account')) {
              return true;
            }
            const verifyButton = Array.from(
              span.querySelectorAll('button, div[role="button"], span[role="button"]')
            ).find(btn => (btn.textContent || '').toLowerCase().includes('verify'));
            return Boolean(verifyButton);
          } catch {
            return false;
          }
        };
        const removeSpan = () => {
          try {
            if (hasVerificationPopup()) {
              const span = document.querySelector('body > span');
              span?.remove();
            }
          } catch {
            // ignore
          }
        };
        if (!win.__bmBodySpanObserverInitialized) {
          win.__bmBodySpanObserverInitialized = true;
          document.addEventListener('DOMContentLoaded', () => {
            removeSpan();
          });
          removeSpan();
          const observer = new MutationObserver(() => {
            if (hasVerificationPopup()) {
              removeSpan();
            }
          });
          observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
          });
          win.__bmBodySpanRemovalInterval = window.setInterval(() => {
            if (hasVerificationPopup()) {
              removeSpan();
            }
          }, 1000);
          win.__bmBodySpanObserver = observer;
          window.addEventListener('unload', () => {
            try {
              observer.disconnect();
            } catch {
              // ignore
            }
            if (win.__bmBodySpanRemovalInterval) {
              clearInterval(win.__bmBodySpanRemovalInterval);
              win.__bmBodySpanRemovalInterval = null;
            }
            win.__bmBodySpanObserverInitialized = false;
          });
        } else {
          removeSpan();
        }
      })();
    `;

    await page.evaluateOnNewDocument(injectRemovalScript);
    await page.evaluate(injectRemovalScript);
  } catch (e) {
    logger.warn(`Failed to inject/remove body span overlay: ${(e as Error).message}`);
  }
}

async function removeVerificationPopupIfPresent(page: any): Promise<void> {
  if (!page) {
    return;
  }
  try {
    await page.evaluate(() => {
      const span = document.querySelector('body > span');
      if (!span) {
        return;
      }
      const text = (span.textContent || '').toLowerCase();
      const hasVerifyText =
        text.includes('verification needed') || text.includes('verify your account');
      const hasVerifyButton = Array.from(
        span.querySelectorAll('button, div[role="button"], span[role="button"]')
      ).some(btn => (btn.textContent || '').toLowerCase().includes('verify'));
      if (hasVerifyText || hasVerifyButton) {
        span.remove();
      }
    });
  } catch {
    // ignore
  }
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

async function ensureViaRunner(
  via: Profile,
  viaRunnerMap: Map<number, ViaRunner>,
  viaWindowIndexMap: Map<number, number>,
  vias: Profile[],
  headless: boolean
): Promise<ViaRunner> {
  const viaId = via.id;
  const existingRunner = viaRunnerMap.get(viaId) || null;

  if (existingRunner && isRunnerPageActive(existingRunner)) {
    return existingRunner;
  }

  if (existingRunner) {
    try {
      await existingRunner['browser']?.close();
    } catch {
      // ignore cleanup errors
    }
    viaRunnerMap.delete(viaId);
  }

  const windowIndex =
    viaWindowIndexMap.get(viaId) ??
    (1 + Math.max(0, vias.findIndex((v) => v.id === viaId)));

  logger.info(`Preparing VIA session for profile ${viaId}`);
  const newRunner = await prepareViaSession(via as any, windowIndex, headless);
  viaRunnerMap.set(viaId, newRunner);
  return newRunner;
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
  const viaLoggedInAlready = await page.evaluate(() => {
    const selectors = [
      '[data-testid="blue_bar_profile_link"]',
      '[aria-label*="Account"]'
    ];

    const hasCookie = document.cookie.includes('c_user=');
    const hasSelectorMatch = selectors.some(sel => !!document.querySelector(sel));

    const xpath =
      '//*[@id="mount_0_0_Bg"]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div[2]/div/div/div/div[2]/div/div[2]/div';
    const hasXPathElement = (() => {
      try {
        const result = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return !!result.singleNodeValue;
      } catch {
        return false;
      }
    })();

    return hasCookie || hasSelectorMatch || hasXPathElement;
  });

  if (viaLoggedInAlready) {
    logger.info(`VIA Profile ${profile.id}: Session already logged in after cookie refresh, skipping password login`);
    return runner;
  }

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
  await ensureBmSpanCleaner(page);

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
 * Test Mode: Mở VIA và chạy thử bước approve role setup với viaBmId cố định
 */
export async function testAutoBmProfiles(
  via: Profile & { password?: string | null },
  viaBmId: string,
  headless: boolean = false
): Promise<{ viaRunner: ViaRunner }> {
  if (!viaBmId || viaBmId.trim() === '') {
    throw new Error('viaBmId is required for Test Mode');
  }

  logger.info('🧪 Test Mode: Opening VIA profile for approve role setup testing...');
  const viaRunner = await prepareViaSession(via, 0, headless);
  logger.info(`✅ VIA Profile ${via.id}: Session ready. Navigating to requests page for viaBmId=${viaBmId.trim()}`);

  try {
    await viaApproveRoleSetup(viaRunner, viaBmId.trim());
    logger.info('✅ Test Mode: viaApproveRoleSetup completed. Browser remains open for inspection.');
  } catch (e) {
    logger.warn(`⚠️ Test Mode: viaApproveRoleSetup encountered an error: ${(e as Error).message}. Browser remains open for inspection.`);
  }

  return { viaRunner };
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
  await page.goto(inviteLink, { waitUntil: 'networkidle2', timeout: 10000 });
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
    await new Promise(resolve => setTimeout(resolve, 5000));
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
    await new Promise(resolve => setTimeout(resolve, 5000));
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
    await new Promise(resolve => setTimeout(resolve, 5000));
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
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    logger.warn('Could not find accept invitation button');
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
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Bước 8: Lấy Via-UID-Ad-Account

  // Copy text ở đó hoặc click vào đó để copy
  let viaAdAccountUid = '';
  try {

    const viaAdAccountXPaths = [
      '/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[1]/div/div[2]/div[2]/div/a',
      '/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[1]/div/div[2]/div[2]/div',
      '/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[1]/div/div[2]/div[2]/div',
      '/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[1]/div/div[2]/div[2]',
      '//div[normalize-space(text())="ID:"]/following::a[1]',
      '//div[contains(normalize-space(.), "ID:")]/div/a'
    ];

    const selectorBuilder = selectors();
    viaAdAccountXPaths.forEach(xpath => selectorBuilder.xpath(xpath));
    const viaAdAccountSelectors = selectorBuilder.build();

    let fallbackXPath = viaAdAccountXPaths[0];

    for (const selector of viaAdAccountSelectors) {
      const text = await getTextFromSelector(page, selector);
      if (text) {
        viaAdAccountUid = text;
        if (selector.startsWith('//')) {
          fallbackXPath = selector;
        }
        break;
      }

      if (selector.startsWith('//')) {
        fallbackXPath = selector;
      }
    }

    if (!viaAdAccountUid) {
      const viaAdAccountClicked = await waitAndClick(page, viaAdAccountSelectors, 10000);

      if (!viaAdAccountClicked) {
        throw new Error('Could not click Via-UID-Ad-Account element for manual copy');
      }

      viaAdAccountUid = await readClipboardText(page);
    }

    if (!viaAdAccountUid) {
      viaAdAccountUid = await getTextByFullXPaths(page, viaAdAccountXPaths);
    }

    if (!viaAdAccountUid && fallbackXPath) {
      viaAdAccountUid = await selectAndCopyByXPath(page, fallbackXPath);
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
  await new Promise(resolve => setTimeout(resolve, 5000));
  await ensureBodySpanRemoved(page);
  await removeVerificationPopupIfPresent(page);

  // Bước 2: Nhấn vào +Add
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const addSelectors = selectors()
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div')
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span')
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div')
    .xpath('/html/body/div[1]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div/div[2]')
    .xpath('//div[@role="button" and .//span[contains(normalize-space(.), "Add")]]')
    .xpath('//div[contains(@aria-label, "Add")]')
    .build();
  await removeVerificationPopupIfPresent(page);
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
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
      throw new Error(`Failed to click +Add button: ${(e as Error).message}`);
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Bước 3: Click vào "Request access to an ad account in another business portfolio"
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const addAdAccountSelectors = selectors()
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]/div/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div[2]/div[1]/div[2]/div/div[2]/div[2]/div[3]/div/div/div/div')
    .xpath('//div[contains(@class, "x1vvvo52") and contains(normalize-space(.), "Request access to an ad account in another business portfolio")]')
    .xpath('//div[contains(@class, "x1rg5ohu") and .//div[contains(normalize-space(.), "Request access to an ad account in another business portfolio")]]')
    .xpath('//div[contains(@class, "x1vvvo52") and contains(@class, "xq9mrsl") and contains(normalize-space(.), "Request access to an ad account in another business portfolio")]')
    .xpath('//p[contains(normalize-space(.), "Agencies who need access to their client")]/ancestor::div[contains(@role, "button")]')
    .xpath('//p[contains(normalize-space(.), "Best for: Agencies who need access to their client")]/parent::div')
    .build();
  await removeVerificationPopupIfPresent(page);
  const addAdAccountClicked = await waitAndClick(page, addAdAccountSelectors, 10000);

  if (!addAdAccountClicked) {
    let textClickSuccess = false;
    try {
      await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('div, button, span')).filter(el => {
          const text = (el.textContent || '').trim();
          return text.includes('Request access to an ad account in another business portfolio');
        });
        const target = candidates.find(el => el instanceof HTMLElement) as HTMLElement | undefined;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.click();
          (window as any).__bmTextClickSuccess = true;
        } else {
          (window as any).__bmTextClickSuccess = false;
        }
      });
      textClickSuccess = await page.evaluate(() => Boolean((window as any).__bmTextClickSuccess));
    } catch (e) {
      textClickSuccess = false;
      logger.warn(`Fallback click by text failed for request access option: ${(e as Error).message}`);
    }

    if (!textClickSuccess) {
      throw new Error('Could not find "Request access to an ad account in another business portfolio" option');
    }
  }

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Bước 4: Nhập Via-UID-Ad-Account vừa nhận được vào:
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const accountIdSelectors = selectors()
    .css('input[placeholder="Ad account ID"]')
    .xpath('//input[@placeholder="Ad account ID"]')
    .xpath('//input[contains(@class, "xjbqb8w") and contains(@class, "x10emqs4") and @type="text"]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[2]/div[2]/div[1]/div[2]/div/div/div/div[1]/div[2]/div/div/input')
    .build();
  const accountIdTyped = await typeIntoInput(page, accountIdSelectors, viaAdAccountUid, 10000);

  if (!accountIdTyped) {
    throw new Error('Could not find ad account input field');
  }

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sau đó nhấn next
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const nextSelectors = selectors()
    .xpath('//div[contains(@class, "x1vvvo52") and normalize-space(text())="Next"]')
    .xpath('//div[contains(@role, "button") and normalize-space(text())="Next"]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div/div')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div')
    .build();
  await removeVerificationPopupIfPresent(page);
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

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Bước 5: Click vào để toggle full access role
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const toggleSelectors = selectors()
    .css('input[aria-label="Manage ad accounts"]')
    .xpath('//input[@aria-label="Manage ad accounts"]')
    .xpath('//input[@role="switch" and contains(@class, "xjyslct")]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div[2]/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/input')
    .build();
  await removeVerificationPopupIfPresent(page);
  const toggleClicked = await waitAndClick(page, toggleSelectors, 10000);

  if (!toggleClicked) {
    logger.warn('Could not find full access toggle');
  } else {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Sau đó, click confirm để hoàn thành
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const confirmSelectors = selectors()
    .xpath('//div[contains(@class, "x1vvvo52") and normalize-space(text())="Confirm"]')
    .xpath('//div[contains(@role, "button") and normalize-space(text())="Confirm"]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div/div')
    .build();
  await removeVerificationPopupIfPresent(page);
  const confirmClicked = await waitAndClick(page, confirmSelectors, 10000);

  if (!confirmClicked) {
    logger.warn('Could not find confirm button');
  } else {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Bước 6: Click done để hoàn tất
  // Dễ dàng thêm selectors mới: selectors().css('#selector').xpath('//xpath').build()
  const doneSelectors = selectors()
    .xpath('//div[contains(@class, "x1vvvo52") and normalize-space(text())="Done"]')
    .xpath('//div[contains(@role, "button") and normalize-space(text())="Done"]')
    .xpath('/html/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div/span/div/div/div')
    .build();
  await removeVerificationPopupIfPresent(page);
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

  await new Promise(resolve => setTimeout(resolve, 5000));
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
  await new Promise(resolve => setTimeout(resolve, 5000));

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

  await new Promise(resolve => setTimeout(resolve, 5000));

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

  await new Promise(resolve => setTimeout(resolve, 5000));
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
  const viaTasks: ViaTask[] = [];
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

      const contexts: RoundTaskContext[] = roundTasks.map((task) => {
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
        return {
          task,
          taskId,
          viaRunner: null,
          result,
        };
      });

      await Promise.all(
        contexts.map(async (ctx) => {
          if (isCancelled && isCancelled()) {
            ctx.extractionError = new Error('Script cancelled');
            return;
          }

          try {
            ctx.viaRunner = await ensureViaRunner(
              ctx.task.via,
              viaRunnerMap,
              viaWindowIndexMap,
              vias,
              headless
            );

            logger.info(`Processing task ${ctx.taskId}: VIA ${(ctx.task.via as any).username || ctx.task.via.id}, link ${ctx.task.link}`);
            logger.info(`VIA ${ctx.task.via.id}: Handling invite and extracting IDs`);
            const { viaBmId, viaAdAccountUid } = await viaHandleInviteAndExtractIds(
              ctx.viaRunner,
              ctx.task.link
            );

            ctx.viaBmId = viaBmId;
            ctx.viaAdAccountUid = viaAdAccountUid;

            ctx.result.viaBmId = viaBmId;
            ctx.result.viaAdAccountUid = viaAdAccountUid;
            onLog?.(ctx.result);

            logger.info(
              `VIA ${ctx.task.via.id}: Extracted viaBmId=${viaBmId}, viaAdAccountUid=${viaAdAccountUid}`
            );
          } catch (error: any) {
            ctx.extractionError = error instanceof Error ? error : new Error(String(error));
            logger.error(`Task ${ctx.taskId} extraction failed:`, error);

            const viaRunner = ctx.viaRunner;
            if (viaRunner && !isRunnerPageActive(viaRunner)) {
              viaRunnerMap.delete(ctx.task.via.id);
            } else if (viaRunner) {
              try {
                await viaRunner['page']?.goto('about:blank', {
                  waitUntil: 'domcontentloaded',
                  timeout: 10000,
                });
              } catch (resetError) {
                logger.warn(`Failed to reset VIA session for ${ctx.task.via.id}: ${resetError}`);
                viaRunnerMap.delete(ctx.task.via.id);
              }
            }
          }
        })
      );

      for (const ctx of contexts) {
        if (ctx.extractionError || !ctx.viaRunner || !ctx.viaBmId || !ctx.viaAdAccountUid) {
          ctx.result.status = 'error';
          ctx.result.errorMessage =
            ctx.extractionError?.message || 'Failed to extract Via IDs before BM processing';
          onLog?.(ctx.result);
          doneCount++;
          onProgress?.(doneCount, totalLinks);
          continue;
        }

        if (isCancelled && isCancelled()) {
          ctx.result.status = 'error';
          ctx.result.errorMessage = 'Script cancelled';
          onLog?.(ctx.result);
          doneCount++;
          onProgress?.(doneCount, totalLinks);
          continue;
        }

        try {
          logger.info(`BM ${bm.id}: Adding ad account ${ctx.viaAdAccountUid} and setting role`);
          await bmAddAdAccountAndSetRole(bmRunner, bmUid, ctx.viaAdAccountUid);

          logger.info(`VIA ${ctx.task.via.id}: Approving role setup for viaBmId=${ctx.viaBmId}`);
          await viaApproveRoleSetup(ctx.viaRunner, ctx.viaBmId);

          ctx.result.status = 'success';
          onLog?.(ctx.result);
          logger.info(`Task ${ctx.taskId} completed successfully`);
        } catch (error: any) {
          ctx.result.status = 'error';
          ctx.result.errorMessage = error.message || 'Unknown error';
          onLog?.(ctx.result);
          logger.error(`Task ${ctx.taskId} failed:`, error);

          if (ctx.viaRunner && !isRunnerPageActive(ctx.viaRunner)) {
            viaRunnerMap.delete(ctx.task.via.id);
          } else if (ctx.viaRunner) {
            try {
              await ctx.viaRunner['page']?.goto('about:blank', {
                waitUntil: 'domcontentloaded',
                timeout: 10000,
              });
            } catch (resetError) {
              logger.warn(`Failed to reset VIA session for ${ctx.task.via.id}: ${resetError}`);
              viaRunnerMap.delete(ctx.task.via.id);
            }
          }
        } finally {
          doneCount++;
          onProgress?.(doneCount, totalLinks);
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
