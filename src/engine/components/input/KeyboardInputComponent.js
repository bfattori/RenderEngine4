 /**
KeyboardInputComponent
Handles keyboard input and emits events about the state of the keyboard.
This component interfaces with the system's keyboard event source and provides a unified interface for game objects to respond to keyboard input.
@class KeyboardInputComponent
@extends InputComponent 
*/
import Console from './../../core/Console.js';
import InputComponent from './InputComponent.js';
import { INPUT_PRIORITY } from './../../constants';
import Engine from './../../core/Engine.js';

class KeyboardInputComponent extends InputComponent () {
    
    /**
     * Constructor
     * @constructs KeyboardInputComponent
     */
    constructor(priority = INPUT_PRIORITY, name = 'KeyboardInputComponent') {
        super(priority, name);
        this._lastKeyPressedTime = 0;
        this._keyHistory = []; // Track recently pressed keys to prevent repeat flooding
        this._repeatInterval = 300; // ms between key repeats
    }
    
    //--------------------------------
    // Getters and Setters
    //--------------------------------

    /**
     * Get or initialize the current keyboard state
     * @returns {Object} Current keyboard state object
     */
    get state() {
        return {...super.state(), ...{
            keyCode: null,
            state: false,
            modifiers: Object.assign({}, KeyboardInputComponent.DEFAULT_MODIFIERS),
            repeat: true
        }};
    }

    /**
     * Get current modifier key states
     * @method getModifiers
     * @returns {Object} Object containing shift, ctrl, alt, cmd, option states
     */
    get modifiers() {
        return this.state.modifiers;
    }

    /**
     * Get the key repeat interval in milliseconds
     * @returns {number} The key repeat interval
     */
    get repeatInterval() {
        return this._repeatInterval;
    }

    /**
     * Set the key repeat interval
     * @param interval {number} The repeat interval delay in milliseconds
     */
    set repeatInterval(interval) {
        this._repeatInterval = interval;
    }

