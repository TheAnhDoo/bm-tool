# Testing Guide - BM Invite Automation Tool

## Quick Setup for Testing

### Step 1: Install Prerequisites

1. **Install Node.js 18+**
   - Download from https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **Install Redis** (Required for job queue)
   - **Option A: Docker (Easiest)**
     ```bash
     docker run -d -p 6379:6379 --name redis redis:latest
     ```
   - **Option B: Windows Native**
     - Download from: https://github.com/microsoftarchive/redis/releases
     - Extract and run `redis-server.exe`
   - **Option C: Use Redis Cloud (Free)**
     - Sign up at https://redis.com/cloud/
     - Get connection string and update `.env`

3. **Verify Redis is Running**
   ```bash
     redis-cli ping
     # Should return: PONG
     ```

### Step 2: Clone and Install

```bash
cd bminvite
npm install
```

### Step 3: Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create database and run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio to view data
npm run prisma:studio
```

### Step 4: Create Environment File

Create `.env` in the root directory:

```env
DATABASE_URL="file:./data/bminvite.db"
API_PORT=3001
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LOG_LEVEL=info
ENCRYPTION_KEY=test-key-change-in-production-12345
```

### Step 5: Start Development Mode

```bash
# This starts both Vite dev server and Electron
npm run dev
```

**What happens:**
- Vite dev server starts on port 3000 (UI)
- Electron main process compiles and watches for changes
- Electron app window opens
- API server starts on port 3001

## Testing the Application

### Test 1: Create a Profile

1. In the app, click **"Add Profile"** or **"Add Via/BM Trung Gian"**
2. Enter test data:
   - Proxy: `127.0.0.1:8080:testuser:testpass` (or use a real proxy)
   - Fingerprint: Select "Random Fingerprint"
   - UID/Password: Optional for testing
3. Click **"Save"**
4. Verify profile appears in the table

### Test 2: Import Profiles

1. Create a test CSV file `test-profiles.csv`:
   ```csv
   uid,pass,2fa,proxy
   100123,mypass,ABCD1234,127.0.0.1:8080:user1:pass1
   100124,mypass2,DEFG5678,127.0.0.1:8080:user2:pass2
   ```
2. Click **"Import"** button
3. Select your CSV file
4. Verify profiles are imported

### Test 3: Add Invite Links

1. Click **"Link Invite"** button
2. Enter test invite URLs (one per line):
   ```
   https://facebook.com/invite/test1
   https://facebook.com/invite/test2
   ```
3. Click **"Save"**
4. Verify invites appear in Link Invite dashboard

### Test 4: Test API Endpoints

Open a new terminal and test the API:

```bash
# List profiles
curl http://127.0.0.1:3001/api/profiles

# Get dashboard stats
curl http://127.0.0.1:3001/api/dashboard/stats

# Health check
curl http://127.0.0.1:3001/health
```

### Test 5: Check Logs

Logs are stored in: `%APPDATA%/BMInviteTool/logs/`

- `combined.log` - All logs
- `error.log` - Error logs only

View logs:
```bash
# Windows PowerShell
Get-Content "$env:APPDATA\BMInviteTool\logs\combined.log" -Tail 50
```

## Debugging Tips

### Enable DevTools

In development mode, DevTools opens automatically. If not:
- Press `F12` or `Ctrl+Shift+I`
- Check Console for errors

### Check Main Process Logs

The main process logs to console and files. Check:
- Terminal where you ran `npm run dev`
- Log files in AppData

### Database Inspection

Use Prisma Studio:
```bash
npm run prisma:studio
```
Opens at http://localhost:5555

### Check Redis

```bash
# Connect to Redis CLI
redis-cli

# Check queue status
KEYS *
GET <queue-name>

# Monitor queue activity
MONITOR
```

## Common Issues

### Issue: "Redis connection failed"
**Solution:** Ensure Redis is running
```bash
docker ps  # Check if Redis container is running
# Or
redis-cli ping  # Should return PONG
```

### Issue: "Port 3000 or 3001 already in use"
**Solution:** Kill processes or change ports
```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

### Issue: "Database locked"
**Solution:** Close Prisma Studio and retry, or restart app

### Issue: "Puppeteer not launching"
**Solution:** 
- Ensure Chrome/Chromium is installed
- Check firewall settings
- Verify proxy settings are correct

## Before Packaging

### 1. Test All Features

- [ ] Create VIA profile
- [ ] Create BM profile
- [ ] Import profiles from CSV
- [ ] Add invite links
- [ ] Start/stop profiles
- [ ] Export reports
- [ ] Check logs are generated
- [ ] Verify screenshots are saved

### 2. Update Configuration

- Change `ENCRYPTION_KEY` in `.env` to a secure value
- Review `LOG_LEVEL` (use `info` for production, `debug` for testing)

### 3. Build for Production

```bash
# Build the application
npm run build

# Verify build output
# Should see: dist/main/ and dist/renderer/
```

### 4. Package as EXE

```bash
npm run package
```

This creates:
- `release/BM Invite Tool Setup.exe` - Installer
- `release/win-unpacked/` - Unpacked app (for testing)

### 5. Test the Packaged Version

1. Run the installer from `release/`
2. Install the application
3. Launch and test all features
4. Verify data is stored in AppData
5. Check logs location

## Next Steps

Once testing is complete:
1. Review automation scripts (see AUTOMATION_SCRIPTS_GUIDE.md)
2. Customize fingerprint generation
3. Adjust Puppeteer selectors for Facebook
4. Test with real proxies and credentials
5. Package final version for client






