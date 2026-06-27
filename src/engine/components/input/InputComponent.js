/**
 * InputComponent
 * 
 * Base class for input components that handle user input and emit events about input state.
 * This component provides a unified interface for receiving keyboard, mouse, and other input sources.
 * 
 * @class InputComponent
 * @extends GameComponent
 */

import Console from '../../core/Console.js';
import { INPUT_PRIORITY } from './../../constants';
import { GameComponent, GameComponentError } from '../GameComponent.js';

/**
 * Creates a new InputComponent instance
 * @param {number} priority - Priority for execution order (defaults to 1.0)
 * @constructs InputComponent
 */
class InputComponent extends GameComponent {
    constructor(priority = INPUT_PRIORITY, name = 'InputComponent') {
        super(priority, name);
    
        // Input state storage
        this._inputState = null;
    }

    //--------------------------------
    // Getters and Setters
    //--------------------------------

    set state(newState) {
        this._inputState = newState;
    }

    get state() {
        return this._inputState;
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            _state: this.state
        }};
    }

    //--------------------------------
    // Lifecycle Methods
    //--------------------------------

    resetState() {
        throw new GameComponentError(this, 'InputComponent.resetState() must be implemented by subclasses');
    }

    /**
     * Updates the input component's state during each frame
     * @method update
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
    update(time, deltaTime) {
        // Update input states based on the current frame
        // This method is called by GameWorld's update loop
        
        // Check for any pending input updates from system (e.g., window events)
        this.processSystemInput();
        
        // Emit held state if necessary
        this.checkHeldKeys();
    }

    /**
     * Processes input received from the system (e.g., keyboard/mouse events)
     * @method processSystemInput
     */
    processSystemInput() {
        // This method will be overridden by subclasses to handle specific input sources
        // Placeholder for base implementation
    }

    /**
     * Checks if any keys have been held down since the last frame update
     * @method checkHeldKeys
     */
    checkHeldKeys() {
        // Emit keyheld events for currently pressed but not yet released keys
        // Implementation depends on subclass input handling
    }

    /**
     * Input event type constants
     */
    static INPUT_EVENTS = {
        KEY_PRESSED: 'keypress',
        KEY_DOWN: 'keydown',
        KEY_UP: 'keyup',
        KEY_HELD: 'keyheld',
        KEY_ESCAPE: 'escape',
        MOUSE_DOWN: 'mousedown',
        MOUSE_UP: 'mouseup',
        MOUSE_MOVE: 'mousemove',
        WHEEL: 'wheel'
    }

}

export default InputComponent;
