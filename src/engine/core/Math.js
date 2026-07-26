
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
        return (radians * 180 / MathRE.PI);
    }

    //------------------------------------
    // Vector & Point Functions

    /**
     * Transform a point or an array of points by the given matrix.  This method
     * transforms the points by mutating them.
     * @param points {Array<Array<number>>} A single point or an array of {@link R.math.Point2D}
     * @param matrix {Matrix2d} The matrix to transform the points with
     */
    static transformPoints(points, matrix) {
        if (R.isArray(points)) {
            for (var pt = 0; pt < points.length; pt++) {
                points[pt].transform(matrix);
            }
            return points;
        } else {
            return points.transform(matrix);
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
        var p = R.math.Point2D.create(0, 0);
        for (var pt = 0; pt < points.length; pt++) {
            p.add(points[pt]);
        }
        p.div(points.length);
        return p;
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
     * @param {Array<number>} baseVec - The base vector
     * @param {number} angle - The rotation in degrees
     * @return {Array<number>} The direction vector
     */
    static getDirectionVector({origin, baseVec = [0, 0], angle}) {
        const r = MathRE.degToRad(angle);
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
    static xProduct({vector1 = [1, 1], vector2 = [1, 1]}) {
        return (vector1[0] * vector2[1]) - (vector1[1] * vector2[0]);
    }

    /**
     * 2d dot product of two vectors
     * @param {Array<number>} vector1 - The first vector
     * @param {Array<number>} vector2 - The second vector
     * @return {number} The dot product
     */
    static dot({vector1: [x1, y1], vector2: [x2, y2]}) {
        return (x1 * x2) + (y1 * y2);
    }

    /**
     * Distance between two points 
     * @param {Array<number>} point1 - The first point
     * @param {Array<number>} point2 - The second point
     * @returns {number} The distance between the two points
     */
    static distance({point1: [x1, y1], point2: [x2, y2]}) {
        return Math.sqrt($Math.distanceSqrd(point1, point2));
    }

    /**
     * Squared distance between two points 
     * @param {Array<number>} point1 - The first point
     * @param {Array<number>} point2 - The second point
     * @returns {number} The squared distance between the two points
     */
    static distanceSqrd({point1: [x1, y1], point2: [x2, y2]}) {
        return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    }

    /**
     * Returns the magnitude of the vector
     * @param {Array<number>} vector - The vector 
     * @returns 
     */
    static magnitude({vector: [x1, y1]}) {
        return Math.sqrt((x1 * x1) + (y1 * y1));
    }

    /**
     * Normalize the vector
     * @param {Array<number>} vector - The vector to normalize
     * @return {number} The unit length of the vector
     */
    static normalize({vector: [vX, vY]}) {
        const norm = [0,0];
        const ln = MathRE.mag([vX, vY]);
        if (ln != 0) {
            norm[0] = vX / ln;
            norm[1] = vY / ln;
        }
        return norm;
    }

    //----------------------------------
    // Collision & Intersection

    /**
     * Returns `true` if the point lies on the line defined by the anchor point
     * in the direction of the normalized vector
     *
     * @param {Array<number>} point - The point to test
     * @param {Array<number>} anchor - The anchor point of the line
     * @param {Array<number>} unitVec - The normalized vector for the line
     * @return {Boolean}
     */
    static pointOnLine({point: [x, y], anchor: [aX, aY], unitVec: [vX, vY]}) {
        // var l = Line.create(anchor._vec, vector._vec);
        // return l.contains(point._vec);
    }

    /**
     * Determine if the given <code>point</code> is within the polygon defined by the array of
     * points in `poly`
     *
     * @param {Array<number>} point The point to test
     * @param {Array<Array>} poly - An array of points comprising the polygon
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
        return (dSqr < radius*radius);
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
    static lineLineCollision({
        line1: [[x1, y1], [x2, y2]], /* start1, end1 */
        line2: [[x3, y3], [x4, y4]]} /* start2, end2 */
    ) {
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

        const lenC = MathRE.magnitude(c);
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
     * @param {number} scalar - Scalara value to offset the points by, expanding the box
     * @return {Array<number>} The bounding box of the points `[[x1, y1], [x2, y2]]`
     */
    static boundingBox(points, transformed) {
        var x1 = points[0].x, x2 = points[0].x, y1 = points[0].y, y2 = points[0].y;
        rect = rect || R.math.Rectangle2D.create(0, 0, 1, 1);
        transformed = transformed || false;

        for (var p = 1; p < points.length; p++) {
            var pt = points[p];

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

        var w, h;
        if (x1 < 0 && x2 >= 0) { w = x2 - x1; }
        else if (x1 < 0 && x2 < 0) { w = x1 + x2; }
        else { w = x2 - x1; }

        if (y1 < 0 && y2 >= 0) { h = y2 - y1; }
        else if (y1 < 0 && y2 < 0) { h = y1 + y2; }
        else { h = y2 - y1; }

        rect.set(transformed * x1, transformed * y1, w, h);
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

const big64 = new BigUint64Array(100);
let ptr = 0;
function next64() {
    ptr++;
    if (ptr > 100) {
        ptr = 0;
    }
    return ptr;
}

class FixedPointMath {
    static #isFloat(value) {
        return typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value);
    }

    static toFixed(a, n) {
        if (FixedPointMath.#isFloat(a)) {
            return a * (1 << n);
        }
        return a << n;
    }

    static toFloat(a, n) {
        return a / (1 << n);
    }

    static toInt(a, n) {
        return a >> n;
    }

    static add(a,b) {
        return a + b;
    }

    static sub(a,b) {
        return a - b;
    }

    static mul(a,b,n) {
        const p = next64();
        big64[p] = a * b;
        return big64[p] >> n;
    }

    static div(a,b,n) {
        const p = next64();
        big64[p] = this.val() << n;
        return big64[p] / b;
    }
}

export {
    FixedPointMath
};