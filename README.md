# Hardware Setup Visualizer

A desktop application for creating visual representations of hardware test setups, built with Electron and TypeScript.

## Features

- **Drag & Drop Interface**: Intuitive Visio-like layout with component library and canvas
- **Hardware Components**: Pre-defined components including computers, laptops, oscilloscopes, multimeters, power supplies, and microcontroller boards
- **Cable Connections**: Support for different cable types (Power, D-Sub9, USB-A to USB-C, etc.) with visual connector representations
- **Project Management**: Save and load projects as `.hvp` files
- **Image Export**: Export diagrams as PNG images for inclusion in test documentation
- **Properties Panel**: Edit component properties and positions
- **Zoom & Pan**: Navigate large diagrams with zoom controls
- **Grid Snapping**: Automatic alignment for clean layouts

## Requirements

- Windows 10/11 (primary target)
- Node.js 16+ 
- npm or yarn

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HardwareSetupVisualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

## Usage

### Creating a Hardware Setup

1. **Add Components**: Drag components from the left panel to the canvas
2. **Position Components**: Use drag & drop or the properties panel to position elements
3. **Connect with Cables**: Select the cable tool and click on component connectors to create connections
4. **Save Project**: Use File > Save to store your work as a `.hvp` file
5. **Export Image**: Use File > Export to create PNG images for documentation

### Component Types

- **Computers**: Desktop PCs, Laptops with standard connectors (Power, USB, Ethernet)
- **Measurement Equipment**: Oscilloscopes, Multimeters with probe connections
- **Power**: Power supplies with AC input and DC outputs
- **Embedded**: Microcontroller boards with GPIO and communication interfaces

### Cable Types

- **Power Cable (IEC C14)**: Standard AC power connections
- **D-Sub9 Cable**: Serial communications
- **D-Sub9 Y-Cable**: Split serial connections  
- **USB-A to USB-C**: Modern USB connections
- **Custom Cable**: Generic connections for special cases

## Architecture

The application follows Electron's security best practices with process isolation:

- **Main Process** (`src/main.ts`): Window management, file I/O, and system integration
- **Renderer Process** (`src/renderer/`): UI and application logic
- **Preload Script** (`src/preload.ts`): Secure IPC bridge between processes

### Key Components

- **ComponentManager**: Handles component library and instance management
- **CanvasManager**: Manages the SVG canvas, zoom, and selection
- **CableManager**: Creates and manages cable connections between components
- **ProjectManager**: Handles project serialization and file operations
- **UIManager**: Coordinates user interface interactions

## Testing

The application includes comprehensive testing:

- **Unit Tests**: Jest-based tests for core logic
  ```bash
  npm test
  ```

- **End-to-End Tests**: Playwright tests for UI functionality
  ```bash
  npm run test:e2e
  ```

## Building & Distribution

### Development Build
```bash
npm run build
npm start
```

### Production Package
```bash
npm run package
```

This creates platform-specific installers in the `release/` directory.

### Supported Platforms

- Windows (NSIS installer)
- Linux (AppImage)
- macOS (DMG) - if built on macOS

## File Format

Projects are saved as JSON files with `.hvp` extension:

```json
{
  "version": "1.0.0",
  "components": [...],
  "cables": [...],
  "metadata": {
    "name": "Test Setup 1",
    "description": "USB communication test",
    "created": "2026-01-17T...",
    "modified": "2026-01-17T..."
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details