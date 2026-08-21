/**
 * RenderContext - Base class for all rendering contexts
 * Defines the common interface and capabilities for vector and raster rendering
 */
import Engine from '../../core/Engine.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import { RenderContextConfig } from '../../core/Config.js';
import Renderer from '../../rendering/renderers/Renderer.js';
import RenderPart from '../../parts/render/RenderPart.js';

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

export {
  RenderContextError
};

/**
 * RenderContext base class - Interface definition only, no implementation
 * This serves as the contract that all render contexts (VectorRenderContext, RasterRenderContext)
 * must implement. Actual implementations should extend this class or follow its interface.
 */
export default class RenderContext {
  #opts = new RenderContextConfig();
  #renderer = null;
  #world = null;
  #activeObjects = [];
  #objectPlaneAssignments = new Map();
  #lastUpdateTime = null;
  #instructionBuffer = [];
  #lastFrame = [];

  /**
   * Creates a new RenderContext instance
   * @param {Renderer} renderer - The renderer for the context
   * @param {Object} options - Configuration options for the render context
   */
  constructor(renderer, options = {}) {
    this.#opts.merge(options);

    // the renderer which will be targeted by the context
    this.#renderer = renderer;
    this.#renderer !== null ? (this.#renderer.renderContext = this) : null;
  }

  //---------------------------
  // Properties

  get config() {
    return this.#opts;
  }

  //--------------------------------------------
  // text and cursor
  //--------------------------------------------

  get formatting() {
    return this.config.text.formatting;
  }

  /**
   * The renderer line height for text
   * @return number
   */
  get lineHeight() {
    return this.config.text.lineHeight;
  }

  /**
   * Set the line height for text
   * @param {number} height - The line height
   */
  set lineHeight(height) {
    this.config.text.lineHeight = height;
  }

  get letterSpacing() {
    return this.config.text.letterSpacing;
  }

  set letterSpacing(s) {
    this.config.text.letterSpacing = s; 
  }

  /**
   * Get the current cursor position
   * @returns {Array<number>} The cursor [x, y]
   */
  get cursor() {
    return [this.config.cursor.x, this.config.cursor.y];
  }

  /**
   * The the cursor position
   * @param {Array<number>} [x, y] - The cursor position
   */
  set cursor([x, y]) {
    this.config.cursor.x = x;
    this.config.cursor.y = y;
  }

  /**
   * Get the cursor X position
   * @returns {number}
   */
  get cursorX() {
    return this.config.cursor.x;
  }

  /**
   * Get the cursor Y position
   * @returns {number}
   */
  get cursorY() {
    return this.config.cursor.y;
  }

  /**
   * Set the cursor X position
   * @param {number} x - The X position
   */
  set cursorX(x) {
    this.config.cursor.x = x;
  }

  /**
   * Set the cursor Y position
   * @param {number} y - The Y position
   */
  set cursorY(y) {
    this.config.cursor.y = y;
  }

  /**
   * Add a delta value to the X position of the cursor.
   * @param {number} delta - The value to modify the X position by
   */
  set cursorDeltaX(delta) {
    this.config.cursor.x += delta;
  }

  /**
   * Add a delta value to the Y poisition of the cursor.
   * @param {number} delta - The value to modify the Y poisition by
   */
  set cursorDeltaY(delta) {
    this.config.cursor.y += delta;
  }

  /**
   * Get the boundaries for text rendering.
   * @returns {Array<number>} [left, top, width, height]
   */
  get cursorMargins() {
    return this.config.cursor.margins;
  }

  /**
   * Set the boundaries for the text being drawn.
   * @param {Object} margins
   * @param {number} [margins.left] - The left margin
   * @param {number} [margins.top] - The top margin
   * @param {number} [margins.right] - The right margin
   * @param {number} [margins.bottom] - The bottom marin
   */
  set cursorMargins({left, right, top, bottom}) {
    this.config.cursor.margins = {left: left, top: top, right: right, bottom: bottom};
  }

  set viewport({left, top, width, height}) {
    this.config.viewport = {left: left, top: top, width: width, height: height};
  }

  get viewport() {
    return this.config.viewport;
  }

  get worldDimensions() {
    return this.config.worldDimensions;
  }

  set worldDimensions({width, height}) {
    this.config.worldDimensions = {width: width, height: height};
  }
  
