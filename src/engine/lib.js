/**

 * RenderEngine4 Library File
 */

// Core Engine
import {
    Config,
    Console,
    Engine,
    Enum,
    EventEngine,
    GameWorld,
    $Math,
    Matrix2d,
    RenderEngineError,
    TransferrableConfig,
    Util,

    Paths
} from './core/lib.js';

// Component Parts
import {
    ComponentPart,
    ComponentPartError,
    ComponentPartEvent,

    // packages
    collision,
    input,
    render as componentRender,
    sound,
    transform
} from './parts/lib.js';

// Render packages
import {
    assemblers,
    cameras,
    contexts,
    renderers,
    shapes
} from './rendering/lib.js';

// Resource Loaders and Types
import {
    ResourceError,
    Sound,
    Sprite,
    Tile,

    loaders
} from './resources/lib.js';

// User Interface
import {
    Slider,
    SwitchPanel,

    debug
} from './ui/lib.js';

export const core = {
    Config,
    Console,
    Engine,
    Enum,
    EventEngine,
    GameWorld,
    $Math,
    Matrix2d,
    RenderEngineError,
    TransferrableConfig,
    Util,

    Paths
};

export const parts = {
    ComponentPart,
    ComponentPartError,
    ComponentPartEvent,

    // packages
    collision,
    input,
    render: componentRender,
    sound,
    transform
};

export const render = {
    assemblers,
    cameras,
    contexts,
    renderers,
    shapes
};

export const resource = {
    ResourceError,
    Sound,
    Sprite,
    Tile,

    // packages
    loaders
};

export const ui = {
    Slider,
    SwitchPanel,

    // package
    debug
};

export const R = {
    core,
    parts,
    render,
    resource,
    ui
};
