import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
interface ElectronAPI {
  // File operations
  newProject: () => Promise<void>;
  openProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  exportImage: () => Promise<void>;

  // Project data
  getCurrentProjectPath: () => Promise<string | null>;
  setProjectModified: (isModified: boolean) => Promise<void>;

  // Event listeners
  onNewProject: (callback: () => void) => void;
  onLoadProject: (callback: (projectData: any) => void) => void;
  onProjectSaved: (callback: () => void) => void;
  onGetProjectData: (callback: () => void) => void;
  onHasUnsavedChanges: (callback: () => void) => void;
  onExportImage: (callback: (filePath: string) => void) => void;

  // Responses
  sendProjectData: (data: any) => void;
  sendUnsavedChangesResponse: (hasChanges: boolean) => void;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // File operations
  newProject: () => ipcRenderer.invoke('new-project'),
  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: () => ipcRenderer.invoke('save-project'),
  saveProjectAs: () => ipcRenderer.invoke('save-project-as'),
  exportImage: () => ipcRenderer.invoke('export-image'),

  // Project data
  getCurrentProjectPath: () => ipcRenderer.invoke('get-current-project-path'),
  setProjectModified: (isModified: boolean) => ipcRenderer.invoke('set-project-modified', isModified),

  // Event listeners
  onNewProject: (callback) => ipcRenderer.on('new-project', callback),
  onLoadProject: (callback) => ipcRenderer.on('load-project', (event, projectData) => callback(projectData)),
  onProjectSaved: (callback) => ipcRenderer.on('project-saved', callback),
  onGetProjectData: (callback) => ipcRenderer.on('get-project-data', callback),
  onHasUnsavedChanges: (callback) => ipcRenderer.on('has-unsaved-changes', callback),
  onExportImage: (callback) => ipcRenderer.on('export-image', (event, filePath) => callback(filePath)),

  // Responses
  sendProjectData: (data) => ipcRenderer.send('project-data-response', data),
  sendUnsavedChangesResponse: (hasChanges) => ipcRenderer.send('unsaved-changes-response', hasChanges),
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}