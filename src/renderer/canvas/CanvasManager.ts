import { ComponentInstance } from '../components/ComponentLibrary';

export class CanvasManager {
    private canvas: SVGSVGElement;
    private isModified: boolean = false;
    private zoomLevel: number = 1;
    private panOffset = { x: 0, y: 0 };
    private selectedTool: 'select' | 'cable' | 'delete' = 'select';
    private history: any[] = [];
    private historyIndex: number = -1;
    private maxHistorySize: number = 50;

    constructor() {
        const canvasElement = document.getElementById('canvas');
        if (!canvasElement) {
            throw new Error('Canvas element not found');
        }
        this.canvas = canvasElement as unknown as SVGSVGElement;
        this.setupCanvasEvents();
        this.setupToolbar();
        this.handleResize();
    }

    getCanvas(): SVGSVGElement {
        return this.canvas;
    }

    markAsModified(): void {
        if (!this.isModified) {
            this.isModified = true;
            window.electronAPI.setProjectModified(true);
            this.updateStatus('Modified');
        }
    }

    markAsSaved(): void {
        this.isModified = false;
        window.electronAPI.setProjectModified(false);
        this.updateStatus('Saved');
    }

    hasUnsavedChanges(): boolean {
        return this.isModified;
    }

    private setupCanvasEvents(): void {
        // Canvas click for deselection
        this.canvas.addEventListener('click', (event) => {
            if (event.target === this.canvas || (event.target as SVGElement).id === 'canvas-content') {
                this.clearSelection();
            }
        });

        // Zoom with mouse wheel
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const delta = event.deltaY > 0 ? 0.9 : 1.1;
            this.setZoom(this.zoomLevel * delta);
        });
    }

    private setupToolbar(): void {
        // Tool buttons
        const selectBtn = document.getElementById('btn-select');
        const cableBtn = document.getElementById('btn-cable');
        const deleteBtn = document.getElementById('btn-delete');

        selectBtn?.addEventListener('click', () => this.setTool('select'));
        cableBtn?.addEventListener('click', () => this.setTool('cable'));
        deleteBtn?.addEventListener('click', () => this.setTool('delete'));

        // Zoom buttons
        const zoomInBtn = document.getElementById('btn-zoom-in');
        const zoomOutBtn = document.getElementById('btn-zoom-out');
        const zoomFitBtn = document.getElementById('btn-zoom-fit');

        zoomInBtn?.addEventListener('click', () => this.setZoom(this.zoomLevel * 1.2));
        zoomOutBtn?.addEventListener('click', () => this.setZoom(this.zoomLevel / 1.2));
        zoomFitBtn?.addEventListener('click', () => this.zoomToFit());

        // File operation buttons
        const newBtn = document.getElementById('btn-new');
        const openBtn = document.getElementById('btn-open');
        const saveBtn = document.getElementById('btn-save');
        const exportBtn = document.getElementById('btn-export');

        newBtn?.addEventListener('click', () => window.electronAPI.newProject());
        openBtn?.addEventListener('click', () => window.electronAPI.openProject());
        saveBtn?.addEventListener('click', () => window.electronAPI.saveProject());
        exportBtn?.addEventListener('click', () => window.electronAPI.exportImage());
    }

    setTool(tool: 'select' | 'cable' | 'delete'): void {
        this.selectedTool = tool;
        
        // Update toolbar button states
        document.querySelectorAll('.canvas-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`btn-${tool}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update cursor
        this.updateCanvasCursor();
    }

    getTool(): 'select' | 'cable' | 'delete' {
        return this.selectedTool;
    }

    private updateCanvasCursor(): void {
        switch (this.selectedTool) {
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'cable':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'delete':
                this.canvas.style.cursor = 'not-allowed';
                break;
        }
    }

    setZoom(level: number): void {
        this.zoomLevel = Math.max(0.1, Math.min(5, level));
        const content = document.getElementById('canvas-content');
        if (content) {
            content.setAttribute('transform', `scale(${this.zoomLevel}) translate(${this.panOffset.x}, ${this.panOffset.y})`);
        }
        this.updateStatus(`Zoom: ${Math.round(this.zoomLevel * 100)}%`);
    }

    private zoomToFit(): void {
        const content = document.getElementById('canvas-content');
        if (!content) return;

        const bbox = (content as unknown as SVGGraphicsElement).getBBox();
        if (bbox.width === 0 || bbox.height === 0) {
            this.setZoom(1);
            return;
        }

        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = (canvasRect.width * 0.9) / bbox.width;
        const scaleY = (canvasRect.height * 0.9) / bbox.height;
        const scale = Math.min(scaleX, scaleY);
        
        this.setZoom(scale);
    }

    clearSelection(): void {
        // This will be called by ComponentManager
        const event = new CustomEvent('clearSelection');
        document.dispatchEvent(event);
    }

    deleteSelected(): void {
        const event = new CustomEvent('deleteSelected');
        document.dispatchEvent(event);
    }

    handleConnectorClick(connector: SVGElement, componentId: string): void {
        if (this.selectedTool === 'cable') {
            const event = new CustomEvent('connectorClicked', {
                detail: { connector, componentId }
            });
            document.dispatchEvent(event);
        }
    }

    showProperties(instance: ComponentInstance): void {
        const event = new CustomEvent('showProperties', {
            detail: { instance }
        });
        document.dispatchEvent(event);
    }

    handleResize(): void {
        const container = document.getElementById('canvas-viewport');
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.setAttribute('width', rect.width.toString());
            this.canvas.setAttribute('height', rect.height.toString());
        }
    }

    undo(): void {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo(): void {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    saveState(state: any): void {
        // Remove any history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(JSON.parse(JSON.stringify(state)));
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    private restoreState(state: any): void {
        const event = new CustomEvent('restoreState', {
            detail: { state }
        });
        document.dispatchEvent(event);
    }

    async exportImage(filePath: string): Promise<void> {
        try {
            const svgData = new XMLSerializer().serializeToString(this.canvas);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) throw new Error('Cannot get canvas context');
            
            const img = new Image();
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob && filePath.toLowerCase().endsWith('.png')) {
                        // In a real app, you'd need to save the blob to the file system
                        // This would require additional IPC communication
                        console.log('Image exported (placeholder)');
                    }
                }, 'image/png');
                
                URL.revokeObjectURL(url);
            };
            
            img.src = url;
            
        } catch (error) {
            console.error('Export failed:', error);
            this.updateStatus('Export failed');
        }
    }

    private updateStatus(message: string): void {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            
            // Clear status after 3 seconds if it's not an important status
            if (message !== 'Modified' && message !== 'Saved') {
                setTimeout(() => {
                    if (statusText.textContent === message) {
                        statusText.textContent = 'Ready';
                    }
                }, 3000);
            }
        }
    }
}