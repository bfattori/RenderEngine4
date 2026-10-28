import Constants from '../../Constants.js';
import Particle from './Particle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import TileSheet from '../../resources/loaders/TileSheet.js';
import Assembler from '../../rendering/assemblers/Assembler.js';


/**
 * @class BasicParticle
 * @classdesc The BasicParticle class is a fundamental particle type used in the particle system. It defines the properties 
 * and behaviors of individual particles, including their color, size, velocity, drag, lifespan, and rendering methods. The 
 * class provides methods for spawning, updating, rendering, and cleaning up particles, allowing for customization of particle 
 * behavior and appearance. BasicParticle can be extended or configured to create various particle effects within the particle system.
 * @extends Particle
 */
export default class BasicParticle extends Particle {
    /**
     * The size of the particle in bytes
     * @type {number}
     */
    static sizeOf = 23;
    static byteOffset = 31;

    static OFFSETS = {
        COLOR:          BasicParticle.byteOffset + 0,
        ORIG_SIZE:      BasicParticle.byteOffset + 1,
        CUR_SIZE:       BasicParticle.byteOffset + 5,
        SIZE_DECAY:     BasicParticle.byteOffset + 9,
        DRAG:           BasicParticle.byteOffset + 13,
        DRAG_DELTA:     BasicParticle.byteOffset + 17,
        TILE_OPAQUE_ID: BasicParticle.byteOffset + 21
    }

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
             * Gravity effect on the particle (can act in any dimension)
             * @type {Array<number>} - vector of gravitational influence
             */
            gravity: [0.0, 0.0]
        }, url);
        this.merge(overrides);
        this.name = 'basicParticle';
    }

    static getInstance() {
        return new BasicParticle();
    }

    initializeParticleType() {
        super.initializeParticleType();
        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i] = Util.getRGBA(this.colors[i]);
        }
    }

    get memoryRequirement() {
        return Particle.sizeOf + BasicParticle.sizeOf;
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
     * Called when a particle is spawned to initialize its settings.
     * @param {Array<number>} worldPos - X & Y coordinates of the particle
     * @param {number} time - The current world time in milliseconds
     * @param {Particle} config - The particle's configuration
     * @param {Spark} memSegment - The particle's instantaneous memory
     * @returns {number} The particle's lifespan
     */
    spawn(worldPos, time, memSegment) {
        super.spawn(worldPos, time, memSegment);

        // color: index to the computed color array
        const color = $Math.randomRangeInt(0, this.colors.length - 1);
        memSegment.setUint8(BasicParticle.OFFSETS.COLOR, color);

        // initial size of the particle
        const initSize = $Math.getRangeValue(this.particleSize);
        memSegment.setFloat32(BasicParticle.OFFSETS.ORIG_SIZE, initSize);
        memSegment.setFloat32(BasicParticle.OFFSETS.CUR_SIZE, initSize)

        // rate of size decay
        memSegment.setFloat32(BasicParticle.OFFSETS.SIZE_DECAY, this.sizeDecay);

        // the drag for the particle (this value changes)
        memSegment.setFloat32(BasicParticle.OFFSETS.DRAG, $Math.getRangeValue(this.drag));

        // rate of drag increase
        memSegment.setFloat32(BasicParticle.OFFSETS.DRAG_DELTA, $Math.getRangeValue(this.dragRate));

        // tile or point?
        let tile = Particle.AS_POINT;
        if (this.tileSheet !== null) {
            // select a random tile
            tile = this.tileSheet.getTileAt($Math.randomRangeInt(0, this.tileSheet.count)).opaqueId;      // 16-bit unsigned int
        }

        memSegment.setUint16(BasicParticle.OFFSETS.TILE_OPAQUE_ID, tile);
    }

    /**
     * Update the particle
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
     * @param {Spark} memSegment - The memory segment containing the particle's instantaneous properties
     * @param {UInt16} life - Remaining life of the particle
     */
    update(time, deltaTime, memSegment, life) {
        super.update(time, deltaTime, memSegment, life);
        
        const originalLifeSpan = memSegment.getUint16(Particle.OFFSETS.LF_ORIGINAL);   // original lifespan
        const initSize = memSegment.getFloat32(BasicParticle.OFFSETS.ORIG_SIZE);
        const sizeDecay = memSegment.getFloat32(BasicParticle.OFFSETS.SIZE_DECAY);

        // shrink over the lifespan
        let curSize = memSegment.getFloat32(BasicParticle.OFFSETS.CUR_SIZE);
        if (sizeDecay !== 0) {
            curSize = ((life / originalLifeSpan) * initSize) - sizeDecay;
            memSegment.setFloat32(BasicParticle.OFFSETS.CUR_SIZE, curSize);
        }

        if (curSize <= Constants.PARTICLE_SIZE_THRESHOLD) {
            // kill the particle
            this.cleanUp(memSegment);
        } else {

            // get the drag and drag rate
            const curDrag = memSegment.getFloat32(BasicParticle.OFFSETS.DRAG);
            const dragDelta = memSegment.getFloat32(BasicParticle.OFFSETS.DRAG_DELTA);

            // calculate instaneous drag
            const drag = curDrag === 0 ? 1 : (1 / curDrag);

            // write back the updated drag
            memSegment.setFloat32(BasicParticle.OFFSETS.DRAG, drag + dragDelta);

            // add drag and gravity to velocity
            const vel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);
            //const cV = [vel[0], vel[1]];
            const v = $Math.vecMulScalar(vel, drag);
            v[0] += this.gravity[0];
            v[1] += this.gravity[1];

            // store back velocity
            memSegment.setVecF32(Particle.OFFSETS.VELOCITY, v);
        }
    }


    /**
     * Render the particle
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {Spark} memSegment - The particle's instantaneous memory
     * @param {number} lifeSpan - the life left in the particle
     * @param {String} target - The name of the renderer ('canvas', 'webgl', ...)
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @type {Function}
     */
    render(time, deltaTime, memSegment, lifeSpan, target, surface) {
        // get the tile's opaque Id or 0 if it's a simple point
        const opaqueId = memSegment.getUint16(BasicParticle.OFFSETS.TILE_OPAQUE_ID);

        switch (target) {
            case 'canvas':
                if (opaqueId === Particle.AS_POINT) {
                    this.drawShape(time, deltaTime, surface, memSegment);
                } else {
                    this.drawTile(opaqueId, surface, memSegment);
                }
                break;
            case 'webgl':
                break;
        }
    }

    /**
     * Render the particle - a filled rectangle
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @param {Spark} memSegment - The memory object containing the particle's instantaneous properties
     */
    drawShape(time, deltaTime, surface, memSegment) {
        // color index
        const colorIdx = memSegment.getUint8(BasicParticle.OFFSETS.COLOR);

        // update current size
        const curSz = memSegment.getFloat32(BasicParticle.OFFSETS.CUR_SIZE);
        const sz = Math.ceil(curSz / 2);
        const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);

        surface.fillStyle = this.colors[colorIdx];
        surface.fillRect(pos[0] - sz, pos[1] - sz, curSz, curSz);
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
    drawTile(opaqueId, surface, memSegment) {
        const tile = Assembler.assemblerInstance.getCompiledTile(opaqueId);
        const frame = tile.frameRect;
        const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
        surface.drawImage(tile.sourceImage, frame[0], frame[1], frame[2], frame [3], pos[0], pos[1], frame[2], frame[3]);
    }
    
    /**
     * Reduce the particle types to their names
     * @returns {Object}
     */
    dehydrate() {
        const props = super.dehydrate();
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