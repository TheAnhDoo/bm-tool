# Automation Scripts Guide

This guide explains how to edit browser automation scripts, handle UID transfer between profiles, and implement logging.

## 📁 Script Locations

### Main Automation Scripts

1. **VIA Runner**: `src/main/automation/viaRunner.ts`
   - Handles VIA profile automation
   - Opens invite links
   - Extracts `via_uid` and `ad_account_uid`

2. **BM Runner**: `src/main/automation/bmRunner.ts`
   - Handles BM profile automation
   - Sets roles for ad accounts
   - Manages Business Manager interactions

3. **Flow Controller**: `src/main/automation/flowController.ts`
   - Orchestrates the automation flow
   - Coordinates between VIA and BM profiles

## 🔧 Editing Automation Scripts

### Example: Editing VIA Runner

**File**: `src/main/automation/viaRunner.ts`

#### 1. Extract Invite Data

```typescript
async extractInviteData(inviteLink: string): Promise<InviteData> {
  // ... existing code ...
  
  // CUSTOMIZE THIS SECTION:
  const inviteData = await this.page.evaluate(() => {
    // Option 1: Extract from data attributes
    const viaUid = document.querySelector('[data-via-uid]')?.getAttribute('data-via-uid') || '';
    
    // Option 2: Extract from URL
    const urlParams = new URLSearchParams(window.location.search);
    const adAccountUid = urlParams.get('act') || '';
    
    // Option 3: Extract from page text/regex
    const pageText = document.body.innerText;
    const viaMatch = pageText.match(/via[_-]?uid[:\s]+(\d+)/i);
    const viaUid = viaMatch ? viaMatch[1] : '';
    
    // Option 4: Extract from specific element
    const adAccountElement = document.querySelector('#ad-account-id');
    const adAccountUid = adAccountElement?.textContent?.trim() || '';
    
    return { viaUid, adAccountUid };
  });
  
  return {
    viaUid: inviteData.viaUid || undefined,
    adAccountUid: inviteData.adAccountUid || undefined,
  };
}
```

#### 2. Handle Login

```typescript
async login(): Promise<void> {
  // ... existing code ...
  
  // CUSTOMIZE LOGIN FLOW:
  
  // Option 1: Wait for specific element
  await this.page.waitForSelector('#email', { timeout: 10000 });
  
  // Option 2: Handle cookie consent
  const cookieButton = await this.page.$('[data-testid="cookie-consent-accept"]');
  if (cookieButton) {
    await cookieButton.click();
    await this.page.waitForTimeout(1000);
  }
  
  // Option 3: Handle 2FA
  if (this.profile.twoFAKey) {
    const twoFAKey = decrypt(this.profile.twoFAKey);
    // Generate TOTP code
    const totpCode = generateTOTP(twoFAKey);
    await this.page.type('#two_factor_code', totpCode);
    await this.page.click('[name="confirm"]');
  }
  
  // Option 4: Handle captcha detection
  const captcha = await this.page.$('#captcha');
  if (captcha) {
    await this.logAction('captcha-detected', 'Manual intervention required', 'warning');
    // Wait for manual solving
    await this.page.waitForSelector('#captcha', { hidden: true, timeout: 60000 });
  }
}
```

#### 3. Accept Invite

```typescript
async acceptInvite(inviteLink: string): Promise<void> {
  // ... existing code ...
  
  // CUSTOMIZE ACCEPT BUTTON SELECTORS:
  
  // Try multiple selectors
  const selectors = [
    '[data-testid="accept-invite-button"]',
    'button:contains("Accept")',
    'button[aria-label*="Accept"]',
    '.accept-button',
    '#accept-btn',
  ];
  
  let clicked = false;
  for (const selector of selectors) {
    try {
      const button = await this.page.$(selector);
      if (button) {
        await button.click();
        clicked = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!clicked) {
    throw new Error('Accept button not found');
  }
  
  // Wait for confirmation
  await this.page.waitForSelector('.success-message', { timeout: 10000 });
}
```

### Example: Editing BM Runner

**File**: `src/main/automation/bmRunner.ts`

#### Set Role for Ad Account

