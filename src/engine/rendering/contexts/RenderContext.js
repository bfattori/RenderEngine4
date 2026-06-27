/**
 * RenderContext - Base class for all rendering contexts
 * Defines the common interface and capabilities for vector and raster rendering
 */
import Console from '../../core/Console.js';
import Renderer from '../../rendering/renderers/Renderer.js';
import RenderEngineError from '../../core/RenderEngineError.js';

// Define the interface that all RenderContext subclasses must implement
const RenderContextInterface = {
  // Required methods
  update: 'Must be implemented - Updates rendering state based on current world time and delta',
  render: 'Must be implemented - Produces video output for the game frame',
  
  // Screen coordinate properties (defined by each subclass)
  top: 'Screen Y-coordinate of the top edge (set by subclass)',
  left: 'Screen X-coordinate of the left edge (set by subclass)',
  right: 'Screen X-coordinate of the right edge (set by subclass)',
  bottom: 'Screen Y-coordinate of the bottom edge (set by subclass)',
  
  // Transform methods
  worldToScreen: 'Must be implemented - Converts world coordinates to screen coordinates',
  screenToWorld: 'Must be implemented - Converts screen coordinates to world coordinates',
};

/**
 * Render context error class for rendering errors.
 * @param {RenderContext} context - The rendering context
 * @param {String} message - The error message
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends RenderEngineError
 */
class RenderContextError extends RenderEngineError {
  constructor(context, message, rootCause) {
    super(message, rootCause);
    this.renderContext = context
  }
}

/**
 * RenderContext base class - Interface definition only, no implementation
 * This serves as the contract that all render contexts (VectorRenderContext, RasterRenderContext)
 * must implement. Actual implementations should extend this class or follow its interface.
 */
export default class RenderContext {
  /**
   * Creates a new RenderContext instance
   * @param {Renderer} renderer - The renderer for the context
   * @param {Object} options - Configuration options for the render context
   * @param {number} [options.viewport=[0, 0, 800,600]] - The viewport dimensions
   * @param {number} [options.worldDimensions=[800, 600]] - The world dimensions
   * @param {number} [options.maxPlanes=3] - Maximum number of render planes to support
   * @param {Array<string>} [options.planeNames] - Names of render planes (default: background, middle, foreground)
   */
  constructor(renderer, options = {}) {
    // the renderer which will be targeted by the context
    this._renderer = renderer;
    this._renderer.renderContext = this;

    // Screen coordinate boundaries (top, left, right, bottom)
    // These define the visible world within the render context
    this._viewport = options.viewport || [0, 0, 800, 600];
    this._worldDimensions = options.worldDimensions || [800, 600];
    
    // World coordinate boundaries (usually larger than screen)
    this.worldWidth = this._worldDimensions[0];
    this.worldHeight = this._worldDimensions[1];
    
    // Flag to control whether culling is enabled
    this.enableCulling = options.enableCulling !== false;

    // Store the world that owns this render context (set by Engine)
    this.world = null;
    
    // Track which GameObjects are currently being rendered
    this.activeObjects = [];
    
    // NEW: Render planes configuration - support any number of planes, default 3
    this.maxPlanes = options.maxPlanes || 3;
    this.renderPlanes = [
      'background',      // Farthest plane (lowest priority)
      'middle',          // Middle plane
      'foreground'       // Closest plane (highest priority)
    ];
    
    // Object-to-plane assignments (null for auto-sort by depth)
    this.objectPlaneAssignments = new Map();
    
    // Store the time/delta passed to last update/render call
    this.lastUpdateTime = null;

    // Instruction buffer for async consumption by subclasses
    this.instructionBuffer = [];

    this._immediate = false;
  }

  set viewport(viewport) {
    this._viewport = viewport;
  }

  get viewport() {
    return this._viewport;
  }

  set worldDimensions(dims) {
    this._worldDimensions = dims;
  }
  
  get immediateMode() {
    return this._immediate;
  }

  set immediateMode(state) {
    this._immediate = state;
  }

  /**
   * Returns a reference to the renderer the context was initialized with.
   * @returns {Renderer} The target of the render context
   */
  get renderer() {
    return this._renderer;
  }

  /**
   * Updates the rendering state based on current world time and delta
   * @param {number} currentTime - Current game time in milliseconds
   * @param {number} deltaTime - Time since last update in milliseconds
   * @returns {boolean} true if update was successful
   */
  update(currentTime, deltaTime) {
    // This method MUST be implemented by subclasses
    // Default implementation does nothing
    this.lastUpdateTime = currentTime;
    return true;
  }

