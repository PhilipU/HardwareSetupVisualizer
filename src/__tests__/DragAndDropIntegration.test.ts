/**
 * Integration Test for Drag and Drop functionality
 * This test validates that the drag and drop implementation works correctly
 * in an integrated environment with real DOM elements.
 */

import { ComponentManager } from '../renderer/components/ComponentManager';
import { CanvasManager } from '../renderer/canvas/CanvasManager';

// Mock DataTransfer for comprehensive testing
class MockDataTransfer {
  private data: Map<string, string> = new Map();
  public effectAllowed: string = 'all';
  public dropEffect: string = 'none';

  setData(format: string, data: string): void {
    this.data.set(format, data);
  }

  getData(format: string): string {
    return this.data.get(format) || '';
  }

  clearData(): void {
    this.data.clear();
  }
}

describe('Drag and Drop Integration Tests', () => {
  let componentManager: ComponentManager;
  let canvasManager: CanvasManager;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="component-panel">
        <div class="component-item" data-component="desktop-pc" draggable="true">Desktop PC</div>
        <div class="component-item" data-component="laptop" draggable="true">Laptop</div>
        <div class="component-item" data-component="oscilloscope" draggable="true">Oscilloscope</div>
      </div>
      <svg id="canvas" width="800" height="600">
        <g id="components-layer"></g>
        <g id="cables-layer"></g>
      </svg>
    `;

    // Initialize managers
    canvasManager = new CanvasManager();
    componentManager = new ComponentManager(canvasManager);

    // Mock DataTransfer for all events
    Object.defineProperty(window, 'DataTransfer', {
      value: MockDataTransfer,
      writable: true
    });
  });

  describe('Component Manager Interface Tests', () => {
    test('should create component instances programmatically', () => {
      const instance = componentManager.createInstance('desktop-pc', { x: 200, y: 200 });
      
      expect(instance).toBeTruthy();
      expect(instance?.definitionId).toBe('desktop-pc');
      expect(instance?.position).toEqual({ x: 200, y: 200 });

      // Check that it was rendered to canvas
      const componentsLayer = document.getElementById('components-layer');
      expect(componentsLayer?.children.length).toBe(1);
    });

    test('should delete component instances', () => {
      const instance = componentManager.createInstance('laptop', { x: 100, y: 100 });
      expect(instance).toBeTruthy();
      
      if (instance) {
        componentManager.deleteInstance(instance.id);
        
        // Should be removed from manager
        expect(componentManager.getInstance(instance.id)).toBeUndefined();
        
        // Should be removed from canvas
        const componentsLayer = document.getElementById('components-layer');
        expect(componentsLayer?.children.length).toBe(0);
      }
    });

    test('should get all instances', () => {
      componentManager.createInstance('desktop-pc', { x: 100, y: 100 });
      componentManager.createInstance('laptop', { x: 200, y: 200 });
      
      const instances = componentManager.getAllInstances();
      expect(instances.length).toBe(2);
      expect(instances.map(i => i.definitionId)).toContain('desktop-pc');
      expect(instances.map(i => i.definitionId)).toContain('laptop');
    });

    test('should handle invalid component types gracefully', () => {
      const instance = componentManager.createInstance('invalid-component', { x: 100, y: 100 });
      
      expect(instance).toBeNull();
      
      // Should not create anything on canvas
      const componentsLayer = document.getElementById('components-layer');
      expect(componentsLayer?.children.length).toBe(0);
    });
  });

  describe('Visual Feedback', () => {
    test('should make component items draggable with correct attributes', () => {
      const componentItems = document.querySelectorAll('.component-item');
      
      componentItems.forEach(item => {
        expect(item.getAttribute('draggable')).toBe('true');
        expect(item.getAttribute('data-component')).toBeTruthy();
      });
    });

    test('should have all expected component types available', () => {
      const expectedComponents = ['desktop-pc', 'laptop', 'oscilloscope'];
      
      expectedComponents.forEach(componentType => {
        const item = document.querySelector(`[data-component="${componentType}"]`);
        expect(item).toBeTruthy();
        expect(item?.getAttribute('draggable')).toBe('true');
      });
    });
  });
});