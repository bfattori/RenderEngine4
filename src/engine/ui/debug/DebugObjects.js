import $Math from '../../core/Math.js';
import { sysText } from '../text/RasterTextParser.js';

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

const canvasDebugObjects = {
    /**
     * Get the origin shape (red line up, blue line to the right)
     * @returns {number} The opaque Id of the shape
     */
    Origin: (surf, x, y, text = null) => {
        surf.save();
        surf.beginPath();
        surf.strokeStyle = '#ff0000';
        surf.lineWidth = 2;
        surf.moveTo(x, y);
        surf.lineTo(x, y - 20);
        surf.stroke();
        surf.beginPath();
        surf.strokeStyle = '#0000ff';
        surf.moveTo(x, y);
        surf.lineTo(x + 20, y);
        surf.stroke();
        if (text !== null)
            sysText(text, surf, x, y);
        surf.restore();
    },

    BoundingBox: (surf, box) => {
       surf.save();
       surf.restore();
    },

    BoundingCircle: (surf, x, y, radius, filled = false) => {
        surf.save();
        surf.beginPath();
        surf.arc(x, y, radius, 0, $Math.TWO_PI);
        if (filled) {
            surf.fillStyle = '#5553';
            surf.fill();
        } else {
            surf.lineWidth = 5;
            surf.strokeStyle = '#5553';
            surf.stroke();
        }
        surf.restore();
    },

    SeparationLine: (shape1, shape2, ctx) => {

    },

    ContactOverlap: (shape1, shape2, collisionType, ctx) => {

    }
};


export default DebugObjects;

export {
    canvasDebugObjects
};