import LoadCounter from './LoadCounter.js';
export default class FPSCounter extends LoadCounter {
    constructor() {
        super('Engine Load', {
                top: 10,
                right: 10,
                filteringStrength: 1000,
                counters: ['FPS', 'Update', 'Render', 'CPU'],
                options: {
                    'FPS': { suffix: ' fps' },
                    'Update': { bar: true, suffix: '%', color: '#f17783'},
                    'Render': { bar: true, suffix: '%', color: '#9978e6' },
                    'CPU': { bar: true, suffix: '%', color: '#8de977' }
                }
            });
    }

    frame(frameTime, frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd) {
        const updateTick = ((updateEnd - updateStart) / frameTime) * 100;
        const renderTick = ((renderEnd - renderStart) / frameTime) * 100;
        const totalTick = ((frameEnd - frameStart) / frameTime) * 100;
        const instantFPS = 1000 / frameTime;

        super.update('FPS', instantFPS);
        super.update('Update', Math.min(updateTick, 100));
        super.update('Render', Math.min(renderTick, 100));
        super.update('CPU', Math.min(totalTick, 100));
    }
}