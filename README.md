# ScenePlotter

**ScenePlotter** (ProStage Plotter) is a web-based technical drawing tool designed for live sound engineers, stage managers, and event technicians. It allows users to create precise stage plots, manage equipment placement, and visualize complex cabling systems (XLR, Jack, Power, AES, DMX) with real-world scale accuracy.

## Key Features

- **Scalable Stage Canvas**: Define custom stage dimensions in centimeters and work on a grid-snapped interface.
- **Rich Asset Library**: Includes a variety of instruments (Drums, Guitars, Piano), microphones (SM58, SM57), audio gear (DL32, M32R, D.I. boxes), and power distribution tools.
- **Advanced Cabling System**:
  - Visual distinction between signal types (XLR, Jack, Electricity, RJ45/AES, DMX).
  - Orthogonal or direct routing modes.
  - Automatic total length calculation for each cable.
  - Interactive anchor points for inputs and outputs on every piece of gear.
- **Note System**: Add text annotations to specify stage requirements.
- **Project Management**: Save and load your projects using the `.stage` file format or export the final plot as a PNG image for technical riders.

## Technical Stack

- **Core**: HTML5, CSS3, JavaScript (ES6).
- **Graphics**: [Konva.js](https://konva.org/) for 2D Canvas manipulation.
- **Export**: Html2Canvas for high-quality scene rendering.

## Getting Started

1. Open `index.html` in any modern web browser.
2. Set your stage dimensions in the right sidebar.
3. Add assets from the left library to the stage.
4. **To Create a Cable**: Hold `Ctrl` and drag from one anchor point to another.
5. **To Edit a Cable**: Double-click on a cable to create a new path point; right-click a point to remove it.

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Ctrl + C / V / X** | Copy, Paste, or Cut selected gear |
| **Ctrl + S** | Save project as `.stage` |
| **Ctrl + A** | Select all elements |
| **Ctrl + E** | Center the stage view |
| **Delete** | Remove selected element or cable |
| **Escape** | Deselect all |
| **Shift + Click** | Measure distance between two points |

## Upcoming Updates (Roadmap)

We are constantly improving ScenePlotter to meet professional standards. The following features are currently under development:

- **Cable Length Constraints**: Set physical limits on cable lengths to ensure the design remains realistic for the available inventory.
- **Make Ctrl + Z/Y finally work**

## License

This project is developed by Timothée D. All rights reserved.
