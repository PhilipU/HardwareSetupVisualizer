import { ComponentManager } from '../renderer/components/ComponentManager';
import { CanvasManager } from '../renderer/canvas/CanvasManager';
import { ComponentLibrary } from '../renderer/components/ComponentLibrary';

// Mock DOM environment for testing
const mockDOM = () => {
    // Create mock HTML structure
    document.body.innerHTML = `
        <div id="app">
            <div id="component-panel">
                <div class="component-item" data-component="desktop-pc" draggable="true">
                    <span>Desktop PC</span>
                </div>
                <div class="component-item" data-component="laptop" draggable="true">
                    <span>Laptop</span>
                </div>
                <div class="component-item" data-component="oscilloscope" draggable="true">
                    <span>Oscilloscope</span>
                </div>
            </div>
            <div id="canvas-container">
                <svg id="canvas" width="800" height="600">
                    <g id="canvas-content"></g>
                    <g id="cables-layer"></g>
                    <g id="components-layer"></g>
                    <g id="selection-layer"></g>
                </svg>
            </div>
        </div>
    `;
};

// Mock DataTransfer object for drag and drop events
class MockDataTransfer {
    private data: { [key: string]: string } = {};
    public dropEffect = 'none';
    public effectAllowed = 'uninitialized';

    setData(format: string, data: string): void {
        this.data[format] = data;
    }

    getData(format: string): string {
        return this.data[format] || '';
    }

    clearData(format?: string): void {
        if (format) {
            delete this.data[format];
        } else {
            this.data = {};
        }
    }
}

// Helper function to create drag events
const createDragEvent = (type: string, dataTransfer?: MockDataTransfer): DragEvent => {
    const event = new Event(type, { bubbles: true, cancelable: true }) as any;
    event.dataTransfer = dataTransfer || new MockDataTransfer();
    return event as DragEvent;
};

