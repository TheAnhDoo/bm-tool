import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Generic IPC handler - accepts channel name and arguments
  apiRequest: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // File operations
  selectFile: (options: { filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('file:select', options),

  // Automation event subscriptions
  subscribeAutomation: (callback: (event: string, data: any) => void) => {
    const listener = (_event: any, eventName: string, eventData: any) => {
      callback(eventName, eventData);
    };
    ipcRenderer.on('automation:event', listener);
    return () => ipcRenderer.removeListener('automation:event', listener);
  },

  // System info
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  getAppDataPath: () => ipcRenderer.invoke('app:getAppDataPath'),
});

