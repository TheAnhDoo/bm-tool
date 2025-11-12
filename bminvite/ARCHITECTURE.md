# Architecture Overview

## System Architecture

The BM Invite Automation Tool is a Windows desktop application built with Electron, implementing a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Renderer                      │
│              (React UI - Port 3000)                      │
│  - React Components (existing UI)                         │
│  - IPC Communication Layer                                │
└────────────────────┬──────────────────────────────────────┘
                     │ IPC (contextBridge)
┌────────────────────▼──────────────────────────────────────┐
│                    Electron Main Process                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  IPC Handlers (ipc/index.ts)                         │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Fastify API Server (127.0.0.1:3001)                │ │
│  │  - Profile Routes                                     │ │
│  │  - Invite Routes                                      │ │
│  │  - Automation Routes                                  │ │
│  │  - Dashboard Routes                                   │ │
│  │  - Report Routes                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Automation Engine                                     │ │
│  │  - Flow Controller                                     │ │
│  │  - VIA Runner (Puppeteer)                             │ │
│  │  - BM Runner (Puppeteer)                              │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Job Queue (BullMQ + Redis)                          │ │
│  │  - Profile Jobs                                       │ │
│  │  - Invite Jobs                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Profile Manager                                      │ │
│  │  - Profile CRUD                                       │ │
│  │  - Fingerprint Generation                             │ │
│  │  - Proxy Validation                                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│                    Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Prisma + SQLite                                      │ │
│  │  - Profiles                                           │ │
│  │  - Invites                                            │ │
│  │  - Logs                                               │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  File System                                           │ │
│  │  - Chrome Profiles (userDataDir)                      │ │
│  │  - Screenshots                                        │ │
│  │  - Logs (Winston)                                     │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Data Flow

### Profile Creation Flow

```
UI → IPC → API Route → ProfileManager → Prisma → Database
                                  ↓
                           Fingerprint Generator
                                  ↓
                           Chrome Profile Creation
```

### Invite Automation Flow

```
1. User clicks "Start Automation"
   ↓
2. UI → IPC → API → AutomationController
   ↓
3. FlowController assigns invites to VIA profiles
   ↓
4. Queue.addInviteJob() for each invite
   ↓
5. Worker processes:
   a. VIA Runner: Extract invite data (via_uid, ad_account_uid)
   b. BM Runner: Set role for ad_account_uid
   c. VIA Runner: Accept invite
   ↓
6. Update database with results
   ↓
7. Emit events to UI via IPC
```

## Component Responsibilities

### Electron Main Process

- **main.ts**: Application entry point, window management
- **preload.ts**: IPC bridge setup (contextBridge)
- **ipc/index.ts**: IPC handlers for renderer communication
- **api/server.ts**: Fastify HTTP server (internal only)
- **api/routes/**: REST API endpoints

### Automation Engine

- **flowController.ts**: Orchestrates automation flow
- **viaRunner.ts**: Puppeteer automation for VIA profiles
- **bmRunner.ts**: Puppeteer automation for BM profiles
- **queue.ts**: BullMQ job queue management

### Profile Management

- **profileManager.ts**: Profile CRUD operations
- **fingerprintGenerator.ts**: Device fingerprint generation
- **proxyParser.ts**: Proxy string parsing

### Data Layer

- **prismaClient.ts**: Database connection and initialization
- **prisma/schema.prisma**: Database schema definition

### Utilities

- **logger.ts**: Winston-based structured logging
- **crypto.ts**: Encryption/decryption for sensitive data
- **fileHelpers.ts**: File system operations

## Security Considerations

1. **Context Isolation**: Renderer process cannot access Node.js APIs directly
2. **Encryption**: Passwords and 2FA keys encrypted with AES-256-GCM
3. **Local Only**: API server only listens on 127.0.0.1
4. **Isolated Profiles**: Each profile has its own Chrome user data directory
5. **Proxy Security**: Proxy credentials stored encrypted

## Performance Optimizations

1. **Concurrency Control**: Queue limits concurrent browser sessions
2. **SQLite WAL Mode**: Enables concurrent database reads
3. **Connection Pooling**: Prisma manages database connections
4. **Resource Management**: Proper cleanup of Puppeteer browsers
5. **Efficient Queuing**: BullMQ handles job distribution

## Error Handling

- **Try-Catch Blocks**: All async operations wrapped
- **Logging**: Errors logged with Winston
- **Database Transactions**: Rollback on failures
- **Queue Retries**: BullMQ handles job retries
- **User Feedback**: Errors surfaced via IPC events

## Extension Points

1. **Custom Fingerprints**: Add new presets in `fingerprintGenerator.ts`
2. **New Automation Steps**: Extend `viaRunner.ts` or `bmRunner.ts`
3. **Additional Providers**: Add new queue types in `queue.ts`
4. **API Routes**: Add new endpoints in `api/routes/`
5. **UI Components**: React components in `src/components/`

