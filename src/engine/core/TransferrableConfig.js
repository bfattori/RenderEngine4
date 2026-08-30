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
        this.#transferrable.url = url;
    }

    set $name(name) {
        this.#transferrable.name = name;
    }

    get $name() {
        return this.#transferrable.name;
    }

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
     * An object that is safe for both network or thread messaging. 
     * The object only contains primitives to reconstruct an identical
     * instance where it is used.
     * @return {Object}
     */
    get transferrable() {
        return { url: this.$url, props: { ...this.dehydrate() }, $type: this.$type, $name: this.$name };
    }

    /**
     * Convert this object's complex types into primitive values. Recursively
     * dehydrates tranferrable objects contained in this object.
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
     * Rehydrate primitive values back into their complex types.
     * @returns {TransferrableConfig}
     */
    rehydrate() {
        return this;
    }

    /**
     * Reconstruct the `TransferrableConfig` object, returning a fully configured instance.
     * @param {Object} transferrable - The value from the `transferrable` property of a `TransferrableConfig`
     * @param {Function} binder - Optional function to bind the object to a context
     * @returns {TransferrableConfig}
     */
    static async reconstruct(transferrable, binder = null) {
        try {
            // import the object class into the global scope
            let obj = await import(transferrable.url);
            self[transferrable.$type] = obj.default;
            obj = new self[transferrable.$type](transferrable.props);
            if (binder && typeof binder === 'function') binder(obj);
            obj.$name = transferrable.$name;
            return obj.rehydrate();
        } catch (ex) {
            throw new RenderEngineError(`Error loading "${transferrable.$name}"(${transferrable.$type}) from "${transferrable.url}"`, ex);
        }
    }
}