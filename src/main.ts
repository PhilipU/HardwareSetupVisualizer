import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ProjectData {
  components: any[];
  cables: any[];
  version: string;
}

class HardwareVisualizerApp {
  private mainWindow: BrowserWindow | null = null;
  private currentProjectPath: string | null = null;

  constructor() {
    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();
    });

    // Handle window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
      },
      icon: path.join(__dirname, '../renderer/assets/icon.png'),
      show: false,
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Development mode
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.newProject(),
          },
          {
            label: 'Open Project...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openProject(),
          },
          { type: 'separator' },
          {
            label: 'Save Project',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.saveProject(),
          },
          {
            label: 'Save Project As...',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.saveProjectAs(),
          },
          { type: 'separator' },
          {
            label: 'Export as Image...',
            accelerator: 'CmdOrCtrl+E',
            click: () => this.exportImage(),
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Hardware Setup Visualizer',
            click: () => this.showAbout(),
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // File operations
    ipcMain.handle('new-project', () => this.newProject());
    ipcMain.handle('open-project', () => this.openProject());
    ipcMain.handle('save-project', () => this.saveProject());
    ipcMain.handle('save-project-as', () => this.saveProjectAs());
    ipcMain.handle('export-image', () => this.exportImage());

    // Project data management
    ipcMain.handle('get-current-project-path', () => this.currentProjectPath);
    ipcMain.handle('set-project-modified', (event, isModified: boolean) => {
      this.setProjectModified(isModified);
    });
  }

  private async newProject(): Promise<void> {
    const result = await this.confirmUnsavedChanges();
    if (result) {
      this.currentProjectPath = null;
      this.mainWindow?.webContents.send('new-project');
      this.updateWindowTitle();
    }
  }

  private async openProject(): Promise<void> {
    const result = await this.confirmUnsavedChanges();
    if (!result) return;

    const dialogResult = await dialog.showOpenDialog(this.mainWindow!, {
      title: 'Open Project',
      filters: [
        { name: 'Hardware Visualizer Projects', extensions: ['hvp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!dialogResult.canceled && dialogResult.filePaths.length > 0) {
      try {
        const projectPath = dialogResult.filePaths[0];
        const projectData = await this.loadProjectFile(projectPath);
        
        this.currentProjectPath = projectPath;
        this.mainWindow?.webContents.send('load-project', projectData);
        this.updateWindowTitle();
      } catch (error) {
        await dialog.showErrorBox('Error Opening Project', `Failed to open project: ${error}`);
      }
    }
  }

  private async saveProject(): Promise<void> {
    if (this.currentProjectPath) {
      await this.saveProjectToPath(this.currentProjectPath);
    } else {
      await this.saveProjectAs();
    }
  }

  private async saveProjectAs(): Promise<void> {
    const dialogResult = await dialog.showSaveDialog(this.mainWindow!, {
      title: 'Save Project As',
      filters: [
        { name: 'Hardware Visualizer Projects', extensions: ['hvp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: 'hardware-setup.hvp',
    });

    if (!dialogResult.canceled && dialogResult.filePath) {
      await this.saveProjectToPath(dialogResult.filePath);
      this.currentProjectPath = dialogResult.filePath;
      this.updateWindowTitle();
    }
  }

  private async saveProjectToPath(filePath: string): Promise<void> {
    try {
      const projectData = await this.getProjectDataFromRenderer();
      await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf-8');
      this.mainWindow?.webContents.send('project-saved');
    } catch (error) {
      await dialog.showErrorBox('Error Saving Project', `Failed to save project: ${error}`);
    }
  }

  private async loadProjectFile(filePath: string): Promise<ProjectData> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as ProjectData;
  }

  private async getProjectDataFromRenderer(): Promise<ProjectData> {
    return new Promise((resolve) => {
      ipcMain.once('project-data-response', (event, data: ProjectData) => {
        resolve(data);
      });
      this.mainWindow?.webContents.send('get-project-data');
    });
  }

  private async exportImage(): Promise<void> {
    const dialogResult = await dialog.showSaveDialog(this.mainWindow!, {
      title: 'Export as Image',
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'SVG Images', extensions: ['svg'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: 'hardware-setup.png',
    });

    if (!dialogResult.canceled && dialogResult.filePath) {
      this.mainWindow?.webContents.send('export-image', dialogResult.filePath);
    }
  }

  private async confirmUnsavedChanges(): Promise<boolean> {
    // Check if project has unsaved changes
    const hasChanges = await this.hasUnsavedChanges();
    
    if (hasChanges) {
      const result = await dialog.showMessageBox(this.mainWindow!, {
        type: 'warning',
        buttons: ['Save', 'Don\'t Save', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'Do you want to save your changes before continuing?',
      });

      switch (result.response) {
        case 0: // Save
          await this.saveProject();
          return true;
        case 1: // Don't Save
          return true;
        case 2: // Cancel
        default:
          return false;
      }
    }

    return true;
  }

  private async hasUnsavedChanges(): Promise<boolean> {
    return new Promise((resolve) => {
      ipcMain.once('unsaved-changes-response', (event, hasChanges: boolean) => {
        resolve(hasChanges);
      });
      this.mainWindow?.webContents.send('has-unsaved-changes');
    });
  }

  private setProjectModified(isModified: boolean): void {
    this.updateWindowTitle(isModified);
  }

  private updateWindowTitle(isModified: boolean = false): void {
    if (!this.mainWindow) return;

    let title = 'Hardware Setup Visualizer';
    
    if (this.currentProjectPath) {
      const fileName = path.basename(this.currentProjectPath);
      title = `${fileName} - ${title}`;
    } else {
      title = `Untitled - ${title}`;
    }

    if (isModified) {
      title = `${title} •`;
    }

    this.mainWindow.setTitle(title);
  }

  private showAbout(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About Hardware Setup Visualizer',
      message: 'Hardware Setup Visualizer',
      detail: 'Version 1.0.0\n\nA desktop application for creating visual representations of hardware test setups.',
    });
  }
}

// Create the application instance
new HardwareVisualizerApp();