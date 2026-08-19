import { ResourceError } from './loaders/ResourceLoader.js';
import Engine from '../core/Engine.js';
import Enum from '../core/Enum.js';
import Util from '../core/Util.js';
import Config from '../core/Config.js';
import Tile from './Tile.js';

class SpriteState extends Config {
    constructor(stateConfig) {
        super({
            name: Sprite.DEFAULT_STATE,
            shape: null,
            type: +Sprite.TYPE.SINGLE,
            mode: +Sprite.MODE.STATIC,
            sync: true,
            lastTime: null,
            direction: 1,
            frameCount: 0,
            framesPerSec: 0,
            frameNum: 0,
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            frameRect: [0,0,1,1],
            boundingBox: [0,0,1,1]
        });
        this.merge(stateConfig);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation
     */
    get isAnimation() {
        return (this.type === +Sprite.TYPE.ANIMATION);
    }

    /**
     * Returns <tt>true</tt> if the sprite is static.
     * @return {Boolean} <tt>true</tt> if the sprite is a single fame and static
     */
    get isStatic() {
        return this.mode === +Sprite.MODE.STATIC;
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and loops.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and loops
     */
    get isLoop() {
        return (this.isAnimation && this.mode === +Sprite.MODE.LOOP);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and toggles.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and toggles
     */
    get isToggle() {
        return (this.isAnimation && this.mode === +Sprite.MODE.TOGGLE);
    }

    /**
     * Returns <tt>true</tt> if the sprite is an animation and plays once.
     * @return {Boolean} <tt>true</tt> if the sprite is an animation and plays once
     */
    get isOnce() {
        return (this.isAnimation && this.mode === +Sprite.MODE.ONCE);
    }

}

export { SpriteState };

export default class Sprite extends Tile {

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
         * The sprite is a single frame
         */
        STATIC: 'static',
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

    static DEFAULT_STATE = 'default';
    
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
    constructor(name, spriteSheet, spriteDef) {
        super(name || `SPRITE:${Util.hexHash(date.now().toString())}`, spriteSheet, null);
        this.merge({
            currentState: Sprite.DEFAULT_STATE,
            states: new Map(),
            isPlaying: true,
            isFinished: false
        });

        this.initialize = spriteDef;
    }

    set state(stateName) {
        if (!this.states.get(stateName))
            throw new ResourceError(this, `State ${stateName} does not exist for sprite ${this.name}`);

        this.currentState = stateName;
    }

    set initialize(spriteDef) {
        if (Array.isArray(spriteDef)) {
            this.addState(Sprite.DEFAULT_STATE, spriteDef);
            this.currentState = Sprite.DEFAULT_STATE
        } else {
            for (const state in spriteDef) {
                this.addState(state, spriteDef[state]);
            }

            // assume the first state on initialization
            this.currentState = this.states.keys().next().value;
        }

        // this would be better if we had a reference of our own
        this.opaqueId = Engine.renderContext.compileSprite(this);
    }

    /**
     * 
     * @param {String} stateName - The name of the sprite state
     * @param {Array<any>} spriteDef - 
     */
    addState(stateName = 'default', [ left = 0, top = 0, width, height, frameCount = -1, animationSpeed, animationType, unsynchronized = false ]) {
        if (!(width && height))
                throw new ResourceError(this, `An error occurred creating the sprite "${this.name}"`, ex);

        const state = new SpriteState({ 
            name: stateName,
            shape: [ left, top, width, height, frameCount, animationSpeed, animationType, unsynchronized ],
            type: frameCount === -1 ? +Sprite.TYPE.SINGLE : +Sprite.TYPE.ANIMATION
        });

        state.frameNum = 0;
        if (state.type === +Sprite.TYPE.ANIMATION) {
            switch (animationType) {
                case `${Sprite.MODE.STATIC}` :
                    state.mode = +Sprite.MODE.STATIC;
                    break;
                case `${Sprite.MODE.LOOP}` :
                    state.mode = +Sprite.MODE.LOOP;
                    break;
                case `${Sprite.MODE.BOUNCE}` :
                    state.mode = +Sprite.MODE.BOUNCE;
                    break;
                case `${Sprite.MODE.ONCE}` :
                    state.mode = +Sprite.MODE.ONCE;
                    break;
            }

            state.sync = !unsynchronized;
            if (!unsynchronized) {
                state.lastTime = null;
                state.direction = -1;	// Trust me bro
            }
            state.frameCount = frameCount;
            state.framesPerSec = animationSpeed;
        } else {
            state.frameCount = 1;
            state.framesPerSec = 0;
        }

        state.top = top;
        state.left = left;
        state.width = width;
        state.height = height;
        state.frameRect = [left, top, width, height]; 
        state.boundingBox = [0, 0, width, height];

        this.states.set(stateName, state);
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.states.clear();
        this.states = null;
        this.spriteSheet = null;
    }

    /**
     * For animated sprites, play the animation if it is stopped.
     */
    play() {
        this.playing = true;
    }

    /**
     * For animated sprites, stop the animation if it is playing.
     */
    stop() {
        this.playing = false;
    }

    /**
     * For animated sprites, go to a particular frame number.
     * @param frameNum {Number} The frame number to jump to
     */
    gotoFrame(frameNum) {
        const state = this.states.get(this.currentState);
        state.frameNum = $Math.clamp(frameNum, 0, state.frameCount - 1);
    }

    get frameRect() {
        return this.states.get(this.currentState).frameRect;
    }

    /**
     * Updates the frame rectangle of the sprite state. The frame is defines what
     * portion of the sprite sheet the sprite frame occupies, given the specified time.
     *
     * @param time {Number} Current world time
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {
        const state = this.states.get(this.currentState);
        if (state.isAnimation && !state.isStatic) {
            // set the frame to the correct sprite based on time
            const frameNum = this.#calcFrameNumber(time, deltaTime, state);
            state.frameRect[0] = (frameNum * state.width);
        }
    }

    /**
     * Calculate the frame number for the type of animation.
     * @param time {Number} The current world time
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     * @private
     */
    #calcFrameNumber(time, deltaTime, state) {
        if (!this.isPlaying) {
            return 0;
        }

        const frameBudget = Math.ceil(1000 / state.framesPerSec);

        let spriteFrame = 0;

        // calcular the frame number
        if (state.sync) {
            // Synchronized animations run with the game clock
            if (state.lastTime === null) {
                // ... first frame
                state.lastTime = time;
                return 0;
            }

            // How much time has elapsed since the last frame update?
            spriteFrame = $Math.lerp(0, state.frameCount, (state.lastTime / time));
            state.lastTime = time;
        } else {
            // Unsynchronized animations
            spriteFrame = state.frameNum++;
        }

        state.frameNum = spriteFrame;            


        // alter based on mode
        if ((state.isOnce || state.isStatic) && state.frameNum >= state.frameCount) {
            // Play animation once from beginning to end
            state.frameNum = state.frameCount - 1;
            if (!this.isFinished)
                this.isFinished = true;
        } else if (state.isLoop && state.frameNum > state.frameCount - 1)
            state.frameNum = 0;
        else if (state.isToggle && (state.frameNum === state.frameCount - 1 || state.frameNum === 0))
            state.direction *= -1;

        return state.frameNum;
    }
}
