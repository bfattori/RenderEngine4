import Engine from './Engine.js';

export default {
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

