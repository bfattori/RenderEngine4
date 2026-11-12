import LoadCounter from '../ui/debug/LoadCounter.js';
import CanvasPIP from '../ui/debug/CanvasPIP.js';

const debug = {
  'showParticleEngineLoad': ({ workerCount, maxParticles }) => {
      const config = {
          left: 5,
          width: 150,
          counters: ['Update:Load', 'Update:Time', 'Render:Load', 'Render:Time', 'Render:Particles'],
          options: {
              'Update:Time': { suffix: ' ms' },
              'Render:Time': { suffix: ' ms' },
              'Update:Load': { bar: true, suffix: '%', clamp: 100.0 },
              'Render:Load': { bar: true, suffix: '%', clamp: 100.0 },
              'Render:Particles': { color: '#aaf', bar: true, 
                  barCalc: (value) => `${(value / maxParticles) * 100}%`,
                  barContent: (value) => `${value}/${maxParticles}` }
          }
      };

      for (let i = 0; i < workerCount; i++) {
          config.counters.push(`Workers:Thread ${i}`);
          config.options[`Workers:Thread ${i}`] = { bar: true, suffix: '%' }
          config.counters.push(`Particles:Thread ${i}`);
          config.options[`Particles:Thread ${i}`] = { bar: false }
      }

      return new LoadCounter("Particle Engine Load", config);
  },

  'showParticleEngineLoad:update': ({ burden, event, loadView, workerCount, liveParticles }) => {
    let update = 0, render = 0;
    for (let i = 0; i < event.data.metrics.length; i++) {
      if (event.data.metrics[i]) {
        update += event.data.metrics[i].updateTime || 0;
        render += event.data.metrics[i].renderTime || 0;

        const live = event.data.metrics[i].live;
        loadView.update(`Workers:Thread ${i}`, (live !== 0 ? live / burden : 0) * 100);
        loadView.update(`Particles:Thread ${i}`, live);
      }
    }

    // calculate slice of time spent by each worker and update the load view accordingly.
    const updateLoad = (update / workerCount) / event.data.deltaTime;
    const renderLoad = (render / workerCount) / event.data.deltaTime;

    loadView.update('Update:Time', update);
    loadView.update('Render:Time', render);
    loadView.update('Update:Load', isNaN(updateLoad) ? 0 : updateLoad * 100);
    loadView.update('Render:Load', isNaN(renderLoad) ? 0 : renderLoad * 100);
    loadView.update('Render:Particles', liveParticles);
  },

  'showParticleWorkersPiP': ({ showLoad, workerCount }) => {
    let top = 10;
    if (showLoad) top = 120;

    const workerViews = [];
    for (let i = 0; i < workerCount; i++)
      workerViews[i] = new CanvasPIP(`Worker ${i}`, top + (i * 160));

    return workerViews;
  },

  'showParticleWorkersPiP:workerRender': ({ workerView, image }) => {
    workerView.update(image);
  }
};

export default debug;