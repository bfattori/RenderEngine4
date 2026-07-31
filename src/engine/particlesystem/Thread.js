import ParticleEngine from './ParticleEngine.js';

let engineInstance;
addEventListener('message', (event) => {
    let pEngine = null;
    if (event.data.init && event.data.init === 'render') {
        engineInstance = ParticleEngine.getInstance(event.data.width, event.data.height, event.data.config, event.data.threading);
    } else if (event.data.re4 && event.data.re4 === 'render') {
        // this is a render thread call
        switch(event.data.type) {
            case 'type':
                engineInstance.addParticleType(event.data.name, event.data.particle);
                break;
            case 'addEffect':
                engineInstance.addEffect(event.data.name, event.data.effect);
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
