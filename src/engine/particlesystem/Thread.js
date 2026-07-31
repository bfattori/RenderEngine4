import ParticleEngine from './ParticleEngine.js';
import Particle from './Particle.js';
import ParticleEffect from './ParticleEffect.js';

import $Math from '../core/Math.js';
import { Matrix2d } from '../core/Matrix.js';

self.$Math = $Math;
self.Matrix2d = Matrix2d;

let engineInstance;
addEventListener('message', (event) => {
    let pEngine = null;
    if (event.data.init && event.data.init === 'render') {
        engineInstance = ParticleEngine.getInstance(event.data.width, event.data.height, event.data.config, event.data.threading);
    } else if (event.data.re4 && event.data.re4 === 'render') {
        // this is a render thread call
        switch(event.data.type) {
            case 'type':
                const p = new Particle(event.data.particle.props);
                p.spawn = new Function("$memory", "time", "type", "config", event.data.particle.f['spawn']).bind(self);
                p.update = new Function("time", "deltaTime", "$memory", "pos", "vel", "life", event.data.particle.f['update']).bind(self);
                p.render = new Function("time", "deltaTime", "$memory", "pos", "life", "target", "surface", event.data.particle.f['render']).bind(self);
                p.cleanUp = new Function("$memory", event.data.particle.f['cleanUp']).bind(self);
                engineInstance.addParticleType(event.data.name, p);
                break;
            case 'addEffect':
                const types = event.data.effect.types;
                const e = new ParticleEffect(types);
                for (const prop in event.data.effect.props)
                    e[prop] = event.data.effect.props[prop];

                engineInstance.addEffect(event.data.name, e);
                break;
            case 'addParticles':
                engineInstance.addParticles(event.data.particles);
                break;
            case 'effect':
                engineInstance.runEffect(event.data.pos, event.data.name, event.data.time, event.data.deltaTime);
                break;
            case 'spawn':
                engineInstance.spawnParticle(event.data.pos, event.data.particle);
                break;
            case 'update':
                engineInstance.update(event.data.time, event.data.deltaTime);
                break;
            case 'render':
                engineInstance.renderParticles(event.data.time, event.data.deltaTime, event.data.mask);
                const image = engineInstance.bitmap;
                postMessage({ re4: 'render', type: 'rendered', image: image }, [image]);
                break;
            default:
                console.error('Unknown message type:', event.data.type);
        }
    }
});
