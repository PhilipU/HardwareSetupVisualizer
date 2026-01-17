# Hardware Setup Visualizer

A desktop application built with Electron for visualizing and designing hardware component setups.

## Features

- Drag and drop hardware components onto a canvas
- Visual component properties panel  
- Standard Electron desktop application with native menus
- Cross-platform support (Windows, macOS, Linux)
- Modern UI with responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PhilipU/HardwareSetupVisualizer.git
cd HardwareSetupVisualizer
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the application in development mode:
```bash
npm run dev
```

### Building

Build the application for your current platform:
```bash
npm run build
```

Build for specific platforms:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

## Project Structure

```
HardwareSetupVisualizer/
├── src/
│   ├── main.js              # Main process
│   ├── preload.js           # Preload script
│   └── renderer/
│       ├── index.html       # Main window HTML
│       ├── styles/
│       │   └── main.css     # Application styles
│       └── js/
│           └── renderer.js  # Renderer process logic
├── assets/                  # Application icons and resources
├── dist/                    # Built application output
├── package.json            # Project configuration
└── README.md              # This file
```

## Scripts

- `npm start` - Start the application
- `npm run dev` - Start in development mode with DevTools
- `npm run build` - Build for current platform
- `npm run pack` - Package without building installer
- `npm run dist` - Build and create distribution files

## License

MIT License - see LICENSE file for details