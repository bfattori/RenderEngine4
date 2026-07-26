
export default class Math2d {
    /**
     * An approximation of PI (3.14159)
     * @type {Number}
     */
    static PI = 3.14159;

    /**
     * An approximation of PI*2 (6.28318)
     * @type {Number}
     */
    static TWO_PI = 6.28318;

    /**
     * An approximation of the inverse of PI (0.31831)
     * @type {Number}
     */
    static INV_PI = 0.31831;

    /**
     * Convert degrees to radians.
     * @param degrees {Number} An angle in degrees
     * @return {Number} The degrees value converted to radians
     */
    static degToRad(degrees) {
        return (0.01745 * degrees);
    }

    /**
     * Convert radians to degrees.
     * @param radians {Number} An angle in radians
     * @return {Number} The radians value converted to degrees
     */
    static radToDeg(radians) {
        return (radians * 180 / MathRE.PI);
    }

    /**
     * Check to see if a line intersects another
     *
     * @param p1 {R.math.Point2D} Start of line 1
     * @param p2 {R.math.Point2D} End of line 1
     * @param p3 {R.math.Point2D} Start of line 2
     * @param p4 {R.math.Point2D} End of line 2
     * @return {Boolean} <tt>true</tt> if the lines intersect
     */
    static lineLineCollision([x1, y1], [x2, y2], [x3, y3], [x4, y4]) {
        var d = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
        var n1 = ((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3));
        var n2 = ((x2 - x1) * (y1 - y1)) - ((y2 - y3) * (x1 - x3));

        if (d === 0.0) {
            if (n1 === 0.0 && n2 === 0.0) {
                return false;  //COINCIDENT;
            }
            return false;   // PARALLEL;
        }
        const ua = n1 / d;
        const ub = n2 / d;

        return (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0);
    }

    /**
     * A static method used to calculate a direction vector
     * from a heading angle.
     *
     * @param origin {Array<number>} The origin of the shape
     * @param baseVec {Array<number>} The base vector
     * @param angle {Number} The rotation in degrees
     * @param [vec] {Array<number>} <i>optional</i>. If provided, the result will be stored in
     *        this vector rather than creating a new one.
     * @return {R.math.Vector2D} The direction vector
     */
    static getDirectionVector([oX, oY], [vX, vY], angle, vec) {
        const r = MathRE.degToRad(angle);

        var x = Math.cos(r) * baseVec.x - Math.sin(r) * baseVec.y;
        var y = Math.sin(r) * baseVec.x + Math.cos(r) * baseVec.y;

        var v = (vec ? vec.set(x, y) : R.math.Vector2D.create(x, y));
        return v.sub(origin).normalize();
    }

    /**
     * Given a {@link R.math.Rectangle2D}, generate a random point within it.
     *
     * @param rect {Array<number>} The rectangle (x,y,width,height)
     * @return {Array<number>} A random point (x,y) within the rectangle
     */
    static randomPoint([x, y, width, height]) {
        return [Math.floor(x + Math.random() * width),
            Math.floor(y + Math.random() * height)];
    }

    /**
     * Returns <tt>true</tt> if the <tt>point</tt> lies on the line defined by
     * <tt>anchor</tt> in the direction of the normalized <tt>vector</tt>.
     *
     * @param point {R.math.Point2D} The point to test
     * @param anchor {R.math.Point2D} The anchor of the line
     * @param vector {R.math.Vector2D} The normalized direction vector for the line
     * @return {Boolean}
     */
    static pointOnLine([x, y], [aX, aY], [vX, vY]) {
        // var l = Line.create(anchor._vec, vector._vec);
        // return l.contains(point._vec);
    }

    /**
     * Tests if a point is Left|On|Right of an infinite line defined by
     * two endpoints.
     *
     * @param endPoint0 {R.math.Point2D} A point on the line
     * @param endPoint1 {R.math.Point2D} A second point on the line
     * @param testPoint {R.math.Point2D} The point to test
     * @return {Number} &lt;0 (to left), 0 (on), &gt;0 (to right)
     */
    static pointLeftOfLine([x1, y1], [x2, y2], [p1, p2]) {
        return (x2 - x1) * (y2 - y1) - (x2 - x1) * (y2 - y1);
    }

