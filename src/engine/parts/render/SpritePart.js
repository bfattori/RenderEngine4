import RenderPart from './RenderPart.js';

export default class SpritePart extends RenderPart {
    #currentSprite = null;

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

        // if (this.getGameObject().jQ()) {
        //     this.getGameObject().jQ().css({
        //         width:sprite.getBoundingBox().len_x(),
        //         height:sprite.getBoundingBox().len_y(),
        //         background:"url('" + sprite.getSourceImage().src + "') no-repeat"
        //     });
        // }
        // this.getGameObject().markDirty();
    }

    /**
     * Get the sprite the component is rendering.
     *
     * @return {R.resources.types.Sprite} A <tt>R.resources.types.Sprite</tt> instance
     */
    get sprite() {
        return this.#currentSprite;
    }

    /**
     * Draw the sprite to the render context.  The frame, for animated
     * sprites, will be automatically determined based on the current
     * time passed as the second argument.
     *
     * @param renderContext {R.rendercontexts.AbstractRenderContext} The context to render to
     * @param time {Number} The engine time in milliseconds
     * @param dt {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(renderContext, time, dt) {

        if (!this.base(renderContext, time, dt)) {
            return;
        }

        if (this.sprite) {
            this.transformOrigin(renderContext, true);
            renderContext.drawSprite(this.currentSprite, time, dt, this.getGameObject());
            this.transformOrigin(renderContext, false);
        }
    }

}

