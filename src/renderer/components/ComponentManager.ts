import { ComponentDefinition, ComponentInstance, ComponentLibrary } from './ComponentLibrary';
import { CanvasManager } from '../canvas/CanvasManager';

export class ComponentManager {
    private canvasManager: CanvasManager;
    private instances: Map<string, ComponentInstance> = new Map();
    private nextInstanceId = 1;

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
        this.setupDragAndDrop();
    }

    createInstance(definitionId: string, position: { x: number; y: number }): ComponentInstance | null {
        const definition = ComponentLibrary.getDefinition(definitionId);
        if (!definition) {
            console.error(`Component definition not found: ${definitionId}`);
            return null;
        }

        const instance: ComponentInstance = {
            id: `component-${this.nextInstanceId++}`,
            definitionId: definitionId,
            position: { ...position },
            rotation: 0,
            properties: { ...definition.properties },
            selected: false
        };

        this.instances.set(instance.id, instance);
        this.renderInstance(instance);
        return instance;
    }

    deleteInstance(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            this.removeInstanceFromCanvas(instanceId);
            this.instances.delete(instanceId);
        }
    }

    getInstance(instanceId: string): ComponentInstance | undefined {
        return this.instances.get(instanceId);
    }

    getAllInstances(): ComponentInstance[] {
        return Array.from(this.instances.values());
    }

    moveInstance(instanceId: string, position: { x: number; y: number }): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.position = { ...position };
            this.updateInstancePosition(instanceId);
        }
    }

    selectInstance(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.selected = true;
            this.updateInstanceSelection(instanceId);
        }
    }

    deselectInstance(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.selected = false;
            this.updateInstanceSelection(instanceId);
        }
    }

    clearSelection(): void {
        this.instances.forEach((instance, id) => {
            if (instance.selected) {
                instance.selected = false;
                this.updateInstanceSelection(id);
            }
        });
    }

    getSelectedInstances(): ComponentInstance[] {
        return Array.from(this.instances.values()).filter(instance => instance.selected);
    }

    updateInstanceProperty(instanceId: string, property: string, value: any): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.properties[property] = value;
            // Trigger property update event if needed
        }
    }

    private renderInstance(instance: ComponentInstance): void {
        const definition = ComponentLibrary.getDefinition(instance.definitionId);
        if (!definition) return;

        const canvas = this.canvasManager.getCanvas();
        const componentsLayer = canvas.querySelector('#components-layer');
        if (!componentsLayer) return;

        // Create SVG group for the component
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', instance.id);
        group.setAttribute('class', 'canvas-component');
        group.setAttribute('transform', `translate(${instance.position.x}, ${instance.position.y}) rotate(${instance.rotation})`);

        // Add component SVG content
        group.innerHTML = definition.svgContent;

        // Add connectors
        definition.connectors.forEach(connector => {
            const connectorElement = this.createConnectorElement(connector);
            group.appendChild(connectorElement);
        });

        // Add event listeners
        this.addInstanceEventListeners(group, instance);

        componentsLayer.appendChild(group);
    }

    private createConnectorElement(connector: any): SVGElement {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'component-connector');
        circle.setAttribute('cx', connector.position.x.toString());
        circle.setAttribute('cy', connector.position.y.toString());
        circle.setAttribute('r', '4');
        circle.setAttribute('data-connector-id', connector.id);
        circle.setAttribute('data-connector-type', connector.type);
        
        // Add title for tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = connector.label;
        circle.appendChild(title);

        return circle;
    }

    private addInstanceEventListeners(element: SVGElement, instance: ComponentInstance): void {
        let isDragging = false;
        let dragStartPos = { x: 0, y: 0 };
        let dragOffset = { x: 0, y: 0 };

        element.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            
            // Handle connector clicks differently
            if ((event.target as SVGElement).classList.contains('component-connector')) {
                this.canvasManager.handleConnectorClick(event.target as SVGElement, instance.id);
                return;
            }

            // Selection
            if (!event.ctrlKey && !event.metaKey) {
                this.clearSelection();
            }
            
            if (!instance.selected) {
                this.selectInstance(instance.id);
            }

            // Start dragging
            isDragging = true;
            element.classList.add('dragging');
            
            const rect = this.canvasManager.getCanvas().getBoundingClientRect();
            dragStartPos.x = event.clientX - rect.left;
            dragStartPos.y = event.clientY - rect.top;
            dragOffset.x = dragStartPos.x - instance.position.x;
            dragOffset.y = dragStartPos.y - instance.position.y;

            event.preventDefault();
        });

        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return;

            const rect = this.canvasManager.getCanvas().getBoundingClientRect();
            const newPosition = {
                x: event.clientX - rect.left - dragOffset.x,
                y: event.clientY - rect.top - dragOffset.y
            };

            // Snap to grid (20px grid)
            newPosition.x = Math.round(newPosition.x / 20) * 20;
            newPosition.y = Math.round(newPosition.y / 20) * 20;

            this.moveInstance(instance.id, newPosition);
            this.canvasManager.markAsModified();
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Double-click to open properties
        element.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            this.canvasManager.showProperties(instance);
        });
    }

    private updateInstancePosition(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        const element = document.getElementById(instanceId);
        if (element) {
            element.setAttribute('transform', `translate(${instance.position.x}, ${instance.position.y}) rotate(${instance.rotation})`);
        }
    }

    private updateInstanceSelection(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        const element = document.getElementById(instanceId);
        if (element) {
            if (instance.selected) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        }
    }

    private removeInstanceFromCanvas(instanceId: string): void {
        const element = document.getElementById(instanceId);
        if (element) {
            element.remove();
        }
    }

    private setupDragAndDrop(): void {
        const componentItems = document.querySelectorAll('.component-item');
        
        componentItems.forEach(item => {
            item.addEventListener('dragstart', ((event: DragEvent) => {
                const componentType = (event.target as HTMLElement).getAttribute('data-component');
                if (componentType && event.dataTransfer) {
                    event.dataTransfer.setData('text/plain', componentType);
                    event.dataTransfer.effectAllowed = 'copy';
                }
            }) as EventListener);

            // Make items draggable
            (item as HTMLElement).draggable = true;
        });

        // Setup canvas drop zone
        const canvas = this.canvasManager.getCanvas();
        
        canvas.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'copy';
        });

        canvas.addEventListener('drop', (event: DragEvent) => {
            event.preventDefault();
            
            const componentType = event.dataTransfer?.getData('text/plain');
            if (componentType) {
                const rect = canvas.getBoundingClientRect();
                const position = {
                    x: Math.round((event.clientX - rect.left) / 20) * 20,
                    y: Math.round((event.clientY - rect.top) / 20) * 20
                };

                const instance = this.createInstance(componentType, position);
                if (instance) {
                    this.canvasManager.markAsModified();
                }
            }
        });
    }

    // Serialization methods
    serialize(): any[] {
        return Array.from(this.instances.values()).map(instance => ({
            id: instance.id,
            definitionId: instance.definitionId,
            position: instance.position,
            rotation: instance.rotation,
            properties: instance.properties
        }));
    }

    deserialize(data: any[]): void {
        this.clear();
        
        data.forEach(instanceData => {
            const instance: ComponentInstance = {
                ...instanceData,
                selected: false
            };
            
            this.instances.set(instance.id, instance);
            this.renderInstance(instance);
            
            // Update next ID counter
            const idNum = parseInt(instance.id.replace('component-', ''));
            if (idNum >= this.nextInstanceId) {
                this.nextInstanceId = idNum + 1;
            }
        });
    }

    clear(): void {
        this.instances.clear();
        const componentsLayer = document.querySelector('#components-layer');
        if (componentsLayer) {
            componentsLayer.innerHTML = '';
        }
        this.nextInstanceId = 1;
    }
}