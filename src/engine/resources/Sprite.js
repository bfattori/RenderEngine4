import Resource from './Resource.js';
import { ResourceError } from './Resource.js';
import $Math from '../core/Math.js';
import Enum from '../core/Enum.js';
import TransferrableConfig from '../core/TransferrableConfig.js';

/**
 * @class A 2D sprite object.  Sprites are either a single frame, or an animation composed of
 *        multiple frames run at a specified frame speed.  Animations can be run once, loop
 *        continuously, or toggle back and forth through the frames.  It is possible to start
 *        and stop animations, and also modify the speed at which each frame is played.
 *        <p/>
 *        In addition to the normal controls for an animation, a developer can also respond
 *        to events triggered on the sprite.  Linking to the events is done through
 *        {@link R.engine.BaseObject#addEvent}. The following are the events, and their
 *        descriptions:
 *        <ul>
 *           <li><tt>finished</tt> - A "run once" animation has played and completed</li>
 *           <li><tt>loopRestarted</tt> - A looping animation has begun a new cycle</li>
 *           <li><tt>toggled</tt> - A toggle animation has changed animation direction</li>
 *        </ul>
 *
 * @class
 * @extends Resource
 */
export default class Sprite extends TransferrableConfig {
    
    static TYPE = new Enum({
        /** 
         * The sprite is a single frame
         */
        SINGLE: 'single',
        /** 
         * The sprite is an animation
         */
        ANIMATION: 'animation'
    });

    static MODE = new Enum({
        /** 
         * The animation loops (beginning to end, repeat)
         */
        LOOP: 'loop',
        /** 
         * The animation bounces, playing from the first to the last frame
         * then backwards from the last to the first, and repeats.
         */
        BOUNCE: 'bounce',
        /** 
         * The  animation plays once from the beginning then stops at the last frame
         */
        ONCE: 'once'
    });
    
    
    // The type of sprite: Single or Animation
    #type = Sprite.TYPE.SINGLE;

    // Animation mode: loop or toggle
    #mode = Sprite.MODE.LOOP;

    // Animation frame count
    #count = 0;

    // Animation speed
    #speed = 0;

    // The rect which defines the sprite frame
    #frameRect;

    // The bounding box for the sprite
    #boundingBox;

    #lastTime;
    #sync = false;
    #finished = false;
    #toggleDir;
    #frameNum = 0;
    #playing = false;
    #spriteSheet = null;
    #name;

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite
     * @param {SpriteSheet} spriteSheet - The sprite sheet resource 
     * @param {{ Number, Number, Number, Number, Number, String, Boolean }} [props] - The sprite info
     * @param {Number} [left=0] - The left position of the sprite on the sprite sheet
     * @param {Number} [top=0] - The top position of the sprite on the sprite sheet
     * @param {Number} [width] - The width of the sprite
     * @param {Number} [height] - The height of the sprite
     * @param {Number} [frameCount=1] - The number of frames in the animation
     * @param {String} [animationSpeed=""] - The speed of the animation
     * @param {String} [animationType="single"] - The type of animation (single or toggle)
     * @param {Boolean} [unsynchronized=false] - Whether the sprite is unsynchronized

     */
    constructor(name, spriteSheet, [ left = 0, top = 0, width, height, frameCount, animationSpeed, animationType, unsynchronized = false ]) {
        super({
            name: name || `SPRITE:${$Math.hexHash(date.now().toString())}`,
            spriteSheet: spriteSheet,
            shape: null
        });

        if (!spriteSheet)
            throw new ResourceError(this, `An error occurred creating the sprite "${name}" - no sprite sheet`, ex);

        this.initialize = [ left = 0, top = 0, width, height, frameCount, animationSpeed, animationType, unsynchronized ];
    }

    set initialize([ left = 0, top = 0, width, height, frameCount, animationSpeed, animationType, unsynchronized ]) {
        if (!(width && height))
                throw new ResourceError(this, `An error occurred creating the sprite "${this.name}"`, ex);

        this.shape = [ left, top, width, height, frameCount, animationSpeed, animationType, unsynchronized ];
        const type = !frameCount ? Sprite.TYPE.SINGLE : Sprite.TYPE.ANIMATION;
        this.#type = type;
        if (type === Sprite.TYPE.ANIMATION) {
            switch (animationType) {
                case `${Sprite.MODE.LOOP}` :
                    this.#mode = Sprite.MODE.LOOP;
                    break;
                case `${Sprite.MODE.BOUNCE}` :
                    this.#mode = Sprite.MODE.BOUNCE;
                    break;
                case `${Sprite.MODE.ONCE}` :
                    this.#mode = Sprite.MODE.ONCE;
                    break;
            }

            this.#sync = !unsynchronized;
            if (!unsynchronized) {
                this.#lastTime = null;
                this.#toggleDir = -1;	// Trust me bro
            }
            this.#count = frameCount;
            this.#speed = animationSpeed;
        } else {
            this.#count = 1;
            this.#speed = 0;
        }

        this.#frameRect = [left, top, width, height]; 
        this.#boundingBox = [0, 0, width, height];
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.#boundingBox = null;
        this.#frameRect = null;
        this.#spriteSheet = null;
    }

    get spriteSheet() {
        return this.#spriteSheet;
    }

    get mode() {
        return this.#mode;
    }

    get type() {
        return this.#type;
    }
    
    /**
     * Get the number of frames in the sprite.
     * @return {Number}
     */
    get frameCount() {
        return this.#count;
    }

    /**
     * Set the speed, in milliseconds, that an animation runs at.  If the sprite is
     * not an animation, this has no effect.
     *
     * @param speed {Number} The number of milliseconds per frame of an animation
     */
    set frameSpeed(speed) {
        this.#speed = Math.max(speed, 0);
    }

