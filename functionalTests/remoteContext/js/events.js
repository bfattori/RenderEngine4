import { Event } from '../../../src/engine/core/EventEngine.js';

class StartupEvent extends Event {
    consume(consumer) {
        super.consume(consumer);
        return "start";
    }
}

class ShutdownEvent extends Event {
    consume(consumer) {
        super.consume(consumer);
        return "start";
    }
}

export {
    StartupEvent,
    ShutdownEvent
};

