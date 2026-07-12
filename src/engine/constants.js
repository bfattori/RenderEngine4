import Console from './core/Console.js';

function NOP() {};
function ENGINE_ERRORS(error, ...args) { Console.error(error, ...args) }

/**
 * Constants used throughout the RenderEngine4 engine
 */
const Constants = {
    // Component priorities (higher priority executes first)
    defaultPriority: 0.5,
    
    // InputComponent priority - highest priority for immediate response
    INPUT_PRIORITY: 1.0,
    
    // TransformComponent priority - updated each frame before rendering
    TRANSFORM_PRIORITY: 0.8,
    
    // ColliderComponent priority - runs at mid-cycle
    COLLIDER_PRIORITY: 0.5,
    
    // RenderComponent priority - renders after updates complete
    RENDER_PRIORITY: 0.0,
    
    // SoundComponent priority - handles audio playback independently
    SOUND_PRIORITY: 0.15,
    
    // Particle rendering priority
    PARTICLE_RENDER_PRIORITY: 0.13,

    // No operation
    NOOP: NOP,
    
    // Console error logging
    ERROR_LOGGER: ENGINE_ERRORS,

    // Compilation
    COMPILATION_FAILED: -1,
    COMPILATION_NOT_SUPPORTED: -2,

    EVENT_INPUT_UPDATE: 'input',
    EVENT_PRE_TRANSFORM: 'transform',
    EVENT_TRANSFORM_UPDATE: 'commit',
    EVENT_COLLIDER_UPDATE: 'collider',
    EVENT_COLLISION: 'collision',
    
    // Default engine configuration options
    DEFAULT_ENGINE_OPTIONS: {
        flags: {
            debugMode: false,
            performanceLogging: false,
            showFps: false
        },
        world: {
            fps: 60,
            dimensions: [800, 600],
            viewport: [0, 0, 800, 600],
            backgroundColor: 'black',
            renderPlanes: 3,
            camera: null,
            renderContext: null,
            collisionModel: null
        },
        threading: {
            render: {
                enabled: false,
                priority: 0,
                name: 'RE4 Render Thread',
            },
            collision: {
                enabled: false,
                priority: 0,
                name: 'RE4 Collision Thread',
            },
        },
        hooks: {
            // Licecycle hooks
            onInit: NOP,
            onStart: NOP,
            onStop: NOP,
            onReset: NOP,
            onShutdown: NOP,
            
            // Stateful runtime hooks
            onError: ENGINE_ERRORS,

            /**
             * Triggered when a world collision event occurs.
             * @param {CollisionData} collisionData - Collision data containing information about the collision. See {@link }
             */
            onCollision: (collisionData) => {},

            // --------------------------
            // FRAME LIFECYCLE HOOKS
            // --------------------------

            /**
             * Triggered at the start of a frame.
             * @param {number} time - The current engine time
             */
            onBeforeFrame: (time) => {},

            /**
             * Triggered before world update.
             * @param {number} deltaTime - The delta time since the beginning of frame generation
             */
            onBeforeUpdate: (deltaTime) => {},

            /**
             * Triggered after world update.
             * @param {number} deltaTime - The delta time since the beginning of frame generation
             * @param {number} updateTime - The total time to update the world.
             */
            onUpdate: (deltaTime, updateTime) => {},

            /**
             * Triggered before frame rendering.
             * @param {number} deltaTime - The delta time since the beginning of frame generation
             */
            onPreRender: (deltaTime) => {},

            /**
             * Triggered after frame rendering.
             * @param {number} deltaTime - The delta time since the last frame beginning of frame generation
             * @param {number} renderTime - The total time to render the frame.
             */
            onRender: (deltaTime, renderTime) => {},

            /**
             * Triggered at the end of a frame.
             * @param {number} frameTime - The total time to generate the frame.
             */
            onFrame: (frameTime) => {}
        },
        canvasDefaults: {
            filter: "none",
            globalAlpha: 1.0,
            globalCompositeOperation: "source-over",
            lineDashOffset: 0.0,
            lineJoin: "round",
            lineCap: "round",
            miterLimit: 10.0,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: "low",
            font: "10px sans-serif",
            letterSpacing: 0,
            textRendering: "auto"
        }
    }
};

export default Constants;
