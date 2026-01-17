# Requirements for Hardware Setup Visualizer

## Description

This application helps quality assurance employees create a visualization of a hardware test setup. The created visualization can then be exported as an image and included in test descriptions. A hardware setup can contain computers, laptops, embedded devices, measurement hardware such as oscilloscopes, cables between devices, power supplies, and more.
It is difficult to describe such a setup with text, which is why a good visualization in the form of an image helps clarify the setup for an untrained test executor.

## Requirements

- This application is written in TypeScript
- This is a desktop application
- It must run at least on Windows (but not exclusively)
- Each feature must be covered by functional tests (UI testing)
- Internal code must be tested by unit tests
- The application can save its current project
- The application can restore a saved project
- The basic layout of the application is like Microsoft Visio
- There is a left pane to select the components
- There is a canvas to show the hardware setup
- Components can be moved via drag and drop to the canvas
- Components are visualized with SVG images
- Components can be connected by cables
- Each component can have multiple connectors for different cables
    - e.g., a computer has a power connector for IEC C14 connector and a USB-A port
- There are different types of cables:
    - Power Cable (IEC C14)
    - D-Sub9 Cable
    - D-Sub9 Y-Cable
    - USB-A to USB-C cable
- The connectors at the end should be shown as such to make it easy for the user of the generated image to differentiate the visualized cable