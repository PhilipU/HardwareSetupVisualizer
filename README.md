# FL3X Hardware Setup Visualizer

A professional web-based tool for visualizing FL3X automotive electronics test setups and component connections with advanced interaction features.

## Features

### **Core Functionality**
- **FL3X Component Library**: Specialized automotive electronics components with realistic SVG graphics
- **Professional Interface**: FL3X-branded styling with modern gradients and shadows
- **Drag & Drop**: Intuitive component placement from the toolbox to canvas
- **Precision Wire Creation**: Click-based wire connections between specific connector points
- **Canvas Navigation**: Smooth zoom (scroll wheel) and pan (middle-click drag) functionality

### **Advanced Interactions**
- **Component Selection**: Right-click any component to access context menu
- **Component Mirroring**: Flip connector layouts to opposite sides via context menu
- **Precise Connection Targeting**: Distance-based connector selection for accurate wire placement
- **Wire Management**: 
  - Visual wire selection and highlighting
  - Double-click wires to delete them
  - Keyboard shortcuts (Delete/Backspace) for wire removal
- **Component Labeling**: Toggle connection point names and color-coded connector types

### **Professional Features**
- **High-DPI Support**: Crisp rendering on all display types
- **SVG Graphics**: Professional component representations with detailed styling
- **Color-Coded Connectors**:
  - 🔴 **Red**: Power connections
  - ⚫ **Black**: Ground connections  
  - 🟣 **Purple**: Data/Digital signals
  - 🔵 **Blue**: Ethernet connections
  - 🟢 **Green**: Analog inputs
- **Persistent Storage**: Save/load complete setups including component positions and connections

## FL3X Components

### **Power & Measurement**
- **Power Supply**: Professional bench power supply with DC output
- **Oscilloscope**: Dual-channel measurement device (CH1/CH2 inputs)
- **Multimeter**: Digital multimeter with COM and V/A connections

### **FL3X Product Line**
- **FL3X Media 100BASE-T1**: Automotive Ethernet media converter (T1 ↔ TX, PWR)
- **FL3X Device-L² Gen 3**: Vehicle ECU with multiple I/O interfaces:
  - **Left Side**: PWR, ETH, DIO, AIN connections
  - **Right Side**: CON1-CON5 data connections

## How to Use

### **Basic Operations**
1. **Open** `index.html` in a modern web browser
2. **Drag** components from the left toolbox onto the canvas
3. **Create Wires**: Click on any connector point, then click on target connector
4. **Navigate**: Use scroll wheel to zoom, middle-click and drag to pan
5. **Move Components**: Click and drag components to reposition them

### **Advanced Features**
- **Mirror Components**: Right-click component → "🔄 Mirror" to flip connector sides
- **Toggle Labels**: Use "Show Labels" checkbox to display connector names
- **Wire Selection**: Click on wires to select them (highlighted in red)
- **Delete Items**: Select component/wire and press Delete key
- **Save/Load**: Export setups as JSON files for later use

### **Professional Workflow**
1. **Plan Layout**: Place power supplies and measurement devices first
2. **Add FL3X Components**: Position media converters and devices strategically  
3. **Create Power Connections**: Connect red power connectors first
4. **Add Data Paths**: Wire signal connections between components
5. **Document Setup**: Use connector labels to verify connections
6. **Save Configuration**: Export for reuse in similar test scenarios

## Technical Implementation

### **Architecture**
- **HTML5 Canvas**: High-performance rendering with zoom/pan transformations
- **ES6 JavaScript**: Modern class-based architecture with event handling
- **JSON Configuration**: Flexible component definitions with connection specifications
- **SVG Integration**: Scalable graphics with dual caching system

### **Key Features**
- **Coordinate System**: Precise mouse-to-canvas coordinate transformation
- **Connection Logic**: Distance-based connector detection with exact positioning
- **Wire Routing**: Bézier curve rendering with visual feedback
- **Component System**: Deep-copy instances preventing shared reference issues

## File Structure

```
├── index.html           # Main application interface
├── styles.css          # FL3X professional styling
├── script.js           # Core visualization engine  
├── components.json     # FL3X component definitions
└── svg/               # Component graphics
    ├── power-supply.svg
    ├── oscilloscope.svg  
    ├── multimeter.svg
    ├── fl3x-media.svg
    └── fl3x-device.svg
```

## Browser Compatibility

- **Recommended**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Requirements**: HTML5 Canvas, ES6 JavaScript, SVG support
- **Performance**: Optimized for desktop browsers with mouse/trackpad input

## FL3X Integration

This tool is designed specifically for FL3X automotive electronics testing workflows, featuring authentic component representations and connector layouts that match real FL3X hardware specifications.