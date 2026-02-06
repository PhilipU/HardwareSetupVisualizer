class HardwareSetupVisualizer {
    constructor() {
        this.canvas = document.getElementById('setupCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.components = [];
        this.wires = [];
        this.selectedComponent = null;
        this.selectedWire = null;
        this.isDragging = false;
        this.isDrawingWire = false;
        this.wireStart = null;
        this.tempWire = null;
        this.svgCache = new Map(); // Cache for loaded SVG images
        this.zoomLevel = 1.2;
        this.minZoom = 0.25;
        this.maxZoom = 3.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.showLabels = true;
        this.selectedForMenu = null;
        this.contextMenu = null;
        this.cursorPos = { x: 0, y: 0 };
        // Touch event properties
        this.isPinching = false;
        this.lastPinchDistance = 0;
        this.lastZoomLevel = 1.0;
        
        this.setupCanvas();
        this.init();
    }

    setupCanvas() {
        // Get the device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        
        // Get the canvas container dimensions
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const cssWidth = rect.width - 20; // Account for margin
        const cssHeight = rect.height - 60; // Account for info bar
        
        // Set the actual canvas size accounting for device pixel ratio
        this.canvas.width = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;
        
        // Scale the canvas back down using CSS
        this.canvas.style.width = cssWidth + 'px';
        this.canvas.style.height = cssHeight + 'px';
        
        // Get fresh context after resize (canvas resize clears context)
        this.ctx = this.canvas.getContext('2d');
        
        // Scale the drawing context so everything draws at the correct size
        this.ctx.scale(dpr, dpr);
        
        // Store the logical canvas dimensions for coordinate calculations
        this.logicalWidth = cssWidth;
        this.logicalHeight = cssHeight;
    }

    async init() {
        await this.loadComponentTypes();
        this.setupEventListeners();
        this.initContextMenu();
        this.renderCanvas();
    }

    async loadComponentTypes() {
        try {
            const response = await fetch('components.json');
            const data = await response.json();
            this.componentTypes = data.components;
            
            // Preload SVG images
            await this.preloadSVGs();
            
            await this.renderToolbox();
        } catch (error) {
            console.error('Could not load components:', error);
            // Fallback components
            this.componentTypes = [
                { id: 'cpu', name: 'CPU', icon: 'CPU', color: '#e74c3c' },
                { id: 'ram', name: 'RAM', icon: 'RAM', color: '#2ecc71' },
                { id: 'gpu', name: 'GPU', icon: 'GPU', color: '#f39c12' },
                { id: 'hdd', name: 'HDD', icon: 'HDD', color: '#9b59b6' },
                { id: 'ssd', name: 'SSD', icon: 'SSD', color: '#1abc9c' },
                { id: 'psu', name: 'PSU', icon: 'PSU', color: '#34495e' },
                { id: 'mb', name: 'Motherboard', icon: 'MB', color: '#16a085' },
                { id: 'cable', name: 'Cable', icon: 'CBL', color: '#7f8c8d' }
            ];
            await this.renderToolbox();
        }
    }

    async preloadSVGs() {
        const svgPromises = this.componentTypes
            .filter(type => type.svg)
            .map(type => this.loadSVG(type.svg, type.id));
        
        await Promise.all(svgPromises);
    }

    async loadSVG(svgPath, componentId) {
        try {
            const response = await fetch(svgPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const svgText = await response.text();
            
            // Parse the SVG text into a DOM element for toolbox use
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // Also create an Image object for canvas rendering
            const img = new Image();
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    // Cache both the SVG element (for toolbox) and Image (for canvas)
                    this.svgCache.set(componentId, {
                        element: svgElement,
                        image: img
                    });
                    URL.revokeObjectURL(url);
                    resolve({ element: svgElement, image: img });
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to load image'));
                };
                img.src = url;
            });
        } catch (error) {
            console.warn(`Could not load SVG for ${componentId}:`, error);
            return null;
        }
    }

    async renderToolbox() {
        const componentList = document.getElementById('componentList');
        componentList.innerHTML = '';

        for (const type of this.componentTypes) {
            const componentItem = document.createElement('div');
            componentItem.className = 'component-item';
            componentItem.draggable = true;
            componentItem.dataset.componentType = type.id;

            // Create icon element
            const iconElement = document.createElement('div');
            iconElement.className = 'component-icon';
            iconElement.style.backgroundColor = type.color;

            // Try to use cached or load SVG icon if available
            let svgLoaded = false;
            if (type.svg) {
                try {
                    // Check cache first
                    let svgData = this.svgCache.get(type.id);
                    
                    // If not cached, try to load it
                    if (!svgData) {
                        svgData = await this.loadSVG(type.svg, type.id);
                    }
                    
                    if (svgData) {
                        iconElement.innerHTML = '';
                        iconElement.style.backgroundColor = 'transparent';
                        iconElement.style.padding = '2px';
                        
                        // Use img tag to avoid Chrome caching issues
                        const img = document.createElement('img');
                        img.src = type.svg + '?t=' + Date.now(); // Cache busting
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        
                        iconElement.appendChild(img);
                        svgLoaded = true;
                    }
                } catch (error) {
                    console.warn(`Failed to render SVG for ${type.id}:`, error);
                }
            }
            
            // Fallback to text icon if SVG failed or not available
            if (!svgLoaded) {
                iconElement.textContent = type.icon;
                iconElement.style.backgroundColor = type.color;
                iconElement.style.padding = '';
            }

            // Create name element
            const nameElement = document.createElement('div');
            nameElement.className = 'component-name';
            nameElement.textContent = type.name;

            // Append elements
            componentItem.appendChild(iconElement);
            componentItem.appendChild(nameElement);

            componentItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', type.id);
                componentItem.classList.add('dragging');
            });

            componentItem.addEventListener('dragend', () => {
                componentItem.classList.remove('dragging');
            });

            // Right-click context menu for toolbox items
            componentItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const rect = componentItem.getBoundingClientRect();
                this.showToolboxContextMenu(type, e.clientX, e.clientY);
            });

            componentList.appendChild(componentItem);
        }
    }

    setupEventListeners() {
        // Canvas drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const componentTypeId = e.dataTransfer.getData('text/plain');
            const coords = this.getMouseCoordinates(e);
            
            this.addComponent(componentTypeId, coords.x, coords.y);
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent browser context menu
            this.handleClick(e); // Handle as right-click
        });
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Touch events for mobile support
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Keyboard events for wire deletion
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Control buttons
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveSetup').addEventListener('click', () => this.saveSetup());
        document.getElementById('loadSetup').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        // Labels toggle
        document.getElementById('showLabels').addEventListener('change', (e) => {
            this.showLabels = e.target.checked;
            this.renderCanvas();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadSetup(e));

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedComponent) {
                this.deleteComponent(this.selectedComponent);
            }
        });
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.setupCanvas();
            this.renderCanvas();
        }, 100);
    }

    initContextMenu() {
        this.contextMenu = document.getElementById('componentContextMenu');
        this.toolboxContextMenu = document.getElementById('toolboxContextMenu');
        this.selectedToolboxType = null;
        
        // Mirror component functionality
        document.getElementById('mirrorComponent').addEventListener('click', () => {
            if (this.selectedForMenu) {
                this.mirrorComponent(this.selectedForMenu);
                this.hideContextMenu();
            }
        });
        
        // Toolbox context menu actions
        document.getElementById('addToCanvas').addEventListener('click', () => {
            if (this.selectedToolboxType) {
                // Add component to center of visible canvas area
                const centerX = (this.logicalWidth / 2 / this.zoomLevel) - this.panX;
                const centerY = (this.logicalHeight / 2 / this.zoomLevel) - this.panY;
                this.addComponent(this.selectedToolboxType.id, centerX, centerY);
                this.hideToolboxContextMenu();
            }
        });
        
        document.getElementById('openImage').addEventListener('click', () => {
            if (this.selectedToolboxType && this.selectedToolboxType.svg) {
                window.open(this.selectedToolboxType.svg, '_blank');
            }
            this.hideToolboxContextMenu();
        });
        
        document.getElementById('removeAll').addEventListener('click', () => {
            if (this.selectedToolboxType) {
                this.removeAllComponentsOfType(this.selectedToolboxType.id);
                this.hideToolboxContextMenu();
            }
        });
        
        // Hide context menus when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
            if (!this.toolboxContextMenu.contains(e.target)) {
                this.hideToolboxContextMenu();
            }
        });
    }
    
    showContextMenu(component, x, y) {
        this.selectedForMenu = component;
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = (x + 10) + 'px';
        this.contextMenu.style.top = (y - 20) + 'px';
    }
    
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.selectedForMenu = null;
    }
    
    showToolboxContextMenu(componentType, x, y) {
        this.selectedToolboxType = componentType;
        this.toolboxContextMenu.style.display = 'block';
        this.toolboxContextMenu.style.left = (x + 5) + 'px';
        this.toolboxContextMenu.style.top = (y + 5) + 'px';
    }
    
    hideToolboxContextMenu() {
        this.toolboxContextMenu.style.display = 'none';
        this.selectedToolboxType = null;
    }
    
    removeAllComponentsOfType(typeId) {
        // Get all components of this type
        const componentsToRemove = this.components.filter(comp => comp.type.id === typeId);
        
        // Remove all wires connected to these components
        this.wires = this.wires.filter(wire => 
            !componentsToRemove.includes(wire.start.component) && 
            !componentsToRemove.includes(wire.end.component)
        );
        
        // Remove the components
        this.components = this.components.filter(comp => comp.type.id !== typeId);
        
        // Clear selection if selected component was removed
        if (this.selectedComponent && this.selectedComponent.type.id === typeId) {
            this.selectedComponent = null;
        }
        
        this.renderCanvas();
    }
    
    mirrorComponent(component) {
        // Flip connectors from left to right and vice versa
        component.connectionPoints.forEach(point => {
            if (point.side === 'left') {
                point.side = 'right';
                point.x = component.width - point.x;
            } else if (point.side === 'right') {
                point.side = 'left';
                point.x = component.width - point.x;
            }
            // Top and bottom connectors remain the same
        });
        
        this.renderCanvas();
    }

    addComponent(typeId, x, y) {
        const type = this.componentTypes.find(t => t.id === typeId);
        if (!type) {
            return;
        }

        // Use custom connection points if defined, otherwise use default points
        const defaultPoints = [
            { x: 0, y: 30, side: 'left', type: 'input' },
            { x: 80, y: 30, side: 'right', type: 'output' },
            { x: 40, y: 0, side: 'top', type: 'power' },
            { x: 40, y: 60, side: 'bottom', type: 'ground' }
        ];
        
        // Create a deep copy of connection points to avoid shared references
        const connectionPoints = JSON.parse(JSON.stringify(type.connectionPoints || defaultPoints));

        const component = {
            id: Date.now() + Math.random(),
            type: type,
            x: x - 60,
            y: y - 45,
            width: 120,
            height: 90,
            connectionPoints: connectionPoints
        };

        this.components.push(component);
        this.renderCanvas();
    }

    getMouseCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate mouse position accounting for zoom and pan
        const x = ((e.clientX - rect.left) / this.zoomLevel) - this.panX;
        const y = ((e.clientY - rect.top) / this.zoomLevel) - this.panY;
        
        return { x, y };
    }

    handleMouseDown(e) {
        const coords = this.getMouseCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        // Left-click for interaction
        if (e.button === 0) {
            // First check for connection points (wire creation has priority)
            const connectionPoint = this.getConnectionPointAt(x, y);
            if (connectionPoint) {
                this.startWire(connectionPoint);
                return;
            }

            // Then check for components (dragging)
            const component = this.getComponentAt(x, y);
            if (component) {
                this.selectedComponent = component;
                this.isDragging = true;
                this.dragOffset = { x: x - component.x, y: y - component.y };
                this.canvas.style.cursor = 'grabbing';
            } else {
                // Start canvas panning
                this.selectedComponent = null;
                this.isPanning = true;
                const rect = this.canvas.getBoundingClientRect();
                this.lastPanPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this.canvas.style.cursor = 'grabbing';
            }
        }

        this.renderCanvas();
    }

    handleMouseMove(e) {
        const coords = this.getMouseCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        // Handle canvas panning
        if (this.isPanning) {
            const rect = this.canvas.getBoundingClientRect();
            const currentPoint = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            const deltaX = (currentPoint.x - this.lastPanPoint.x) / this.zoomLevel;
            const deltaY = (currentPoint.y - this.lastPanPoint.y) / this.zoomLevel;
            
            this.panX += deltaX;
            this.panY += deltaY;
            
            this.lastPanPoint = currentPoint;
            this.renderCanvas();
            return;
        }

        // Handle component dragging
        if (this.isDragging && this.selectedComponent) {
            this.selectedComponent.x = x - this.dragOffset.x;
            this.selectedComponent.y = y - this.dragOffset.y;
            
            // Keep component within canvas bounds using logical dimensions
            this.selectedComponent.x = Math.max(0, Math.min(this.logicalWidth - this.selectedComponent.width, this.selectedComponent.x));
            this.selectedComponent.y = Math.max(0, Math.min(this.logicalHeight - this.selectedComponent.height, this.selectedComponent.y));
            
            this.renderCanvas();
        }

        // Handle wire drawing
        if (this.isDrawingWire && this.wireStart) {
            // Use the exact coordinates from the selected connection point
            this.tempWire = { x1: this.wireStart.x, y1: this.wireStart.y, x2: x, y2: y };
            this.renderCanvas();
        }

        // Update cursor based on what's under the mouse
        if (!this.isDragging && !this.isDrawingWire && !this.isPanning) {
            // Check if hovering over zoom indicator (uses canvas coordinates)
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            
            const zoomIndicatorX = this.logicalWidth - 80;
            const zoomIndicatorY = this.logicalHeight - 30;
            const zoomIndicatorWidth = 75;
            const zoomIndicatorHeight = 25;
            
            if (canvasX >= zoomIndicatorX && canvasX <= zoomIndicatorX + zoomIndicatorWidth &&
                canvasY >= zoomIndicatorY && canvasY <= zoomIndicatorY + zoomIndicatorHeight) {
                this.canvas.style.cursor = 'pointer';
            } else {
                const component = this.getComponentAt(x, y);
                const connectionPoint = this.getConnectionPointAt(x, y);
                const wire = this.getWireAt((e.clientX - this.canvas.getBoundingClientRect().left) / this.zoomLevel - this.panX, (e.clientY - this.canvas.getBoundingClientRect().top) / this.zoomLevel - this.panY);
                
                if (connectionPoint) {
                    this.canvas.style.cursor = 'crosshair';
                } else if (component || wire) {
                    this.canvas.style.cursor = 'grab';
                } else {
                    this.canvas.style.cursor = 'move';
                }
            }
        }
    }

    handleMouseUp(e) {
        if (this.isDrawingWire) {
            const coords = this.getMouseCoordinates(e);
            
            const endPoint = this.getConnectionPointAt(coords.x, coords.y);
            if (endPoint && endPoint !== this.wireStart) {
                this.addWire(this.wireStart, endPoint);
            }
            
            this.stopWire();
        }

        if (this.isDragging || this.isPanning) {
            this.canvas.style.cursor = 'default';
        }

        this.isDragging = false;
        this.isPanning = false;
        this.dragOffset = null;
    }

    handleClick(e) {
        // Check if clicking on zoom indicator (uses canvas coordinates, not world coordinates)
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        const zoomIndicatorX = this.logicalWidth - 80;
        const zoomIndicatorY = this.logicalHeight - 30;
        const zoomIndicatorWidth = 75;
        const zoomIndicatorHeight = 25;
        
        if (canvasX >= zoomIndicatorX && canvasX <= zoomIndicatorX + zoomIndicatorWidth &&
            canvasY >= zoomIndicatorY && canvasY <= zoomIndicatorY + zoomIndicatorHeight) {
            // Reset zoom to 100%
            this.zoomLevel = 1.0;
            this.renderCanvas();
            return;
        }
        
        const coords = this.getMouseCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        // Right-click on component shows context menu
        if (e.button === 2 || e.ctrlKey) {
            const component = this.getComponentAt(x, y);
            if (component) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const menuX = e.clientX - rect.left;
                const menuY = e.clientY - rect.top;
                this.showContextMenu(component, menuX, menuY);
                return;
            } else {
                this.hideContextMenu();
            }
        }

        // Check if clicking on a wire
        const wire = this.getWireAt(x, y);
        if (wire) {
            if (e.detail === 2) { 
                // Double click to delete wire
                this.deleteWire(wire);
            } else {
                // Single click to select wire
                this.selectedWire = wire;
                this.renderCanvas();
            }
        } else {
            // Click on empty space - deselect wire
            this.selectedWire = null;
            this.renderCanvas();
        }
    }

    // Touch event handlers for mobile support
    handleTouchStart(e) {
        e.preventDefault(); // Prevent default touch behavior (scrolling, zooming)
        
        if (e.touches.length === 1) {
            // Single touch - treat as mouse down
            const touch = e.touches[0];
            const mouseEvent = this.touchToMouseEvent(touch);
            this.handleMouseDown(mouseEvent);
        } else if (e.touches.length === 2) {
            // Two-finger touch - prepare for pinch zoom
            this.isPinching = true;
            this.lastPinchDistance = this.getPinchDistance(e.touches[0], e.touches[1]);
            this.lastZoomLevel = this.zoomLevel;
        }
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent default touch behavior
        
        if (e.touches.length === 1 && !this.isPinching) {
            // Single touch - treat as mouse move
            const touch = e.touches[0];
            const mouseEvent = this.touchToMouseEvent(touch);
            this.handleMouseMove(mouseEvent);
        } else if (e.touches.length === 2 && this.isPinching) {
            // Two-finger touch - handle pinch zoom
            const currentDistance = this.getPinchDistance(e.touches[0], e.touches[1]);
            const scaleFactor = currentDistance / this.lastPinchDistance;
            
            // Apply zoom with limits
            const newZoom = this.lastZoomLevel * scaleFactor;
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
            
            this.renderCanvas();
        }
    }

    handleTouchEnd(e) {
        e.preventDefault(); // Prevent default touch behavior
        
        if (e.touches.length === 0) {
            // All touches ended
            if (this.isPinching) {
                this.isPinching = false;
                this.lastPinchDistance = 0;
            } else {
                // Single touch ended - treat as mouse up
                const touch = e.changedTouches[0];
                const mouseEvent = this.touchToMouseEvent(touch);
                this.handleMouseUp(mouseEvent);
            }
        } else if (e.touches.length === 1) {
            // One finger remains, stop pinching
            this.isPinching = false;
            this.lastPinchDistance = 0;
        }
    }

    touchToMouseEvent(touch) {
        // Convert touch event to mouse event format
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0, // Left button
            preventDefault: () => {},
            stopPropagation: () => {}
        };
    }

    getPinchDistance(touch1, touch2) {
        // Calculate distance between two touch points
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    startWire(connectionPoint) {
        this.isDrawingWire = true;
        this.wireStart = connectionPoint;
    }

    stopWire() {
        this.isDrawingWire = false;
        this.wireStart = null;
        this.tempWire = null;
        this.renderCanvas();
    }

    addWire(startPoint, endPoint) {
        const wire = {
            id: Date.now() + Math.random(),
            start: {
                component: startPoint.component,
                side: startPoint.side,
                point: startPoint.point, // Store reference to exact connection point
                x: startPoint.x,
                y: startPoint.y
            },
            end: {
                component: endPoint.component,
                side: endPoint.side,
                point: endPoint.point, // Store reference to exact connection point
                x: endPoint.x,
                y: endPoint.y
            }
        };
        this.wires.push(wire);
        this.renderCanvas();
    }

    handleKeyDown(e) {
        // Delete selected wire with Delete or Backspace key
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedWire) {
            e.preventDefault();
            this.deleteWire(this.selectedWire);
            this.selectedWire = null;
        }
    }

    deleteWire(wire) {
        const index = this.wires.indexOf(wire);
        if (index > -1) {
            this.wires.splice(index, 1);
            this.renderCanvas();
        }
    }

    deleteComponent(component) {
        // Remove wires connected to this component
        this.wires = this.wires.filter(wire => 
            wire.start.component !== component && wire.end.component !== component
        );
        
        // Remove component
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            this.selectedComponent = null;
            this.renderCanvas();
        }
    }

    getComponentAt(x, y) {
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (x >= comp.x && x <= comp.x + comp.width &&
                y >= comp.y && y <= comp.y + comp.height) {
                return comp;
            }
        }
        return null;
    }

    getConnectionPointAt(x, y) {
        let closestPoint = null;
        let closestDistance = Infinity;
        const maxDistance = 15; // Detection radius for easier selection
        
        for (const component of this.components) {
            for (const point of component.connectionPoints) {
                const px = component.x + point.x;
                const py = component.y + point.y;
                const distance = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
                
                // Check if within detection radius and closer than previous closest
                if (distance <= maxDistance && distance < closestDistance) {
                    closestDistance = distance;
                    closestPoint = {
                        x: px,
                        y: py,
                        component: component,
                        side: point.side,
                        point: point
                    };
                }
            }
        }
        
        return closestPoint;
    }

    getRoutedPath(x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y) {
        // Check for component intersections and route around them
        const intersectingComponents = this.findIntersectingComponents(x1, y1, x2, y2);
        
        if (intersectingComponents.length === 0) {
            // No obstacles, use simple curve
            return {
                startX: x1,
                startY: y1,
                endX: x2,
                endY: y2,
                cp1x: cp1x,
                cp1y: cp1y,
                cp2x: cp2x,
                cp2y: cp2y,
                waypoints: null
            };
        }
        
        // Route around obstacles
        const waypoints = this.calculateWaypoints(x1, y1, x2, y2, intersectingComponents);
        
        return {
            startX: x1,
            startY: y1,
            endX: x2,
            endY: y2,
            waypoints: waypoints
        };
    }

    findIntersectingComponents(x1, y1, x2, y2) {
        const intersecting = [];
        const padding = 20; // Extra space around components
        
        for (const component of this.components) {
            // Expand component bounds with padding
            const left = component.x - padding;
            const right = component.x + component.width + padding;
            const top = component.y - padding;
            const bottom = component.y + component.height + padding;
            
            // Check if line intersects with expanded component bounds
            if (this.lineIntersectsRect(x1, y1, x2, y2, left, top, right, bottom)) {
                intersecting.push({
                    component: component,
                    left: left,
                    right: right,
                    top: top,
                    bottom: bottom
                });
            }
        }
        
        return intersecting;
    }

    lineIntersectsRect(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) {
        // Check if line segment intersects with rectangle
        return this.lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectTop) ||
               this.lineIntersectsLine(x1, y1, x2, y2, rectRight, rectTop, rectRight, rectBottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, rectRight, rectBottom, rectLeft, rectBottom) ||
               this.lineIntersectsLine(x1, y1, x2, y2, rectLeft, rectBottom, rectLeft, rectTop);
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return false;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    calculateWaypoints(x1, y1, x2, y2, obstacles) {
        if (obstacles.length === 0) return [];
        
        const waypoints = [];
        
        // For each obstacle, calculate routing points
        for (const obstacle of obstacles) {
            const centerX = (obstacle.left + obstacle.right) / 2;
            const centerY = (obstacle.top + obstacle.bottom) / 2;
            
            // Determine which side to route around based on line direction
            const dx = x2 - x1;
            const dy = y2 - y1;
            
            let routeX, routeY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal routing - go above or below
                routeX = centerX;
                routeY = dy > 0 ? obstacle.top - 10 : obstacle.bottom + 10;
            } else {
                // Vertical routing - go left or right
                routeX = dx > 0 ? obstacle.left - 10 : obstacle.right + 10;
                routeY = centerY;
            }
            
            waypoints.push({ x: routeX, y: routeY });
        }
        
        return waypoints;
    }

    getConnectionPointPosition(component, side) {
        const point = component.connectionPoints.find(p => p.side === side);
        if (point) {
            return {
                x: component.x + point.x,
                y: component.y + point.y
            };
        }
        return { x: component.x, y: component.y };
    }

    getWireAt(x, y) {
        for (const wire of this.wires) {
            let startPos, endPos;
            
            if (wire.start.point) {
                startPos = {
                    x: wire.start.component.x + wire.start.point.x,
                    y: wire.start.component.y + wire.start.point.y
                };
            } else {
                startPos = this.getConnectionPointPosition(wire.start.component, wire.start.side);
            }
            
            if (wire.end.point) {
                endPos = {
                    x: wire.end.component.x + wire.end.point.x,
                    y: wire.end.component.y + wire.end.point.y
                };
            } else {
                endPos = this.getConnectionPointPosition(wire.end.component, wire.end.side);
            }
            
            // Check distance to Bézier curve by sampling points along the curve
            if (this.distanceToBezierCurve(x, y, startPos.x, startPos.y, endPos.x, endPos.y) < 10) {
                return wire;
            }
        }
        return null;
    }

    distanceToBezierCurve(px, py, x1, y1, x2, y2) {
        // Calculate the same control points used in drawing
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        let cp1x, cp1y, cp2x, cp2y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            const offset = Math.abs(dx) * 0.5;
            cp1x = x1 + Math.sign(dx) * Math.min(offset, 100);
            cp1y = y1;
            cp2x = x2 - Math.sign(dx) * Math.min(offset, 100);
            cp2y = y2;
        } else {
            const offset = Math.abs(dy) * 0.5;
            cp1x = x1;
            cp1y = y1 + Math.sign(dy) * Math.min(offset, 100);
            cp2x = x2;
            cp2y = y2 - Math.sign(dy) * Math.min(offset, 100);
        }
        
        // Sample points along the Bézier curve and find minimum distance
        let minDistance = Infinity;
        const steps = 30;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;
            
            // Cubic Bézier curve formula
            const curveX = mt3 * x1 + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * x2;
            const curveY = mt3 * y1 + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * y2;
            
            const distance = Math.sqrt((px - curveX) ** 2 + (py - curveY) ** 2);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }

    getConnectionPointPosition(component, side) {
        const point = component.connectionPoints.find(p => p.side === side);
        if (point) {
            return {
                x: component.x + point.x,
                y: component.y + point.y
            };
        }
        return { x: component.x, y: component.y };
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    renderCanvas() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Apply zoom and pan transformations
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        this.ctx.translate(this.panX, this.panY);

        // Draw wires
        this.wires.forEach(wire => {
            // Use stored connection point references to get current positions
            let startPoint, endPoint;
            
            if (wire.start.point) {
                // Calculate current position based on component position + point offset
                startPoint = {
                    x: wire.start.component.x + wire.start.point.x,
                    y: wire.start.component.y + wire.start.point.y
                };
            } else {
                // Fallback for old wires without point references
                startPoint = this.getConnectionPointPosition(wire.start.component, wire.start.side);
            }
            
            if (wire.end.point) {
                // Calculate current position based on component position + point offset
                endPoint = {
                    x: wire.end.component.x + wire.end.point.x,
                    y: wire.end.component.y + wire.end.point.y
                };
            } else {
                // Fallback for old wires without point references
                endPoint = this.getConnectionPointPosition(wire.end.component, wire.end.side);
            }
            
            // Save context for wire-specific styling
            this.ctx.save();
            
            // Highlight selected wire
            if (wire === this.selectedWire) {
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 4;
                this.ctx.shadowColor = '#e74c3c';
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.strokeStyle = '#34495e';
                this.ctx.lineWidth = 3;
            }
            
            this.drawWire(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            this.ctx.restore();
        });

        // Draw temporary wire
        if (this.tempWire) {
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.tempWire.x1, this.tempWire.y1);
            this.ctx.lineTo(this.tempWire.x2, this.tempWire.y2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw components
        this.components.forEach(component => {
            this.drawComponent(component);
        });
        
        // Restore canvas transformation
        this.ctx.restore();
        
        // Draw zoom level indicator (outside transform)
        this.drawZoomIndicator();
    }

    handleWheel(e) {
        e.preventDefault();
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to world coordinates (before zoom)
        const worldX = mouseX / this.zoomLevel - this.panX;
        const worldY = mouseY / this.zoomLevel - this.panY;
        
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = this.zoomLevel * zoomFactor;
        
        // Clamp zoom level
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // Only adjust pan if zoom actually changed
        if (clampedZoom !== this.zoomLevel) {
            // Calculate new pan to keep the world point under the mouse
            this.panX = mouseX / clampedZoom - worldX;
            this.panY = mouseY / clampedZoom - worldY;
            this.zoomLevel = clampedZoom;
        }
        
        this.renderCanvas();
    }
    
    drawZoomIndicator() {
        // Draw zoom level in bottom right corner
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.logicalWidth - 80, this.logicalHeight - 30, 75, 25);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.round(this.zoomLevel * 100)}%`, this.logicalWidth - 42, this.logicalHeight - 12);
        this.ctx.restore();
    }

    drawComponent(component) {
        // Highlight selected component
        const isSelected = this.selectedComponent === component;
        
        if (isSelected) {
            // Draw highlight border
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([]);
            this.ctx.strokeRect(component.x - 3, component.y - 3, component.width + 6, component.height + 6);
            
            // Draw subtle glow effect
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeRect(component.x - 3, component.y - 3, component.width + 6, component.height + 6);
            this.ctx.shadowBlur = 0;
        }
        
        // Check if SVG is available for this component
        const svgData = this.svgCache.get(component.type.id);
        
        if (svgData && svgData.image) {
            // Draw SVG image
            this.ctx.drawImage(svgData.image, component.x, component.y, component.width, component.height);
        } else {
            // Fallback to icon rendering
            // Draw component icon
            this.ctx.fillStyle = component.type.color;
            const iconSize = 36;
            const iconX = component.x + (component.width - iconSize) / 2;
            const iconY = component.y + 12;
            this.ctx.fillRect(iconX, iconY, iconSize, iconSize);

            // Draw component icon text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(component.type.icon, iconX + iconSize/2, iconY + iconSize/2 + 4);

            // Draw component name
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(component.type.name, component.x + component.width/2, component.y + component.height - 8);
        }

        // Draw connection points
        component.connectionPoints.forEach(point => {
            const px = component.x + point.x;
            const py = component.y + point.y;
            
            // Color code connection points by type
            let pointColor = '#9b59b6'; // default purple for data
            switch(point.type) {
                case 'input': pointColor = '#9b59b6'; break;   // purple (data)
                case 'output': pointColor = '#9b59b6'; break;  // purple (data)
                case 'data': pointColor = '#9b59b6'; break;    // purple (data)
                case 'ethernet': pointColor = '#3498db'; break; // blue (ethernet)
                case 'digital': pointColor = '#9b59b6'; break;  // purple (digital)
                case 'analog': pointColor = '#27ae60'; break;   // green (analog)
                case 'power': pointColor = '#e74c3c'; break;   // red (power)
                case 'ground': pointColor = '#2c3e50'; break;  // black (ground)
            }
            
            this.ctx.fillStyle = pointColor;
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw connector label (if enabled and connector has a name)
            if (this.showLabels && point.name) {
                this.ctx.fillStyle = '#2c3e50';
                this.ctx.font = '10px Arial';
                
                // Position label based on connector side
                let labelX = px;
                let labelY = py;
                this.ctx.textAlign = 'center';
                
                switch(point.side) {
                    case 'left':
                        labelX = px - 12;
                        this.ctx.textAlign = 'right';
                        break;
                    case 'right':
                        labelX = px + 12;
                        this.ctx.textAlign = 'left';
                        break;
                    case 'top':
                        labelY = py - 8;
                        break;
                    case 'bottom':
                        labelY = py + 12;
                        break;
                }
                
                this.ctx.fillText(point.name, labelX, labelY + 3);
            }
        });
        
        // Draw component label (if enabled)
        if (this.showLabels) {
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            
            // Check if there are connectors on top or bottom
            const hasTopConnector = component.connectionPoints.some(p => p.side === 'top');
            const hasBottomConnector = component.connectionPoints.some(p => p.side === 'bottom');
            
            // Position label on opposite side of connectors
            let labelY;
            if (hasTopConnector && !hasBottomConnector) {
                // Connector on top -> label on bottom
                labelY = component.y + component.height + 15;
            } else {
                // Default: label on top (including when both or neither have connectors)
                labelY = component.y - 8;
            }
            
            this.ctx.fillText(component.type.name, component.x + component.width/2, labelY);
        }
    }

    drawWire(x1, y1, x2, y2) {
        // Calculate control points for smooth Bézier curves
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Create control points that create natural curves
        let cp1x, cp1y, cp2x, cp2y;
        
        // Determine curve direction based on connection positions
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal emphasis - curve horizontally
            const offset = Math.abs(dx) * 0.5;
            cp1x = x1 + Math.sign(dx) * Math.min(offset, 100);
            cp1y = y1;
            cp2x = x2 - Math.sign(dx) * Math.min(offset, 100);
            cp2y = y2;
        } else {
            // Vertical emphasis - curve vertically  
            const offset = Math.abs(dy) * 0.5;
            cp1x = x1;
            cp1y = y1 + Math.sign(dy) * Math.min(offset, 100);
            cp2x = x2;
            cp2y = y2 - Math.sign(dy) * Math.min(offset, 100);
        }
        
        // Draw smooth Bézier curve (style should be set by caller)
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        this.ctx.stroke();

        // Draw wire endpoints
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(x1, y1, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x2, y2, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear all components and wires?')) {
            this.components = [];
            this.wires = [];
            this.selectedComponent = null;
            this.selectedWire = null;
            this.renderCanvas();
        }
    }

    saveSetup() {
        const setupData = {
            components: this.components.map(comp => ({
                id: comp.id,
                typeId: comp.type.id,
                x: comp.x,
                y: comp.y
            })),
            wires: this.wires.map(wire => ({
                id: wire.id,
                startComponentId: wire.start.component.id,
                startSide: wire.start.side,
                endComponentId: wire.end.component.id,
                endSide: wire.end.side
            }))
        };

        const dataStr = JSON.stringify(setupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'hardware_setup.json';
        link.click();
    }

    loadSetup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const setupData = JSON.parse(e.target.result);
                this.restoreSetup(setupData);
            } catch (error) {
                alert('Invalid setup file format');
                console.error('Load error:', error);
            }
        };
        reader.readAsText(file);
    }

    restoreSetup(setupData) {
        this.clearCanvas();
        
        // Restore components
        setupData.components.forEach(compData => {
            const type = this.componentTypes.find(t => t.id === compData.typeId);
            if (type) {
                const component = {
                    id: compData.id,
                    type: type,
                    x: compData.x,
                    y: compData.y,
                    width: 80,
                    height: 60,
                    connectionPoints: [
                        { x: 0, y: 30, side: 'left' },
                        { x: 80, y: 30, side: 'right' },
                        { x: 40, y: 0, side: 'top' },
                        { x: 40, y: 60, side: 'bottom' }
                    ]
                };
                this.components.push(component);
            }
        });

        // Restore wires
        setupData.wires.forEach(wireData => {
            const startComp = this.components.find(c => c.id === wireData.startComponentId);
            const endComp = this.components.find(c => c.id === wireData.endComponentId);
            
            if (startComp && endComp) {
                const startPoint = startComp.connectionPoints.find(p => p.side === wireData.startSide);
                const endPoint = endComp.connectionPoints.find(p => p.side === wireData.endSide);
                
                if (startPoint && endPoint) {
                    const wire = {
                        id: wireData.id,
                        start: {
                            x: startComp.x + startPoint.x,
                            y: startComp.y + startPoint.y,
                            component: startComp,
                            side: startPoint.side
                        },
                        end: {
                            x: endComp.x + endPoint.x,
                            y: endComp.y + endPoint.y,
                            component: endComp,
                            side: endPoint.side
                        }
                    };
                    this.wires.push(wire);
                }
            }
        });

        this.renderCanvas();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HardwareSetupVisualizer();
});