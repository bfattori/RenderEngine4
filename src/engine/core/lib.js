import Config from './Config.js';
import Console from './Console.js';
import Engine from './Engine.js';
import Enum from './Enum.js';
import EventEngine from './EventEngine.js';
import GameWorld from './GameWorld.js';
import $Math from './Math.js';
import { Matrix2d } from './Matrix.js';
import RenderEngineError from './RenderEngineError.js';
import TransferrableConfig from './TransferrableConfig.js';
import Util from './Util.js';

const Paths = {
    /**
     * The engine Url: `./src/engine` 
     * @returns {String}
     */
    get engine() {
        return Engine.engine.options.system.engineLocation.toString();
    },
    /**
     * The engine startup invocation Url: `./renderEngine4.js`
     * @returns {String}
     */
    get startup() {
        return Engine.engine.options.system.startupLocation.toString();
    },
    /**
     * The game location url
     * @returns {String}
     */
    get game() {
        return Engine.engine.options.system.gameLocation.toString();
    }
};


export {
    // engine classes
    Console,
    Config,
    TransferrableConfig,
    $Math,
    Matrix2d,
    RenderEngineError,
    Util,
    Engine,
    Enum,
    EventEngine,
    GameWorld,

    // engine releative paths
    Paths
};