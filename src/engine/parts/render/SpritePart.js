import RenderPart from './RenderPart.js';

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

    /**
     * Calculate the bounding box from the set of
     * points which comprise the shape to be rendered.
     * @private
     */
    calculateBoundingBox() {
        return this.sprite.boundingBox;
    }

    /**
     * Set the sprite the component will render.
     *
     * @param sprite {R.resources.types.Sprite} The sprite to render
     */
    set sprite(sprite) {
        this.#currentSprite = sprite;
        this.#opaqueId = this.context.compileSprite(sprite, null);
    }

    /**
     * Get the sprite the component is rendering.
     *
     * @return {R.resources.types.Sprite} A <tt>R.resources.types.Sprite</tt> instance
     */
    get sprite() {
        return this.#currentSprite;
    }

    draw(time, deltaTime) {
        if (this.#opaqueId)
            this.context.renderSprite(this.#opaqueId, time, deltaTime);
        
    }

}

