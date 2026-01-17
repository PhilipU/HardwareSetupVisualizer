import { ComponentManager } from '../components/ComponentManager';
import { CanvasManager } from '../canvas/CanvasManager';
import { CableManager } from '../cables/CableManager';
import { ProjectManager } from '../project/ProjectManager';
import { ComponentInstance } from '../components/ComponentLibrary';

export class UIManager {
    private componentManager: ComponentManager;
    private canvasManager: CanvasManager;
    private cableManager: CableManager;
    private projectManager: ProjectManager;
    private propertiesPanel: HTMLElement;

    constructor(
        componentManager: ComponentManager,
        canvasManager: CanvasManager,
        cableManager: CableManager,
        projectManager: ProjectManager
    ) {
        this.componentManager = componentManager;
        this.canvasManager = canvasManager;
        this.cableManager = cableManager;
        this.projectManager = projectManager;
        this.propertiesPanel = document.getElementById('properties-panel')!;
        
        this.setupEventListeners();
        this.setupComponentCategories();
    }

    private setupEventListeners(): void {
        // Canvas events
        document.addEventListener('clearSelection', () => {
            this.componentManager.clearSelection();
            this.cableManager.clearSelection();
            this.hideProperties();
        });

        document.addEventListener('deleteSelected', () => {
            this.deleteSelected();
        });

        document.addEventListener('showProperties', ((event: CustomEvent) => {
            this.showProperties(event.detail.instance);
        }) as EventListener);

        // Properties panel
        const closePropertiesBtn = document.getElementById('btn-close-properties');
        closePropertiesBtn?.addEventListener('click', () => {
            this.hideProperties();
        });

        // Component instance movement tracking
        document.addEventListener('componentMoved', ((event: CustomEvent) => {
            const { componentId } = event.detail;
            this.cableManager.updateCablePositions(componentId);
        }) as EventListener);

        // Tool selection updates
        document.addEventListener('toolChanged', ((event: CustomEvent) => {
            this.updateToolUI(event.detail.tool);
        }) as EventListener);
    }

    private setupComponentCategories(): void {
        const categoryHeaders = document.querySelectorAll('.category-header');
        
        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const categoryItems = header.nextElementSibling as HTMLElement;
                if (categoryItems) {
                    const isVisible = !categoryItems.classList.contains('hidden');
                    categoryItems.classList.toggle('hidden', isVisible);
                    
                    // Update arrow indicator (if you add one)
                    const arrow = header.querySelector('.category-arrow');
                    if (arrow) {
                        arrow.textContent = isVisible ? '▶' : '▼';
                    }
                }
            });
        });
    }

    private deleteSelected(): void {
        // Delete selected components
        const selectedComponents = this.componentManager.getSelectedInstances();
        selectedComponents.forEach(component => {
            // First delete any connected cables
            this.deleteComponentCables(component.id);
            
            // Then delete the component
            this.componentManager.deleteInstance(component.id);
        });

        // Delete selected cables
        this.cableManager.deleteSelectedCables();

        if (selectedComponents.length > 0) {
            this.canvasManager.markAsModified();
            this.hideProperties();
        }
    }

    private deleteComponentCables(componentId: string): void {
        // This is a simplified version - in a real implementation,
        // you'd need to track which cables are connected to which components
        console.log(`Deleting cables for component ${componentId}`);
    }

    private showProperties(instance: ComponentInstance): void {
        this.propertiesPanel.classList.remove('hidden');
        
        const content = document.getElementById('properties-content');
        if (!content) return;

        content.innerHTML = this.generatePropertiesHTML(instance);
        this.setupPropertyEvents(instance);
    }

    private hideProperties(): void {
        this.propertiesPanel.classList.add('hidden');
    }

    private generatePropertiesHTML(instance: ComponentInstance): string {
        let html = `
            <div class="property-group">
                <label class="property-label">Instance ID</label>
                <input class="property-input" type="text" value="${instance.id}" readonly>
            </div>
            
            <div class="property-group">
                <label class="property-label">Position X</label>
                <input class="property-input" type="number" data-property="position.x" value="${instance.position.x}">
            </div>
            
            <div class="property-group">
                <label class="property-label">Position Y</label>
                <input class="property-input" type="number" data-property="position.y" value="${instance.position.y}">
            </div>
            
            <div class="property-group">
                <label class="property-label">Rotation</label>
                <input class="property-input" type="number" data-property="rotation" value="${instance.rotation}" min="0" max="360">
            </div>
        `;

        // Add custom properties
        Object.entries(instance.properties).forEach(([key, value]) => {
            html += `
                <div class="property-group">
                    <label class="property-label">${this.formatPropertyLabel(key)}</label>
                    <input class="property-input" type="text" data-property="properties.${key}" value="${value}">
                </div>
            `;
        });

        return html;
    }

    private formatPropertyLabel(key: string): string {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }

    private setupPropertyEvents(instance: ComponentInstance): void {
        const propertyInputs = this.propertiesPanel.querySelectorAll('.property-input[data-property]');
        
        propertyInputs.forEach(input => {
            const propertyPath = (input as HTMLInputElement).getAttribute('data-property')!;
            
            input.addEventListener('change', (event) => {
                const value = (event.target as HTMLInputElement).value;
                this.updateInstanceProperty(instance, propertyPath, value);
            });
        });
    }

    private updateInstanceProperty(instance: ComponentInstance, propertyPath: string, value: string): void {
        const parts = propertyPath.split('.');
        
        if (parts[0] === 'position') {
            const coord = parts[1] as 'x' | 'y';
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                const newPosition = { ...instance.position };
                newPosition[coord] = numValue;
                this.componentManager.moveInstance(instance.id, newPosition);
                this.canvasManager.markAsModified();
            }
        } else if (parts[0] === 'rotation') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                instance.rotation = numValue % 360;
                // Update visual rotation
                this.updateInstanceTransform(instance);
                this.canvasManager.markAsModified();
            }
        } else if (parts[0] === 'properties') {
            const propertyKey = parts[1];
            this.componentManager.updateInstanceProperty(instance.id, propertyKey, value);
            this.canvasManager.markAsModified();
        }
    }

    private updateInstanceTransform(instance: ComponentInstance): void {
        const element = document.getElementById(instance.id);
        if (element) {
            element.setAttribute('transform', 
                `translate(${instance.position.x}, ${instance.position.y}) rotate(${instance.rotation})`
            );
        }
    }

    private updateToolUI(tool: string): void {
        // Update cursor and UI feedback based on selected tool
        const canvas = this.canvasManager.getCanvas();
        
        switch (tool) {
            case 'select':
                canvas.style.cursor = 'default';
                break;
            case 'cable':
                canvas.style.cursor = 'crosshair';
                break;
            case 'delete':
                canvas.style.cursor = 'not-allowed';
                break;
        }
    }

    updateStatus(message: string, timeout: number = 3000): void {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            
            if (timeout > 0) {
                setTimeout(() => {
                    if (statusText.textContent === message) {
                        statusText.textContent = 'Ready';
                    }
                }, timeout);
            }
        }
    }

    showError(message: string): void {
        // Simple error display - in a real app you might want a proper modal
        alert(`Error: ${message}`);
    }

    showSuccess(message: string): void {
        this.updateStatus(message, 2000);
    }

    confirmAction(message: string): boolean {
        return confirm(message);
    }
}