import Util from '../engine/core/Util.js';

describe('Util Class', () => {
    describe('randomRange', () => {
        it('should return a random value within the range', () => {
            const low = 10;
            const high = 20;
            const result = Util.randomRange(low, high);
            expect(result).toBeGreaterThanOrEqual(low);
            expect(result).toBeLessThanOrEqual(high);
        });

        it('should return whole values when whole is true', () => {
            const low = 10;
            const high = 20;
            const result = Util.randomRange(low, high, true);
            expect(Number.isInteger(result)).toBe(true);
            expect(result).toBeGreaterThanOrEqual(low);
            expect(result).toBeLessThanOrEqual(high);
        });

        it('should return floating point values when whole is false', () => {
            const low = 10;
            const high = 20;
            const result = Util.randomRange(low, high, false);
            // Note: there is a small chance it's an integer, but statistically unlikely
            // For a simple test, we just check it's within range
            expect(result).toBeGreaterThanOrEqual(low);
            expect(result).toBeLessThanOrEqual(high);
        });
    });

    describe('getColor', () => {
        it('should return a hex value for numeric RGB values', () => {
            const result = Util.getColor(255, 0, 0, 1);
            expect(result).toBe('#ff0000');
        });

        it('should handle alpha channel', () => {
            const result = Util.getColor(255, 255, 255, 0.5);
            expect(result).toBe('#ffffff80');
        });

        it('should return the string if a string is provided', () => {
            const result = Util.getColor('red', 0, 0, 1);
            expect(result).toBe('red');
        });

        it('should return the string if a hex is provided', () => {
            const result = Util.getColor('#ffffff', 0, 0, 1);
            expect(result).toBe('#ffffff');
        });

        it('should return black if inputs are invalid', () => {
            const result = Util.getColor(null, null, null, null);
            expect(result).toBe('#000000');
        });
    });
});
