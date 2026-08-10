import LoadCounter from './LoadCounter.js';
export default class FPSCounter extends LoadCounter {
    constructor() {
        super('Game Engine Load', {
                top: 10,
                right: 10,
                filteringStrength: 1000,
                counters: ['FPS', 'Update', 'Render', 'Frame'],
                options: {
                    'FPS': { suffix: ' fps' },
                    'Update': { bar: true, suffix: '%', color: '#f17783', clamp: 100.0 },
                    'Render': { bar: true, suffix: '%', color: '#9978e6', clamp: 100.0 },
                    'Frame': { bar: true, suffix: '%', color: '#8de977', clamp: 100.0 }
                }
            });
    }

    frame(frameTime, frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd) {
        const updateTick = ((updateEnd - updateStart) / frameTime) * 100;
        const renderTick = ((renderEnd - renderStart) / frameTime) * 100;
        const totalTick = ((frameEnd - frameStart) / frameTime) * 100;
        const instantFPS = 1000 / frameTime;

        super.update('FPS', instantFPS);
        super.update('Update', updateTick);
        super.update('Render', renderTick);
        super.update('Frame', totalTick);
    }
}