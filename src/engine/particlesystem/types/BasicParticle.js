import TransferrableConfig from '../../core/TransferrableConfig.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import TileSheet from '../../resources/loaders/TileSheet.js';
import Assembler from '../../rendering/assemblers/Assembler.js';
import { MemShape } from '../../core/Spark.js';

/**
 * @class BasicParticle
 * @classdesc The BasicParticle class is a fundamental particle type used in the particle system. It defines the properties 
 * and behaviors of individual particles, including their color, size, velocity, drag, lifespan, and rendering methods. The 
 * class provides methods for spawning, updating, rendering, and cleaning up particles, allowing for customization of particle 
 * behavior and appearance. BasicParticle can be extended or configured to create various particle effects within the particle system.
 * @extends TransferrableConfig
 */
export default class BasicParticle extends TransferrableConfig {
    static AS_POINT = 0;
    #opaqueId = null;
    #particleShape = null;
    #sizeBytes = null;

    /**
     * Create a `BasicParticle` with options for colors, sizes, velocity range,
     * drag, and other properties. Particles are the atomic unit represented in the `ParticleSystem`
     * and have position, velocity, and run-time options. The run-time options allow a particle to
     * change over time, such as changing size, introducing turbulence, or fading in and out.
     *  
     * @param {Object} overrides - Configuration options for the particle
     * @param {String} url - Module URL
     */
    constructor(overrides = {}, url = import.meta.url) {
        super({
            /**
             * Colors of the particle
             * @type {String}
             */
            colors: ['#fff'],
            /**
             * Tiles (bitmaps) used in place of a simple colored shape.
             * @type {}
             */
            tileSheet: null,
            /**
             * Size of the particle
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            particleSize: [0.5, 2.0],
            /**
             * Amount to decay the particle size over its lifetime
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            sizeDecay: 0,
            /**
             * Velocity range - a scalar multiple to apply to the velocity
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            velocity: [0.8, 2.0],
            /**
             * Particle drag
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            drag: 1.4,
            /**
             * Increase in drag at each update
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            dragRate: 1.3,
            /**
             * Lifespan range of the particle in milliseconds
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            lifeSpan: [90, 3000],
            /**
             * Variance to add to the lifespan to make
             * particles feel unique
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            lifeVariance: 80,
            /**
             * Gravity effect on the particle (can act in any dimension)
             * @type {Array<number>} - vector of gravitational influence
             */
            gravity: [0.0, 0.0]
        }, url);
        this.merge(overrides);
        this.name = 'basicParticle';

        // convert colors to 4 8-bit color channels
        this.#preComputeColors();
    }

    static getInstance() {
        return new BasicParticle();
    }

