 /**
MouseInput
Handles mouse input and emits events about the state of the mouse.
This component interfaces with the system's mouse event source and provides a unified interface for game objects to respond to mouse input.
@class MouseInput
@extends Input */

import Console from '../../core/Console.js';
import InputPart from './InputPart.js';
import Constants from '../../Constants.js';
import Engine from '../../core/Engine.js';

class MouseInput extends InputPart {

    constructor(priority = Constants.INPUT_PRIORITY, name = 'MouseInput') {
        super(priority, name);
    
        this._lastMouseMoveTime = 0;
        this._previousMousePosition = [0, 0];
        this._initialMousePosition = null;
        this._buttonPressPositions = []; // Track where mouse buttons were pressed
    }
    
    //--------------------------------
    // Getters and Setters
    //--------------------------------

    /**
     * Get current mouse position in screen coordinates
     * @method getPosition
     * @returns {Array} Array of [x, y] coordinates
     */
    get position() {
        return this.state.position;
    }

    get previousPosition() {
        return this._previousMousePosition;
    }
    
    /**
     * Get delta from last frame in screen coordinates
     * @method getDelta
     * @returns {Array} Array of [dx, dy] deltas
     */
    get delta() {
        return this.state.delta;
    }
    
    /**
     * Get current button states
     * @method getButtons
     * @returns {Object} Object containing left, right, middle boolean states
     */
    get buttons() {
        return Object.assign({}, this.state.buttons);
    }
    
    /**
     * Get wheel delta information
     * @method getWheel
     * @returns {Object} Object containing position and delta properties
     */
    get wheel() {
        return this.state.wheel;
    }

    /**
     * Check if mouse is currently clicking (button pressed and hasn't moved much)
     * @method isClicking
     * @returns {boolean} True if mouse button is held in click position
     */
    get isClicking() {
        const buttons = this.buttons;
        
        // Check if any button is pressed
        if (!buttons.left && !buttons.right && !buttons.middle) {
            return false;
        }
        
        // Calculate movement threshold for click detection (e.g., 5 pixels)
        const maxDelta = Math.max(Math.abs(this.state.delta[0]), Math.abs(this.state.delta[1]));
        return maxDelta < 5;
    }
    
    /**
     * Check if mouse is currently dragging (button pressed and moved)
     * @method isDragging
     * @returns {boolean} True if mouse button is held and has moved significantly
     */
    get isDragging() {
        const buttons = this.buttons;
        
        // Check if any button is pressed
        if (!buttons.left && !buttons.right && !buttons.middle) {
            return false;
        }
        
        // Calculate movement threshold for drag detection (e.g., 5 pixels)
        const maxDelta = Math.max(Math.abs(this.state.delta[0]), Math.abs(this.state.delta[1]));
        return maxDelta >= 5;
    }
    
