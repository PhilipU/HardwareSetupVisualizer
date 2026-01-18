// Type definitions for Electron API exposed via contextBridge

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; // Make this file a module