    #preComputeColors() {
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i] = Util.color8Hex(this.colors[i]);
        }
    }

    get shape() {
        if (!this.#particleShape) {
            this.#particleShape = new MemShape();
            this.#particleShape.set('particleColor',  'UInt8');
            this.#particleShape.set('startSize',      'Float32');
            this.#particleShape.set('particleSize',   'Float32');
            this.#particleShape.set('sizeDecay',      'Float32');
            this.#particleShape.set('dragRate',       'Float32');
            this.#particleShape.set('dragDelta',      'Float32');
            this.#particleShape.set('tileOpaqueId',   'UInt16');
            this.#particleShape.build();
        }
        return this.#particleShape;
    }

    get sizeBytes() {
        return this.shape.sizeOf;
    }

    /**
     * Override the name of the particle type. If you reuse a particle type, you need
     * to differentiate them by name or the particle engine will use the first instance
     * provided.
     * @param {String} name - The particle name
     */
    set name(name) {
        this.$name = name;
    }

    /**
     * Get the name of this particle type.
     * @returns {String} The name of the particle type
     */
    get name() {
        return this.$name;
    }

    /**
     * The opaque Id references this type of particle. This is used to identify particles in the engine's memory.
     * @type {number} - The opaque Id of the particle type
     */
    set opaqueId(opaqueId) {
        this.#opaqueId = opaqueId;
    }

    /**
     * The opaque Id representing this particle type
     * @returns {number}
     */
    get opaqueId() {
        return this.#opaqueId;
    }

    /**
     * Called when a particle is spawned to initialize its settings.
     * @param {number} time - The current world time in milliseconds
     * @param {BasicParticle} config - The particle's configuration
     * @param {Spark} header - The particle header
     * @param {Spark} heap - The particle's instantaneous memory
     * @returns {number} The particle's lifespan
     */
    spawn(time, config, header, heap) {
        // assign the heap segment BEFORE any operations
        this.shape.segment = heap;

        // color: index to the computed color array
        const color = $Math.randomRangeInt(0, config.colors.length - 1);
        this.shape.particleColor = color;

        // initial size of the particle
        const initSize = $Math.getRangeValue(config.particleSize);
        this.shape.startSize = initSize;

        // the size of the particle as rendered (this value will change)
        this.shape.particleSize = initSize;

        // rate of size decay
        this.shape.sizeDecay = config.sizeDecay;

        // the drag for the particle (this value changes)
        this.shape.dragRate = $Math.getRangeValue(config.drag);

        // rate of drag increase
        this.shape.dragDelta = $Math.getRangeValue(config.dragRate);

        // tile or point?
        let tile = BasicParticle.AS_POINT;
        if (this.tileSheet !== null) {
            // select a random tile
            tile = this.tileSheet.getTileAt($Math.randomRangeInt(0, this.tileSheet.count)).opaqueId;      // 16-bit unsigned int
        }

        this.shape.tileOpaqueId = tile;

        // generate a lifespan for the particle
        return $Math.getRangeValueInt(config.lifeSpan);               
    }

    /**
     * Update the particle
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
     * @param {Spark} header - The particle's header
     * @param {Spark} heap - The memory segment containing the particle's instantaneous properties
     * @param {Float32Array} pos - The particle's current position (2-element x & y)
     * @param {Float32Array} vel - The particle's velocity vector (2-element x & y)
     * @param {UInt16Array} life - Remaining life of the particle (1-element)
     */
    update(time, deltaTime, header, heap, pos, vel, life) {
        // assign the segment BEFORE any operations
        this.shape.segment = heap;

        const lifeSpan = header.lifeSpan;
        const initSize = this.shape.startSize;
        const sizeDecay = this.shape.sizeDecay;

        // shrink over the lifespan
        if (sizeDecay > 0.0) {
            this.shape.particleSize = ((life[0] / lifeSpan) * initSize) / sizeDecay;
        }

        if (this.shape.particleSize <= 0.0) {
            // kill the particle
            life[0] = 0;
        }
        
        // get the drag and drag rate
        const curDrag = this.shape.dragRate;
        const dragDelta = this.shape.dragDelta;

        // calculate instaneous drag
        const drag = curDrag === 0 ? 1 : (1 / curDrag);

        // write back the updated drag
        this.shape.dragRate = drag + dragDelta;

        // add velocity to position then add gravity to velocity
        const cV = [vel[0], vel[1]];
        const v = $Math.vecMulScalar(cV, drag);
        v[0] += this.gravity[0];
        v[1] += this.gravity[1];
        const p = [pos[0], pos[1]];
        p[0] += v[0];
        p[1] += v[1];
        pos[0] = p[0]
        pos[1] = p[1];
        vel[0] = v[0];
        vel[1] = v[1];
    }

    /**
     * Render the particle
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {Spark} header - The particle header
     * @param {Spark} heap - The particle's instantaneous memory
     * @param {Float32Array} pos - The current position of the particle
     * @param {Uint16Array} life - the life left in the particle
     * @param {String} target - The name of the renderer ('canvas', 'webgl', ...)
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @type {Function}
     */
    render(time, deltaTime, header, heap, pos, life, target, surface) {
        // assign the memory segment BEFORE any access to the shape
        this.shape.segment = heap;

        // get the tile's opaque Id or 0 if it's a simple point
        const opaqueId = this.shape.tileOpaqueId;

        switch (target) {
            case 'canvas':
                if (opaqueId === BasicParticle.AS_POINT) {
                    this.drawShape(time, deltaTime, surface, header, heap, pos);
                } else {
                    this.drawTile(opaqueId, surface, header, heap, pos);
                }
                break;
            case 'webgl':
                break;
        }
    }

    /**
     * Render the particle - a filled rectangle
     * @param {ParticleEngine} pEngine - The particle engine
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The current position of the particle
     * @type {Function}
     */
    drawShape(time, deltaTime, surface, header, heap, pos) {
        // assign the memory segment BEFORE any access to the shape
        this.shape.segment = heap;

        // color index
        const colorIdx = this.shape.particleColor;

        // step over initial size to get the current size
        const curSz = this.shape.particleSize;
        const sz = Math.ceil(curSz / 2);
        const pX = pos[0];
        const pY = pos[1];

        surface.fillStyle = this.colors[colorIdx];
        surface.fillRect(pX - sz, pY - sz, curSz, curSz);
    }

    /**
     * Render the particle - a tile
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The current position of the particle
     * @type {Function}
     */
    drawTile(opaqueId, surface, header, heap, pos) {
        this.shape.segment = heap;
        const tile = Assembler.assemblerInstance.getCompiledTile(opaqueId);
        const frame = tile.frameRect;
        const pX = pos[0];
        const pY = pos[1];
        surface.drawImage(tile.sourceImage, frame[0], frame[1], frame[2], frame [3], pX, pY, frame[2], frame[3]);
    }

    
    /**
     * Called to clean up the particle, such as for freeing resources
     * @param {Spark} heap - The memory object containing the particle's instantaneous properties
     * @type {Function}
     */
    cleanUp(heap) {
    }

    /**
     * Reduce the particle types to their names
     * @returns {Object}
     */
    dehydrate() {
        const props = super.dehydrate();
        props.opaqueId = this.#opaqueId;
        props.tileSheet = this.tileSheet ? {name: this.tileSheet.$name, resourceUrl: this.tileSheet.resourceUrl.toString()} : null;
        return props;
    }

    /**
     * Replace particle types with their configured instances
     * @returns 
     */
    async rehydrate(obj) {
        if (obj.tileSheet !== null) {
            const sheet = new TileSheet(obj.tileSheet.name, obj.tileSheet.resourceUrl);
            await sheet.loading();
            obj.tileSheet = sheet;
        }

        await super.rehydrate(obj);
        return obj;
    }
}