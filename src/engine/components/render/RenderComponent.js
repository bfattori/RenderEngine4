 /**
@fileoverview GameComponent subclass for rendering functionality
Provides a way for game objects to render to the context 
*/
import { RENDER_PRIORITY } from './../../constants';
import GameComponent from '../GameComponent.js';
import Engine from './../../core/Engine.js';

export default class RenderComponent extends GameComponent {
    constructor(priority = RENDER_PRIORITY, name = 'RenderComponent') {
        super(RENDER_PRIORITY, name);
        this._context = Engine.getRenderContext();
        this._transformStackDepth = 0;
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
        return this._context.render;
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            _context: this._context
        }};
    }

    //--------------------------------
    // Lifecycle methods
    //--------------------------------

    /**
     * Compile a rendering component
     */
    compile() {}

    /**
     * Sets up the component for drawing to the Renderer then pops any 
     * transforms applied by this component.
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {void}
     */
    composeAndDraw(time, deltaTime) {
        this.draw(time, deltaTime);
        while (this._transformStackDepth-- > 0)
            this._context?.popTransform();
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
        this._transformStackDepth++;
        this._context?.pushTransform(transformMatrix);
    }
}