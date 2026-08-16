
const DebugObjects = {
    /**
     * Get the origin shape (red line up, blue line to the right)
     * @returns {number} The opaque Id of the shape
     */
    Origin: (ctx) => {
        ctx.API
            .setColor('#ff0000')
            .setWidth(1)
            .line(0,0,0,-10)
            .setColor('#0000ff')
            .line(0,0,10,0);
    },

    BoundingBox: (box, ctx) => {

    },

    SeparationLine: (shape1, shape2, ctx) => {

    },

    ContactOverlap: (shape1, shape2, collisionType, ctx) => {

    }
};

export default DebugObjects;