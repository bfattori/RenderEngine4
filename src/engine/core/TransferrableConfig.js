import Config from './Config.js';
import Context from '../Context.js';
import RenderEngineError from '../core/RenderEngineError.js';

const ctx = Context.getInstance();

/**
 * A transferrable config can be used to reconstruct the config object
 * in a thread or remotely.
 * @class
 * @extends Config
 */
export default class TransferrableConfig extends Config {
    #transferrable = {
        name: null,
        url: null
    };

    constructor(opts, url = import.meta.url) {
        super(opts);
        opts.name !== undefined ? this.$name = opts.name : this.$name = null; 
        this.#transferrable.url = url;
    }

    /**
     * Set the transferrable object's unique name. Think of this like a variable name, it
     * allows the receiving end to identify this instance type amongst others of the same class.
     * @param {String} name - A user-defined name
     */
    set $name(name) {
        this.#transferrable.name = name;
    }

    /**
     * Returns the user-defined name that makes this class instance unique from others like it.
     * @returns {String} The instance name
     */
    get $name() {
        return this.#transferrable.name;
    }

    /**
     * Returns the URL where the instance's class constructor is located.
     * @returns {URL} The URL where the class is located
     */
    get $url() {
        return this.#transferrable.url;
    }

    /**
     * The type of object represented
     * @returns {String}
     */
    get $type() {
        return this.constructor.name;
    }

    /**
     * Used in conjunction with dehydration/rehydration, builds an `JSON` object that is safe to transmit
     * with `.postMessage()` of most classes that provide it. The object returned represents the primitive
     * form of a transferrable's instance.
     * 
     * Ex:
     * ```json
     * {
     *   "url": "https://localhost:8080/.../re4/src/engine/particleSystem/types/SmokeParticle.js",
     *   "$type": "SmokeParticle",
     *   "$name": "smoky_1"
     *   "props": {
     *     "colors": ["#ff0000", "#fe24a8"],
     *     "particleSize": 3.5,
     *     "tileSheet": "https://localhost:8080/.../game/assets/tileSheets/game-tiles.json"
     *   }
     * }
     * ```
     * 
     * @return {Object}
     */
    get transferrable() {
        return { url: this.$url, props: { ...this.dehydrate() }, $type: this.$type, $name: this.$name };
    }

    /**
     * Dehydration is the serialization of complex types into primitives to simplify sharing objects
     * with systems that support `.postMessage()`. Dehydration is the mechanism which `TransferrableConfig`
     * uses to simplify what is sent to the other end.
     * 
     * Sub-classes provide the dehydration of the complex types supported by that class to transmit the
     * information as primitive types that can be rehydrated elsewhere.
     * 
     * The example below demonstrates turning the `Particle` types (complex) used by the `ParticleEffect`
     * into the user-defined name of the particle (primitive).
     * 
     * @example 
     *    dehydrate() {
     *      const props = super.dehydrate();
     *      props.particleTypes = props.particleTypes.map(e => e.$name);
     *      return props;
     *    }
     *
     * @returns {Object} A primitives-only object representing the config
     */
    dehydrate() {
        const t = {};
        Object.keys(this.opts).forEach(key => {
            const value = this.opts[key];
            if (Array.isArray(value)) {
                t[key] = value.map(v => {
                    if (v instanceof TransferrableConfig)
                        return v.transferrable;
                    else 
                        return v;
                });
            } else if (value instanceof TransferrableConfig) {
                t[key] = value.transferrable;
            } else if (typeof value === 'object') {
                let o = value;
                if (value !== null && !value.enum && value.forEach) {
                    o = {};
                    value.forEach((k, v) => {
                        if (v instanceof TransferrableConfig) {
                            o[k] = v.transferrable;
                        } else if (Array.isArray(v)) {
                            o[k] = v.map(val => {
                                if (val instanceof TransferrableConfig)
                                    return val.transferrable;
                                else 
                                    return v;
                            });
                        } else {
                            o[k] = v;
                        }
                    });
                }
                t[key] = o;
            } else {
                t[key] = value;
            }
        });
        return t;
    }

    /**
     * Rehydrate an object that was dehydrated in another location (memory, network, etc.). Rehydration is
     * the mechanism that `TransferrableConfig` uses to rebuild an object that was sent from somewhere else.
     * All of the classes that were dehydrated in the sending location must be available in the receiving
     * location.
     * 
     * When an object is rehydrated, it must first be reconstructed in the target environment. The static
     * `reconstruct()` method is used to create an unconfigured instance of the class that was dehydrated 
     * in the sending location. The primitive properties are rehydrated into actual objects by the sub-classes
     * the dehydrated them.
     * 
     * The example below shows how `ParticleEffect waits until the particle instances it is looking for
     * exist in memory. Once available, the effect can be instantiated and replace the particle names
     * with the particle instances.
     * 
     * @example
     * async rehydrate(obj) {
     *   await new Promise((resolve) => {
     *       const resolveParticleTypes = () => {
     *           const success = obj.particleTypes.every(e => this.engine.typesByName.get(e));
     *           if (success)
     *               return resolve(true);
     *           else
     *               setTimeout(resolveParticleTypes, 250);
     *       };
     *       resolveParticleTypes();
     *   });
     *
     *   obj.particleTypes = obj.particleTypes.map(e => this.engine.typesByName.get(e));
     *   await super.rehydrate(obj);
     *   return obj;
     * }
     * 
     * @param {Object} props - The properties to be rehydrated into a new object
     * @returns {Object} A plain object carrying the transferrable's properties
     */
    async rehydrate(props) {
        this.merge(props);
        return props;
    }

    /**
     * Reconstruct the `TransferrableConfig` object, which in turn calls `rehydrate()` to return 
     * a configured instance matching the sending environment.
     * 
     * @example const particle = await TransferrableConfig.reconstruct(data.particle, (obj) => {obj.engine = this.instance;});
     * @param {Object} transferrable - The value from the `transferrable` property of a `TransferrableConfig`
     * @param {Function} binder - Optional function to bind the object to a context
     * @returns {TransferrableConfig}
     */
    static async reconstruct(transferrable, binder = null) {
        try {
            let obj;
            
            // If the transferrable's class doesn't exist
            if (self[transferrable.$type] === undefined) {
                // import it's class into the Worker's scope
                obj = await import(transferrable.url);
                self[transferrable.$type] = obj.default;
            }

            // create a new, unconfigured instance of the class
            obj = new self[transferrable.$type]({});

            // some objects need to bind to another object
            // to function properly
            if (binder && typeof binder === 'function') binder(obj);
            
            // rehydrate the object with transferrable's properties and name it
            await obj.rehydrate(transferrable.props);
            obj.$name = transferrable.$name;
            return obj;
        } catch (ex) {
            throw new RenderEngineError(`Error loading "${transferrable.$name}"(${transferrable.$type}) from "${transferrable.url}"`, ex);
        }
    }
}