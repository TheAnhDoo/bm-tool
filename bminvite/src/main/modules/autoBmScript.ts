import { ViaRunner } from '../automation/viaRunner';
import { BMRunner } from '../automation/bmRunner';
import { Profile } from '@prisma/client';
import { logger } from '../utils/logger';

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
 * Helper: Wait for element with multiple selector strategies
 */
async function waitAndClick(page: any, selectors: string[], timeout: number = 10000): Promise<boolean> {
  for (const selector of selectors) {
    try {
      if (selector.startsWith('//')) {
        // XPath
        await page.waitForXPath(selector, { timeout });
        const [element] = await page.$x(selector);
        if (element) {
          await (element as any).click();
          return true;
        }
      } else {
        // CSS selector
        await page.waitForSelector(selector, { timeout });
        await page.click(selector);
        return true;
      }
    } catch (e) {
      // Try next selector
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
  const runner = new ViaRunner(via);
  
  // Override deviceConfig headless setting if specified
  // Tạo một copy của deviceConfig để không modify original
  const deviceConfig = JSON.parse(via.deviceConfig);
  if (headless) {
    deviceConfig.headless = true;
  } else {
    deviceConfig.headless = false; // Đảm bảo không headless nếu không chọn
  }
  // Temporarily override deviceConfig trong profile object
  const originalDeviceConfig = via.deviceConfig;
  (via as any).deviceConfig = JSON.stringify(deviceConfig);
  
  // Tính toán window position giống ProfileManager
  const windowConfig = calculateWindowPosition(windowIndex);
  
  try {
    await runner.initialize(windowConfig);
  } finally {
    // Restore original deviceConfig
    (via as any).deviceConfig = originalDeviceConfig;
  }

  if (!runner['page']) {
    throw new Error('Failed to initialize VIA page');
  }

  const page = runner['page'];

  // Bước 1: Vào trang chủ facebook.com, đợi 5s
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Bước 2: Refresh trang một lần
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 3: Click avatar để hiện form login
  // CSS: #u_0_3_RL > img._s0._4ooo._1x2_._1ve7._1gax.img
  // Xpath: //*[@id="u_0_3_RL"]/img[1]
  const avatarClicked = await waitAndClick(page, [
    '#u_0_3_RL > img',
    '//*[@id="u_0_3_RL"]/img[1]',
  ], 10000);

  if (!avatarClicked) {
    logger.warn('Could not find avatar, trying to find password field directly');
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Bước 4: Điền password từ via.password
  // CSS: #pass
  // Xpath: //*[@id="u_0_q_CD"]/div[2]/div[1]/input[1]
  if (via.password && via.password.trim() !== '') {
    const passwordTyped = await typeIntoInput(page, [
      '#pass',
      '//*[@id="u_0_q_CD"]/div[2]/div[1]/input[1]',
    ], via.password, 10000);

    if (!passwordTyped) {
      throw new Error('Could not find password input field');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Bước 5: Nhấn Enter
    await page.keyboard.press('Enter');

    // Bước 6: Đợi khoảng 5s
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
  const runner = new BMRunner(bm);
  
  // Override deviceConfig headless setting if specified
  // Tạo một copy của deviceConfig để không modify original
  const deviceConfig = JSON.parse(bm.deviceConfig);
  if (headless) {
    deviceConfig.headless = true;
  } else {
    deviceConfig.headless = false; // Đảm bảo không headless nếu không chọn
  }
  // Temporarily override deviceConfig trong profile object
  const originalDeviceConfig = bm.deviceConfig;
  (bm as any).deviceConfig = JSON.stringify(deviceConfig);
  
  // Tính toán window position giống ProfileManager
  const windowConfig = calculateWindowPosition(windowIndex);
  
  try {
    await runner.initialize(windowConfig);
  } finally {
    // Restore original deviceConfig
    (bm as any).deviceConfig = originalDeviceConfig;
  }

  if (!runner['page']) {
    throw new Error('Failed to initialize BM page');
  }

  const page = runner['page'];

  // Bước 1: Navigate đến base URL (facebook.com)
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 });

  // Bước 2: Đợi 2 giây (để page load)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 3: Đợi thêm 3 giây (tổng 5 giây)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bước 4: Set cookie (nếu có)
  const cookie = (bm as any).cookie;
  if (cookie && cookie.trim() !== '') {
    try {
      const cookies = runner['parseCookieString'](cookie);
      await page.setCookie(...cookies);
      logger.info(`BM Profile ${bm.id}: Set ${cookies.length} cookies`);
    } catch (e) {
      logger.warn('Failed to set cookies for BM profile:', e);
    }
  }

  // Bước 5: Reload page để đảm bảo cookie được apply
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 6 & 7: Navigate đến URL với business_id đã được lưu
  const bmUid = bm.bmUid;
  if (bmUid && bmUid.trim() !== '') {
    const targetUrl = `https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=${bmUid.trim()}`;
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    logger.info(`BM Profile ${bm.id}: Navigated to BM dashboard with business_id=${bmUid}`);
  } else {
    await page.goto('https://business.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 });
    logger.warn(`BM Profile ${bm.id}: No bmUid set, navigating to business.facebook.com`);
  }

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
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Click block accept đầu tiên
  // CSS: #login-panel-container > div.x1ey2m1c... (dài)
  // Xpath: //*[@id="login-panel-container"]/div/div/div/div[3]/div/div/div hoặc //*[@id="login-panel-container"]/div/div/div/div[3]/div/div
  const acceptBlockClicked = await waitAndClick(page, [
    '//*[@id="login-panel-container"]/div/div/div/div[3]/div/div/div',
    '//*[@id="login-panel-container"]/div/div/div/div[3]/div/div',
    '#login-panel-container > div > div > div > div:nth-of-type(3) > div > div',
  ], 15000);

  if (!acceptBlockClicked) {
    logger.warn('Could not find accept block, continuing...');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 2: Điền first name & last name
  // First name 'ok': CSS: #js_5, Xpath: //*[@id="js_5"]
  // Last name 'oka': CSS: #js_a, Xpath: //*[@id="js_a"]
  const firstNameTyped = await typeIntoInput(page, [
    '#js_5',
    '//*[@id="js_5"]',
  ], 'ok', 10000);

  if (!firstNameTyped) {
    logger.warn('Could not find first name input');
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  const lastNameTyped = await typeIntoInput(page, [
    '#js_a',
    '//*[@id="js_a"]',
  ], 'oka', 10000);

  if (!lastNameTyped) {
    logger.warn('Could not find last name input');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Bước 3: Bấm continue lần 1
  // Xpath: //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]
  const continue1Clicked = await waitAndClick(page, [
    '//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]',
  ], 10000);

  if (continue1Clicked) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    logger.warn('Could not find first continue button');
  }

  // Bước 4: Continue tiếp
  // Xpath: //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]
  // hoặc //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]
  const continue2Clicked = await waitAndClick(page, [
    '//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]',
    '//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]',
  ], 10000);

  if (continue2Clicked) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    logger.warn('Could not find second continue button');
  }

  // Bước 5: Accept invitation
  // Xpath: //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/div
  const acceptClicked = await waitAndClick(page, [
    '//*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/div',
  ], 10000);

  if (acceptClicked) {
    await new Promise(resolve => setTimeout(resolve, 3000));
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
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bước 8: Lấy Via-UID-Ad-Account
  // CSS: #js_6g hoặc #js_6g > a
  // Xpath: //*[@id="js_6g"]/a hoặc //*[@id="js_6g"]
  // Copy text ở đó hoặc click vào đó để copy
  let viaAdAccountUid = '';
  try {
    await page.waitForSelector('#js_6g', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to get text from #js_6g > a first
    viaAdAccountUid = await page.evaluate(() => {
      const element = document.querySelector('#js_6g > a') || document.querySelector('#js_6g');
      if (element) {
        // Try textContent first
        let text = element.textContent?.trim() || '';
        // If no text, try href
        if (!text && element.getAttribute('href')) {
          const href = element.getAttribute('href') || '';
          const match = href.match(/act=(\d+)/);
          if (match) {
            text = match[1];
          }
        }
        // If still no text, try innerText
        if (!text) {
          text = (element as HTMLElement).innerText?.trim() || '';
        }
        return text;
      }
      return '';
    });

    if (!viaAdAccountUid) {
      // Try xpath
      const [element] = await (page as any).$x('//*[@id="js_6g"]/a | //*[@id="js_6g"]');
      if (element) {
        viaAdAccountUid = await page.evaluate((el) => {
          let text = el.textContent?.trim() || '';
          if (!text && el.getAttribute('href')) {
            const href = el.getAttribute('href') || '';
            const match = href.match(/act=(\d+)/);
            if (match) {
              text = match[1];
            }
          }
          if (!text) {
            text = (el as HTMLElement).innerText?.trim() || '';
          }
          return text;
        }, element);
      }
    }

    if (!viaAdAccountUid) {
      throw new Error('Could not extract Via-UID-Ad-Account from element');
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
  // Xpath: //*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div
  // hoặc //*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div
  const addClicked = await waitAndClick(page, [
    '//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div',
    '//*[@id="mount_0_0_MY"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[1]/div/div/div/div/div/div[2]/div[3]/div/span/div/div',
  ], 15000);

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
  // CSS: #js_7l hoặc #js_7m
  // Xpath: //*[@id="js_7m"] hoặc //*[@id="js_7l"] hoặc //*[@id="js_7k"]/div/div/div/div/div/div
  const addAdAccountClicked = await waitAndClick(page, [
    '#js_7l',
    '#js_7m',
    '//*[@id="js_7m"]',
    '//*[@id="js_7l"]',
    '//*[@id="js_7k"]/div/div/div/div/div/div',
  ], 10000);

  if (!addAdAccountClicked) {
    throw new Error('Could not find "Add an ad account" option');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 4: Nhập Via-UID-Ad-Account vừa nhận được vào:
  // CSS: #js_8m
  // Xpath: //*[@id="js_8m"]
  const accountIdTyped = await typeIntoInput(page, [
    '#js_8m',
    '//*[@id="js_8m"]',
  ], viaAdAccountUid, 10000);

  if (!accountIdTyped) {
    throw new Error('Could not find ad account input field');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Sau đó nhấn next
  // Xpath: //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div
  // hoặc //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div
  const nextClicked = await waitAndClick(page, [
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div',
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div[2]/div/span/div/div',
  ], 10000);

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
  // Xpath: //*[@id="js_95"]
  // hoặc //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[1]
  // hoặc //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[2]
  const toggleClicked = await waitAndClick(page, [
    '#js_95',
    '//*[@id="js_95"]',
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[1]',
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[3]/div/div[2]/div/div[2]/div/div/div/div/span/div/div[1]/div/div[2]',
  ], 10000);

  if (!toggleClicked) {
    logger.warn('Could not find full access toggle');
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sau đó, click confirm để hoàn thành
  // CSS: #js_8y hoặc #js_8y > span.x1vvvo52...
  // Xpath: //*[@id="js_8y"]/span/div/div/div
  const confirmClicked = await waitAndClick(page, [
    '#js_8y',
    '//*[@id="js_8y"]/span/div/div/div',
  ], 10000);

  if (!confirmClicked) {
    logger.warn('Could not find confirm button');
  } else {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Bước 6: Click done để hoàn tất
  // Xpath: //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div
  // hoặc //*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div/span/div/div/div
  const doneClicked = await waitAndClick(page, [
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div',
    '//*[@id="facebook"]/body/span/div/div[1]/div[1]/div/div/div/div/div/div[1]/div[2]/div[2]/div/div/div[3]/div/div/div/span/div/div/div',
  ], 10000);

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
  // Xpath: //*[@id="mount_0_0_OJ"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr
  // hoặc //*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[1]
  // hoặc //*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[2]
  const requestRowClicked = await waitAndClick(page, [
    '//table/tbody/tr[1]',
    '//*[@id="mount_0_0_OJ"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr',
    '//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[1]',
    '//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div/div/div/div/table/tbody/tr/td[2]',
  ], 15000);

  if (!requestRowClicked) {
    throw new Error('Could not find request in table');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Bước 2: Chọn approve
  // Xpath: //*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div
  // hoặc //*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div/span/div/div/div
  const approveClicked = await waitAndClick(page, [
    '//div[contains(text(), "Approve")]',
    '//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div',
    '//*[@id="mount_0_0_1J"]/div/div[1]/div/div[2]/div/div/div[1]/span/div/div/div[1]/div[1]/div/div[2]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div/div[1]/div/div[2]/div/div[2]/div/span/div/div/div',
  ], 15000);

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
        const viaUid = (task.via as any).username || task.via.uid || '';

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

          // Prepare VIA session với window index dựa trên task index
          // Window index bắt đầu từ 1 (0 là BM), sau đó tăng dần cho mỗi VIA
          const viaWindowIndex = 1 + task.index;
          logger.info(`Preparing VIA session for profile ${task.via.id}`);
          viaRunner = await prepareViaSession(task.via as any, viaWindowIndex, headless);

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

          // Cleanup: close browser
          try {
            await viaRunner['browser']?.close();
          } catch (e) {
            // Ignore cleanup errors
          }
        } catch (error: any) {
          result.status = 'error';
          result.errorMessage = error.message || 'Unknown error';
          onLog?.(result);

          doneCount++;
          onProgress?.(doneCount, totalLinks);

          logger.error(`Task ${taskId} failed:`, error);

          // Cleanup on error
          try {
            if (viaRunner) {
              await viaRunner['browser']?.close();
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      roundIndex++;
    }
  }

  // Cleanup BM browser
  try {
    await bmRunner['browser']?.close();
  } catch (e) {
    // Ignore cleanup errors
  }

  logger.info(`Auto BM Script completed: ${doneCount}/${totalLinks} links processed`);
}
