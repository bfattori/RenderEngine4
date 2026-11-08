
import Sprite from '../../resources/Sprite.js';
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
     * Set the name of the active state of the sprite. This can be used to change the appearance of the sprite at runtime. 
     * For sprites with only one state, no value or `Sprite.DEFAULT_STATE` are both acceptable.
     */
    set stateName(stateName) {
        this.sprite.state = stateName;
    }

    /**
     * Returns the current state the sprite is in.
     * @return {String} The state name of the sprite or `Sprite.DEFAULT_STATE`
     */
    get stateName() {
        return this.sprite.currentState;
    }

    /**
     * Set the sprite the component will render.
     *
     * @param sprite {R.resources.types.Sprite} The sprite to render
     */
    set sprite(sprite) {
        this.#currentSprite = sprite;
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

    /**
     * Get the current state of the sprite
     * @returns {SpriteState}
     */
    get currentState() {
        return this.sprite.states.get(this.sprite.currentState);
    }

    /**
     * Calculate the bounding box from the set of
     * points which comprise the shape to be rendered.
     * @private
     */
    #calculateBoundingBox() {
        this.host.setBoundingBox(this.currentState.width, this.currentState.height);
        this.currentState.boundingBox = this.host.boundingBox;
    }

    // flipX(force) {
    //     this.host.worldTransform.flipX(force);
    // }

    // flipY(force) {
    //     this.host.worldTransform.flipY(force);
    // }

    update(time, deltaTime) {
        this.sprite.update(time, deltaTime);
        super.update(time, deltaTime);
    }

    draw(time, deltaTime) {
        if (this.sprite !== null)
            this.context.renderSprite(this.sprite.opaqueId, 0, -this.sprite.states.get(this.sprite.currentState).height, time, deltaTime);
    }

    /**
     * Releases the component back into the object pool. See {@link R.engine.PooledObject#release} for
     * more information.
     */
    destroy() {
        this.#currentSprite = null;
    }
}

