
const DebugObjects = {
    /**
     * Get the origin shape (red line up, blue line to the right)
     * @returns {number} The opaque Id of the shape
     */
    Origin: (ctx, x, y, local = [0,0], world = [0,0], angle) => {
        ctx.API
            .setColor('#ff0000')
            .setWidth(2)
            .line(0,0,0,-20)
//            .systemText(`${world[0]},${world[1]}` + '\n' + `${local[0]},${local[1]}` + '\n' + `${angle}°`)
            .systemText(`${world[0]},${world[1]}` + '\n' + `θ ${angle.toFixed(1)}°`)
            .setColor('#0000ff')
            .line(0,0,20,0);
    },

    BoundingBox: (box, ctx) => {
        ctx.API
            .setColor('#ff0000')
            .setWidth(2)
            .line(box[0], box[1], box[0] + box[2], box[1])
            .line(box[0], box[1], box[0], box[1] + box[3])
            .setColor('#0000ff')
            .line(box[0] + box[2], box[1], box[0] + box[2], box[1] + box[3])
            .line(box[0], box[1] + box[3], box[0] + box[2], box[1] + box[3]);

    },

    SeparationLine: (shape1, shape2, ctx) => {

    },

    ContactOverlap: (shape1, shape2, collisionType, ctx) => {

    }
};

export default DebugObjects;