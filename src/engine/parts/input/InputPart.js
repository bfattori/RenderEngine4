/**
 * Input
 * 
 * Base class for input components that handle user input and emit events about input state.
 * This component provides a unified interface for receiving keyboard, mouse, and other input sources.
 * 
 * @class Input
 * @extends GameComponent
 */

import Console from '../../core/Console.js';
import Constants from '../../Constants.js';
import { ComponentPart, ComponentPartEvent, GameComponentError } from '../ComponentPart.js';

class InputEvent extends ComponentPartEvent {
    #inputState = null;
    constructor(inputState, gameObject, time, deltaTime) {
        super(gameObject, time, deltaTime);
        this.#inputState = inputState;
    }

    consume(consumer) {
        super.consume(consumer);
        return this.#inputState;
    }
}

export { InputEvent };

/**
 * Creates a new Input instance
 * @param {number} priority - Priority for execution order (defaults to 1.0)
 * @constructs Input
 */
class InputPart extends ComponentPart {
    #inputState = null;
    
    constructor(priority = Constants.INPUT_PRIORITY, name = 'Input') {
        super(priority, name);
     }

    //--------------------------------
    // Getters and Setters
    //--------------------------------

    set state(newState) {
        this.#inputState = newState;
    }

    get state() {
        return this.#inputState;
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
        throw new GameComponentError(this, 'Input.resetState() must be implemented by subclasses');
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

export default InputPart;
