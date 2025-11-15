/**
 * React API service for IPC communication
 * All UI components should use this service instead of direct IPC calls
 */

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class APIService {
  /**
   * Generic IPC call helper
   */
  private async callIPC<T = any>(channel: string, ...args: any[]): Promise<APIResponse<T>> {
    if (!window.electronAPI) {
      return { success: false, error: 'Electron API not available' };
    }

    try {
      const result = await window.electronAPI.apiRequest(channel, ...args);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'IPC call failed' };
    }
  }

  // ============================================
  // PROFILES
  // ============================================

  async listProfiles(filters?: { type?: string; search?: string }) {
    return this.callIPC('profiles:list', filters);
  }

  async createProfile(data: {
    type: 'VIA' | 'BM';
    proxy: string;
    fingerprint?: string;
    uid?: string;
    password?: string;
    twoFAKey?: string;
    headless?: boolean;
  }) {
    return this.callIPC('profiles:create', data);
  }

  async importProfiles(filePath?: string, type?: string, accounts?: string[]) {
    return this.callIPC('profiles:import', { filePath, type, accounts });
  }

  async updateProfile(id: number, data: { uid?: string; password?: string; twoFAKey?: string; cookie?: string; deviceConfig?: string }) {
    return this.callIPC('profiles:update', id, data);
  }

  async startProfile(id: number) {
    return this.callIPC('profiles:start', id);
  }

  async stopProfile(id: number) {
    return this.callIPC('profiles:stop', id);
  }

  async startProfiles(profileIds?: number[]) {
    return this.callIPC('profiles:startBatch', profileIds);
  }

  async stopProfiles(profileIds?: number[]) {
    return this.callIPC('profiles:stopBatch', profileIds);
  }

  async deleteProfile(id: number) {
    return this.callIPC('profiles:delete', id);
  }

  async exportProfiles(format: string = 'csv') {
    return this.callIPC('profiles:export', format);
  }

  async testProxy(proxy: string) {
    return this.callIPC('profiles:testProxy', proxy);
  }

  // ============================================
  // INVITES
  // ============================================

  async listInvites(filters?: { search?: string; status?: string }) {
    return this.callIPC('invites:list', filters);
  }

  async createInvites(data: { links: string[]; notes?: string }) {
    return this.callIPC('invites:create', data);
  }

  async uploadInvites(filePath: string) {
    return this.callIPC('invites:upload', filePath);
  }

  async startInvites(data: { inviteIds?: number[]; bmId?: number; viaIds?: number[] }) {
    return this.callIPC('invites:start', data);
  }

  async deleteInvite(id: number) {
    return this.callIPC('invites:delete', id);
  }

  async deleteInvites(inviteIds: number[]) {
    return this.callIPC('invites:deleteBatch', inviteIds);
  }

  // ============================================
  // AUTOMATION
  // ============================================

  async runAutomation(data: { inviteIds?: number[]; bmId?: number; viaIds?: number[] }) {
    return this.callIPC('automation:run', data);
  }

  async stopAutomation() {
    return this.callIPC('automation:stop');
  }

  async getAutomationStatus() {
    return this.callIPC('automation:status');
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats() {
    return this.callIPC('dashboard:stats');
  }

  // ============================================
  // REPORTS
  // ============================================

  async listReports() {
    return this.callIPC('reports:list');
  }

  async exportReports(format: string = 'csv') {
    return this.callIPC('reports:export', format);
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  async selectFile(options?: { filters?: Array<{ name: string; extensions: string[] }> }) {
    if (!window.electronAPI) {
      return { success: false, error: 'Electron API not available' };
    }
    return window.electronAPI.selectFile(options || {});
  }
}

export const api = new APIService();


