// Setup file for Jest tests
import 'jest-canvas-mock';

// This file is a setup file, not a test file
// Jest setup files don't need test cases

// Mock Electron APIs
const mockElectronAPI = {
  newProject: jest.fn(),
  openProject: jest.fn(),
  saveProject: jest.fn(),
  saveProjectAs: jest.fn(),
  exportImage: jest.fn(),
  getCurrentProjectPath: jest.fn(),
  setProjectModified: jest.fn(),
  onNewProject: jest.fn(),
  onLoadProject: jest.fn(),
  onProjectSaved: jest.fn(),
  onGetProjectData: jest.fn(),
  onHasUnsavedChanges: jest.fn(),
  onExportImage: jest.fn(),
  sendProjectData: jest.fn(),
  sendUnsavedChangesResponse: jest.fn(),
};

// Add electronAPI to global window
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock SVG methods that might not be available in jsdom
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  value: jest.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }),
  writable: true,
});

Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
  value: jest.fn().mockReturnValue(100),
  writable: true,
});

// Mock getBoundingClientRect for all elements
Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

// Suppress console.log in tests unless needed
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Add a dummy export to make TypeScript happy
export {};