    /**
     * Get mouse click history positions
     * @method getClickHistory
     * @returns {Array} Array of click history entries
     */
    get clickHistory() {
        return this._buttonPressPositions.slice(-10); // Return last 10 clicks for history
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            _lastMouseMoveTime: this._lastMouseMoveTime,
            _previousPosition: this.previousPosition,
        }};
    }
    
    //--------------------------------
    // Lifecycle Methods
    //--------------------------------

    /**
     * Initialize mouse input component
     * @method initialize
     */
    initialize() {
        this.state = {
            position: [0, 0],
            delta: [0, 0],
            buttons: {
                left: false,
                right: false,
                middle: false
            },
            wheel: {
                position: 0,
                delta: 0
            },
            repeat: true
        };
        
        // Bind mouse event handlers to window or system mouse source
        this.bindMouseEvents();
    }
    
    /**
     * Binds mouse event handlers to the system input source
     * @method bindMouseEvents
     */
    bindMouseEvents() {
        Console.log('MouseInput: Binding mouse events');
        
        // Note: Actual binding depends on platform/browser environment
        // In a browser environment, you would do:
        // window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        // window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        // window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // For desktop environments or custom input systems:
        // This is handled by the system's input management
    }
    
    /**
     * Handle mousedown events from the system
     * @method handleMouseDown
     * @param {MouseEvent} event - The mouse event from the system
     */
    handleMouseDown(event) {
        const buttonMap = {
            0: 'left',
            1: 'middle',
            2: 'right',
            3: 'back',
            4: 'forward'
        };
        
        const buttonName = buttonMap[event.button] || 'unknown';
        
        // Record where the mouse was pressed for drag detection
        if (this._initialMousePosition === null) {
            this._initialMousePosition = [event.clientX, event.clientY];
        }
        
        // Update button state
        this.state.buttons[buttonName] = true;
        this.state.repeat = false; // This is a new mouse button press
        
        // Record the position for potential drag detection
        this._buttonPressPositions.push({
            x: event.clientX,
            y: event.clientY,
            button: buttonName,
            timestamp: Date.now()
        });
        
        // Publish mouse down event with new data
        Engine.eventEngine.emit(Input.INPUT_EVENTS.MOUSE_DOWN, {
            button: buttonName,
            position: [event.clientX, event.clientY],
            delta: [0, 0], // No movement yet
            repeat: false
        });
    }
    
    /**
     * Handle mouseup events from the system
     * @method handleMouseUp
     * @param {MouseEvent} event - The mouse event from the system
     */
    handleMouseUp(event) {
        const buttonMap = {
            0: 'left',
            1: 'middle',
            2: 'right',
            3: 'back',
            4: 'forward'
        };
        
        const buttonName = buttonMap[event.button] || 'unknown';
        
        // Update button state
        this.state.buttons[buttonName] = false;
        this.state.repeat = true;
        
        // Publish mouse up event with new data
        Engine.eventEngine.emit(Input.INPUT_EVENTS.MOUSE_UP, {
            button: buttonName,
            position: [event.clientX, event.clientY],
            delta: [0, 0],
            repeat: true
        });
    }
    
    /**
     * Handle mouse move events from the system
     * @method handleMouseMove
     * @param {MouseEvent} event - The mouse event from the system
     */
    handleMouseMove(event) {
        // Calculate delta from last position
        const deltaX = event.clientX - this.state.position[0];
        const deltaY = event.clientY - this.state.position[1];
        
        // Update mouse position
        this._mousePosition = [event.clientX, event.clientY];
        this.state.delta = [deltaX, deltaY];
        this.state.position = [event.clientX, event.clientY];
        this.state.repeat = false; // This is new mouse movement data
        
        // Publish mouse move event with new data
        Engine.eventEngine.emit(Input.INPUT_EVENTS.MOUSE_MOVE, {
            position: [event.clientX, event.clientY],
            delta: [deltaX, deltaY],
            repeat: false
        });
        
        this._lastMouseMoveTime = Date.now();
    }
    
    /**
     * Handle mouse wheel events from the system
     * @method handleMouseWheel
     * @param {MouseEvent} event - The mouse wheel event from the system
     */
    handleMouseWheel(event) {
        // Get wheel delta (normalized to lines)
        const wheelDelta = Math.round((event.detail || event.wheelDeltaY || 0) / 120);
        
        // Publish wheel event with new data
        Engine.eventEngine.emitGlobal(Input.INPUT_EVENTS.WHEEL, {
            position: [...this.position],
            delta: wheelDelta,
            repeat: false
        });
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @method convertToWorldCoordinates
     * @param {Array} screenPos - Screen position [x, y]
     * @returns {Array} World position [x, y]
     */
    convertToWorldCoordinates(screenPos) {
        // This would be implemented with camera/viewport transformations
        if (screenPos && screenPos.length === 2) {
            // For now, assume 1:1 mapping in world space
            return [...screenPos];
        }
        return [0, 0];
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @method convertToScreenCoordinates
     * @param {Array} worldPos - World position [x, y]
     * @returns {Array} Screen position [x, y]
     */
    convertToScreenCoordinates(worldPos) {
        // This would be implemented with camera/view transformations
        if (worldPos && worldPos.length === 2) {
            return [...worldPos];
        }
        return [0, 0];
    }
    
    /**
     * Override base update to process mouse-specific logic
     * @method update
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(time, deltaTime) {
        // Base implementation from Input is inherited
        super.update(time, deltaTime);
        
        // Additional mouse-specific logic here if needed
        
        // Reset initial position after a short delay to handle click detection properly
        if (Date.now() - this._lastMouseMoveTime > 100 && this._initialMousePosition) {
            // Allow drag operations to complete before resetting
            if (this.state.buttons.left || 
                this.state.buttons.right || 
                this.state.buttons.middle) {
                // Continue tracking position during drag
            } else if (Date.now() - this._lastMouseMoveTime > 100) {
                this._initialMousePosition = null;
            }
        }
    };
    
    /**
     * Reset mouse state to default (override parent method)
     */
    resetState() {
        this._mousePosition = [0, 0];
        this._initialMousePosition = null;
        this._buttonPressPositions = [];
        this.state = {
            position: [0, 0],
            delta: [0, 0],
            buttons: {
                left: false,
                right: false,
                middle: false
            },
            wheel: {
                position: 0,
                delta: 0
            },
            repeat: true
        };
    }
    
    /**
     * Clear click history
     * @method clearClickHistory
     */
    clearClickHistory() {
        this._buttonPressPositions = [];
        this._initialMousePosition = null;
    }
        
}

export default MouseInput;