    /**
     * Check if any modifier key is currently pressed
     * @returns {boolean} True if any modifier is pressed
     */
    get isModifierKeyPressed() {
        return this.modifiers.shift || 
               this.modifiers.ctrl || 
               this.modifiers.alt || 
               this.modifiers.cmd || 
               this.modifiers.option;
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            repeatInterval: this.repeatInterval
        }};
    }

    //--------------------------------
    // Lifecycle Methods
    //--------------------------------

    /**
     * Initialize keyboard input component
     * @method initialize
     */
    initialize() { 
        this.state = {
            keyCode: null,
            state: false,
            modifier: Object.assign({}, KeyboardInputComponent.DEFAULT_MODIFIERS),
            repeat: true
        };

        // Bind keyboard event handler to window or system keyboard source
        this.bindKeyboardEvents();
    };
    
    /**
     * Binds keyboard event handlers to the system input source
     * @method bindKeyboardEvents
     */
    bindKeyboardEvents() {
        Console.log('KeyboardInputComponent: Binding keyboard events');
        
        // Note: Actual binding depends on platform/browser environment
        // In a browser environment, you would do:
        // window.addEventListener('keydown', this.handleKeyDown.bind(this));
        // window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // For desktop environments or custom input systems:
        // This is handled by the system's input management
    }

    /**
     * Override base update to process keyboard-specific logic
     * @method update
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     */
   update(time, deltaTime) {
        // Base implementation from InputComponent is inherited
        super.update(time, deltaTime);
        
        // Additional keyboard-specific logic here if needed
    }

    /**
     * Handle keydown events from the system
     * @method handleKeyDown
     * @param {KeyboardEvent} event - The keyboard event from the system
     */
    handleKeyDown(event) {
        // Record which keys are currently held down
        this.updateModifierState(event, true);
        
        // Update key state with repeat handling
        this.state.keyCode = event.keyCode;
        this.state.state = true;
        this.state.repeat = false; // This is a new key press
        
        // Record timestamp for repeat logic
        this._lastKeyPressedTime = Date.now();
        
        // Track in history to prevent flood
        const timeSinceLastKey = Date.now() - (this._keyHistory.length > 0 ? this._keyHistory[this._keyHistory.length - 1] : 0);
        if (timeSinceLastKey >= this._repeatInterval || this._keyHistory.length === 0) {
            this._keyHistory.push(Date.now());
            
            // Emit key pressed event with new data
            Engine.eventEngine.emitGlobal(InputComponent.INPUT_EVENTS.KEY_DOWN, {
                keyCode: event.keyCode,
                state: true,
                modifiers: this.state.modifiers,
                repeat: false
            });
        } else {
            this.state.repeat = true;
            this.emitGlobal('keyheld', {
                keyCode: event.keyCode,
                state: true,
                modifiers: this.state.modifiers,
                repeat: true
            });
        }
    }
    
    /**
     * Handle keyup events from the system
     * @method handleKeyUp
     * @param {KeyboardEvent} event - The keyboard event from the system
     */
    handleKeyUp(event) {
        // Record which keys are currently held down
        this.updateModifierState(event, false);
        
        // Emit key released event with new data
        this.state.keyCode = event.keyCode;
        this.state.state = false;
        this.state.repeat = true; // This will be overridden next press
        
        this.emitGlobal(InputComponent.INPUT_EVENTS.KEY_UP, {
            keyCode: event.keyCode,
            state: false,
            modifiers: this.state.modifiers,
            repeat: true
        });
        
        // Remove from history if it's the most recent key
        if (this._keyHistory.length > 0 && this._keyHistory[this.keyHistory.length - 1] === Date.now()) {
            this._keyHistory.pop();
        }
    }
    
    /**
     * Handle special keyboard events like escape or context menu
     * @method handleSpecialEvents
     * @param {KeyboardEvent} event - The keyboard event from the system
     */
    handleSpecialEvents(event) {
        // Prevent default behavior for certain keys
        if (event.key === 'Escape') {
            // Emit escape press if not already in our state
            if (!this.isModifierKeyPressed()) {
                Engine.eventEngine.emit(InputComponent.INPUT_EVENTS.KEY_ESCAPE, { keyCode: KeyboardInputComponent.KEY_CODES.KEY_ESCAPE });
            }
        }
        
        // Handle context menu for F1-F4 keys
        if (['F1', 'F2', 'F3', 'F4'].includes(event.key)) {
            event.preventDefault();
        }
    }
    
    /**
     * Update modifier state based on keyboard event
     * @method updateModifierState
     * @param {KeyboardEvent} event - The keyboard event
     * @param {boolean} isPressed - Whether the key is being pressed
     */
    updateModifierState(event, isPressed) {
        switch (event.keyCode) {
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_SHIFT:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_SHIFT:
                this.getCurrentState().modifier.shift = isPressed;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_CONTROL:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_CONTROL:
                this.getCurrentState().modifier.ctrl = isPressed;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_ALT:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_ALT:
                this.getCurrentState().modifier.alt = isPressed;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_WIN:
                this.getCurrentState().modifier.cmd = isPressed; // Use cmd for Mac compatibility
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_MENU:
                this.getCurrentState().modifier.option = isPressed; // Mac/Windows option key
                break;
        }
    }
        
    /**
     * Handle key release for modifier keys
     * @method handleModifierRelease
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleModifierRelease = function(event) {
        switch (event.keyCode) {
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_SHIFT:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_SHIFT:
                this.getCurrentState().modifier.shift = false;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_CONTROL:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_CONTROL:
                this.getCurrentState().modifier.ctrl = false;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_ALT:
            case KeyboardInputComponent.KEY_CODES.KEY_RIGHT_ALT:
                this.getCurrentState().modifier.alt = false;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_LEFT_WIN:
                this.getCurrentState().modifier.cmd = false;
                break;
            case KeyboardInputComponent.KEY_CODES.KEY_MENU:
                this.getCurrentState().modifier.option = false;
                break;
        }
    }
        
    /**
     * Reset keyboard state to default (override parent method)
     */
    resetState() {
        this.state = {
            keyCode: null,
            state: false,
            modifier: Object.assign({}, KeyboardInputComponent.DEFAULT_MODIFIERS),
            repeat: true
        };
        this.lastKeyPressedTime = 0;
        this.keyHistory = [];
    }

    /**
     * Common key code constants
     */
    static KEY_CODES = {
        KEY_SPACE: 32,
        KEY_APOSTROPHE: 39,
        KEY_COMMA: 44,
        KEY_MINUS: 45,
        KEY_PERIOD: 46,
        KEY_SLASH: 47,
        KEY_0: 48,
        KEY_1: 49,
        KEY_2: 50,
        KEY_3: 51,
        KEY_4: 52,
        KEY_5: 53,
        KEY_6: 54,
        KEY_7: 55,
        KEY_8: 56,
        KEY_9: 57,
        KEY_SEMICOLON: 59,
        KEY_EQUAL: 61,
        KEY_A: 65,
        KEY_B: 66,
        KEY_C: 67,
        KEY_D: 68,
        KEY_E: 69,
        KEY_F: 70,
        KEY_G: 71,
        KEY_H: 72,
        KEY_I: 73,
        KEY_J: 74,
        KEY_K: 75,
        KEY_L: 76,
        KEY_M: 77,
        KEY_N: 78,
        KEY_O: 79,
        KEY_P: 80,
        KEY_Q: 81,
        KEY_R: 82,
        KEY_S: 83,
        KEY_T: 84,
        KEY_U: 85,
        KEY_V: 86,
        KEY_W: 87,
        KEY_X: 88,
        KEY_Y: 89,
        KEY_Z: 90,
        KEY_LEFT_SHIFT: 16,
        KEY_RIGHT_SHIFT: 42,
        KEY_LEFT_CONTROL: 17,
        KEY_RIGHT_CONTROL: 55,
        KEY_LEFT_ALT: 18,
        KEY_LEFT_WIN: 91,
        KEY_RIGHT_WIN: 92,
        KEY_MENU: 93,
        KEY_BACKSPACE: 8,
        KEY_TAB: 9,
        KEY_CLEAR: 12,
        KEY_ENTER: 13,
        KEY_SHIFT: 16,
        KEY_CTRL: 17,
        KEY_CAPS_LOCK: 20,
        KEY_ALT: 18,
        KEY_PAUSE: 19,
        KEY_END: 35,
        KEY_HOME: 36,
        KEY_LEFT: 37,
        KEY_UP: 38,
        KEY_RIGHT: 39,
        KEY_DOWN: 40,
        KEY_INSERT: 45,
        KEY_DELETE: 46,
        KEY_F1: 112,
        KEY_F2: 113,
        KEY_F3: 114,
        KEY_F4: 115,
        KEY_F5: 116,
        KEY_F6: 117,
        KEY_F7: 118,
        KEY_F8: 119,
        KEY_F9: 120,
        KEY_F10: 121,
        KEY_F11: 122,
        KEY_F12: 123
    }

    /**
     * Default modifiers state
     */
    static DEFAULT_MODIFIERS = {
        shift: false,
        ctrl: false,
        alt: false,
        cmd: false,
        option: false
    }
}

export default KeyboardInputComponent;