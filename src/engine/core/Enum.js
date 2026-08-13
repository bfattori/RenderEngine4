import RenderEngineError from './RenderEngineError.js';
import Util from './Util.js';

export default class Enum extends Map {
    constructor(values) {
        super();
        const mapped = {};
        const $this = this;

        if (Array.isArray(values)) {
            values.map((item, ordinal) => {
                this.set(ordinal, {sym: Symbol(item), label: item});
                mapped[item] = {
                    [Symbol.toPrimitive](hint) {
                        if (hint === "number") {
                            return ordinal;
                        } else if (hint === "string") {
                            return $this.get(ordinal).label;
                        }

                        return null;
                    }
                }            
            });
        } else if (typeof values === 'function') {
            const result = values();
            result.map((item, ordinal) => {
                this.set(ordinal, {sym: Symbol(item), label: item});
                mapped[item] = {
                    [Symbol.toPrimitive](hint) {
                        if (hint === "number") {
                            return ordinal;
                        } else if (hint === "string") {
                            return $this.get(ordinal).label;
                        }

                        return $this.get(ordinal).sym;
                    }
                }             
            });
        } else if (typeof values === 'object') {
            Object.keys(values).forEach((item, ordinal) => {
                if (typeof values[item] === 'function')
                    values[item] = values[item](item);

                this.set(ordinal, {sym: Symbol(values[item]), label: values[item]});
                mapped[item] = {
                    [Symbol.toPrimitive](hint) {
                        if (hint === "number") {
                            return ordinal;
                        } else if (hint === "string") {
                            return $this.get(ordinal).label;
                        }

                        return $this.get(ordinal).sym;
                    }
                }
            });
        } else {
            throw new RenderEngineError(`Unknown value type "${typeof values}" for Enum`);
        }

        Util.lombok(this, Object.freeze(mapped), false);
    }
}