    /**
     * Distance from one point to another
     * @param {Array<number>}
     * @param {Array<number>}
     */
    static distance([x1, y1], [x2, y2]) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }

    /**
     * Normalizes a vector, returning a unit length vector.
     * @param {Array<number>} [] - The vector (x, y)
     * @return {Array<number>} The vector, normalized
     */
    static normalizeVec([vX, vY]) {
        const norm = [0,0];
        const ln = MathRE.mag([vX, vY]);
        if (ln != 0) {
            norm[0] = vX / ln;
            norm[1] = vY / ln;
        }
        return norm;
    }

    static magnitude([x1, y1]) {
        return Math.sqrt((x1 * x1) + (y1 * y1));
    }

    /**
     * Get the dot product of two vectors
     * @param vector {R.math.Vector2D} The Point to perform the operation against.
    * @return {Number} The dot product
     */
    static dot([x1, y1], [x2, y2]) {
        return (x1 * x2) + (y1 * y2);
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
        let dist = MathRE.distance([x,y], [tX, tY]);
        const sumRad = r + tR;
        dist -= sumRad;
        if (MathRE.magnitude([vX, vY]) < dist) {
            // No collision possible
            return null;
        }

        const norm = MathRE.normalizeVec([vX, vY]);

        // Find C, the vector from the center of the moving
        // circle A to the center of B
        const c = [tX - x, tY - y];
        const dot = MathRE.dot(norm, c);

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
        const mag = MathRE.magnitude([vX, vY]);

        // Finally, make sure that the distance A has to move
        // to touch B is not greater than the magnitude of the
        // movement vector.
        if (mag < distance) {
            return null;
        }

        return [norm[0] * distance, norm[1] * distance];
    }

    /**
     * Get a point which represents the logical center of all of the
     * given points.
     * @param points {Array} An array of {@link R.math.Point2D}
     * @return {R.math.Point2D}
     */
    static centerOfPoints(points) {
        var p = R.math.Point2D.create(0, 0);
        for (var pt = 0; pt < points.length; pt++) {
            p.add(points[pt]);
        }
        p.div(points.length);
        return p;
    }

    /**
     * Calculate the smallest bounding box which contains
     * the given set of points.
     * @param points {Array} An array of {@link R.math.Point2D}
     * @param [rect] {R.math.Rectangle2D} Optional rectangle to set to the bounding box
     * @return {R.math.Rectangle2D} The bounding box of the points
     */
    static getBoundingBox(points, rect, transformed) {
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
     * Calculates all of the points along a line using Bresenham's algorithm.
     * This method will return an array of points which need to be cleaned up
     * when done using them.
     *
     * @param start {R.math.Point2D} The starting point for the line
     * @param end {R.math.Point2D} The ending point for the line
     * @return {Array} An array of {@link R.math.Point2D}.  Be sure to
     *    destroy the points in the array when done using them.
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

    /**
     * Determine if the given <code>point</code> is within the polygon defined by the array of
     * points in <code>poly</code>.
     *
     * @param point {R.math.Point2D} The point to test
     * @param poly {Array} An array of <code>R.math.Point2D</code>
     * @return {Boolean} <code>true</code> if the point is within the polygon
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
     * Determine if the given <code>point</code> is within the circle defined by the
     * <code>center</code> and <code>radius</code>.
     * @param point {R.math.Point2D} The point to test
     * @param center {R.math.Point2D} The center of the circle
     * @param radius {Number} The radius of the circle
     * @return {Boolean} <code>true</code> if the point is within the circle
     */
    static pointInCircle(point, center, radius) {
        // Point to circle hull test
        var distSqr = (point.x - center.x) * (point.x - center.x) +
            (point.y - center.y) * (point.y - center.y);
        return (distSqr < (radius * radius));
    }
}