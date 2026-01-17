// Renderer process JavaScript
class HardwareVisualizer {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.components = [];
        this.selectedComponent = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMenuListeners();
        this.loadAppInfo();
        this.resizeCanvas();
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

        // Component drag and drop
        const componentItems = document.querySelectorAll('.component-item');
        componentItems.forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
        });

        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));

        // Button events
        document.getElementById('new-btn').addEventListener('click', this.newProject.bind(this));
        document.getElementById('open-btn').addEventListener('click', this.openProject.bind(this));
        document.getElementById('save-btn').addEventListener('click', this.saveProject.bind(this));
        document.getElementById('clear-workspace').addEventListener('click', this.clearWorkspace.bind(this));
        document.getElementById('export-btn').addEventListener('click', this.exportProject.bind(this));

        // Modal events
        const modal = document.getElementById('about-modal');
        const closeBtn = document.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Window resize
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }

    setupMenuListeners() {
        if (window.electronAPI) {
            // Menu event listeners
            window.electronAPI.onMenuNewFile(() => this.newProject());
            window.electronAPI.onMenuOpenFile(() => this.openProject());
            window.electronAPI.onMenuSaveFile(() => this.saveProject());
            window.electronAPI.onMenuAbout(() => this.showAbout());
        }
    }

    async loadAppInfo() {
        if (window.electronAPI) {
            try {
                const version = await window.electronAPI.getAppVersion();
                const name = await window.electronAPI.getAppName();
                
                document.getElementById('app-info').textContent = `${name} v${version}`;
                document.getElementById('app-version').textContent = version;
            } catch (error) {
                console.error('Failed to load app info:', error);
            }
        }
    }

    resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width - 40; // Account for padding
        this.canvas.height = rect.height - 40;
        
        this.redraw();
    }

    handleDragStart(event) {
        const componentType = event.target.dataset.component;
        event.dataTransfer.setData('text/plain', componentType);
        event.dataTransfer.effectAllowed = 'copy';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(event) {
        event.preventDefault();
        const componentType = event.dataTransfer.getData('text/plain');
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.addComponent(componentType, x, y);
    }

    addComponent(type, x, y) {
        const component = {
            id: this.generateId(),
            type: type,
            x: x - 30, // Center the component
            y: y - 20,
            width: 60,
            height: 40,
            name: this.getComponentName(type),
            properties: this.getDefaultProperties(type)
        };

        this.components.push(component);
        this.redraw();
        this.updateStatus(`Added ${component.name}`);
    }

    getComponentName(type) {
        const names = {
            cpu: 'CPU',
            ram: 'RAM',
            gpu: 'GPU',
            storage: 'Storage',
            motherboard: 'Motherboard'
        };
        return names[type] || 'Component';
    }

    getDefaultProperties(type) {
        const defaults = {
            cpu: { cores: 4, speed: '3.2GHz', socket: 'LGA1200' },
            ram: { capacity: '16GB', speed: 'DDR4-3200', type: 'DIMM' },
            gpu: { memory: '8GB', type: 'RTX 3070', interface: 'PCIe 4.0' },
            storage: { capacity: '1TB', type: 'SSD', interface: 'SATA' },
            motherboard: { socket: 'LGA1200', chipset: 'B550', formFactor: 'ATX' }
        };
        return defaults[type] || {};
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const component = this.getComponentAt(x, y);
        if (component) {
            this.selectedComponent = component;
            this.isDragging = true;
            this.dragOffset.x = x - component.x;
            this.dragOffset.y = y - component.y;
            this.showComponentProperties(component);
        } else {
            this.selectedComponent = null;
            this.hideComponentProperties();
        }
        
        this.redraw();
    }

    handleMouseMove(event) {
        if (this.isDragging && this.selectedComponent) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            this.selectedComponent.x = x - this.dragOffset.x;
            this.selectedComponent.y = y - this.dragOffset.y;
            
            this.redraw();
        }
    }

    handleMouseUp(event) {
        this.isDragging = false;
    }

    handleCanvasClick(event) {
        if (!this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const component = this.getComponentAt(x, y);
            if (component) {
                this.selectedComponent = component;
                this.showComponentProperties(component);
            } else {
                this.selectedComponent = null;
                this.hideComponentProperties();
            }
            
            this.redraw();
        }
    }

    getComponentAt(x, y) {
        // Check components in reverse order (top to bottom)
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    showComponentProperties(component) {
        const panel = document.getElementById('properties-panel');
        
        let html = `<h4>${component.name}</h4>`;
        html += `<p><strong>Type:</strong> ${component.type}</p>`;
        
        for (const [key, value] of Object.entries(component.properties)) {
            html += `<p><strong>${key}:</strong> ${value}</p>`;
        }
        
        panel.innerHTML = html;
    }

    hideComponentProperties() {
        const panel = document.getElementById('properties-panel');
        panel.innerHTML = '<p class="no-selection">Select a component to view properties</p>';
    }

    redraw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw components
        this.components.forEach(component => {
            this.drawComponent(component);
        });
    }

    drawGrid() {
        const gridSize = 20;
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawComponent(component) {
        // Component colors
        const colors = {
            cpu: '#e74c3c',
            ram: '#3498db',
            gpu: '#9b59b6',
            storage: '#f39c12',
            motherboard: '#27ae60'
        };

        const color = colors[component.type] || '#95a5a6';
        
        // Draw component rectangle
        this.ctx.fillStyle = color;
        this.ctx.fillRect(component.x, component.y, component.width, component.height);

        // Draw border
        if (component === this.selectedComponent) {
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 2;
        } else {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
        }
        this.ctx.strokeRect(component.x, component.y, component.width, component.height);

        // Draw component name
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            component.name,
            component.x + component.width / 2,
            component.y + component.height / 2 + 4
        );
    }

    newProject() {
        this.clearWorkspace();
        this.updateStatus('New project created');
    }

    openProject() {
        // Implement file opening logic
        this.updateStatus('Open project - Feature coming soon');
    }

    saveProject() {
        // Implement file saving logic
        this.updateStatus('Save project - Feature coming soon');
    }

    clearWorkspace() {
        this.components = [];
        this.selectedComponent = null;
        this.hideComponentProperties();
        this.redraw();
        this.updateStatus('Workspace cleared');
    }

    exportProject() {
        // Implement export logic
        this.updateStatus('Export project - Feature coming soon');
    }

    showAbout() {
        const modal = document.getElementById('about-modal');
        modal.style.display = 'block';
    }

    updateStatus(message) {
        document.querySelector('.status-text').textContent = message;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            document.querySelector('.status-text').textContent = 'Ready';
        }, 3000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new HardwareVisualizer();
});