  /**
   * Determine if render commands will be processed immediately by the renderer, or cached until an entire frame has been generated.
   * @return {boolean} True if the context is in immediate mode
   */
  get immediateMode() {
    return this.config.immediateMode;
  }

  /**
   * Set whether render commands should be processed immediately by the renderer.
   * @param {boolean} state - Whether to enable immediate mode
   */
  set immediateMode(state) {
    this.config.immediateMode = state;
  }

  /**
   * Returns a reference to the renderer the context was initialized with.
   * @returns {Renderer} The target of the render context
   */
  get renderer() {
    return this.#renderer;
  }

  /**
   * Returns the instructions for rendering.
   */
  get renderingInstructions() {
    return this.#instructionBuffer;
  }

  get lastFrameInstructions() {
    return this.#lastFrame;
  }

    /**
   * Set the owning world for this render context
   * @param {GameWorld} world - The world that manages GameObjects for this context
   */
  set world(world) {
    this.#world = world;
  }
  
  /**
   * Get the owning world
   * @returns {GameWorld|null} The associated world or null
   */
  get world() {
    return this.#world;
  }
  
  /**
   * Set enable/disable culling for this render context
   * @param {boolean} enabled - Whether culling should be active
   */
  set culling(enabled) {
    this.config.enableCulling = enabled;
  }
  
  /**
   * Get whether culling is enabled
   * @returns {boolean}
   */
  get culling() {
    return this.config.enableCulling;
  }
  
  /**
   * Get render area dimensions
   * @returns {Object} Object with width and height of screen coordinates
   */
  get renderArea() {
    return {
      width: this.viewport.width,
      height: this.viewport.height,
      x: this.viewport.left,
      y: this.viewport.top
    };
  }
  
  /**
   * Get world dimensions
   * @returns {Object} Object with world width and height
   */
  get worldArea() {
    return {
      width: this.worldDimensions.width,
      height: this.worldDimensions.height,
      x: 0,
      y: 0
    };
  }
  
  /**
   * Get the number of configured render planes
   * @returns {number} Number of active render planes
   */
  get planeCount() {
    return this.config.renderPlanes.names.length;
  }
  
  /**
   * Get the list of configured render plane names
   * @returns {Array<string>} Array of plane names
   */
  get planeNames() {
    return this.config.renderPlanes.names.slice(0, this.config.renderPlanes.maxPlanes);
  }

  set planeNames(names) {
    this.config.renderPlanes.names = names.slice(0, names.length);
  }

  get particleThreadingEnabled() {
     return Engine.options.threading.particleEngine.enabled;
  }

  //-------------------------------
  // Properties
  //-------------------------------

  get properties() {
      return {
        World: this.world,
        Renderer: this.renderer,

        renderingInstructions: this.renderingInstructions,
        lastFrameInstructions: this.lastFrameInstructions,
        
        config: this.config,
        immediateMode: this.immediateMode,
        culling: this.culling,
        renderArea: this.renderArea,
        worldArea: this.worldArea,

        planeCount: this.planeCount,
        planeNames: this.planeNames

      };
  }

  //-----------------------------
  // viewport and world
  //------------------------------

  /**
   * Updates the rendering state based on current world time and delta
   * @param {number} currentTime - Current game time in milliseconds
   * @param {number} deltaTime - Time since last update in milliseconds
   * @returns {boolean} true if update was successful
   */
  update(currentTime, deltaTime) {
    // This method MUST be implemented by subclasses
    // Default implementation does nothing
    this.#lastUpdateTime = currentTime;
    return true;
  }

  /**
   * Add a rendering instruction. If the context is in immediate mode, the instruction is
   * drawn to the renderer as soon as it is received.
   * @param  {String} instruction A rendering instruction
   */
  addInstruction(instruction) {
    if (this.immediateMode) {
      this.#renderer.render(instruction);
    } else {
      this.#instructionBuffer.push(instruction);
    }
  }

  /**
   * Clear the instruction buffer without resetting internal state
   */
  clearInstructionBuffer() {
    this.#lastFrame = [...this.#instructionBuffer];
    this.#instructionBuffer = [];
  }

  /**
   * Returns the object containing the high-level API methods exposed by the sub-class.
   * @returns {Object}
   */
  getAPI() {
    throw new RenderContextError(this, 'render() must be implemented by the sub-class to expose a high-level API.');
  }
  
