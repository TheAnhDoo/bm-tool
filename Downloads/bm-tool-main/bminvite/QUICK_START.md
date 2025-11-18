# Quick Start Guide - Windows Desktop App

## 🚀 Fast Setup (5 minutes)

### 1. Install Node.js

- Download Node.js 18+ from https://nodejs.org/
- Install it (includes npm)
- Verify:
  ```powershell
  node --version
  npm --version
  ```

### 2. Install Dependencies

```powershell
cd bminvite
npm install
```

**Note**: This is a **Windows desktop application** - no Docker, no Redis, no external services required! Everything runs natively on Windows.

### 3. Setup Database

```powershell
npm run prisma:generate
npm run prisma:migrate
```

The database will be created automatically in `%APPDATA%/BMInviteTool/data/bminvite.db`

### 4. Create .env File (Optional)

Create `.env` in the root (optional - defaults work fine):

```env
DATABASE_URL="file:./data/bminvite.db"
API_PORT=3001
LOG_LEVEL=info
ENCRYPTION_KEY=change-this-to-secure-key-in-production
```

### 5. Start Development

```powershell
npm run dev
```

**Done!** The Electron app window should open automatically.

## 📝 First Test

1. **Create a Test Profile:**
   - Click "Add Profile" in the app
   - Enter proxy: `127.0.0.1:8080:test:test` (or use a real proxy)
   - Select "Random Fingerprint"
   - Click "Save"

2. **Check Logs:**
   - Logs are in: `%APPDATA%\BMInviteTool\logs\`
   - Or check the terminal output

3. **Test API:**
   ```powershell
   curl http://127.0.0.1:3001/health
   ```

## 🛠️ Editing Automation Scripts

### Location of Scripts

- **VIA Automation**: `src/main/automation/viaRunner.ts` (Line ~140 for selectors)
- **BM Automation**: `src/main/automation/bmRunner.ts` (Line ~128 for role assignment)
- **Flow Control**: `src/main/automation/flowController.ts`

### Quick Edit Example

Open `src/main/automation/viaRunner.ts` and find the `extractInviteData` method around line 140:

```typescript
// Current code (lines ~140-155):
const inviteData = await this.page.evaluate(() => {
  // ⚠️ EDIT THIS SECTION TO MATCH YOUR FACEBOOK PAGE STRUCTURE ⚠️
  const viaUid = document.querySelector('[data-via-uid]')?.getAttribute('data-via-uid') || '';
  // ... replace with your selectors
});
```

**Replace with your Facebook selectors:**

```typescript
const inviteData = await this.page.evaluate(() => {
  // YOUR FACEBOOK SELECTORS HERE
  // Example: Extract from URL
  const urlParams = new URLSearchParams(window.location.search);
  const adAccountUid = urlParams.get('act') || '';
  
  // Example: Extract from page element
  const viaElement = document.querySelector('.via-uid');
  const viaUid = viaElement?.textContent?.trim() || '';
  
  return { viaUid, adAccountUid };
});
```

### Save and Restart

After editing:
1. Stop the app (Ctrl+C)
2. Run `npm run dev` again
3. Changes will be compiled automatically

## 🔄 UID Transfer Between Profiles

The system **automatically** transfers UIDs through the database. Here's how it works:

1. **VIA extracts UIDs** → Saved to `Invite` table
2. **BM reads UIDs** → Uses them to assign roles
3. **VIA confirms** → Accepts the invite

**No code changes needed** - it's automatic! See `src/main/jobs/localQueue.ts` for the implementation.

## 📝 Logging

### Where Logs Are Saved

1. **File Logs**: `%APPDATA%\BMInviteTool\logs\combined.log`
2. **Database Logs**: `Log` table (view with `npm run prisma:studio`)
3. **Screenshots**: `%APPDATA%\BMInviteTool\artifacts\screenshots\`

### Adding Logs to Your Scripts

In any automation file, add:

```typescript
// Log an action
await this.logAction('my-action', 'Description of what happened', 'success');

// Log with screenshot
await this.saveScreenshot('action-name');
await this.logAction('my-action', 'Action completed', 'success');
```

### View Logs

```powershell
# Database logs
npm run prisma:studio
# Opens at http://localhost:5555 - view Log table

# Or check files
Get-Content "$env:APPDATA\BMInviteTool\logs\combined.log" -Tail 50
```

## 🐛 Troubleshooting

### "Port in use"
```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

### "Database error"
```powershell
npm run prisma:generate
npm run prisma:migrate
```

### "Puppeteer not launching"
- Ensure Chrome/Chromium is installed
- Puppeteer will download Chromium on first run if needed
- Check firewall settings

## 📦 Before Packaging

### 1. Test Everything
- Create profiles
- Add invites
- Start automation
- Check logs

### 2. Build
```powershell
npm run build
```

### 3. Package
```powershell
npm run package
```

Installer will be in `release\BM Invite Tool Setup.exe`

## ✅ No External Dependencies!

This is a **fully self-contained Windows desktop application**:
- ✅ No Docker required
- ✅ No Redis required
- ✅ No external services
- ✅ Everything runs natively on Windows
- ✅ All data stored locally in AppData

## 📚 More Details

- **Full Testing Guide**: See `TESTING_GUIDE.md`
- **Automation Scripts**: See `AUTOMATION_SCRIPTS_GUIDE.md`
- **Architecture**: See `ARCHITECTURE.md`
