# Client Installation Guide

## For End Users (Clients)

### ✅ Fully Automatic Setup

**The application is now fully self-contained!** Clients don't need to:
- ❌ Create `.env` files
- ❌ Run database migrations
- ❌ Install Node.js or npm
- ❌ Run any commands

### Installation Steps

1. **Run the Installer**
   - Double-click `BM Invite Tool Setup.exe`
   - Follow the installation wizard
   - Choose installation location (default: `C:\Program Files\BM Invite Tool`)

2. **Launch the Application**
   - Find "BM Invite Tool" in Start Menu
   - Or double-click desktop shortcut
   - The app will automatically:
     - Create database on first run
     - Set up all required files
     - Configure environment
     - Be ready to use immediately

### Data Storage

All data is stored automatically in:
```
%APPDATA%\BMInviteTool\
├── data\              # Database
├── logs\              # Log files
├── artifacts\         # Screenshots
└── chrome-profiles\   # Browser profiles
```

### First Launch

On first launch, the app will:
1. ✅ Create all required directories
2. ✅ Initialize the database automatically
3. ✅ Run migrations automatically
4. ✅ Set default configuration
5. ✅ Be ready to use in ~5 seconds

### No Configuration Needed

Everything is automatic:
- Database path: Auto-configured
- API port: Auto-configured (3001)
- Encryption: Auto-configured
- Logging: Auto-configured

### Troubleshooting

If the app doesn't start:
1. Check Windows Defender / Antivirus (may block first run)
2. Run as Administrator (right-click → Run as Administrator)
3. Check logs in `%APPDATA%\BMInviteTool\logs\`

### System Requirements

- Windows 10/11 (64-bit)
- 4GB RAM minimum
- 500MB free disk space
- Internet connection (for Facebook automation)

That's it! The app handles everything automatically.






