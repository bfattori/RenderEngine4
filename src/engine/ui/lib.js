import Slider from './Slider.js';
import SwitchPanel from './SwitchPanel.js';

import CanvasPIP from './debug/CanvasPIP.js';
import DebugObjects from './debug/DebugObjects.js';
import FPSCounter from './debug/FPSCounter.js';
import LoadCounter from './debug/LoadCounter.js';

const debug = {
    CanvasPIP: CanvasPIP,
    Objects: DebugObjects,
    FPSCounter: FPSCounter,
    LoadCounter: LoadCounter
};

export {
    // Classes
    Slider,
    SwitchPanel,

    // Packages
    debug
};