  /**
   * Push a transformation onto the world stack.
   * @param {Matrix2d} transformationMatrix The matrix to push onto the transform stack, or null to push the current world transform
   */
  pushTransform(transformationMatrix = null) {
    // multiply the new transform and store that
    this.#world.pushTransformation(transformationMatrix);    
  }

  /**
   * Remove the last transform off the world stack and return it.
   * @returns A matrix representing the top-most element of the transformation stack
   */
  popTransform() {
    return this.#world.popTransformation();
  }

  /**
   * Peek at the top of the transform stack.
   * @returns A matrix representing the top-most element of the transformation stack
   */
  peekTransform() {
    return this.#world?.peekTransformation();
  }

  /**
   * Resets the transformation stack to the initial state (identity matrix)
   */
  resetTransforms() {
    this.#world?.resetTransforms();
  }

  /**
   * Renders the current scene to produce video output
   * Objects are automatically sorted into render planes for depth-based rendering
   * @param {Array<GameObject>} objects - Array of GameObjects to render in order
   * @param {number} time - Current game time in milliseconds (for parallax effects)
   * @param {number} deltaTime - Time since last update in milliseconds
   * @returns {boolean} true if rendering was successful
   */
  renderScene(objects, time, deltaTime) {
    // Clear active objects for this frame
    this.clearActiveObjects();

    // start the particles rendering now, if threading
    if (this.particleThreadingEnabled)
      Engine.particleEngine.renderParticles(time, deltaTime, null);

    if (this.#renderer && this.#renderer.constructor !== Renderer) {
      // pre-frame generation
      this.#renderer.preFrame();

      const activeObjects = [];

      // Add all objects to active list
      for (const obj of objects) {
        if (!activeObjects.includes(obj)) {
          activeObjects.push(obj);
        }
      }
      
      // If culling is enabled, check visibility before rendering
      if (this.config.enableCulling) {
        const visibleObjects = activeObjects.filter((obj) => this.isObjectVisible(obj));
        
        // Assign objects to render planes based on their world positions
        // or use auto-sorting if no explicit assignment
        for (const obj of visibleObjects) {
          let plane = null;
          
          // Check for explicit plane assignment
          const assignment = this.#objectPlaneAssignments.get(obj);
          if (assignment) {
            plane = assignment;
          } else {
            // Auto-assign based on object's world position (for parallax effects)
            // Objects at larger world distances go to background planes
            // Objects closer to camera go to foreground planes
            plane = this.autoAssignToPlane(obj);
            this.assignObjectToPlane(obj, plane);
          }
          
          if (!this.#activeObjects.find((o) => o.object === obj)) {
            const assignedObj = {object: obj, assignedPlane: plane};
            this.#activeObjects.push(assignedObj);
          }
        }
      } else {
        // No culling, use all active objects with plane assignments
        for (const obj of activeObjects) {
          const assignment = this.#objectPlaneAssignments.get(obj);
          if (!obj.assignedPlane && !assignment) {
            obj.assignedPlane = this.autoAssignToPlane(obj);
          } else if (assignment && !obj.assignedPlane) {
            obj.assignedPlane = assignment;
          }
          this.assignObjectToPlane(obj, obj.assignedPlane);

          if (!this.#activeObjects.find((o) => o.object === obj)) {
            const assignedObj = {object: obj, assignedPlane: obj.assignedPlane};
            this.#activeObjects.push(assignedObj);
          }
        }
      }
      
      // Sort objects into their respective planes
      this.sortObjectsByPlanes();

      // Render objects
      for (const object of this.#activeObjects) {
        try {
          if (object.object.render) {
            object.object.render(time, deltaTime);
          }
        } catch (error) {
          console.error('RenderContext: Error rendering GameObject:', object.object.name || 'unnamed', error);
        }
      }

      // render any pending instructions
      this.renderInstructions(time, deltaTime);

      // render the particles directly to the 
      // framebuffer if running on the main thread
      if (!this.particleThreadingEnabled)
        Engine.particleEngine.renderParticles(time, deltaTime, null,  this.renderer.surface);


      // post-frame generation
      this.#renderer.postFrame();

      // clean up 
      this.clearInstructionBuffer();
    }
    return true;
  }
  
