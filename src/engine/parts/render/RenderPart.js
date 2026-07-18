 /**
@fileoverview ComponentPart subclass for rendering functionality
Provides a way for game objects to render to the context 
*/
import Constants from '../../Constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent } from '../ComponentPart.js';
import Engine from '../../core/Engine.js';

import { CommitTransformEvent, TransformEvent } from '../../parts/transform/TransformPart.js';
import { Matrix2d } from '../../core/Matrix.js';

class RenderEvent extends ComponentPartEvent {
    #frameTime = 0;
    constructor(part, frameTime, time, deltaTime) {
        super(part, time, deltaTime);
        this.#frameTime = frameTime;
    }

    consume(consumer) {
        super.consume(consumer);
        return this.#frameTime;
    }
}

export { RenderEvent };

export default class RenderPart extends ComponentPart {
    #context = null;
    #localTransformStack = [];
    #world = null;
    #committed = false;
    
    #lineHeight = Constants.VECTOR_DEFAULTS.LINE_HEIGHT;
    
    constructor(priority = Constants.RENDER_PRIORITY, name = 'RenderPart') {
        super(priority, name);
        this.#context = Engine.renderContext;

        // listen for events
        this.on(TransformEvent);
        this.on(CommitTransformEvent);
    }

    //--------------------------------
    // Getters and Setters
    //--------------------------------

    /**
     * Maps the render methods of the context to the context property of this component for easy access in game objects.
     * Since render contexts may have different methods, this provides a consistent interface for game objects to call rendering 
     * functions without needing to know the specific context implementation. But that also means that if a context doesn't implement 
     * a method, it will throw an error when called.
     * 
     * @returns {object} An object containing the render methods of the context
     */
    get context() {
        return this.#context;
    }

    get renderer() {
        return this.context.renderer;
    }

    get renderTransform() {
        return this.peekTransform();
    }

    get lineHeight() {
        return this.#lineHeight;
    }

    /**
     * Add a delta value to the X position of the cursor.
     * @param {number} delta - The value to modify the X position by
     */
    set cursorDeltaX(delta) {
        this.#context.cursorX += delta;
    }


    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            context: this.#context
        }};
    }

    //------------------------------
    // Local Transforms
    //------------------------------

    pushTransform(transform) {
        this.#localTransformStack.push(transform);
        
    }

    popTransform() {
        return this.#localTransformStack.pop();
    }

    resetTransforms() {
        this.#localTransformStack = [];
    }

    peekTransform() {
        return this.#localTransformStack[this.#localTransformStack.length - 1];
    }

    //-------------------------------
    // Event handler
    //-------------------------------
    
    /**
     * Event handler responds to {@link PreTransformEvent} and {@link TransformEvent}.
     * The former occurs when the transform intended for rendering is updated. The latter is a commit to use the newly calculated transform.
     * 
     * @param {ComponentPartEvent} eventObject - The event object
     */
    onEvent(eventObject) {
        if (super.onEvent(eventObject)) return;
        switch (eventObject.type) {
            case TransformEvent:
                this.modifyTransform(eventObject);
                break;
            case CommitTransformEvent:
                this.commitTransform(eventObject);
                break;
        }
    }

    /**
     * This event is fired from the transform and collider parts that adjust the transform during their update.
     * The last transform passed will be used when the render occurs. If the transform is committed, no further
     * updates will be processed.
     * @param {PreTransformEvent} transformEvent - A transformation event.
     * @returns void
     */
    modifyTransform(transformEvent) {
        if (this.#committed) return;
        this.pushTransform(transformEvent.consume(this));
    }

    /**
     * Commit the transform, or commit the transform passed in the event. This marks the last accepted transform
     * for the object before rendering.
     * @param {TransformEvent} transformEvent - (optional) An optional transformation event.
     */
    commitTransform(transformEvent) {
        if (!this.#committed && transformEvent) {
            this.pushTransform(transformEvent.consume(this));
        }
        this.#committed = true;    
    }

    //--------------------------------
    // Lifecycle methods
    //--------------------------------

    /**
     * Compile a rendering component
     */
    compile() {}

    /**
     * Updates the transform based on current state and world bounds
     * 
     * @param {number} time - Current world time (Unix timestamp or frame count)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration for the update
     */
    update(time, deltaTime, options = {}) {
        this.composeAndDraw(time, deltaTime);
        this.emit(new RenderEvent(this, performance.now() - time, time, deltaTime));
        this.resetTransforms();
        return this;
    }

    /**
     * Sets up the component for drawing to the Renderer then pops any 
     * transforms applied by this component.
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {void}
     */
    composeAndDraw(time, deltaTime) {
        this.context.pushTransform(this.peekTransform());
        this.draw(time, deltaTime);
        this.context.popTransform();
        this.#committed = false;
    }

    /**
     * Draw the component
     * @param {number} time 
     * @param {number} deltaTime 
     */
    draw(time, deltaTime) {}

    destroy() {
        this.off(TransformEvent);
        this.off(CommitTransformEvent);
        super.destroy();
    }
}