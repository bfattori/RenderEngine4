 /**
@fileoverview ComponentPart subclass for rendering functionality
Provides a way for game objects to render to the context 
*/
import Constants from '../../Constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent } from '../ComponentPart.js';
import Engine from '../../core/Engine.js';

import { PreTransformEvent, TransformEvent } from '../../parts/transform/TransformPart.js';
import { Matrix2d } from '../../core/Matrix.js';

class RenderEvent extends ComponentPartEvent {
    #frameTime = 0;
    constructor(frameTime, gameObject, time, deltaTime) {
        super(gameObject, time, deltaTime);
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
    #transformStackDepth = 0;
    #world = null;
    #cachedTransform = new Matrix2d();
    #committed = false;
    
    constructor(priority = Constants.RENDER_PRIORITY, name = 'RenderPart') {
        super(priority, name);
        this.#context = Engine.renderContext;
        this.#world = Engine.world;

        // listen for events
        this.on(PreTransformEvent);
        this.on(TransformEvent);
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

    get world() {
        return this.#world;
    }

    get renderer() {
        return this.context.renderer;
    }

    get cachedTransform() {
        return this.#cachedTransform;
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            context: this.#context
        }};
    }

    //-------------------------------
    // Event handler
    //-------------------------------
    
    /**
     * Event handler responds to {@link PreTransformEvent} and {@link TransformEvent}.
     * The former occurs when the transform intended for rendering is updated. The latter is a commit to use the newly calculated transform.
     * 
     * @param {Event} eventObject - The event object
     */
    onEvent(eventObject) {
        switch (eventObject.type) {
            case PreTransformEvent:
                this.transformModified(eventObject);
                break;
            case TransformEvent:
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
    transformModified(transformEvent) {
        if (this.#committed) return;
        this.#cachedTransform = transformEvent.consume(this);
    }

    /**
     * Commit the transform, or commit the transform passed in the event. This marks the last accepted transform
     * for the object before rendering.
     * @param {TransformEvent} transformEvent - (optional) An optional transformation event.
     */
    commitTransform(transformEvent) {
        if (transformEvent) {
            this.#cachedTransform = transformEvent.consume(this);
        }
        this.pushTransform(this.#cachedTransform);
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
        this.emit(new RenderEvent(performance.now() - time, this.gameObject, time, deltaTime));
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
        this.draw(time, deltaTime);
        while (this.#transformStackDepth-- > 0)
            this.#context?.popTransform();
        this.#committed = false;
    }

    /**
     * Draw the component
     * @param {number} time 
     * @param {number} deltaTime 
     */
    draw(time, deltaTime) {}

    /**
     * Pushes a transform into the render context's transformation stack
     * @param {Number[Number[]]} transformMatrix The Transformation matrix to apply to the render context.
     */
    pushTransform(transformMatrix) {
        this.#transformStackDepth++;
        this.#context?.pushTransform(transformMatrix);
    }

    popTransform() {
        this.#transformStackDepth--;
        return this.#context?.popTransform();
    }

    /**
     * Add a delta value to the X position of the cursor.
     * @param {number} delta - The value to modify the X position by
     */
    set cursorDeltaX(delta) {
        this.#context.cursorX += delta;
    }
}