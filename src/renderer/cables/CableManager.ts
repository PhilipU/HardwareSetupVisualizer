import { CanvasManager } from '../canvas/CanvasManager';

export interface CableType {
    id: string;
    name: string;
    color: string;
    width: number;
    connectorTypes: string[];
}

export interface Cable {
    id: string;
    type: string;
    startComponent: string;
    startConnector: string;
    endComponent: string;
    endConnector: string;
    selected: boolean;
}

export class CableManager {
    private canvasManager: CanvasManager;
    private cables: Map<string, Cable> = new Map();
    private nextCableId = 1;
    private tempCable: { startComponent: string; startConnector: string; startElement: SVGElement } | null = null;

    private cableTypes: Map<string, CableType> = new Map([
        ['power-iec', {
            id: 'power-iec',
            name: 'Power Cable (IEC C14)',
            color: '#333333',
            width: 4,
            connectorTypes: ['power']
        }],
        ['d-sub9', {
            id: 'd-sub9',
            name: 'D-Sub9 Cable',
            color: '#666666',
            width: 3,
            connectorTypes: ['d-sub9']
        }],
        ['d-sub9-y', {
            id: 'd-sub9-y',
            name: 'D-Sub9 Y-Cable',
            color: '#888888',
            width: 3,
            connectorTypes: ['d-sub9']
        }],
        ['usb-a-c', {
            id: 'usb-a-c',
            name: 'USB-A to USB-C Cable',
            color: '#0066cc',
            width: 2,
            connectorTypes: ['usb-a', 'usb-c']
        }],
        ['custom', {
            id: 'custom',
            name: 'Custom Cable',
            color: '#ff6b35',
            width: 2,
            connectorTypes: ['custom']
        }]
    ]);

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        document.addEventListener('connectorClicked', ((event: CustomEvent) => {
            this.handleConnectorClick(event.detail.connector, event.detail.componentId);
        }) as EventListener);
    }

    private handleConnectorClick(connector: SVGElement, componentId: string): void {
        const connectorId = connector.getAttribute('data-connector-id');
        const connectorType = connector.getAttribute('data-connector-type');
        
        if (!connectorId || !connectorType) return;

        if (this.tempCable === null) {
            // Start a new cable
            this.startCable(componentId, connectorId, connector);
        } else {
            // Complete the cable
            this.completeCable(componentId, connectorId, connectorType);
        }
    }

    private startCable(componentId: string, connectorId: string, connectorElement: SVGElement): void {
        this.tempCable = {
            startComponent: componentId,
            startConnector: connectorId,
            startElement: connectorElement
        };

        // Visual feedback
        connectorElement.style.fill = '#00ff00';
        this.canvasManager.getCanvas().style.cursor = 'crosshair';
    }

    private completeCable(endComponentId: string, endConnectorId: string, endConnectorType: string): void {
        if (!this.tempCable) return;

        const startConnectorType = this.tempCable.startElement.getAttribute('data-connector-type');
        
        // Check if connectors are compatible
        const cableType = this.findCompatibleCableType(startConnectorType, endConnectorType);
        if (!cableType) {
            this.cancelTempCable();
            alert(`Cannot connect ${startConnectorType} to ${endConnectorType}`);
            return;
        }

        // Don't allow connecting to the same component
        if (this.tempCable.startComponent === endComponentId) {
            this.cancelTempCable();
            return;
        }

        // Create the cable
        const cable: Cable = {
            id: `cable-${this.nextCableId++}`,
            type: cableType.id,
            startComponent: this.tempCable.startComponent,
            startConnector: this.tempCable.startConnector,
            endComponent: endComponentId,
            endConnector: endConnectorId,
            selected: false
        };

        this.cables.set(cable.id, cable);
        this.renderCable(cable);
        this.canvasManager.markAsModified();

        // Reset temp cable
        this.tempCable.startElement.style.fill = '';
        this.tempCable = null;
        this.canvasManager.getCanvas().style.cursor = 'default';
    }

    private cancelTempCable(): void {
        if (this.tempCable) {
            this.tempCable.startElement.style.fill = '';
            this.tempCable = null;
            this.canvasManager.getCanvas().style.cursor = 'default';
        }
    }

    private findCompatibleCableType(type1: string | null, type2: string | null): CableType | null {
        if (!type1 || !type2) return null;

        for (const cableType of this.cableTypes.values()) {
            if (cableType.connectorTypes.includes(type1) && cableType.connectorTypes.includes(type2)) {
                return cableType;
            }
        }

        // For custom/generic connections
        if (type1 === 'custom' || type2 === 'custom') {
            return this.cableTypes.get('custom') || null;
        }

        return null;
    }

    private renderCable(cable: Cable): void {
        const cableType = this.cableTypes.get(cable.type);
        if (!cableType) return;

        const startPos = this.getConnectorPosition(cable.startComponent, cable.startConnector);
        const endPos = this.getConnectorPosition(cable.endComponent, cable.endConnector);
        
        if (!startPos || !endPos) return;

        const cablesLayer = document.querySelector('#cables-layer');
        if (!cablesLayer) return;

        // Create cable group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', cable.id);
        group.setAttribute('class', 'cable');

        // Create path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.createCablePath(startPos, endPos);
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', cableType.color);
        path.setAttribute('stroke-width', cableType.width.toString());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');

        group.appendChild(path);

        // Add connector representations at both ends
        const startConnector = this.createCableConnector(startPos, cableType);
        const endConnector = this.createCableConnector(endPos, cableType);
        group.appendChild(startConnector);
        group.appendChild(endConnector);

        // Add event listeners
        this.addCableEventListeners(group, cable);

        cablesLayer.appendChild(group);
    }

    private createCablePath(start: {x: number, y: number}, end: {x: number, y: number}): string {
        // Create a curved path for better visual appeal
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Control point offset (for curve)
        const controlOffset = Math.min(distance * 0.3, 50);
        
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        // Perpendicular direction for control points
        const perpX = -dy / distance * controlOffset;
        const perpY = dx / distance * controlOffset;
        
        return `M ${start.x} ${start.y} Q ${midX + perpX} ${midY + perpY} ${end.x} ${end.y}`;
    }

    private createCableConnector(position: {x: number, y: number}, cableType: CableType): SVGElement {
        const connector = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        connector.setAttribute('class', 'cable-connector');
        connector.setAttribute('cx', position.x.toString());
        connector.setAttribute('cy', position.y.toString());
        connector.setAttribute('r', (cableType.width + 2).toString());
        connector.setAttribute('fill', cableType.color);
        return connector;
    }

    private getConnectorPosition(componentId: string, connectorId: string): {x: number, y: number} | null {
        const component = document.getElementById(componentId);
        if (!component) return null;

        const connector = component.querySelector(`[data-connector-id="${connectorId}"]`);
        if (!connector) return null;

        const componentTransform = component.getAttribute('transform');
        const match = componentTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
        
        if (!match) return null;
        
        const componentX = parseFloat(match[1]);
        const componentY = parseFloat(match[2]);
        const connectorX = parseFloat(connector.getAttribute('cx') || '0');
        const connectorY = parseFloat(connector.getAttribute('cy') || '0');
        
        return {
            x: componentX + connectorX,
            y: componentY + connectorY
        };
    }

    private addCableEventListeners(element: SVGElement, cable: Cable): void {
        element.addEventListener('click', (event) => {
            event.stopPropagation();
            this.selectCable(cable.id);
        });

        element.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            this.deleteCable(cable.id);
        });
    }

    selectCable(cableId: string): void {
        const cable = this.cables.get(cableId);
        if (cable) {
            // Clear other selections first
            this.clearSelection();
            
            cable.selected = true;
            const element = document.getElementById(cableId);
            if (element) {
                element.classList.add('selected');
            }
        }
    }

    clearSelection(): void {
        this.cables.forEach((cable, id) => {
            if (cable.selected) {
                cable.selected = false;
                const element = document.getElementById(id);
                if (element) {
                    element.classList.remove('selected');
                }
            }
        });
    }

    deleteCable(cableId: string): void {
        const cable = this.cables.get(cableId);
        if (cable) {
            this.cables.delete(cableId);
            const element = document.getElementById(cableId);
            if (element) {
                element.remove();
            }
            this.canvasManager.markAsModified();
        }
    }

    deleteSelectedCables(): void {
        const selectedCables = Array.from(this.cables.entries())
            .filter(([_, cable]) => cable.selected)
            .map(([id, _]) => id);
        
        selectedCables.forEach(id => this.deleteCable(id));
    }

    updateCablePositions(componentId: string): void {
        // Update all cables connected to a component when it moves
        this.cables.forEach((cable, id) => {
            if (cable.startComponent === componentId || cable.endComponent === componentId) {
                this.rerenderCable(id);
            }
        });
    }

    private rerenderCable(cableId: string): void {
        const cable = this.cables.get(cableId);
        if (!cable) return;

        const element = document.getElementById(cableId);
        if (element) {
            element.remove();
            this.renderCable(cable);
        }
    }

    // Serialization methods
    serialize(): any[] {
        return Array.from(this.cables.values()).map(cable => ({
            id: cable.id,
            type: cable.type,
            startComponent: cable.startComponent,
            startConnector: cable.startConnector,
            endComponent: cable.endComponent,
            endConnector: cable.endConnector
        }));
    }

    deserialize(data: any[]): void {
        this.clear();
        
        data.forEach(cableData => {
            const cable: Cable = {
                ...cableData,
                selected: false
            };
            
            this.cables.set(cable.id, cable);
            
            // Update next ID counter
            const idNum = parseInt(cable.id.replace('cable-', ''));
            if (idNum >= this.nextCableId) {
                this.nextCableId = idNum + 1;
            }
        });
        
        // Render cables after a short delay to ensure components are rendered
        setTimeout(() => {
            this.cables.forEach((cable, id) => {
                this.renderCable(cable);
            });
        }, 100);
    }

    clear(): void {
        this.cables.clear();
        const cablesLayer = document.querySelector('#cables-layer');
        if (cablesLayer) {
            cablesLayer.innerHTML = '';
        }
        this.nextCableId = 1;
        this.cancelTempCable();
    }
}