import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';

import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';

import $Math from '../../../../src/engine/core/lang/Math.js';
import Util from '../../../../src/engine/core/Util.js';

import SwitchPanel from '../../../../src/engine/ui/SwitchPanel.js';

// effect and particle types
import { pEffect, pEffect2, wEffect1, wEffect2, sparkEffect, smokeEffect } from './effects.js';
import { eParticle, eParticle2, eParticle3, eParticle4, wParticle, sparkParticle, trailParticle, chaff, smokeParticle } from './particles.js';

self.PARTICLE_ENGINE_OPTIONS = {
    maxParticles: 30000
};

self.PARTICLE_THREADING_OPTIONS = {
    workers: 4,
    framesPerSecond: 80
};

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            trackPerformance: false,
            pragmaDebugging: true,
            objectOrigins: false,
            showParticleWorkersPiP: true,
            showParticleEngineLoad: true
        },
        threading: {
            particles: true
        }
    },
    world: {
        renderContext: new RenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                {
                    doubleBuffered: true,
                    useCompiler: true
                }
            ),
            { 
                enableCulling: false
             }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    },
    hooks: {
        onLoad: () => { RenderEngine.loading("Please wait..."); },
        onStart: () => { RenderEngine.doneLoading(); }
    }
});

// set background to blue
document.getElementById("context").classList.add("types-and-effects");

const p = new SwitchPanel(document.body, {
    label: 'Particle Control',
    groups: [
        {
            label: 'Toggle Particle Effects',
            buttons: {
                'Burst (off)': () => { return toggleBurstEffect(); },
                'Fountain (off)': () => { return toggleFountainEffect(); },
                'Trails (off)': () => { return toggleTrailEffect(); },
                'Sparks (off)': () => { return toggleSparkEffect(); },
                'Smoke (off)': () => { return toggleSmokeEffect(); }
            }
        }
    ]
});

//----------------------------------
// configure the particle engine

// add the particle types and effects
RenderEngine.particleEngine.addParticleTypes(eParticle, eParticle2, eParticle3, eParticle4, wParticle, sparkParticle, trailParticle, chaff, smokeParticle);
RenderEngine.particleEngine.addEffects(pEffect, pEffect2, wEffect1, wEffect2, sparkEffect, smokeEffect);

// initialize the particle engine
await RenderEngine.particleEngine.initialize();

//-----------------------------------
// burst effect 

const explosionObject = new GameObject();
explosionObject
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//----------------------------------
// fountain effects

const fountain1 = new GameObject();
fountain1
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

const fountain2 = new GameObject();
fountain2
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//---------------------------------
// spark effects

const sparkObject = new GameObject();
sparkObject
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//---------------------------------
// smoke effect
const smoker = new GameObject();
smoker
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//----------------------------------       
// add the objects to the render engine world
RenderEngine.world.addObjects(explosionObject, fountain1, fountain2, sparkObject, smoker);

// set the positions of the various static objects in the world
fountain1.PARTS.transform.position = [5, 580];
fountain2.PARTS.transform.position = [795, 580];
sparkObject.PARTS.transform.position = [0, 5];
smoker.PARTS.transform.position = [400, 600];

// configure fountain and smoke emitters and enable them to continuously emit particles
const emitter1 = fountain1.PARTS.emitter;
const emitter2 = fountain2.PARTS.emitter;
const smokeEmitter = smoker.PARTS.emitter;

emitter1.effect = wEffect1;
emitter2.effect = wEffect2;
smokeEmitter.effect = smokeEffect;

// emitter1.enable();
// emitter2.enable();
// smokeEmitter.enable();

// configure spark emitters and enable them to continuously emit particles
const sparkEmitter = sparkObject.PARTS.emitter;
sparkEmitter.effect = sparkEffect;
//sparkEmitter.enable();

// generate an explosion randomly every 80 to 200 milliseconds
let explodeTimeout = null;
function explode() {
    explosionObject.PARTS.transform.position = [$Math.randomRangeInt(10, 790), $Math.randomRangeInt(5, 300)];

    // choose a random effect
    explosionObject.PARTS.emitter.effect = Util.selectRandomOf(pEffect, pEffect2);
    explosionObject.PARTS.emitter.once();
    explodeTimeout = setTimeout(explode, $Math.randomRangeInt(80, 200));
}

// // start the first explosion
//explode();

function toggleBurstEffect() {
    if (explodeTimeout !== null) {
        clearTimeout(explodeTimeout);
        explodeTimeout = null;
        return 'Burst (off)';
    } else {
        explode();
        return 'Burst';
    }
}

function toggleFountainEffect() {
    if (emitter1.enabled) {
        emitter1.disable();
        return 'Fountain (off)';
    } else {
        emitter1.enable();
        return 'Fountain';
    }
}

function toggleTrailEffect() {
    if (emitter2.enabled) {
        emitter2.disable();
        return 'Trails (off)';
    } else {
        emitter2.enable();
        return 'Trails';
    }
}

function toggleSparkEffect() {
    if (sparkEmitter.enabled) {
        sparkEmitter.disable();
        return 'Sparks (off)';
    } else {
        sparkEmitter.enable();
        return 'Sparks';
    }
}

function toggleSmokeEffect() {
    if (smokeEmitter.enabled) {
        smokeEmitter.disable();
        return 'Smoke (off)';
    } else {
        smokeEmitter.enable();
        return 'Smoke';
    }
}


// Start the render loop   
RenderEngine.start();

// What's going on here...
DemoHelper.showInfo( 
  `<p>
  The <b>RenderEngine4</b>'s particle system is extremely flexible. Everything from
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/Particle.js', {className:'Particle'})">Particle</a>
  to <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/ParticleEffect.js', {className:'ParticleEffect'})">ParticleEffect</a>
  is customizable. There are several existing particle types and effects to start with, or you can
  create your own.
  </p>
  <p>
  This example features:
  <ul>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/BasicParticle.js', {className:'BasicParticle'})">BasicParticle</a>
  for the bursts</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/effects/FountainEffect.js', {className:'FountainEffect'})">FountainEffect</a>
  for both the fountain and trails.</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/TrailParticle.js', {className:'TrailParticle'})">TrailParticle</a>
  draws trails behind particles as they are emitted.</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/SparkParticle.js', {className:'SparkParticle'})">SparkParticle</a>
  makes streaks with hot spots.</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/SmokeParticle.js', {className:'SmokeParticle'})">SmokeParticle</a>
  creates wispy smoke that is affected by zones of influence.</li>
  </ul>
  </p>
`);
