# Setup Guide for BM Invite Automation Tool

## Prerequisites Installation

### 1. Install Node.js
- Download and install Node.js 18+ from [nodejs.org](https://nodejs.org/)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. No External Services Required!

**This is a Windows desktop application** - everything runs natively:
- ✅ No Docker required
- ✅ No Redis required  
- ✅ No external services
- ✅ Uses in-memory queue (built-in)
- ✅ All data stored locally in AppData

### 3. Install Git (if cloning from repository)
- Download from [git-scm.com](https://git-scm.com/)

## Project Setup

### Step 1: Install Dependencies

```bash
cd bminvite
npm install
```

This will install all required packages including:
- Electron
- React and UI components
- Puppeteer
- Prisma
- Fastify
- BullMQ
- And all other dependencies

### Step 2: Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create initial migration
npm run prisma:migrate

# Or if you want to reset the database
npx prisma migrate reset
```

The database will be created at: `%APPDATA%/BMInviteTool/data/bminvite.db`

### Step 3: Configure Environment

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./data/bminvite.db"
API_PORT=3001
LOG_LEVEL=info
ENCRYPTION_KEY=change-this-to-a-secure-key-in-production
```

**Important**: Change `ENCRYPTION_KEY` to a secure random string in production!

### Step 4: Build the Application

```bash
# Build main process and renderer
npm run build
```

### Step 5: Start Development

```bash
# Start development mode (with hot reload)
npm run dev
```

This will:
1. Start the Vite dev server (port 3000)
2. Watch and compile the Electron main process
3. Launch the Electron app

## First Run

1. The application will:
   - Create necessary directories in AppData
   - Initialize the SQLite database
   - Start the local API server on port 3001

2. You should see the UI matching the web version

3. Start by:
   - Adding a profile (VIA or BM)
   - Testing proxy connection
   - Adding invite links
   - Starting automation

## Troubleshooting

### Queue Issues

If you see queue-related errors:
- The queue runs in-memory (no Redis needed)
- Restart the app if queue seems stuck
- Check logs for detailed error messages

### Database Errors

If you encounter database errors:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Port Already in Use

If ports 3000 or 3001 are in use:
- Change port in `vite.config.ts` (renderer)
- Change port in `src/main/api/server.ts` (API)

### Puppeteer Issues

- Ensure Chrome/Chromium is installed
- Puppeteer will download Chromium on first run if needed
- If downloads fail, install Chrome manually

### TypeScript Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Production Build

### Build for Windows

```bash
npm run package
```

This creates:
- `release/BM Invite Tool Setup.exe` - Windows installer
- `release/win-unpacked/` - Unpacked application

### Distribution

The installer can be distributed to end users. On installation:
- Application installs to Program Files
- Data stored in `%APPDATA%/BMInviteTool/`
- Logs stored in `%APPDATA%/BMInviteTool/logs/`
- Screenshots stored in `%APPDATA%/BMInviteTool/artifacts/screenshots/`

## Next Steps

1. Read `README.md` for usage instructions
2. Review `UI_TO_BACKEND_MAPPING.md` for API documentation
3. Customize automation logic in `src/main/automation/`
4. Adjust fingerprint generation in `src/main/profiles/fingerprintGenerator.ts`

## Support

For issues or questions:
- Check logs in `%APPDATA%/BMInviteTool/logs/`
- Review error messages in the application console
- Check database with Prisma Studio: `npm run prisma:studio`

