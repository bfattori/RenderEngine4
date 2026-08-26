import Constants from '../Constants.js';

/**
 * RenderEngine4 math functions
 */
export default class $Math {
    /**
     * An approximation of PI (3.14159)
     * @type {number}
     */
    static PI = 3.14159;

    /**
     * An approximation of PI*2 (6.28318)
     * @type {number}
     */
    static TWO_PI = 6.28318;

    /**
     * An approximation of the inverse of PI (0.31831)
     * @type {number}
     */
    static INV_PI = 0.31831;

    /**
     * Convert degrees to radians.
     * @param {number} degrees An angle in degrees
     * @return {number} The degrees value converted to radians
     */
    static degToRad(degrees) {
        return (0.01745 * degrees);
    }

    /**
     * Convert radians to degrees.
     * @param {number} radians  An angle in radians
     * @return {number} The radians value converted to degrees
     */
    static radToDeg(radians) {
        return (radians * 180 / $Math.PI);
    }

    /**
     * Clamp a value between a minimum and maximum value
     * @param {Number} num - The value 
     * @param {Number} min - The minimum value 
     * @param {Number} max - The maximum value
     * @returns 
     */
    static clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }
 
    //-------------------------------
    // Random functions

    /**
     * Return a random value within the <tt>low</tt> to <tt>high</tt> range,
     * optionally as an integer value only (rounded down to nearest integer)
     *
     * @param low {Number} The low part of the range
     * @param high {Number} The high part of the range
     * @param [whole] {Boolean} Return whole values only
     * @return {Number}
     * @memberof R.lang.Math2
     */
    static randomRange(low, high, whole = false) {
        const v = low + (Math.random() * (high - low));
        return (whole ? Math.floor(v) : v);
    }

    /**
     * Return a random value within the <tt>low</tt> to <tt>high</tt> range,
     * optionally as an integer value only (rounded to nearest integer)
     *
     * @param low {Number} The low part of the range
     * @param high {Number} The high part of the range
     * @param [whole] {Boolean} Return whole values only
     * @return {Number}
     * @memberof R.lang.Math2
     */
    static randomRangeRound(low, high, whole = false) {
        const v = low + (Math.random() * (high - low));
        return (whole ? Math.round(v) : v);
    }

    /**
     * Return a random value within the <tt>low</tt> to <tt>high</tt> range,
     * optionally as an integer value only (next highest integer).
     *
     * @param low {Number} The low part of the range
     * @param high {Number} The high part of the range
     * @param [whole] {Boolean} Return whole values only
     * @return {Number}
     * @memberof R.lang.Math2
     */
    static randomRangeCeil(low, high, whole = false) {
        const v = low + (Math.random() * (high - low));
        return (whole ? Math.ceil(v) : v);
    }

    /**
     * Returns the value given between 0 and a finite set of number of values.
     * If no value is provided, or the value is not a number or `Array`, it will 
     * return `0`. If one value is provided, it will return a value between 0.0 
     * and that number. If an array of two values are provided, it returns a 
     * value between the two values. If there are three or more values, it 
     * returns the mean of the provided values. If any values are NaN, returns `0`.
     * @param  {...any} v - value(s)
     * @returns {number}
     */
    static getRangeValue(v) {
        if (v && Array.isArray(v) && v.every(e => !isNaN(e))) {
            if (v.length === 1) {
                return v[0];
            } else if (v.length === 2) {
                return $Math.randomRange(v[0], v[1]);
            } else {
                return $Math.mean(v);
            }
        } else if (v && !isNaN(v)) {
            return v;
        }
        return 0.0;
    }

    //------------------------------------
    // 

    /**
     * Return the median value for the set of values
     * @param  {...number} values - The set of values 
     * @returns {number} 
     */
    static median(...values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 !== 0 
            ? sorted[mid] 
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Return the mean value for the set of values
     * @param  {...number} values - The set of values 
     * @returns {number} 
     */
    static mean(...values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Return the standard deviation for the set of values
     * @param  {...number} values - The set of values 
     * @returns {number} 
     */
    static stdDeviation(...values) {
        const mean = $Math.mean(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    //------------------------------------
    // Linear Interpolation

    /**
     * Interpolate a value from start to end based on the given time value
     *
     * @param {number} start - The starting value  
     * @param {number} end - The ending value 
     * @param {number} time - The time value between 0 and 1 
     * @returns {number} The interpolated value
     */
    static lerp(start, end, time) {
        return start + (end - start) * time;
    }

    /**
     * Interpolate a value from start to end based on the given time value
     * with precision for floating point numbers
     *
     * @param {number} start - The starting value  
     * @param {number} end - The ending value 
     * @param {number} time - A value between 0 and 1 
     * @returns {number} The interpolated value
     */
    static preciseLerp(start, end, time) {
        return (1 - time) * start + time * end;
    }

    /**
     * Interpolate a value from start to end based on the inverse of the given time value
     *
     * @param {number} start - The starting value 
     * @param {number} end - The ending value 
     * @param {number} time - A value between 0 and 1 
     * @returns {number} The interpolated value
     */
    static invLerp(start, end, time) {
        return  (time - start) / (end - start);
    }

    /**
     * Interpolate a value between two ranges based on the given time value
     * with precision for floating point numbers
     * 
     * @param {number} lowStart - The starting value for the lower range 
     * @param {number} lowEnd - The ending value for the lower range 
     * @param {number} hiStart - The starting value for the higher range 
     * @param {number} hiEnd - The ending value for the higher range 
     * @param {number} time - A value between 0 and 1 
     * @returns {number} The interpolated value
     */
    static rangeLerp(lowStart, lowEnd, hiStart, hiEnd, time) {
        return $Math.lerp(hiStart, hiEnd, $Math.invLerp(lowStart, lowEnd, time));
    }

    //------------------------------------
    // Vector & Point Functions

    /**
     * Mutates the points in the array by the given matrix.
     * @param points {Array<Array<number>>} An array of [x, y]
     * @param matrix {Matrix2d} The matrix to transform the points with
     */
    static transformPoints(points, matrix) {
        for (const point of points) {
            point[0] = matrix.a * point[0] + matrix.c * point[1] + matrix.e;
            point[1] = matrix.b * point[0] + matrix.d * point[1] + matrix.f;
        }
    }

    /**
     * Given a rectanlge dimensions, generate a random point within it.
     *
     * @param {Object} rect The rectangle defined by `x, y, width, and height`
     * @return {Array<number>} A random point [x, y] within the rectangle
     */
    static randomPoint({x, y, width, height}) {
        return [Math.floor(x + Math.random() * width),
            Math.floor(y + Math.random() * height)];
    }

    /**
     * Find the average center of the given points
     * @param {Array} points - An array of points
     * @return {Array<number>} The center of the given points `[x, y]`
     */
    static logicalCenter(points) {
        var p = [0, 0];
        for (let pt = 0; pt < points.length; pt++) {
            p = $Math.vecAdd(p, points[pt]);
        }
        return $Math.vecDivScalar(p, points.length);
    }

    /**
     * Find the mean center of the given points
     * @param {Array} points - An array of points
     * @return {Array<number>} The mean center of the given points `[x, y]`
     */
    static meanCenter(points) {

    }

    /**
     * Calculate a direction vector from a heading angle.
     *
     * @param {Array<number>} origin The origin of the shape
     * @param {Array<number>} baseVec - The base vector (default: up vector)
     * @param {number} angle - The rotation in degrees
     * @return {Array<number>} The direction vector
     */
    static getDirectionVector(origin = [0, 0], angle, baseVec = Constants.UP_VECTOR) {
        const r = $Math.degToRad(angle);
        const x = Math.cos(r) * baseVec[0] - Math.sin(r) * baseVec[1];
        const y = Math.sin(r) * baseVec[0] + Math.cos(r) * baseVec[1];
        let v = [x, y];
        v[0] -= origin[0];
        v[1] -= origin[1];
        return $Math.normalize(v);
    }
    
    /**
     * 2d cross product of two vectors
     * @param {Array<number>} vector1 A point on the line
     * @param {Array<number>} vector2 A second point on the line
     * @return {number} the vector cross-product
     */
    static xproduct([x1, y1], [x2, y2]) {
        return (x1 * y2) - (y1 * x2);
    }

    /**
     * 2d dot product of two vectors
     * @param {Array<number>} vector1 - The first vector
     * @param {Array<number>} vector2 - The second vector
     * @return {number} The dot product
     */
    static dot([x1, y1], [x2, y2]) {
        return (x1 * x2) + (y1 * y2);
    }

    /**
     * Distance between two points 
     * @param {Array<number>} point1 - The first point
     * @param {Array<number>} point2 - The second point
     * @returns {number} The distance between the two points
     */
    static distance([x1, y1], [x2, y2]) {
        return Math.sqrt($Math.distanceSqrd([x1, y1], [x2, y2]));
    }

    /**
     * Squared distance between two points 
     * @param {Array<number>} point1 - The first point
     * @param {Array<number>} point2 - The second point
     * @returns {number} The squared distance between the two points
     */
    static distanceSqrd([x1, y1], [x2, y2]) {
        return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    }

    /**
     * Returns the magnitude of the vector
     * @param {Array<number>} vector - The vector 
     * @returns 
     */
    static magnitude([x1, y1]) {
        return Math.sqrt((x1 * x1) + (y1 * y1));
    }

    /**
     * Normalize the vector
     * @param {Array<number>} vector - The vector to normalize
     * @return {number} The unit length of the vector
     */
    static normalize([vX, vY]) {
        const norm = [0,0];
        const ln = $Math.magnitude([vX, vY]);
        if (ln != 0) {
            norm[0] = vX / ln;
            norm[1] = vY / ln;
        }
        return norm;
    }

    /**
     * Calculate the angle between to vectors.
     * @param {Array<number>} v1 - The first vector
     * @param {Array<number>} v2 - The second vector
     * @returns {number} The angle in degrees
     */
    static angleBetween(v1, v2) {
        const dot = $Math.dot(v1, v2);
        const xprod = $Math.xproduct(v1, v2);

        const rad = Math.atan2(xprod, dot);
        let degrees = $Math.radToDeg(rad);
        if (degrees < 0)
            degrees += 360;

        return degrees;
    }

    //-----------------------------------
    // Vector arithmetic

    /**
     * Multiply the elements of `vec` by the scalar value.
     * @param {Array<number>} vec - The vector 
     * @param {number} scalar - The scalar value
     * @returns {Array<number>} The result of the multiplication
     */
    static vecMulScalar(vec, scalar) {
        return vec.map(e => e * scalar);
    }

    /**
     * Multiply the elements in `vec` by the corresponding elements in `vec2`
     * @param {Array<number>} vec - The first vector
     * @param {Array<number>} vec2 - The second vector
     * @returns {Array<number>} The result of the multiplication
     */
    static vecMul(vec, vec2) {
        return vec.map((e, i) => e * vec2[i]);
    }

    /**
     * Add the scalar value to each element of `vec`.
     * @param {Array<number>} vec - The vector 
     * @param {number} scalar - The scalar value
     * @returns {Array<number>} The result of the addition
     */
    static vecAddScalar(vec, scalar) {
        return vec.map(e => e + scalar);
    }

    /**
     * Add the elements in `vec` to the corresponding elements in `vec2`
     * @param {Array<number>} vec - The first vector
     * @param {Array<number>} vec2 - The second vector
     * @returns {Array<number>} The result of the addition
     */
    static vecAdd(vec, vec2) {
        return vec.map((e, i) => e + vec2[i]);
    }

    static vecSubtractScalar(vec, scalar) {
        return vec.map(e => e - scalar);
    }

    static vecSubtract(vec, vec2) {
        return vec.map((e, i) => e - vec2[i]);
    }



    /**
     * Divide the elements of `vec` by the scalar value.
     * @param {Array<number>} vec - The vector 
     * @param {number} scalar - The scalar value
     * @returns {Array<number>} The result of the division
     */
    static vecDivScalar(vec, scalar) {
        return vec.map((e) => e / scalar);
    }

    /**
     * Divide the elements in `vec` by the corresponding elements in `vec2`
     * @param {Array<number>} vec - The first vector
     * @param {Array<number>} vec2 - The second vector
     * @returns {Array<number>} The result of the division
     */
    static vecDiv(vec, vec2) {
        return vec.map((e, i) => e / vec2[i]);
    }

    /**
     * Invert the vector's elements.
     * @param {Array<number>} vec - The vector 
     * @returns {Array<number>} The inverted vector
     */
    static invVec(vec) {
        return vec.map(e => { return e *= -1 });
    }

    //----------------------------------
    // Collision & Intersection

    /**
     * Returns `true` if the point lies on the line defined by the anchor point
     * in the direction of the normalized vector
     *
     * @param {Array<number>} point - The point to test
     * @param {Array<number>} start - The start point of the line segment
     * @param {Array<number>} end - The end point of the line segment
     * @param {Array<number>} epsilon - Allowed error margin for floating-point values
     * @return {Boolean} `true` if the point falls along the line
     */
    static pointOnLine(point, start, end, epsilon = 0.01) {
        // check collinearity 
        const xprod = $Math.xproduct([point[1] - start[1], end[0] - start[0]], 
                                     [point[0] - start[0], end[1] - start[1]]);

        if (Math.abs(xprod) > epsilon) {
            // the point is not on the line
            return false;
        }

        // the point falls within the segment bounds (bounding box test)
        const withinX = point[0] >= Math.min(start[0], end[0]) - epsilon && point[0] <= Math.max(start[0], end[0]) + epsilon;
        const withinY = point[1] >= Math.min(start[1], end[1]) - epsilon && point[1] <= Math.max(start[1], end[1]) + epsilon;

        return withinX && withinY;
    }    

    /**
     * Determine if the given <code>point</code> is within the polygon defined by the array of
     * points in `poly`
     *
     * @param {Array<number>} point The point to test
     * @param {Array<Array<number>>} poly - An array of points comprising the polygon. E.g. [[0,0], [10, 8], [46, 12], [3, 7], [0, 0]] (a closed poly)
     * @return {boolean} `true` if the point is inside the polygon
     */
    static pointInPoly(point, poly) {
        var sides = poly.length, i = 0, j = sides - 1, oddNodes = false;
        for (i = 0; i < sides; i++) {
            if ((poly[i].y < point.y && poly[j].y >= point.y) ||
                (poly[j].y < point.y && poly[i].y >= point.y)) {

                if (poly[i].x + (point.y - poly[i].y) / (poly[j].y - poly[i].y) * (poly[j].x - poly[i].x) < point.x) {
                    oddNodes = !oddNodes;
                }
            }
            j = i;
        }
        return oddNodes;
    }

    /**
     * Determine if the given `point` is within the circle defined by the
     * `center` and `radius`
     * @param {Array<number>} point - The point to test
     * @param {Array<number>} center - The center of the circle
     * @param {number} radius - The radius of the circle
     * @return {boolean} <code>true</code> if the point is within the circle
     */
    static pointInCircle(point, center, radius) {
        // Point to circle hull test
        const dSqr = $Math.distanceSqrd(point, center);
        return (dSqr <= radius*radius);
    }

    /**
     * 
     * @param {Array<number>} point - The point to test 
     * @param {number} top - The top boundary of the rectangle
     * @param {number} left - The top boundary of the rectangle
     * @param {number} width - The width of the rectangle
     * @param {number} height - The height of the rectangle
     * @returns {boolean} `true` if the point is within the rectangle's boundaries
     */
    static pointInRect(point, top, left, width, height) {
        const x = point[0], y = point[1];
        return (x >= left && x <= left + width) &&
               (y >= top && y <= top + height);
    }

    /**
     * Check to see if a line intersects another
     * @param {Array<Array>} line1 - Line 1: `[ start, end ]`
     * @param {Array<number>} [line1.start] - `[ x, y ]` start of line
     * @param {Array<number>} [line1.end] - `[ x, y ]` end of line
     * @param {Array<Array>} line2 - Line 2: `[ start, end ]`
     * @param {Array<number>} [line2.start] - `[ x, y ]` start of line
     * @param {Array<number>} [line2.end] - `[ x, y ]` end of line
     * @return {Boolean} `true` if the lines intersect
     */
    static lineLineCollision(anchor1, unitVec1, anchor2, unitVec2) {
        // const d = $Math.pointLeftOfLine(start1, )
        //     (end2[1] - start2[1]) * (end1[0] - start1[0])
        // ) - (
        //     (end2[0] - start2[0]) * (end1[1] - start1[1])
        // );
        // const n1 = ((end2[0] - start2[0]) * (start1[1] - start2[1])) - ((end2[1] - start2[1]) * (start1[0] - start2[0]));
        // const n2 = ((end1[0] - start1[0]) * (start1[1] - start2[1])) - ((end1[1] - start1[1]) * (start1[0] - start2));

        // if (d === 0.0) 
        //     return false;   // coincident or parallel

        // // normalize
        // const ua = n1 / d;
        // const ub = n2 / d;

        // return (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0);
    }

    /**
     * Helper method to determine if one circle will collide with another circle
     * based on its direction of movement.  The circle's centers should be in
     * world coordinates.
     *
     * @param circle {R.math.Circle2D} The first circle
     * @param velocity {R.math.Vector2D} The first circle's velocity vector
     * @param targetCircle {R.math.Circle2D} The second circle
     * @return {R.math.Vector2D} The vector which keeps the two circles from overlapping,
     *     or <tt>null</tt> if they cannot overlap.
     */
    static circleCircleCollision([x, y, r], [vX, vY], [tX, tY, tR]) {
        // Early out test
        let dist = $Math.distance([x,y], [tX, tY]);
        const sumRad = r + tR;
        dist -= sumRad;
        if ($Math.magnitude([vX, vY]) < dist) {
            // No collision possible
            return null;
        }

        const norm = $Math.normalize([vX, vY]);

        // Find C, the vector from the center of the moving
        // circle A to the center of B
        const c = [tX - x, tY - y];
        const dot = $Math.dot(norm, c);

        // Another early escape: Make sure that A is moving
        // towards B! If the dot product between the movevec and
        // B.center - A.center is less that or equal to 0,
        // A isn't isn't moving towards B
        if (dot <= 0) {
            return null;
        }

        const lenC = $Math.magnitude(c);
        const f = (lenC * lenC) - (dot * dot);

        // Escape test: if the closest that A will get to B
        // is more than the sum of their radii, there's no
        // way they are going collide
        const sumRad2 = sumRad * sumRad;
        if (f >= sumRad2) {
            return null;
        }

        // We now have F and sumRadii, two sides of a right triangle.
        // Use these to find the third side, sqrt(T)
        const t = sumRad2 - f;

        // If there is no such right triangle with sides length of
        // sumRadii and sqrt(f), T will probably be less than 0.
        // Better to check now than perform a square root of a
        // negative number.
        if (t < 0) {
            return null;
        }

        // Therefore the distance the circle has to travel along
        // movevec is D - sqrt(T)
        const distance = dot - Math.sqrt(t);

        // Get the magnitude of the movement vector
        const mag = $Math.magnitude([vX, vY]);

        // Finally, make sure that the distance A has to move
        // to touch B is not greater than the magnitude of the
        // movement vector.
        if (mag < distance) {
            return null;
        }

        return [norm[0] * distance, norm[1] * distance];
    }

    /**
     * Calculate the smallest bounding box which contains the given set of points.
     * @param {Array} points - An array of points `[x, y]`
     * @param {number} scalar - Scalar value to offset the points by, expanding the box
     * @return {Array<number>} The bounding box of the points `[[x1, y1], [x2, y2]]`
     */
    static boundingBox(points, scalar = 0) {
        if (points.length === 0) return [0,0,1,1];

        let x1 = points[0].x, x2 = points[0].x, y1 = points[0].y, y2 = points[0].y;
        const rect = [0,0,1,1];

        for (let p = 1; p < points.length; p++) {
            const pt = points[p];

            if (pt.x < x1) {
                x1 = pt.x;
            }
            if (pt.x > x2) {
                x2 = pt.x;
            }
            if (pt.y < y1) {
                y1 = pt.y;
            }
            if (pt.y > y2) {
                y2 = pt.y;
            }
        }

        rect[2] = (x2 - x1) + (scalar * 2);
        rect[3] = (y2 - y1) + (scalar * 2);

        // var w, h;
        // if (x1 < 0 && x2 >= 0) { w = x2 - x1; }
        // else if (x1 < 0 && x2 < 0) { w = x1 + x2; }
        // else { w = x2 - x1; }

        // if (y1 < 0 && y2 >= 0) { h = y2 - y1; }
        // else if (y1 < 0 && y2 < 0) { h = y1 + y2; }
        // else { h = y2 - y1; }

        // rect.set(transformed * x1, transformed * y1, w, h);
        return rect;
    }

    /**
     * Calculates all of the points along a line using Bresenham's algorithm.
     *
     * @param {Array<number>} start - The starting point for the line
     * @param {Array<number>} end - The ending point for the line
     * @return {Array} An array of points `[x, y]` comprising the line
     */
    static bresenham(start, end) {
        function swap(pt) {
            pt.set(pt.y, pt.x);
        }

        var points = [], steep = Math.abs(end.y - start.y) > Math.abs(end.x - start.x), swapped = false;
        if (steep) {
            // Reflect the line
            swap(start);
            swap(end);
        }

        if (start.x > end.x) {
            // Make sure the line goes downward
            var t = start.x;
            start.x = end.x;
            end.x = t;
            t = start.y;
            start.y = end.y;
            end.y = t;
            swapped = true;
        }

        var deltax = end.x - start.x, // x slope
            deltay = Math.abs(end.y - start.y), // y slope, positive because the lines always go down
            error = deltax / 2, // error is used instead of tracking the y values
            ystep, y = start.y;

        ystep = (start.y < end.y ? 1 : -1);
        for (var x = start.x; x < end.x; x++) {   // for each point
            if (steep) {
                points.push(R.math.Point2D.create(y, x));  // if it's stepp, push flipped version
            } else {
                points.push(R.math.Point2D.create(x, y));  // push normal
            }
            error -= deltay;  // change the error
            if (error < 0) {
                y += ystep;    // if the error is too much, adjust the ystep
                error += deltax;
            }
        }

        if (swapped) {
            points.reverse();
        }

        return points;
    }
}
