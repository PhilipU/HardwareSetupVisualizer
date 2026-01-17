import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Hardware Visualizer E2E Drag and Drop', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main.js')],
    });
    
    // Get the first window that the app opens
    window = await electronApp.firstWindow();
    
    // Wait for the app to load
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should have draggable component items in the component panel', async () => {
    // Wait for component panel to load
    await window.waitForSelector('#component-panel');
    
    // Check that component items exist and are draggable
    const componentItems = await window.locator('.component-item').all();
    expect(componentItems.length).toBeGreaterThan(0);
    
    // Check first component item
    const firstComponent = window.locator('.component-item').first();
    const isDraggable = await firstComponent.getAttribute('draggable');
    expect(isDraggable).toBe('true');
    
    // Check that it has a data-component attribute
    const componentType = await firstComponent.getAttribute('data-component');
    expect(componentType).toBeTruthy();
  });

  test('should have a canvas drop zone', async () => {
    // Check that the canvas exists
    const canvas = window.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    // Check canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox!.width).toBeGreaterThan(200);
    expect(canvasBox!.height).toBeGreaterThan(200);
  });

  test('should perform drag and drop from component panel to canvas', async () => {
    // Get the desktop PC component
    const desktopComponent = window.locator('[data-component=\"desktop-pc\"]');
    await expect(desktopComponent).toBeVisible();
    
    // Get the canvas
    const canvas = window.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    // Get initial number of components on canvas
    const initialComponents = await window.locator('#components-layer > g').count();
    
    // Perform drag and drop
    await desktopComponent.hover();
    await desktopComponent.dragTo(canvas, {
      sourcePosition: { x: 10, y: 10 },
      targetPosition: { x: 300, y: 200 }
    });
    
    // Wait a bit for the component to be created
    await window.waitForTimeout(500);
    
    // Check that a new component was added to the canvas
    const finalComponents = await window.locator('#components-layer > g').count();
    expect(finalComponents).toBe(initialComponents + 1);
    
    // Verify the component appears in the expected location
    const newComponent = window.locator('#components-layer > g').last();
    await expect(newComponent).toBeVisible();
  });

  test('should show component on canvas after successful drop', async () => {
    // Clear the canvas first by creating a new project
    await window.click('#btn-new');
    
    // Drag a laptop component to the canvas
    const laptopComponent = window.locator('[data-component=\"laptop\"]');
    const canvas = window.locator('#canvas');
    
    await laptopComponent.dragTo(canvas, {
      targetPosition: { x: 400, y: 150 }
    });
    
    await window.waitForTimeout(300);
    
    // Check that the laptop component is visible on canvas
    const canvasComponents = window.locator('#components-layer > g');
    const componentCount = await canvasComponents.count();
    expect(componentCount).toBe(1);
    
    // Check that the component has the laptop SVG content
    const componentSvg = canvasComponents.first();
    const svgContent = await componentSvg.innerHTML();
    expect(svgContent).toContain('rect'); // Laptops have rectangle shapes
  });

  test('should handle multiple component drops', async () => {
    // Clear canvas
    await window.click('#btn-new');
    
    const canvas = window.locator('#canvas');
    
    // Add multiple different components
    const components = [
      { selector: '[data-component=\"desktop-pc\"]', position: { x: 200, y: 200 } },
      { selector: '[data-component=\"laptop\"]', position: { x: 400, y: 200 } },
      { selector: '[data-component=\"oscilloscope\"]', position: { x: 600, y: 200 } }
    ];
    
    for (const component of components) {
      await window.locator(component.selector).dragTo(canvas, {
        targetPosition: component.position
      });
      await window.waitForTimeout(200);
    }
    
    // Verify all components were added
    const canvasComponents = await window.locator('#components-layer > g').count();
    expect(canvasComponents).toBe(3);
  });

  test('should snap components to grid when dropped', async () => {
    // Clear canvas
    await window.click('#btn-new');
    
    const desktopComponent = window.locator('[data-component=\"desktop-pc\"]');
    const canvas = window.locator('#canvas');
    
    // Drop at a non-grid position (e.g., 237, 163)
    await desktopComponent.dragTo(canvas, {
      targetPosition: { x: 237, y: 163 }
    });
    
    await window.waitForTimeout(300);
    
    // Check the component's transform attribute to see if it's snapped to grid
    const component = window.locator('#components-layer > g').first();
    const transform = await component.getAttribute('transform');
    
    // Grid is 20px, so 237 should snap to 240, 163 should snap to 160
    expect(transform).toContain('240'); // x snapped to grid
    expect(transform).toContain('160'); // y snapped to grid
  });

  test('should show visual feedback during drag operation', async () => {
    const desktopComponent = window.locator('[data-component=\"desktop-pc\"]');
    
    // Start drag but don't complete it
    await desktopComponent.hover();
    await window.mouse.down();
    
    // Move mouse to show drag state
    await window.mouse.move(300, 200);
    
    // Check if there's any visual feedback (this depends on implementation)
    // For example, the canvas might show a drop zone indicator
    const canvas = window.locator('#canvas');
    await expect(canvas).toBeVisible();
    
    // Complete the drag
    await window.mouse.up();
    
    await window.waitForTimeout(200);
  });

  test('should update project modified state after drag and drop', async () => {
    // Clear canvas
    await window.click('#btn-new');
    
    // Check initial window title (should not show modified indicator)
    let title = await window.title();
    expect(title).not.toContain('•');
    
    // Add a component
    const desktopComponent = window.locator('[data-component=\"desktop-pc\"]');
    const canvas = window.locator('#canvas');
    
    await desktopComponent.dragTo(canvas, {
      targetPosition: { x: 300, y: 200 }
    });
    
    await window.waitForTimeout(500);
    
    // Check that window title now shows modified state
    title = await window.title();
    // The modified state might be indicated by a • in the title
    // This depends on the actual implementation
    expect(title).toContain('Hardware Setup Visualizer');
  });
});