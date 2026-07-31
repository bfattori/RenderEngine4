import Console from '../engine/core/Console.js';

describe('Console Class', () => {
    let consoleInstance;

    beforeEach(() => {
        consoleInstance = new Console();
    });

    describe('Logging Methods', () => {
        it('should call ref.warn with correct arguments', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            consoleInstance.warn('Test warning');
            expect(warnSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Test warning');
            warnSpy.mockRestore();
        });

        it('should call ref.error with correct arguments', () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            consoleInstance.error('Test error');
            expect(errorSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Test error');
            errorSpy.mockRestore();
        });

        it('should call ref.info with correct arguments', () => {
            const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
            consoleInstance.info('Test info');
            expect(infoSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Test info');
            infoSpy.mockRestore();
        });

        it('should call ref.debug with correct arguments', () => {
            const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
            consoleInstance.debug('Test debug');
            expect(debugSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Test debug');
            debugSpy.mockRestore();
        });

        it('should call ref.info when log() is called', () => {
            const infoSpy = jest.spyOn(consoleInstance, 'info').mockImplementation(() => {});
            consoleInstance.log('Test log');
            expect(infoSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Test log');
            infoSpy.mockRestore();
        });

        it('should handle multiple arguments correctly', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            consoleInstance.warn('Warning', 'Extra', 123);
            expect(warnSpy).toHaveBeenCalledWith('[RenderEngine4]', 'Warning', 'Extra', 123);
            warnSpy.mockRestore();
        });
    });
});