  renderInstructions(time, deltaTime) {
      // play out any pending instructions
      this.#instructionBuffer.forEach(instruction => {
        this.#renderer.render(instruction, time, deltaTime);
      });
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
    const assignment = this.#objectPlaneAssignments.get(object);
    if (assignment) {
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
    const validPlanes = this.planeNames.slice(0, this.config.renderPlanes.max);
    if (!validPlanes.includes(planeName)) {
      console.warn(`${this.constructor.name}: Invalid plane name "${planeName}". Valid planes: ${this.planeNames.join(', ')}`);
      return false;
    }
    
    object.assignedPlane = planeName;
    this.#objectPlaneAssignments.set(object, planeName);
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
    this.#objectPlaneAssignments.delete(object);
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
    if (this.planeNames.includes(planeName)) {
      return this.#activeObjects.filter((obj) => obj.assignedPlane === planeName);
    }
    return [];
  }
  
  /**
   * Sort objects into their respective planes for depth-based rendering
   * Objects in the background plane render first, then middle, then foreground
   */
  sortObjectsByPlanes() {
    const planes = this.planeNames.slice(0, this.config.renderPlanes.max);
    
    // Clear active objects and rebuild with proper plane sorting
    const activeObjects = [];
    
    // Render each plane in order from background to foreground
    for (const planeName of planes) {
      const planeObjects = this.getObjectsInPlane(planeName);
      activeObjects.concat(planeObjects);
    }
    
    return activeObjects;
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
    let screenX = x - this.#world.camera.viewport[0];
    let screenY = y - this.#world.camera.viewport[1];
    screenX += this.#world.camera.viewport[2] / 2;
    screenY += this.#world.camera.viewport[3] / 2;

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
    const centerX = x - (this.#world.camera.viewport[2] / 2);
    const centerY = y - (this.#world.camera.viewport[3] / 2);
    const worldX = (centerX / this.#world.camera.scale[0]) + this.#world.camera.position[0];
    const worldY = (centerY / this.#world.camera.scale[1]) + this.#world.camera.position[1];
    return [worldX, worldY];
  }
  
  /**
   * Tests whether a GameObject is visible within the render context's boundaries
   * Must be implemented by all subclasses
   * @param {GameObject} object - The GameObject to check
   * @returns {boolean} true if the object is within the visible area
   */
  isObjectVisible(object) {
    const transform = object.worldTransform;
    return this.worldToScreen(transform.position[0], transform.position[1]) !== null;
  }
  
  /**
   * Clear active objects list (used during render preparation)
   */
  clearActiveObjects() {
    this.#activeObjects = [];
  }
  
  //-----------------------------------
  // Render Planes

  /**
   * Set custom render plane configuration
   * @param {number} count - Number of planes to configure
   * @param {Array<string>} names - Names for each plane (optional)
   */
  setPlaneConfiguration(count, names = null) {
    this.config.renderPlanes.max = count;
    
    if (!names) {
      // Generate default plane names
      const defaults = ['background', 'middle', 'foreground'];
      this.planeNames = defaults.slice(0, count);
    } else {
      this.planeNames = names.slice(0, count);
    }
  }
  
  /**
   * Add a custom render plane at the specified index
   * @param {number} index - Position to insert the new plane (0 = background)
   * @param {string} name - Name for the new plane
   */
  addRenderPlane(index, name) {
    if (index < 0 || index > this.config.renderPlanes.max) {
      throw new RenderContextError(this, `Cannot add plane at index ${index}. Max planes: ${this.config.renderPlanes.max}`);
    }
    
    if (!this.planeNames[index]) {
      this.planeNames.splice(index, 0, name);
    } else if (this.planeNames.length <= this.config.renderPlanes.max) {
      this.planeNames.push(name);
      this.config.renderPlanes.max = this.planeNames.length;
    }
  }
  
  /**
   * Remove a render plane by name
   * @param {string} planeName - Name of the plane to remove
   */
  removeRenderPlane(planeName) {
    const index = this.planeNames.indexOf(planeName);
    if (index > -1) {
      this.planeNames.splice(index, 1);
      
      // Update max planes if needed
      if (this.planeNames.length < this.config.renderPlanes.max) {
        this.config.renderPlanes.max = this.planeNames.length;
      }
    }
  }
  
  /**
   * Reset all render context state for a new frame
   */
  reset() {
    this.clearActiveObjects();
    this.#objectPlaneAssignments.clear();
    this.#lastUpdateTime = null;
  }

  /**
   * Shutdown the render context and free up resources. This should be called when the engine is shutting down.
   */
  shutdown() {
    this.reset();
  }

  serialize() {
    return Engine.engine.serialize.call(this);
  }
}
