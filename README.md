# RenderEngine4
*A High-performance, modular graphics engine for the modern web.*

## Overview
RenderEngine4 is a sophisticated, high-performance graphics engine built for the web. It provides a modular, component-based architecture designed to empower developers to create complex 2D and 3D environments with ease. By leveraging a robust system of "Parts" and "Systems," it solves the complexity of manual engine management, allowing you to focus on creating unique game mechanics and interactive experiences.

## Features
*   **Modular Component Architecture**: Compose complex behaviors using a flexible system of Parts (Input, Render, Sound, Transform).
*   **Multi-Renderer Support**: Seamlessly switch between Canvas and WebGL rendering contexts.
*   **Advanced Physics & Collision**: Integrated support for AABB, CABC, and Convex Hull collision models.
*   **Dynamic Particle System**: High-performance particle emitters and effects for explosions, sprays, and more.
*   **Robust Event System**: A centralized `EventEngine` to handle game logic and state changes efficiently.

## Tech Stack
*   **Languages**: JavaScript (ESM)
*   **Graphics APIs**: WebGL, Canvas API
*   **Styling**: CSS3
*   **Markup**: HTML5

## Getting Started
### Prerequisites
*   A modern web browser (Chrome, Firefox, Edge, or Safari)
*   A basic understanding of JavaScript

### Installation
Since this project is a client-side engine, no complex installation is required. You can include the engine directly in your project:

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/RenderEngine4.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd RenderEngine4
    ```

## Usage
To get started quickly, you can use the provided test pages or integrate the engine into your own HTML file.

### Using Chrome
You can play with the test pages by supplying a configuration argument to Chrome to allow local file access:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files
```
Then you can open any of the test index pages.

### Using Python
You can use Python to run a simple webserver from the root folder to access the tests:
```
python -m http.server 8080
```
Then you can navigate to `http://localhost:8080/` to see the test pages in action.



### Basic Integration
Import the core engine into your project:
```javascript
import { renderEngine4 } from './src/engine/renderEngine4.js';

const engineOptions = {
    // Your configuration here
};

renderEngine4(engineOptions);
```

## Contributing
Contributions are welcome! To contribute:
1.  Fork the repository.
2.  Create a feature branch.
3.  Submit a Pull Request with a clear description of your changes.

## License
This project is licensed under the GNU General Public License 3.0 - see `LICENSE.md` for details.