```typescript
async setRoleForAdAccount(adAccountId: string): Promise<void> {
  // ... existing code ...
  
  // CUSTOMIZE ROLE ASSIGNMENT:
  
  // Navigate to ad account settings
  const adAccountUrl = `https://business.facebook.com/ads/manager/account_settings?act=${adAccountId}`;
  await this.page.goto(adAccountUrl, { waitUntil: 'networkidle2' });
  
  // Wait for page to load
  await this.page.waitForSelector('[data-testid="account-settings"]', { timeout: 10000 });
  
  // Click "Assign Role" or "Add People"
  await this.page.click('[data-testid="assign-role-button"]');
  
  // Wait for modal
  await this.page.waitForSelector('[data-testid="role-assignment-modal"]', { timeout: 5000 });
  
  // Enter VIA UID (received from flow controller)
  const viaUid = this.receivedViaUid; // See UID Transfer section below
  await this.page.type('[data-testid="user-id-input"]', viaUid);
  
  // Select role
  await this.page.select('[data-testid="role-select"]', 'ADMIN'); // or 'ADVERTISER', 'ANALYST'
  
  // Confirm
  await this.page.click('[data-testid="confirm-assignment-button"]');
  
  // Wait for success
  await this.page.waitForSelector('.success-notification', { timeout: 10000 });
}
```

## 🔄 UID Transfer Between Profiles

### How It Works

The flow controller manages UID transfer:

1. **VIA Profile** extracts `via_uid` and `ad_account_uid` from invite
2. **Flow Controller** receives this data
3. **BM Profile** receives `via_uid` to assign role
4. **VIA Profile** receives confirmation to accept invite

### Implementation

#### 1. Update Flow Controller

**File**: `src/main/automation/flowController.ts`

```typescript
async startAutomation(options: AutomationOptions): Promise<void> {
  // ... existing code ...
  
  // After VIA extracts invite data, store it
  for (const invite of invites) {
    // Store extracted data in invite record
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        // Store extracted UIDs for later use
        metadata: JSON.stringify({
          viaUid: extractedViaUid,
          adAccountUid: extractedAdAccountUid,
        }),
      },
    });
  }
}
```

#### 2. Update Invite Job Worker

**File**: `src/main/jobs/queue.ts`

```typescript
// In the invite worker
const invite = await prisma.invite.findUnique({
  where: { id: inviteId },
  include: { viaProfile: true, bmProfile: true },
});

// Extract stored UIDs
const metadata = invite.metadata ? JSON.parse(invite.metadata) : {};
const viaUid = metadata.viaUid;
const adAccountUid = metadata.adAccountUid;

// Step 1: VIA profile extracts data
const viaRunner = new ViaRunner(invite.viaProfile);
const inviteData = await viaRunner.extractInviteData(invite.link);

// Store extracted data
await prisma.invite.update({
  where: { id: inviteId },
  data: {
    metadata: JSON.stringify({
      viaUid: inviteData.viaUid,
      adAccountUid: inviteData.adAccountUid,
    }),
  },
});

// Step 2: BM profile uses viaUid to set role
const bmRunner = new BMRunner(invite.bmProfile);
// Pass viaUid to BM runner
await bmRunner.setRoleForAdAccount(inviteData.adAccountUid, inviteData.viaUid);
```

#### 3. Update BM Runner to Accept UID

**File**: `src/main/automation/bmRunner.ts`

```typescript
export class BMRunner {
  private profile: Profile;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private prisma = getPrismaClient();
  private receivedViaUid: string | null = null; // Add this

  constructor(profile: Profile) {
    this.profile = profile;
  }

  async setRoleForAdAccount(adAccountId: string, viaUid: string): Promise<void> {
    this.receivedViaUid = viaUid; // Store received UID
    
    // ... rest of the method uses this.receivedViaUid ...
    
    // Use the viaUid when assigning role
    await this.page.type('[data-testid="user-id-input"]', viaUid);
  }
}
```

#### 4. Alternative: Use Database for UID Transfer

Store UIDs in the Invite record:

```typescript
// In viaRunner.ts after extraction
await this.prisma.invite.update({
  where: { id: inviteId },
  data: {
    adAccountId: inviteData.adAccountUid,
    // Store viaUid in a custom field or metadata
    result: JSON.stringify({
      viaUid: inviteData.viaUid,
      adAccountUid: inviteData.adAccountUid,
    }),
  },
});

// In bmRunner.ts, retrieve from database
const invite = await this.prisma.invite.findUnique({
  where: { id: inviteId },
});

const result = invite.result ? JSON.parse(invite.result) : {};
const viaUid = result.viaUid;
```

## 📝 Logging Implementation

### Logging Locations

1. **Application Logs**: `%APPDATA%/BMInviteTool/logs/`
   - `combined.log` - All logs
   - `error.log` - Errors only

2. **Database Logs**: Stored in `Log` table
   - View in Prisma Studio: `npm run prisma:studio`

3. **Screenshots**: `%APPDATA%/BMInviteTool/artifacts/screenshots/`

### Adding Custom Logs

#### In Automation Scripts

```typescript
// File: src/main/automation/viaRunner.ts