    /**
     * Get the number of milliseconds each frame is displayed for an animation
     * @return {Number} The milliseconds per frame
     */
    get frameSpeed() {
        return this.#speed;
    }

    /**
     * Get the bounding box for the sprite.
     * @return {R.math.Rectangle2D} The bounding box which contains the entire sprite
     */
    get boundingBox() {
        return this.#boundingBox;
    }

    get isPlaying() {
        return this.#playing;
    }

    get frameNum() {
        return this.#frameNum;
    }

    set frameNum(frame) {
        this.#frameNum = frame;
    }

    get frameRect() {
        return this.#frameRect;
    }

    set frameRect(rect) {
        this.#frameRect = rect;
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation
     */
    get isAnimation() {
        return (this.type === Sprite.TYPE.ANIMATION);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and loops.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and loops
     */
    get isLoop() {
        return (this.isAnimation && this.mode === Sprite.MODE.LOOP);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and toggles.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and toggles
     */
    get isToggle() {
        return (this.isAnimation && this.mode === Sprite.MODE.TOGGLE);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and plays once.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and plays once
     */
    get isOnce() {
        return (this.isAnimation && this.mode === Sprite.MODE.ONCE);
    }

    get isFinished() {
        return this.#finished;
    }

    set isFinished(finished) {
        this.#finished = finished;
    }

    /**
     * For animated sprites, play the animation if it is stopped.
     */
    play() {
        this.#playing = true;
    }

    /**
     * For animated sprites, stop the animation if it is playing.
     */
    stop() {
        this.#playing = false;
    }

    /**
     * For animated sprites, reset the animation to frame zero.
     */
    reset() {
        this.frameNum = 0;
    }

    /**
     * For animated sprites, go to a particular frame number.
     * @param frameNum {Number} The frame number to jump to
     */
    gotoFrame(frameNum) {
        this.frameNum = Math.clamp(frameNum, 0, this.#count - 1);
    }

    /**
     * Gets the frame rectangle of the sprite. The frame is defines what
     * portion of the sprite sheet the sprite frame occupies, given the specified time.
     *
     * @param time {Number} Current world time
     * @param dt {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     * @return {R.math.Rectangle2D} A rectangle which defines the frame of the sprite in
     *         the source image map.
     */
    getFrame(time, dt) {
        if (!this.isAnimation) {
            return [...this.frameRect];
        } else {
            const frame = [...this.frameRect];
            const frameNum = this.calcFrameNumber(time, dt);
            frame[0] = this.frameRect[0] + (frameNum * this.frameRect[2]);
            return frame;
        }
    }

    /**
     * Get the current frame image
     * @param {number} time 
     * @param {number} dt 
     * @returns {ImageData}
     */
    getFrameImage(time, dt) {
        const frameRect = this.getFrame(time, dt);
        // extract the frame and draw to our buffer
        const frame = this.spriteSheet.sheet.image.getImageData(frameRect[0], frameRect[1], frameRect[2], frameRect[3]);
        return frame;
    }

    /**
     * Calculate the frame number for the type of animation.
     * @param time {Number} The current world time
     * @param dt {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     * @private
     */
    calcFrameNumber(time, dt) {
        if (!this.isPlaying) {
            return this.frameNum;
        }

        if (this.#sync) {
            // Synchronized animations

            if (this.#lastTime === null) {
                // Note the time when the first frame is requested and just return frame zero
                this.#lastTime = time;
                return 0;
            }

            // How much time has elapsed since the last frame update?
            if (dt > this.frameSpeed) {
                // Engine is lagging, skip to correct frame
                this.frameNum = Math.floor((this.frameSpeed / dt) *  this.#count);
            } else {
                this.frameNum += (time - this.#lastTime > this.frameSpeed ? this.#toggleDir : 0);
            }
            this.#lastTime = time;

            // Modify the frame number for the animation mode
            if (this.isOnce) {
                // Play animation once from beginning to end
                if (this.frameNum >= this.frameCount) {
                    this.frameNum = this.frameCount - 1;
                    if (!this.isFinished) {
                        // Call event when finished
                        this.isFinished = true;
                        //this.triggerEvent("finished");
                    }
                }
            } else if (this.isLoop) {
                if (this.frameNum > this.frameCount - 1) {
                    // Call event when loop restarts
                    this.frameNum = 0;
                    //this.triggerEvent("loopRestarted");
                }
            } else {
                if (this.frameNum === this.frameCount - 1 || this.frameNum === 0) {
                    // Call event when animation toggles
                    this.#toggleDir *= this.#toggleDir;
                    this.frameNum += this.#toggleDir;
                    //this.triggerEvent("toggled");
                }
            }

            // Remember the last time a frame was requested
            this.#lastTime = time;

        } else {
            // Unsynchronized animations
            const lastFrame = this.frameNum;
            if (this.isLoop) {
                this.frameNum = Math.floor(time / this.frameSpeed) % this.frameCount;
                if (this.frameNum < lastFrame) {
                    //this.triggerEvent("loopRestarted");
                }
            } else if (this.isOnce && !this.isFinished) {
                this.frameNum = Math.floor(time / this.frameSpeed) % this.frameCount;
                if (this.frameNum < lastFrame) {
                    this.isFinished = true;
                    this.frameNum = this.frameCount - 1;
                    //this.triggerEvent("finished");
                }
            } else if (this.isToggle) {
                this.frameNum = Math.floor(time / this.frameSpeed) % (this.frameCount * 2);
                if (this.frameNum > this.frameCount - 1) {
                    this.frameNum = this.frameCount - (this.frameNum - (this.frameCount - 1));
                    //this.triggerEvent("toggled");
                }
            }
        }

        return this.frameNum;
    }
}
