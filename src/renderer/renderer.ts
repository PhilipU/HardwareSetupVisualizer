import { ComponentManager } from './components/ComponentManager';
import { CanvasManager } from './canvas/CanvasManager';
import { ProjectManager } from './project/ProjectManager';
import { UIManager } from './ui/UIManager';
import { CableManager } from './cables/CableManager';

class HardwareVisualizerRenderer {
    private componentManager!: ComponentManager;
    private canvasManager!: CanvasManager;
    private projectManager!: ProjectManager;
    private uiManager!: UIManager;
    private cableManager!: CableManager;

    constructor() {
        this.initializeManagers();
        this.setupEventListeners();
        this.setupIpcHandlers();
        
        console.log('Hardware Visualizer Renderer initialized');
    }

    private initializeManagers(): void {
        this.canvasManager = new CanvasManager();
        this.componentManager = new ComponentManager(this.canvasManager);
        this.cableManager = new CableManager(this.canvasManager);
        this.projectManager = new ProjectManager(this.componentManager, this.cableManager);
        this.uiManager = new UIManager(
            this.componentManager,
            this.canvasManager,
            this.cableManager,
            this.projectManager
        );
    }

    private setupEventListeners(): void {
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'n':
                        event.preventDefault();
                        window.electronAPI.newProject();
                        break;
                    case 'o':
                        event.preventDefault();
                        window.electronAPI.openProject();
                        break;
                    case 's':
                        if (event.shiftKey) {
                            event.preventDefault();
                            window.electronAPI.saveProjectAs();
                        } else {
                            event.preventDefault();
                            window.electronAPI.saveProject();
                        }
                        break;
                    case 'e':
                        event.preventDefault();
                        window.electronAPI.exportImage();
                        break;
                    case 'z':
                        event.preventDefault();
                        if (event.shiftKey) {
                            this.canvasManager.redo();
                        } else {
                            this.canvasManager.undo();
                        }
                        break;
                    case 'Delete':
                    case 'Backspace':
                        event.preventDefault();
                        this.canvasManager.deleteSelected();
                        break;
                }
            }

            // Direct key shortcuts
            switch (event.key) {
                case 'Delete':
                case 'Backspace':
                    if (!event.target || (event.target as HTMLElement).tagName !== 'INPUT') {
                        event.preventDefault();
                        this.canvasManager.deleteSelected();
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.canvasManager.clearSelection();
                    break;
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.canvasManager.handleResize();
        });

        // Prevent default drag behavior on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    private setupIpcHandlers(): void {
        // Project operations from main process
        window.electronAPI.onNewProject(() => {
            this.projectManager.newProject();
        });

        window.electronAPI.onLoadProject((projectData) => {
            this.projectManager.loadProject(projectData);
        });

        window.electronAPI.onProjectSaved(() => {
            this.projectManager.markAsSaved();
        });

        window.electronAPI.onGetProjectData(() => {
            const projectData = this.projectManager.getProjectData();
            window.electronAPI.sendProjectData(projectData);
        });

        window.electronAPI.onHasUnsavedChanges(() => {
            const hasChanges = this.projectManager.hasUnsavedChanges();
            window.electronAPI.sendUnsavedChangesResponse(hasChanges);
        });

        window.electronAPI.onExportImage((filePath) => {
            this.canvasManager.exportImage(filePath);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HardwareVisualizerRenderer();
});