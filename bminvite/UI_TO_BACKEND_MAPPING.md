# UI Component to Backend API Mapping

This document maps all UI components, buttons, and actions to their corresponding backend endpoints or IPC events.

## Profile Management

### ProfileDashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| `Add Profile` button | `onClick={() => setIsAddProfileOpen(true)}` | Opens dialog (no API call) | - |
| `Add Via/BM Trung Gian` button | `onClick={() => setIsAddViaOpen(true)}` | Opens dialog (no API call) | - |
| `Link Invite` button | `onClick={() => setIsAddLinkInviteOpen(true)}` | Opens dialog (no API call) | - |
| `Import` button | `onClick` (file upload) | `POST /api/profiles/import` | `FormData` with CSV/TXT file |
| `Export` button | `onClick` | `GET /api/profiles/export` | Query: `?format=csv` |
| `Run All` button | `handleRunAll()` | `POST /api/profiles/start-all` | `{}` |
| `Stop All` button | `handleStopAll()` | `POST /api/profiles/stop-all` | `{}` |
| `Run Selected` button | `handleRunSelected()` | `POST /api/profiles/start` | `{ profileIds: [1,2,3] }` |
| `Stop Selected` button | `handleStopSelected()` | `POST /api/profiles/stop` | `{ profileIds: [1,2,3] }` |
| Search input | `onChange` | Client-side filtering (or `GET /api/profiles?search=...`) | - |
| `ProfileTable` component | Renders profiles | `GET /api/profiles` | Returns: `{ profiles: Profile[] }` |

### AddProfileDialog Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| `Test` proxy button | `handleTestProxy()` | `POST /api/profiles/test-proxy` | `{ proxy: "ip:port:user:pass" }` |
| `Save` button | `handleSave()` | `POST /api/profiles` | `{ type: "VIA"\|"BM", proxy: {...}, fingerprint: "...", uid?: "...", password?: "...", twoFAKey?: "..." }` |
| Import CSV/TXT | `handleImportCSV()` | `POST /api/profiles/import` | `FormData` with file |
| Cancel button | `onOpenChange(false)` | Close dialog (no API call) | - |

### AddViaDialog Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Account type selector | `setAccountType("via"\|"bm-trung-gian")` | UI state only | - |
| `Save` button | `handleSave()` | `POST /api/profiles/batch` | `{ type: "VIA"\|"BM", accounts: ["UID\|PASS\|2FA\|PROXY", ...] }` |
| Import file | `handleImportFile()` | `POST /api/profiles/import` | `FormData` with CSV/TXT file |
| Cancel button | `onOpenChange(false)` | Close dialog (no API call) | - |

### ProfileTable Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Checkbox (select all) | `handleSelectAll(checked)` | Client-side state | - |
| Checkbox (row) | `handleSelectRow(id, checked)` | Client-side state | - |
| Play/Stop button | `handleToggleStatus(id)` | `POST /api/profiles/:id/start` or `POST /api/profiles/:id/stop` | `{}` |
| Edit button | `onClick` | `PUT /api/profiles/:id` | `{ uid?, password?, twoFAKey? }` |
| Delete button | `handleDelete(id)` | `DELETE /api/profiles/:id` | `{}` |
| View button (hover) | `onClick` | `GET /api/profiles/:id/logs` | Returns: `{ logs: Log[] }` |

## Via Dashboard

### ViaDashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Search input | `onChange` | Client-side filtering (or `GET /api/profiles?type=VIA&search=...`) | - |
| Delete button | `handleDelete()` | `DELETE /api/profiles/batch` | `{ profileIds: [1,2,3] }` |
| Table rows | Renders VIA profiles | `GET /api/profiles?type=VIA` | Returns: `{ profiles: Profile[] }` |

## BM Trung Gian Dashboard

### BMTrungGianDashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Search input | `onChange` | Client-side filtering (or `GET /api/profiles?type=BM&search=...`) | - |
| Delete button | `handleDelete()` | `DELETE /api/profiles/batch` | `{ profileIds: [1,2,3] }` |
| Table rows | Renders BM profiles | `GET /api/profiles?type=BM` | Returns: `{ profiles: Profile[] }` |

## Link Invite Management

### LinkInviteDashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Search input | `onChange` | Client-side filtering (or `GET /api/invites?search=...`) | - |
| Delete button | `handleDelete()` | `DELETE /api/invites/batch` | `{ inviteIds: [1,2,3] }` |
| Table rows | Renders invites | `GET /api/invites` | Returns: `{ invites: Invite[] }` |

### AddLinkInviteDialog Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| `Save` button | `handleSave()` | `POST /api/invites` | `{ links: ["url1", "url2", ...], notes?: "..." }` |
| Import file | `handleImportFile()` | `POST /api/invites/upload` | `FormData` with TXT file |
| Cancel button | `onOpenChange(false)` | Close dialog (no API call) | - |

## Dashboard (Main)

### Dashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Stats cards | Renders on mount | `GET /api/dashboard/stats` | Returns: `{ totalProfiles, viaActive, bmTrungGian, linkInvites, runningNow }` |
| Recent activity | Renders on mount | `GET /api/dashboard/activity` | Returns: `{ activities: Activity[] }` |
| System status | Renders on mount | `GET /api/dashboard/system` | Returns: `{ cpuUsage, memoryUsage, profilesRunning }` |

## Report Dashboard

### ReportDashboard Component

| UI Element | Action/Event | Backend Route/IPC | Payload Example |
|------------|-------------|-------------------|-----------------|
| Stats cards | Renders on mount | `GET /api/reports/stats` | Returns: `{ total, completed, pending }` |
| Refresh button | `handleRefresh()` | `GET /api/reports` | Returns: `{ reports: Report[] }` |
| Export CSV button | `handleExportCSV()` | `GET /api/reports/export?format=csv` | Returns: CSV file download |
| Table rows | Renders reports | `GET /api/reports` | Returns: `{ reports: Report[] }` |

## Real-time Updates

All components should listen to IPC events or WebSocket messages for real-time updates:

| Event Name | Description | Payload |
|------------|-------------|---------|
| `automation:profile:started` | Profile started running | `{ profileId: number }` |
| `automation:profile:stopped` | Profile stopped | `{ profileId: number }` |
| `automation:profile:updated` | Profile status changed | `{ profileId: number, status: string }` |
| `automation:invite:processing` | Invite being processed | `{ inviteId: number, status: string }` |
| `automation:invite:completed` | Invite completed | `{ inviteId: number, result: string }` |
| `automation:log:new` | New log entry created | `{ log: Log }` |
| `system:stats:updated` | Dashboard stats updated | `{ stats: DashboardStats }` |

## IPC Channel Names (Electron)

| Channel | Direction | Description |
|---------|-----------|-------------|
| `api:request` | Renderer → Main | Generic API request |
| `api:response` | Main → Renderer | API response |
| `automation:subscribe` | Renderer → Main | Subscribe to automation events |
| `automation:event` | Main → Renderer | Automation event update |
| `file:select` | Renderer → Main | Open file dialog |
| `file:selected` | Main → Renderer | File selection result |

