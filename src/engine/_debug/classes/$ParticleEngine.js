
import { canvasDebugObjects } from '../../ui/debug/DebugObjects.js';
import LoadCounter from '../../ui/debug/LoadCounter.js';

const debug = {
  'showParticleEngineLoad': ({init}) => {
    if (init) {
      const config = {
        left: 5,
        counters: ['Update:Load', 'Update:Time', 'Render:Load', 'Render:Time', 'Particles'],
        options: {
          'Update:Time': { suffix: ' ms' },
          'Render:Time': { suffix: ' ms' },
          'Update:Load': { bar: true, suffix: '%', clamp: 100.0 },
          'Render:Load': { bar: true, suffix: '%', clamp: 100.0 },
          'Particles': {}
        }
      }
      return new LoadCounter("Particle Engine Load", config);
    }
  },

  'showParticleEngineLoad:update': ({visible, loadView, overall, load}) => {
    if (visible) {
      loadView.update('Update:Load', load);
      loadView.update('Update:Time', overall);
    }
  },

  'showParticleEngineLoad:render': ({ visible, loadView, renderTime, deltaTime, liveParticles }) => {
    if (visible) {
      // using the last frame time, what
      // is the overall load of the PE on the CPU?
      loadView.update('Render:Load', (renderTime / deltaTime) * 100);
      loadView.update('Render:Time', renderTime);
      loadView.update('Particles', liveParticles);
    }
  },

  'showParticleInfluenceZones': ({ influencers, surface }) => {
    influencers.forEach(zone => {
      canvasDebugObjects.BoundingCircle(surface, zone.pos[0], zone.pos[1], zone.radius);
      canvasDebugObjects.Origin(surface, zone.pos[0], zone.pos[1], `${zone.pos[0]}, ${zone.pos[1]} (r${zone.radius})\nf ${zone.friction}\nr ${zone.restitution}`);
    });
  },

  profiling: {
    color: "tertiary",
    methods: [ "update", "renderParticles" ],
    inTrack: "GameWorld",
    asGroup: "Particle Engine"  
  }
};

export default debug;