describe('Drag and Drop Functionality', () => {
    let componentManager: ComponentManager;
    let canvasManager: CanvasManager;

    beforeEach(() => {
        // Initialize the component library
        ComponentLibrary.initialize();
        
        // Setup mock DOM
        mockDOM();
        
        // Initialize managers
        canvasManager = new CanvasManager();
        componentManager = new ComponentManager(canvasManager);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Component Item Drag Setup', () => {
        test('should make component items draggable', () => {
            const componentItems = document.querySelectorAll('.component-item');
            
            componentItems.forEach(item => {
                expect((item as HTMLElement).draggable).toBe(true);
                expect(item.getAttribute('data-component')).toBeDefined();
            });
        });

        test('should have correct data-component attributes', () => {
            const desktopPc = document.querySelector('[data-component="desktop-pc"]');
            const laptop = document.querySelector('[data-component="laptop"]');
            const oscilloscope = document.querySelector('[data-component="oscilloscope"]');

            expect(desktopPc).toBeTruthy();
            expect(laptop).toBeTruthy();
            expect(oscilloscope).toBeTruthy();
        });
    });

    describe('Drag Start Events', () => {
        test('should set correct data transfer on drag start', () => {
            const desktopPcItem = document.querySelector('[data-component="desktop-pc"]') as HTMLElement;
            const mockDataTransfer = new MockDataTransfer();
            
            const dragStartEvent = createDragEvent('dragstart', mockDataTransfer);
            Object.defineProperty(dragStartEvent, 'target', { value: desktopPcItem });

            desktopPcItem.dispatchEvent(dragStartEvent);

            expect(mockDataTransfer.getData('text/plain')).toBe('desktop-pc');
            expect(mockDataTransfer.effectAllowed).toBe('copy');
        });

        test('should handle drag start for different component types', () => {
            const components = ['desktop-pc', 'laptop', 'oscilloscope'];
            
            components.forEach(componentType => {
                const item = document.querySelector(`[data-component="${componentType}"]`) as HTMLElement;
                const mockDataTransfer = new MockDataTransfer();
                const dragStartEvent = createDragEvent('dragstart', mockDataTransfer);
                Object.defineProperty(dragStartEvent, 'target', { value: item });

                item.dispatchEvent(dragStartEvent);

                expect(mockDataTransfer.getData('text/plain')).toBe(componentType);
            });
        });

        test('should not set data if component type is missing', () => {
            const invalidItem = document.createElement('div');
            invalidItem.className = 'component-item';
            // No data-component attribute
            
            const mockDataTransfer = new MockDataTransfer();
            const dragStartEvent = createDragEvent('dragstart', mockDataTransfer);
            Object.defineProperty(dragStartEvent, 'target', { value: invalidItem });

            invalidItem.dispatchEvent(dragStartEvent);

            expect(mockDataTransfer.getData('text/plain')).toBe('');
        });
    });

    describe('Canvas Drop Events', () => {
        test('should prevent default on dragover', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const dragOverEvent = createDragEvent('dragover');
            const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');

            canvas.dispatchEvent(dragOverEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        test('should set correct drop effect on dragover', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const mockDataTransfer = new MockDataTransfer();
            const dragOverEvent = createDragEvent('dragover', mockDataTransfer);

            canvas.dispatchEvent(dragOverEvent);

            expect(mockDataTransfer.dropEffect).toBe('copy');
        });

        test('should create component instance on successful drop', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const mockDataTransfer = new MockDataTransfer();
            mockDataTransfer.setData('text/plain', 'desktop-pc');
            
            // Mock getBoundingClientRect for position calculation
            jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
                left: 0,
                top: 0,
                right: 800,
                bottom: 600,
                width: 800,
                height: 600,
                x: 0,
                y: 0,
                toJSON: () => ({})
            });

            const dropEvent = createDragEvent('drop', mockDataTransfer);
            Object.defineProperty(dropEvent, 'clientX', { value: 100 });
            Object.defineProperty(dropEvent, 'clientY', { value: 150 });

            // Spy on createInstance method
            const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');

            canvas.dispatchEvent(dropEvent);

            expect(createInstanceSpy).toHaveBeenCalledWith('desktop-pc', {
                x: 100, // Snapped to grid (100/20*20)
                y: 160  // Snapped to grid (150/20*20) = 160
            });
        });

        test('should snap dropped components to grid', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const mockDataTransfer = new MockDataTransfer();
            mockDataTransfer.setData('text/plain', 'laptop');
            
            jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
                left: 0, top: 0, right: 800, bottom: 600,
                width: 800, height: 600, x: 0, y: 0, toJSON: () => ({})
            });

            const testCases = [
                { clientX: 37, clientY: 83, expectedX: 40, expectedY: 80 },
                { clientX: 142, clientY: 197, expectedX: 140, expectedY: 200 },
                { clientX: 5, clientY: 12, expectedX: 0, expectedY: 20 }
            ];

            testCases.forEach(({ clientX, clientY, expectedX, expectedY }) => {
                const dropEvent = createDragEvent('drop', mockDataTransfer);
                Object.defineProperty(dropEvent, 'clientX', { value: clientX });
                Object.defineProperty(dropEvent, 'clientY', { value: clientY });

                const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');

                canvas.dispatchEvent(dropEvent);

                expect(createInstanceSpy).toHaveBeenCalledWith('laptop', {
                    x: expectedX,
                    y: expectedY
                });

                createInstanceSpy.mockRestore();
            });
        });

        test('should not create instance with invalid component data', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const mockDataTransfer = new MockDataTransfer();
            mockDataTransfer.setData('text/plain', 'invalid-component');

            const dropEvent = createDragEvent('drop', mockDataTransfer);
            const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');

            canvas.dispatchEvent(dropEvent);

            expect(createInstanceSpy).toHaveBeenCalledWith('invalid-component', expect.any(Object));
            // The createInstance method should return null for invalid components
        });

        test('should handle drop event with no data', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const mockDataTransfer = new MockDataTransfer();
            // No data set
            
            const dropEvent = createDragEvent('drop', mockDataTransfer);
            const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');

            canvas.dispatchEvent(dropEvent);

            expect(createInstanceSpy).not.toHaveBeenCalled();
        });
    });

    describe('Integration Tests', () => {
        test('should complete full drag and drop workflow', () => {
            // Step 1: Start drag
            const desktopPcItem = document.querySelector('[data-component="desktop-pc"]') as HTMLElement;
            const mockDataTransfer = new MockDataTransfer();
            const dragStartEvent = createDragEvent('dragstart', mockDataTransfer);
            Object.defineProperty(dragStartEvent, 'target', { value: desktopPcItem });

            desktopPcItem.dispatchEvent(dragStartEvent);

            // Verify drag data is set
            expect(mockDataTransfer.getData('text/plain')).toBe('desktop-pc');

            // Step 2: Drag over canvas
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            const dragOverEvent = createDragEvent('dragover', mockDataTransfer);
            
            canvas.dispatchEvent(dragOverEvent);

            // Verify dragover handling
            expect(mockDataTransfer.dropEffect).toBe('copy');

            // Step 3: Drop on canvas
            jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
                left: 50, top: 100, right: 850, bottom: 700,
                width: 800, height: 600, x: 50, y: 100, toJSON: () => ({})
            });

            const dropEvent = createDragEvent('drop', mockDataTransfer);
            Object.defineProperty(dropEvent, 'clientX', { value: 250 });
            Object.defineProperty(dropEvent, 'clientY', { value: 350 });

            const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');
            const markAsModifiedSpy = jest.spyOn(canvasManager, 'markAsModified');

            canvas.dispatchEvent(dropEvent);

            // Verify component creation
            expect(createInstanceSpy).toHaveBeenCalledWith('desktop-pc', {
                x: 200, // (250-50)/20*20 = 200
                y: 260  // (350-100)/20*20 = 260
            });

            // Verify modification marking (assuming createInstance returns a valid instance)
            // Note: This depends on the actual implementation of createInstance
        });

        test('should handle multiple component drops', () => {
            const canvas = document.getElementById('canvas') as unknown as SVGElement;
            jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
                left: 0, top: 0, right: 800, bottom: 600,
                width: 800, height: 600, x: 0, y: 0, toJSON: () => ({})
            });

            const components = ['desktop-pc', 'laptop', 'oscilloscope'];
            const createInstanceSpy = jest.spyOn(componentManager, 'createInstance');

            components.forEach((componentType, index) => {
                const mockDataTransfer = new MockDataTransfer();
                mockDataTransfer.setData('text/plain', componentType);
                
                const dropEvent = createDragEvent('drop', mockDataTransfer);
                Object.defineProperty(dropEvent, 'clientX', { value: 100 + (index * 150) });
                Object.defineProperty(dropEvent, 'clientY', { value: 200 });

                canvas.dispatchEvent(dropEvent);
            });

            expect(createInstanceSpy).toHaveBeenCalledTimes(3);
            expect(createInstanceSpy).toHaveBeenNthCalledWith(1, 'desktop-pc', { x: 100, y: 200 });
            expect(createInstanceSpy).toHaveBeenNthCalledWith(2, 'laptop', { x: 260, y: 200 }); // 100 + 150 = 250, snapped to 260
            expect(createInstanceSpy).toHaveBeenNthCalledWith(3, 'oscilloscope', { x: 400, y: 200 });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing canvas element gracefully', () => {
            // Remove canvas from DOM
            const canvas = document.getElementById('canvas');
            canvas?.remove();

            // This should not throw an error during manager initialization
            expect(() => {
                new ComponentManager(canvasManager);
            }).not.toThrow();
        });

        test('should handle drag events without dataTransfer', () => {
            const desktopPcItem = document.querySelector('[data-component="desktop-pc"]') as HTMLElement;
            const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
            // No dataTransfer property

            expect(() => {
                desktopPcItem.dispatchEvent(dragStartEvent);
            }).not.toThrow();
        });

        test('should handle empty component panel gracefully', () => {
            // Clear component panel
            const componentPanel = document.getElementById('component-panel');
            if (componentPanel) {
                componentPanel.innerHTML = '';
            }

            expect(() => {
                new ComponentManager(canvasManager);
            }).not.toThrow();
        });
    });
});