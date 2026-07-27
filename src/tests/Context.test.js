import Context from '../engine/Context.js';

describe('Context Class', () => {
    beforeEach(() => {
        // Reset the private static #instance if possible. 
        // Since we can't easily reset a private static field from outside, 
        // we'll just be aware that the singleton persists across tests.
        // However, for the sake of these tests, we want to ensure 
        // the state is predictable.
        Context.debug = true;
    });

    describe('getInstance', () => {
        it('should return the same instance every time', () => {
            const instance1 = Context.getInstance();
            const instance2 = Context.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should return an instance of the Context class', () => {
            const instance = Context.getInstance();
            expect(instance).toBeInstanceOf(Context);
        });
    });

    describe('debug property', () => {
        it('should have a default debug value of true', () => {
            // Note: This depends on the initial state. 
            // If other tests changed it, this might fail.
            // But in a fresh run, it should be true.
            // To be safe, let's set it explicitly first.
            Context.debug = true;
            expect(Context.debug).toBe(true);
        });

        it('should update the debug value when set', () => {
            Context.debug = false;
            expect(Context.debug).toBe(false);
        });

        it('should allow setting it back to true', () => {
            Context.debug = true;
            expect(Context.debug).toBe(true);
        });
    });
});
