export interface ComponentConnector {
    id: string;
    type: 'power' | 'usb-a' | 'usb-c' | 'd-sub9' | 'ethernet' | 'custom';
    position: { x: number; y: number };
    label: string;
}

export interface ComponentDefinition {
    id: string;
    name: string;
    category: string;
    width: number;
    height: number;
    connectors: ComponentConnector[];
    svgContent: string;
    properties: Record<string, any>;
}

export interface ComponentInstance {
    id: string;
    definitionId: string;
    position: { x: number; y: number };
    rotation: number;
    properties: Record<string, any>;
    selected: boolean;
}

export class ComponentLibrary {
    private static definitions: Map<string, ComponentDefinition> = new Map();

    static initialize(): void {
        // Desktop PC
        this.registerComponent({
            id: 'desktop-pc',
            name: 'Desktop PC',
            category: 'computers',
            width: 100,
            height: 120,
            connectors: [
                { id: 'power', type: 'power', position: { x: 10, y: 100 }, label: 'Power' },
                { id: 'usb1', type: 'usb-a', position: { x: 30, y: 100 }, label: 'USB 1' },
                { id: 'usb2', type: 'usb-a', position: { x: 50, y: 100 }, label: 'USB 2' },
                { id: 'ethernet', type: 'ethernet', position: { x: 70, y: 100 }, label: 'Ethernet' },
            ],
            svgContent: `
                <rect x="10" y="20" width="80" height="60" fill="#333" stroke="#666" stroke-width="2" rx="5"/>
                <rect x="15" y="25" width="70" height="40" fill="#000"/>
                <rect x="25" y="85" width="50" height="20" fill="#666" stroke="#333" stroke-width="1"/>
                <circle cx="50" cy="95" r="3" fill="#00ff00"/>
                <text x="50" y="110" text-anchor="middle" fill="#333" font-size="8" font-family="Arial">Desktop PC</text>
            `,
            properties: {
                model: 'Generic PC',
                cpu: 'Intel i5',
                ram: '8GB',
                os: 'Windows 10'
            }
        });

        // Laptop
        this.registerComponent({
            id: 'laptop',
            name: 'Laptop',
            category: 'computers',
            width: 120,
            height: 80,
            connectors: [
                { id: 'power', type: 'power', position: { x: 10, y: 60 }, label: 'Power' },
                { id: 'usb1', type: 'usb-a', position: { x: 30, y: 60 }, label: 'USB 1' },
                { id: 'usb2', type: 'usb-c', position: { x: 50, y: 60 }, label: 'USB-C' },
            ],
            svgContent: `
                <rect x="10" y="25" width="100" height="50" fill="#333" stroke="#666" stroke-width="2" rx="5"/>
                <rect x="15" y="30" width="90" height="35" fill="#000"/>
                <rect x="5" y="75" width="110" height="8" fill="#666" stroke="#333" stroke-width="1" rx="2"/>
                <text x="60" y="90" text-anchor="middle" fill="#333" font-size="8" font-family="Arial">Laptop</text>
            `,
            properties: {
                model: 'Generic Laptop',
                cpu: 'Intel i7',
                ram: '16GB',
                os: 'Windows 11'
            }
        });

        // Oscilloscope
        this.registerComponent({
            id: 'oscilloscope',
            name: 'Oscilloscope',
            category: 'measurement',
            width: 140,
            height: 100,
            connectors: [
                { id: 'power', type: 'power', position: { x: 10, y: 80 }, label: 'Power' },
                { id: 'ch1', type: 'custom', position: { x: 120, y: 30 }, label: 'CH1' },
                { id: 'ch2', type: 'custom', position: { x: 120, y: 50 }, label: 'CH2' },
                { id: 'usb', type: 'usb-a', position: { x: 70, y: 80 }, label: 'USB' },
            ],
            svgContent: `
                <rect x="10" y="20" width="120" height="70" fill="#1e1e1e" stroke="#666" stroke-width="2" rx="5"/>
                <rect x="20" y="30" width="60" height="40" fill="#003300" stroke="#00ff00" stroke-width="1"/>
                <polyline points="25,50 35,40 45,60 55,45 65,50 75,40" fill="none" stroke="#00ff00" stroke-width="2"/>
                <circle cx="100" cy="40" r="6" fill="#333" stroke="#666"/>
                <circle cx="100" cy="60" r="6" fill="#333" stroke="#666"/>
                <text x="70" y="100" text-anchor="middle" fill="#333" font-size="8" font-family="Arial">Oscilloscope</text>
            `,
            properties: {
                model: 'Generic Scope',
                bandwidth: '100MHz',
                channels: 2,
                sampleRate: '1GSa/s'
            }
        });

        // Multimeter
        this.registerComponent({
            id: 'multimeter',
            name: 'Multimeter',
            category: 'measurement',
            width: 80,
            height: 120,
            connectors: [
                { id: 'com', type: 'custom', position: { x: 30, y: 100 }, label: 'COM' },
                { id: 'vohm', type: 'custom', position: { x: 50, y: 100 }, label: 'VΩmA' },
            ],
            svgContent: `
                <rect x="15" y="15" width="50" height="90" fill="#ffff00" stroke="#333" stroke-width="2" rx="8"/>
                <rect x="20" y="25" width="40" height="25" fill="#000"/>
                <text x="40" y="40" text-anchor="middle" fill="#00ff00" font-size="10" font-family="monospace">12.34</text>
                <circle cx="30" cy="65" r="8" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="50" cy="65" r="8" fill="none" stroke="#333" stroke-width="2"/>
                <line x1="25" y1="70" x2="35" y2="60" stroke="#333" stroke-width="2"/>
                <text x="40" y="115" text-anchor="middle" fill="#333" font-size="8" font-family="Arial">Multimeter</text>
            `,
            properties: {
                model: 'Generic DMM',
                accuracy: '±0.1%',
                maxVoltage: '1000V'
            }
        });

        // Power Supply
        this.registerComponent({
            id: 'power-supply',
            name: 'Power Supply',
            category: 'power',
            width: 120,
            height: 80,
            connectors: [
                { id: 'ac-input', type: 'power', position: { x: 10, y: 60 }, label: 'AC Input' },
                { id: 'dc-pos', type: 'custom', position: { x: 90, y: 30 }, label: '+' },
                { id: 'dc-neg', type: 'custom', position: { x: 110, y: 30 }, label: '-' },
            ],
            svgContent: `
                <rect x="15" y="20" width="90" height="50" fill="#666" stroke="#333" stroke-width="2" rx="3"/>
                <rect x="20" y="30" width="30" height="15" fill="#000" stroke="#666"/>
                <text x="35" y="40" text-anchor="middle" fill="#ff0000" font-size="8">24V</text>
                <circle cx="80" cy="37" r="6" fill="#ff0000"/>
                <circle cx="100" cy="37" r="6" fill="#000"/>
                <text x="80" y="55" text-anchor="middle" fill="#fff" font-size="10">+</text>
                <text x="100" y="55" text-anchor="middle" fill="#fff" font-size="10">-</text>
                <text x="60" y="75" text-anchor="middle" fill="#333" font-size="8" font-family="Arial">Power Supply</text>
            `,
            properties: {
                model: 'Generic PSU',
                voltage: '24V',
                current: '5A',
                power: '120W'
            }
        });

        // Microcontroller Board
        this.registerComponent({
            id: 'microcontroller',
            name: 'Microcontroller Board',
            category: 'embedded',
            width: 100,
            height: 80,
            connectors: [
                { id: 'usb', type: 'usb-c', position: { x: 10, y: 40 }, label: 'USB' },
                { id: 'power', type: 'power', position: { x: 90, y: 60 }, label: 'Power' },
                { id: 'gpio1', type: 'custom', position: { x: 90, y: 20 }, label: 'GPIO1' },
                { id: 'gpio2', type: 'custom', position: { x: 90, y: 40 }, label: 'GPIO2' },
            ],
            svgContent: `
                <rect x="15" y="15" width="70" height="50" fill="#0066cc" stroke="#004499" stroke-width="2" rx="3"/>
                <circle cx="25" cy="25" r="2" fill="#fff"/>
                <circle cx="75" cy="25" r="2" fill="#fff"/>
                <circle cx="25" cy="55" r="2" fill="#fff"/>
                <circle cx="75" cy="55" r="2" fill="#fff"/>
                <rect x="45" y="35" width="10" height="10" fill="#333"/>
                <!-- Pins -->
                <rect x="10" y="22" width="5" height="2" fill="#ffff00"/>
                <rect x="10" y="32" width="5" height="2" fill="#ffff00"/>
                <rect x="10" y="42" width="5" height="2" fill="#ffff00"/>
                <rect x="10" y="52" width="5" height="2" fill="#ffff00"/>
                <rect x="85" y="22" width="5" height="2" fill="#ffff00"/>
                <rect x="85" y="32" width="5" height="2" fill="#ffff00"/>
                <rect x="85" y="42" width="5" height="2" fill="#ffff00"/>
                <rect x="85" y="52" width="5" height="2" fill="#ffff00"/>
                <text x="50" y="75" text-anchor="middle" fill="#333" font-size="7" font-family="Arial">MCU Board</text>
            `,
            properties: {
                model: 'Generic MCU',
                cpu: 'ARM Cortex-M4',
                flash: '512KB',
                ram: '96KB'
            }
        });
    }

    static registerComponent(definition: ComponentDefinition): void {
        this.definitions.set(definition.id, definition);
    }

    static getDefinition(id: string): ComponentDefinition | undefined {
        return this.definitions.get(id);
    }

    static getAllDefinitions(): ComponentDefinition[] {
        return Array.from(this.definitions.values());
    }

    static getDefinitionsByCategory(category: string): ComponentDefinition[] {
        return Array.from(this.definitions.values())
            .filter(def => def.category === category);
    }
}

// Initialize the component library
ComponentLibrary.initialize();