# Hardware Setup Visualizer

A simple web-based tool for visualizing hardware test setups and component connections.

## Features

- **Component Toolbox**: Drag and drop hardware components from the left panel
- **Visual Canvas**: Place components freely on the canvas with a grid background
- **Wire Connections**: Click and drag between component connection points to create wires
- **Save/Load**: Export and import your setup configurations as JSON files
- **Interactive Elements**: 
  - Select and move components around
  - Delete components with the Delete key
  - Double-click wires to remove them
  - Clear entire canvas

## How to Use

1. **Open** `index.html` in a web browser
2. **Drag** components from the toolbox on the left to the canvas
3. **Connect** components by clicking on the red connection points and dragging to another component's connection point
4. **Move** components by clicking and dragging them
5. **Save** your setup using the "Save Setup" button (downloads as JSON)
6. **Load** previous setups using the "Load Setup" button

## Components Available

- CPU (Central Processing Unit)
- RAM (Random Access Memory)  
- GPU (Graphics Processing Unit)
- HDD (Hard Disk Drive)
- SSD (Solid State Drive)
- PSU (Power Supply Unit)
- Motherboard
- Monitor
- Keyboard & Mouse
- Network components (Router, Switch)
- Server systems

## File Structure

- `index.html` - Main application page
- `styles.css` - Styling and layout
- `script.js` - JavaScript functionality
- `components.json` - Component definitions and properties

## Browser Compatibility

Works with modern browsers that support HTML5 Canvas and ES6 JavaScript.