  /**
   * Returns the instructions for rendering.
   */
  get renderInstructions() {
    return this.instructionBuffer;
  }

  /**
   * Add a rendering instruction. If the context is in immediate mode, the instruction is
   * drawn to the renderer as soon as it is received.
   * @param  {String} instruction A rendering instruction
   */
  addInstruction(instruction) {
    if (this._immediate) {
      this.renderer.render(instruction);
    } else {
      this.instructionBuffer.push(instruction);
    }
  }

  /**
   * Clear the instruction buffer without resetting internal state
   */
  clearInstructionBuffer() {
    this.instructionBuffer = [];
  }

  /**
   * Returns the object containing the high-level API methods exposed by the sub-class.
   * @returns {Object}
   */
  get render() {
    throw new RenderContextError(this, 'render() must be implemented by the sub-class to expose a high-level API.');
  }
  
  /**
   * Push the transformation onto the world stack.
   * @param {Array[Matrix4]} transformationMatrix The matrix to push onto the transform stack
   */
  pushTransform(transformationMatrix) {
    // multiply the new transform and store that
    transformationMatrix.mul(this.world?.peekTransformation());
    this.world?.pushTransformation(transformationMatrix);    
  }

  /**
   * Remove the last transform off the world stack and return it.
   * @returns A matrix representing the top-most element of the transformation stack
   */
  popTransform() {
    return this.world?.popTransform();
  }

  /**
   * Peek at the top of the transform stack.
   * @returns A matrix representing the top-most element of the transformation stack
   */
  peekTransform() {
    return this.world?.peekTransform();
  }

  /**
   * Resets the transformation stack to the initial state (identity matrix)
   */
  resetTransforms() {
    this.world?.resetTransforms();
  }

  /**
   * Renders the current scene to produce video output
   * Objects are automatically sorted into render planes for depth-based rendering
   * @param {Array<GameObject>} objects - Array of GameObjects to render in order
   * @param {number} currentTime - Current game time in milliseconds (for parallax effects)
   * @param {number} deltaTime - Time since last update in milliseconds
   * @returns {boolean} true if rendering was successful
   */
  renderScene(objects, currentTime, deltaTime) {
    // Clear active objects for this frame
    this.clearActiveObjects();

    if (this.renderer && this.renderer.constructor !== Renderer) {
      // pre-frame generation
      this.renderer.preFrame();

      // Add all objects to active list
      for (const obj of objects) {
        if (!this.activeObjects.includes(obj)) {
          this.activeObjects.push(obj);
        }
      }
      
      // If culling is enabled, check visibility before rendering
      if (this.enableCulling) {
        const visibleObjects = this.activeObjects.filter((obj) => this.isObjectVisible(obj));
        
        // Assign objects to render planes based on their world positions
        // or use auto-sorting if no explicit assignment
        for (const obj of visibleObjects) {
          let plane = null;
          
          // Check for explicit plane assignment
          const assignment = this.objectPlaneAssignments.get(obj);
          if (assignment) {
            plane = assignment;
          } else {
            // Auto-assign based on object's world position (for parallax effects)
            // Objects at larger world distances go to background planes
            // Objects closer to camera go to foreground planes
            plane = this.autoAssignToPlane(obj);
          }
          
          if (!this.activeObjects.find((o) => o === obj)) {
            const assignedObj = {...obj, assignedPlane: plane};
            this.activeObjects.push(assignedObj);
          }
        }
      } else {
        // No culling, use all active objects with plane assignments
        for (const obj of this.activeObjects) {
          const assignment = this.objectPlaneAssignments.get(obj);
          if (!obj.assignedPlane && !assignment) {
            obj.assignedPlane = this.autoAssignToPlane(obj);
          } else if (assignment && !obj.assignedPlane) {
            obj.assignedPlane = assignment;
          }
        }
      }
      
      // Sort objects into their respective planes
      this.sortObjectsByPlanes();

      // render the objects to the renderer surface
      this.activeObjects.forEach(object => {
        object.getComponentsByType(RenderComponent).forEach(component => {
          component.composeAndDraw(time, deltaTime);
        });
      });

      // play out any instructions
      this.instructionBuffer.forEach(instruction => {
        this.renderer.render(instruction);
      });


      // post-frame generation
      this.renderer.postFrame();
    }
    return true;
  }
  
