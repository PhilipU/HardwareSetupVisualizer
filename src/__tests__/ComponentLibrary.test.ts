import { ComponentLibrary } from '../renderer/components/ComponentLibrary';

describe('ComponentLibrary', () => {
    beforeEach(() => {
        // Initialize the component library
        ComponentLibrary.initialize();
    });

    test('should initialize with default components', () => {
        const definitions = ComponentLibrary.getAllDefinitions();
        expect(definitions.length).toBeGreaterThan(0);
    });

    test('should retrieve component definition by ID', () => {
        const definition = ComponentLibrary.getDefinition('desktop-pc');
        expect(definition).toBeDefined();
        expect(definition!.name).toBe('Desktop PC');
        expect(definition!.category).toBe('computers');
    });

    test('should retrieve components by category', () => {
        const computers = ComponentLibrary.getDefinitionsByCategory('computers');
        expect(computers.length).toBeGreaterThanOrEqual(2);
        
        const computerIds = computers.map(c => c.id);
        expect(computerIds).toContain('desktop-pc');
        expect(computerIds).toContain('laptop');
    });

    test('should have valid component structure', () => {
        const definition = ComponentLibrary.getDefinition('oscilloscope');
        expect(definition).toBeDefined();
        expect(definition!.connectors).toBeDefined();
        expect(definition!.connectors.length).toBeGreaterThan(0);
        expect(definition!.svgContent).toBeDefined();
        expect(definition!.width).toBeGreaterThan(0);
        expect(definition!.height).toBeGreaterThan(0);
    });

    test('should have connectors with required properties', () => {
        const definition = ComponentLibrary.getDefinition('desktop-pc');
        const connector = definition!.connectors[0];
        
        expect(connector.id).toBeDefined();
        expect(connector.type).toBeDefined();
        expect(connector.position).toBeDefined();
        expect(connector.position.x).toBeDefined();
        expect(connector.position.y).toBeDefined();
        expect(connector.label).toBeDefined();
    });

    test('should register new component', () => {
        const customComponent = {
            id: 'test-component',
            name: 'Test Component',
            category: 'test',
            width: 50,
            height: 50,
            connectors: [],
            svgContent: '<rect width="50" height="50" fill="red"/>',
            properties: {}
        };

        ComponentLibrary.registerComponent(customComponent);
        
        const retrieved = ComponentLibrary.getDefinition('test-component');
        expect(retrieved).toEqual(customComponent);
    });
});