import { ComponentManager } from '../components/ComponentManager';
import { CableManager } from '../cables/CableManager';

export interface ProjectData {
    version: string;
    components: any[];
    cables: any[];
    metadata: {
        name: string;
        description: string;
        created: string;
        modified: string;
    };
}

export class ProjectManager {
    private componentManager: ComponentManager;
    private cableManager: CableManager;
    private isModified: boolean = false;
    private currentProject: ProjectData | null = null;

    constructor(componentManager: ComponentManager, cableManager: CableManager) {
        this.componentManager = componentManager;
        this.cableManager = cableManager;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for canvas modifications
        document.addEventListener('canvasModified', () => {
            this.markAsModified();
        });
    }

    newProject(): void {
        this.currentProject = {
            version: '1.0.0',
            components: [],
            cables: [],
            metadata: {
                name: 'Untitled Project',
                description: '',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }
        };
        
        this.componentManager.clear();
        this.cableManager.clear();
        this.isModified = false;
        
        this.updateStatus('New project created');
    }

    loadProject(projectData: ProjectData): void {
        try {
            this.currentProject = projectData;
            
            // Clear current state
            this.componentManager.clear();
            this.cableManager.clear();
            
            // Load components
            if (projectData.components) {
                this.componentManager.deserialize(projectData.components);
            }
            
            // Load cables
            if (projectData.cables) {
                this.cableManager.deserialize(projectData.cables);
            }
            
            this.isModified = false;
            this.updateStatus(`Project loaded: ${projectData.metadata?.name || 'Unknown'}`);
        } catch (error) {
            console.error('Failed to load project:', error);
            this.updateStatus('Failed to load project');
        }
    }

    getProjectData(): ProjectData {
        if (!this.currentProject) {
            this.newProject();
        }
        
        const projectData: ProjectData = {
            version: '1.0.0',
            components: this.componentManager.serialize(),
            cables: this.cableManager.serialize(),
            metadata: {
                name: this.currentProject!.metadata.name,
                description: this.currentProject!.metadata.description,
                created: this.currentProject!.metadata.created,
                modified: new Date().toISOString()
            }
        };
        
        return projectData;
    }

    markAsModified(): void {
        this.isModified = true;
        if (this.currentProject) {
            this.currentProject.metadata.modified = new Date().toISOString();
        }
    }

    markAsSaved(): void {
        this.isModified = false;
        this.updateStatus('Project saved');
    }

    hasUnsavedChanges(): boolean {
        return this.isModified;
    }

    updateProjectMetadata(name: string, description: string): void {
        if (this.currentProject) {
            this.currentProject.metadata.name = name;
            this.currentProject.metadata.description = description;
            this.markAsModified();
        }
    }

    getProjectMetadata() {
        return this.currentProject?.metadata || null;
    }

    private updateStatus(message: string): void {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            
            // Clear status after 3 seconds
            setTimeout(() => {
                if (statusText.textContent === message) {
                    statusText.textContent = 'Ready';
                }
            }, 3000);
        }
    }
}