  //-------------------------------
  // Multi-plane rendering support
  //-------------------------------

  /**
   * Auto-assign an object to a render plane based on world position
   * Uses a simple distance-based approach for parallax effects
   * @param {GameObject} object - The GameObject to assign
   * @returns {string} The assigned plane name
   */
  autoAssignToPlane(object) {
    const assignment = this.objectPlaneAssignments.get(object);
    if (assignment !== null) {
      return assignment;
    }
    
    // For objects without explicit assignment, use a simple heuristic:
    // - Objects with worldPosition.z < 0 go to background
    // - Objects with worldPosition.z around 0 go to middle
    // - Objects with worldPosition.z > 0 go to foreground
    
    const position = object.worldPosition || {};
    const z = position.z || 0;
    
    if (z < -100) {
      return 'background';
    } else if (z > 100) {
      return 'foreground';
    } else {
      return 'middle';
    }
  }
  
  /**
   * Assign an object to a specific render plane
   * @param {GameObject} object - The GameObject to assign
   * @param {string} planeName - Name of the plane ('background', 'middle', 'foreground')
   * @returns {boolean} true if assignment was successful
   */
  assignObjectToPlane(object, planeName) {
    const validPlanes = this.renderPlanes.slice(0, this.maxPlanes);
    if (!validPlanes.includes(planeName)) {
      Console.warn(`RenderContext: Invalid plane name "${planeName}". Valid planes: ${this.renderPlanes.join(', ')}`);
      return false;
    }
    
    this.objectPlaneAssignments.set(object, planeName);
    object.assignedPlane = planeName;
    return true;
  }
  
  /**
   * Assign an object to the front (foreground) plane
   * @param {GameObject} object - The GameObject to assign
   */
  assignObjectToFront(object) {
    this.assignObjectToPlane(object, 'foreground');
  }
  
  /**
   * Assign an object to the back (background) plane
   * @param {GameObject} object - The GameObject to assign
   */
  assignObjectToBack(object) {
    this.assignObjectToPlane(object, 'background');
  }
  
  /**
   * Remove an object's plane assignment (allows auto-sorting)
   * @param {GameObject} object - The GameObject to unassign
   */
  removeObjectFromPlaneAssignment(object) {
    this.objectPlaneAssignments.delete(object);
    if (object.assignedPlane) {
      delete object.assignedPlane;
    }
  }
  
  /**
   * Get all objects assigned to a specific render plane
   * @param {string} planeName - Name of the plane to query
   * @returns {Array<GameObject>} Array of objects in this plane
   */
  getObjectsInPlane(planeName) {
    if (this.renderPlanes.includes(planeName)) {
      return this.activeObjects.filter((obj) => obj.assignedPlane === planeName);
    }
    return [];
  }
  