import { logger } from '../utils/logger';
import { getPrismaClient } from '../db/prismaClient';

async extractInviteData(inviteLink: string): Promise<InviteData> {
  const prisma = getPrismaClient();
  
  try {
    // Log start
    await this.logAction('extract-start', `Starting extraction for ${inviteLink}`, 'info');
    logger.info(`Profile ${this.profile.id}: Extracting invite data from ${inviteLink}`);
    
    await this.page.goto(inviteLink, { waitUntil: 'networkidle2' });
    
    // Log page loaded
    await this.logAction('page-loaded', 'Invite page loaded successfully', 'info');
    
    // Extract data
    const inviteData = await this.page.evaluate(() => {
      // ... extraction logic ...
    });
    
    // Log extracted data (without sensitive info)
    await this.logAction('extract-success', 
      `Extracted: viaUid=${inviteData.viaUid?.substring(0, 5)}..., adAccount=${inviteData.adAccountUid?.substring(0, 5)}...`, 
      'success'
    );
    logger.info(`Profile ${this.profile.id}: Extracted data`, {
      viaUid: inviteData.viaUid,
      adAccountUid: inviteData.adAccountUid,
    });
    
    return {
      viaUid: inviteData.viaUid || undefined,
      adAccountUid: inviteData.adAccountUid || undefined,
    };
    
  } catch (error: any) {
    // Log error
    await this.logAction('extract-error', `Failed: ${error.message}`, 'error');
    logger.error(`Profile ${this.profile.id}: Extraction failed`, error);
    throw error;
  }
}
```

#### Logging Helper Methods

```typescript
// Already in viaRunner.ts and bmRunner.ts

private async logAction(action: string, message: string, status: string): Promise<void> {
  await this.prisma.log.create({
    data: {
      profileId: this.profile.id,
      action,
      message,
      status,
      // Add metadata if needed
      metadata: JSON.stringify({
        timestamp: new Date().toISOString(),
        // Add any relevant data
      }),
    },
  });
}

private async saveScreenshot(name: string): Promise<string> {
  if (!this.page) return '';
  
  const screenshotPath = join(
    getScreenshotsPath(),
    `profile-${this.profile.id}-${name}-${Date.now()}.png`
  );
  
  await this.page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  // Log screenshot saved
  await this.logAction('screenshot', `Screenshot saved: ${name}`, 'info');
  
  return screenshotPath;
}
```

#### Advanced Logging with Metadata

```typescript
// Enhanced logging with more context
private async logAction(
  action: string, 
  message: string, 
  status: string, 
  metadata?: Record<string, any>
): Promise<void> {
  const screenshotPath = await this.saveScreenshot(action);
  
  await this.prisma.log.create({
    data: {
      profileId: this.profile.id,
      action,
      message,
      status,
      screenshot: screenshotPath,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
  
  // Also log to Winston
  if (status === 'error') {
    logger.error(`Profile ${this.profile.id}: ${action} - ${message}`, metadata);
  } else {
    logger.info(`Profile ${this.profile.id}: ${action} - ${message}`, metadata);
  }
}

// Usage:
await this.logAction('login', 'Login successful', 'success', {
  uid: this.profile.uid,
  loginTime: Date.now(),
});
```

### Viewing Logs

#### In Application

```typescript
// Query logs from database
const logs = await prisma.log.findMany({
  where: { profileId: profileId },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

#### Via API

```bash
# Get logs for a profile
curl http://127.0.0.1:3001/api/profiles/1/logs
```

#### Export Logs

```typescript
// In reports route
fastify.get('/logs/export', async (request, reply) => {
  const logs = await prisma.log.findMany({
    include: { profile: true },
  });
  
  const csv = [
    'ID,Profile,Action,Message,Status,Timestamp',
    ...logs.map(log => 
      `${log.id},${log.profile?.uid || 'N/A'},${log.action},${log.message},${log.status},${log.createdAt}`
    ),
  ].join('\n');
  
  reply.header('Content-Type', 'text/csv');
  return csv;
});
```

## 🎯 Best Practices

1. **Always log errors** with full context
2. **Save screenshots** at critical steps
3. **Use structured logging** (JSON metadata)
4. **Log before and after** important operations
5. **Include timestamps** in all logs
6. **Don't log sensitive data** (passwords, 2FA keys)
7. **Use appropriate log levels** (info, warning, error)

## 📚 Next Steps

1. Test automation scripts with real Facebook pages
2. Update selectors based on actual page structure
3. Implement error recovery mechanisms
4. Add retry logic for failed operations
5. Customize logging based on your needs






