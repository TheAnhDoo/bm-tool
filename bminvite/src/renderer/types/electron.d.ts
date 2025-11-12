export interface ElectronAPI {
  apiRequest: (channel: string, ...args: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  selectFile: (options: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  subscribeAutomation: (callback: (event: string, data: any) => void) => () => void;
  getAppPath: () => Promise<string>;
  getAppDataPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

