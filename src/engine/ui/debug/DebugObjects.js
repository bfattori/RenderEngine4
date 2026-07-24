/**
 * Get the origin shape (red line up, blue line to the right)
 * @returns {number} The opaque Id of the shape
 */
function originShape(ctx) {
    ctx.API
        .setColor('#ff0000')
        .setWidth(1)
        .line(0,0,0,-10)
        .setColor('#0000ff')
        .line(0,0,10,0);
}

export {
    originShape
}
