import Config from '../core/Config.js';

export default class Sound extends Config {
    static TYPE = new Enum({
        LOOP: 'loop',
        ONCE: 'once',
        BACKGROUND: 'background'
    });

    constructor(name, soundSheet, soundDef) {
        super({
            name: name,
            type: Sound.TYPE.LOOP,
            soundSheet: soundSheet,
            soundDef: soundDef
        });
    }
}