  /**
   * Sort objects into their respective planes for depth-based rendering
   * Objects in the background plane render first, then middle, then foreground
   */
  sortObjectsByPlanes() {
    const planes = this.renderPlanes.slice(0, this.maxPlanes);
    
    // Clear active objects and rebuild with proper plane sorting
    this.activeObjects = [];
    
    // Render each plane in order from background to foreground
    for (const planeName of planes) {
      const planeObjects = this.getObjectsInPlane(planeName);
      
      for (const obj of planeObjects) {
        // Add to active list with preserved properties
        const filteredObj = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            filteredObj[key] = obj[key];
          }
        }
        this.activeObjects.push(filteredObj);
      }
    }
    
    return this.activeObjects;
  }
  
  /**
   * Converts world coordinates to screen coordinates
   *
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   * @param {string} [plane='middle'] - Which render plane to use for conversion
   * @returns {Array|null} Array [screenX, screenY]
   */
  worldToScreen(x, y, plane = 'middle') {
    let screenX = x - this.world.camera.viewport[0];
    let screenY = y - this.world.camera.viewport[1];
    screenX += this.world.camera.viewport[2] / 2;
    screenY += this.world.camera.viewport[3] / 2;

    return [screenX, screenY];
  }
  
  /**
   * Converts screen coordinates to world coordinates
   * 
   * @param {number} x - Screen X coordinate
   * @param {number} y - Screen Y coordinate
   * @param {string} [plane='middle'] - Which render plane to use for conversion
   * @returns {Array|null} Array [worldX, worldY]
   */
  screenToWorld(x, y, plane = 'middle') {
    const centerX = x - (this.world.camera.viewport[2] / 2);
    const centerY = y - (this.world.camera.viewport[3] / 2);
    const worldX = (centerX / this.world.camera.scale[0]) + this.world.camera.position[0];
    const worldY = (centerY / this.world.camera.scale[1]) + this.world.camera.position[1];
    return [worldX, worldY];
  }
  
  /**
   * Tests whether a GameObject is visible within the render context's boundaries
   * Must be implemented by all subclasses
   * @param {GameObject} object - The GameObject to check
   * @returns {boolean} true if the object is within the visible area
   */
  isObjectVisible(object) {
    const transform = object.getComponentsByType(TransformComponent);
    if (transform.length != 0) {
      // assume the first transform component is the object's position
      const position = transform[0].position;
      return this.worldToScreen(position.x, position.y) !== null;
    }
    return true; 
  }
  
  /**
   * Set the owning world for this render context
   * @param {GameWorld} world - The world that manages GameObjects for this context
   */
  setWorld(world) {
    this.world = world;
  }
  
  /**
   * Get the owning world
   * @returns {GameWorld|null} The associated world or null
   */
  getWorld() {
    return this.world;
  }
  
  /**
   * Set enable/disable culling for this render context
   * @param {boolean} enabled - Whether culling should be active
   */
  setCullingEnabled(enabled) {
    this.enableCulling = enabled;
  }
  
  /**
   * Get whether culling is enabled
   * @returns {boolean}
   */
  getEnableCulling() {
    return this.enableCulling;
  }
  
  /**
   * Clear active objects list (used during render preparation)
   */
  clearActiveObjects() {
    this.activeObjects = [];
  }
  
  /**
   * Get render area dimensions
   * @returns {Object} Object with width and height of screen coordinates
   */
  getRenderArea() {
    return {
      width: this._viewport[2],
      height: this._viewport[3],
      x: this._viewport[0],
      y: this._viewport[1]
    };
  }
  
  /**
   * Get world dimensions
   * @returns {Object} Object with world width and height
   */
  getWorldArea() {
    return {
      width: this._worldDimensions[0],
      height: this._worldDimensions[1],
      x: 0,
      y: 0
    };
  }
  
  /**
   * Get the number of configured render planes
   * @returns {number} Number of active render planes
   */
  getPlaneCount() {
    return this.renderPlanes.length;
  }
  
  /**
   * Get the list of configured render plane names
   * @returns {Array<string>} Array of plane names
   */
  getPlaneNames() {
    return this.renderPlanes.slice(0, this.maxPlanes);
  }
  
  /**
   * Set custom render plane configuration
   * @param {number} count - Number of planes to configure
   * @param {Array<string>} names - Names for each plane (optional)
   */
  setPlaneConfiguration(count, names = null) {
    this.maxPlanes = count;
    
    if (!names) {
      // Generate default plane names
      const defaults = ['background', 'middle', 'foreground'];
      this.renderPlanes = defaults.slice(0, count);
    } else {
      this.renderPlanes = names.slice(0, count);
    }
  }
  
  /**
   * Add a custom render plane at the specified index
   * @param {number} index - Position to insert the new plane (0 = background)
   * @param {string} name - Name for the new plane
   */
  addRenderPlane(index, name) {
    if (index < 0 || index > this.maxPlanes) {
      throw new RenderContextError(this, `Cannot add plane at index ${index}. Max planes: ${this.maxPlanes}`);
    }
    
    if (!this.renderPlanes[index]) {
      this.renderPlanes.splice(index, 0, name);
    } else if (this.renderPlanes.length <= this.maxPlanes) {
      this.renderPlanes.push(name);
      this.maxPlanes = this.renderPlanes.length;
    }
  }
  
  /**
   * Remove a render plane by name
   * @param {string} planeName - Name of the plane to remove
   */
  removeRenderPlane(planeName) {
    const index = this.renderPlanes.indexOf(planeName);
    if (index > -1) {
      this.renderPlanes.splice(index, 1);
      
      // Update max planes if needed
      if (this.renderPlanes.length < this.maxPlanes) {
        this.maxPlanes = this.renderPlanes.length;
      }
    }
  }
  
  /**
   * Reset all render context state for a new frame
   */
  reset() {
    this.clearActiveObjects();
    this.objectPlaneAssignments.clear();
    this.lastUpdateTime = null;
  }

  /**
   * Shutdown the render context and free up resources. This should be called when the engine is shutting down.
   */
  shutdown() {
    this.reset();
  }
}

export {
  RenderContextError,
  RenderContextInterface
};