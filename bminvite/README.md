# BM Invite Automation Tool

A Windows desktop application built with Electron, TypeScript, Puppeteer, and Prisma for automating Facebook Business Manager invite acceptance and role assignment.

## 🚀 Features

- **Profile Management**: Create and manage VIA and BM Trung Gian profiles with proxy configuration and device fingerprinting
- **Invite Automation**: Automate the complete invite flow from VIA to BM to VIA
- **Local Database**: SQLite database stored in AppData for all profile and invite data
- **Browser Automation**: Puppeteer-based automation with stealth mode and proxy support
- **Real-time Updates**: Live status updates via IPC communication
- **Logging & Reporting**: Comprehensive logging with screenshot capture and CSV export

## 📋 Prerequisites

- Node.js 18+ and npm
- Windows 10/11
- Redis (optional, for BullMQ - can run in-memory for local use)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bminvite
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

## 🏃 Development

### Start Development Mode

```bash
npm run dev
```

This will:
- Start the Vite dev server for the renderer process (React UI)
- Watch and compile the main process (Electron backend)
- Start the Electron app

### Build for Production

```bash
npm run build
```

This compiles both the main and renderer processes.

### Package for Windows

```bash
npm run package
```

This creates a Windows installer in the `release/` directory.

## 📁 Project Structure

```
bminvite/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # Entry point
│   │   ├── preload.ts        # IPC bridge
│   │   ├── api/              # Fastify API server
│   │   │   ├── server.ts
│   │   │   └── routes/       # API routes
│   │   ├── automation/       # Automation engine
│   │   │   ├── viaRunner.ts
│   │   │   ├── bmRunner.ts
│   │   │   └── flowController.ts
│   │   ├── profiles/         # Profile management
│   │   │   ├── profileManager.ts
│   │   │   └── fingerprintGenerator.ts
│   │   ├── jobs/             # Job queue
│   │   │   └── queue.ts
│   │   ├── db/               # Database
│   │   │   └── prismaClient.ts
│   │   └── utils/            # Utilities
│   │       ├── logger.ts
│   │       ├── crypto.ts
│   │       └── fileHelpers.ts
│   └── components/           # React UI components (existing)
├── prisma/
│   └── schema.prisma         # Database schema
├── dist/                     # Build output
└── package.json
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./data/bminvite.db"
API_PORT=3001
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
LOG_LEVEL=info
```

### Database

The SQLite database is automatically created in `%APPDATA%/BMInviteTool/data/bminvite.db` when the app first runs.

## 📖 Usage

### Adding Profiles

1. Click "Add Profile" or "Add Via/BM Trung Gian"
2. Enter proxy information (format: `ip:port:user:pass`)
3. Optionally enter UID, Password, and 2FA key
4. Select device fingerprint configuration
5. Save the profile

### Importing Profiles

1. Use the "Import" button in the profile dashboard
2. Upload a CSV/TXT file with format:
   ```
   UID|PASS|2FA|PROXY
   100123|password|ABCD1234|176.111.216.68:16554:user:pass
   ```

### Managing Invites

1. Click "Link Invite" to add invite links
2. Enter invite URLs (one per line) or import from file
3. Start automation to process invites

### Running Automation

1. Select profiles or click "Run All"
2. Automation will:
   - Launch VIA profile → Extract invite data
   - Notify BM profile → Set role for ad account
   - VIA profile → Accept invite
3. Monitor progress in the dashboard and reports

## 🔐 Security

- Passwords and 2FA keys are encrypted using AES-256-GCM
- All sensitive data is stored encrypted in the database
- Chrome profiles are isolated per profile
- Proxy credentials are stored securely

## 📝 API Endpoints

The application runs a local Fastify server on `127.0.0.1:3001`:

- `GET /api/profiles` - List profiles
- `POST /api/profiles` - Create profile
- `POST /api/profiles/import` - Import profiles
- `POST /api/profiles/:id/start` - Start profile
- `POST /api/profiles/:id/stop` - Stop profile
- `GET /api/invites` - List invites
- `POST /api/invites` - Create invites
- `POST /api/automation/run` - Start automation
- `GET /api/reports` - Get reports

See `UI_TO_BACKEND_MAPPING.md` for complete API documentation.

## 🐛 Troubleshooting

### Database Issues

If you encounter database errors:
```bash
npm run prisma:migrate
npm run prisma:generate
```

### Port Conflicts

If port 3000 or 3001 is in use, update the ports in:
- `vite.config.ts` (renderer port)
- `src/main/api/server.ts` (API port)

### Puppeteer Issues

Ensure Chrome/Chromium is installed. The app uses Puppeteer which requires Chrome.

## 📄 License

MIT

## 🤝 Contributing

This is a private project. For issues or questions, contact the development team.
