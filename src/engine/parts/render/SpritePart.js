import RenderPart from './RenderPart.js';
import $Math from '../../core/Math.js';

export default class SpritePart extends RenderPart {
    #currentSprite = null;
    #opaqueId = null;

    /**
     * @private
     */
    constructor(priority = Constants.RENDER_PRIORITY, name = 'SpritePart', sprite) {
        super(priority, name);
        this.#currentSprite = sprite;
    }

    /**
     * Releases the component back into the object pool. See {@link R.engine.PooledObject#release} for
     * more information.
     */
    destroy() {
        this.#currentSprite = null;
    }

    set stateName(stateName) {
        this.sprite.currentState = stateName;
        this.calculateBoundingBox();
    }

    get stateName() {
        return this.this.sprite.currentState;
    }

    /**
     * Set the sprite the component will render.
     *
     * @param sprite {R.resources.types.Sprite} The sprite to render
     */
    set sprite(sprite) {
        this.#currentSprite = sprite;
        if (this.#opaqueId) {
            // if this previously existed
            this.context.destroySprite(this.#opaqueId);
        }

        this.#opaqueId = this.context.compileSprite(sprite, null);
        this.#calculateBoundingBox();
    }

    /**
     * Get the sprite the component is rendering.
     *
     * @return {R.resources.types.Sprite} A <tt>R.resources.types.Sprite</tt> instance
     */
    get sprite() {
        return this.#currentSprite;
    }

    get currentState() {
        return this.sprite.states.get(this.sprite.currentState);
    }

    /**
     * Calculate the bounding box from the set of
     * points which comprise the shape to be rendered.
     * @private
     */
    #calculateBoundingBox() {
        return this.currentState.boundingBox = $Math.boundingBox([0,0],[this.currentState.width,this.currentState.height]);
    }

    update(time, deltaTime) {
        this.sprite.update(time, deltaTime);
        super.update(time, deltaTime);
    }

    draw(time, deltaTime) {
        if (this.#opaqueId)
            this.context.renderSprite(this.#opaqueId, this.host.worldTransform.e, this.host.worldTransform.f - this.sprite.states.get(this.sprite.currentState).height, time, deltaTime);
    }

}

