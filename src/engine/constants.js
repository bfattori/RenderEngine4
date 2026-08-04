function NOP() {};
function ENGINE_ERRORS(error, ...args) { console.error(error, ...args) }

/**
 * Constants used throughout the RenderEngine4 engine
 */
const Constants = {
    // Component priorities (higher priority executes first)
    defaultPriority: 0.5,
    
    // InputComponent priority - highest priority for immediate response
    INPUT_PRIORITY: 0.0,
    
    // TransformComponent priority - updated each frame before rendering
    TRANSFORM_PRIORITY: 0.5,
    
    // ColliderComponent priority - runs at mid-cycle
    COLLIDER_PRIORITY: 0.8,
    
    // RenderComponent priority - renders after updates complete
    RENDER_PRIORITY: 1.0,
    
    // SoundComponent priority - handles audio playback independently
    SOUND_PRIORITY: 0.92,

    // Particle emitter priority
    PARTICLE_RENDER_PRIORITY: 0.98,

    /* No operation: () => {} */
    NOOP: NOP,
    
    /* Engine error logging */
    ERROR_LOGGER: ENGINE_ERRORS,

    VECTOR_DEFAULTS: {
        LINE_HEIGHT: 15,
        LINE_COLOR: '#00000000',
        FILL_COLOR: '#00000000',
        LINE_WIDTH: 1,
        FONT_SIZE: 10,
        
        MAX_FONT_SIZE: 200,
        TEXT_BOLD: 2,
        SPACE_WIDTH: 10,
        CHAR_SPACING: 3,
        FONT_SCALE: 2.0
    },

    /* Default Point Size */
    POINT_SIZE: 0.5,

    /* PI's cousins */
    TWO_PI: Math.PI * 2,
    HALF_PI: Math.PI / 2,

    /* Function Compilation */
    COMPILATION: {
        FAILED: -1,
        NOT_SUPPORTED: -2
    },

    /* Particle Engine */
    MAX_PARTICLES: 3000,

    /* Base Vectors */
    UP_VECTOR: [1, -1],
    DOWN_VECTOR: [1, 1],

    /* Load Counters */
    LOAD_COUNTER_DEFAULTS: {
        top: 10,
        width: 130,
        filteringStrength: 10
    },
    DEFAULT_COUNTER_FORMAT: {
        bar: false,
        smoothing: true,
        color: null,
        prefix: '',
        suffix: ''
    },
    DEFAULT_FILTER_STRENGTH: 10
};

export default Constants;

export {
    NOP,
    ENGINE_ERRORS
};
