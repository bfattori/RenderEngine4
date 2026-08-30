import TransferrableConfig from '../../core/TransferrableConfig.js';
import Enum from '../../core/Enum.js';
import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';

export default class ParticleAffector extends TransferrableConfig {
   static FALLOFF_TYPE = new Enum({
    LINEAR: 'linear',
    SQUARED: 'squared',
    ATTENUATE: 'log',
    CUSTOM: 'custom'
  });

  static SHAPE = new Enum({
    CIRCLE: 'circ',
    RECTANGLE: 'rect'
  });

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * The world position of the affector.
       * @type {Array<number>} The position of the affector in world space (x, y)
       */
      pos: [0, 0],

      /**
       * The shape of the affector: CIRCLE or RECTANGLE
       * @type {ParticleAffector#SHAPE}
       */
      shape: ParticleAffector.SHAPE.CIRCLE,

      /**
       * The radius for the affector's influence when the shape is `CIRCLE`.
       * @type {number} The distance from the center of the affector
       */
      radius: 50,

      /**
       * The shape when the affector is type `RECTANGLE`. The rectangle origin is 
       * the position of the affector
       * @type {Array<number>} The rectangle shape in [x, y, width, height] format
       */
      rectangle: [0, 0, 1, 1],

      /**
       * When the shape is `RECTANGLE`, this is the rotation applied to the shape at its center point. 
       * @type {number} The rotation in degrees
       */
      rotation: 0.0,

      /**
       * The type of falloff applied
       * @type {ParticleAffector#FALLOFF_TYPE} 
       */
      falloffType: ParticleAffector.FALLOFF_TYPE.LINEAR,

      /**
       * The rolloff factor for the `ATTENUATE` style falloff.
       * @type {number} The rolloff factor
       */
      rolloffFactor: 0.0,

      /**
       * The amount of friction the affector imparts.
       * @type {number} 0.0 - dead stop, 1.0 - no friction, 0.96 - about average
       */
      friction: 0.986,

      /**
       * The restitution of the affector. This is a value between 0.0 and 1.0, where 
       * 0.0 means no bounce and 1.0 means perfect bounce.
       * @type {number} 0.0 - no bounce, 1.0 - perfect bounce
       */
      restitution: 0.0
    }, url);
    this.merge(overrides);
    this.name = 'particleAffector';
  }

  /**
   * Override the name of the particle type. If you reuse a particle type, you need
   * to differentiate them by name or the particle engine will use the first instance
   * provided.
   * @param {String} name - The particle name
   */
  set name(name) {
    this.$name = name;
  }

  /**
   * Get the name of this particle type.
   * @returns {String} The name of the particle type
   */
  get name() {
    return this.$name;
  }

  /**
   * Impact a particle's position and velocity based on the
   * affector's properties. Return an object with updated position
   * and velocity for the particle.
   * @param {Array<number>} pos - The particle's poisition
   * @param {Array<number>} vel - The particle's velocity vector
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since the last frame 
   */
  affect(position, velocity, time, deltaTime) {
    if (this.shape === ParticleAffector.SHAPE.CIRCLE) {
      this.#circleImpulse(position, velocity);
    } else {
      this.#rectangleImpulse(position, velocity);
    }
  }

  #circleImpulse(position, velocity) {
    // early out
    const dist = $Math.distance(position, this.pos);
    if (dist < this.radius && dist > 0) {
      const normX = (position[0] - this.pos[0]) / dist;
      const normY = (position[1] - this.pos[1]) / dist;

      const fallOff = this.#getFallOff(position[0], position[1], dist);
      const impulseVec = $Math.vecMulScalar($Math.vecMulScalar([normX, normY], fallOff), this.restitution);

      // nudge away from the repulsor
      const v = $Math.vecAdd(velocity, impulseVec);
      velocity[0] = v[0] * this.friction;
      velocity[1] = v[1] * this.friction;
    }
  }

  #rectangleImpulse(position, velocity) {
    // create the rectangle shape and position it
    const mtx = Matrix2d.identity();
    mtx.setTo({
      position: this.pos,
      rotation: this.rotation
    });
    const sh = [];
    this.shape.map(el => sh.push[el]);
    $Math.transformPoints(sh, mtx);

    // if the particle is inside the shape, exit
    if ($Math.pointInPoly(position, sh)) return;

    // get the distance from the nearest line to determine impulse
    const lDist = this.#lineDist(sh[0], sh[3], position);
    const rDist = this.#lineDist(sh[1], sh[2], position);
    const tDist = this.#lineDist(sh[0], sh[1], position);
    const bDist = this.#lineDist(sh[2], sh[3], position);
    const d = [lDist,rDist,tDist,bDist].sort()[0];

    const normX = (position[0] - this.pos[0]) / d;
    const normY = (position[1] - this.pos[1]) / d;

    const fallOff = this.#getFallOff(position[0], position[1], d);
    const impulseVec = $Math.vecMulScalar($Math.vecMulScalar([normX, normY], fallOff), this.restitution);

    // nudge away from the repulsor
    const v = $Math.vecAdd(velocity, impulseVec);
    velocity[0] = v[0] * this.friction;
    velocity[1] = v[1] * this.friction;
  }

  #sideOfLine(start, end, p) {
    return (end[0] - start[0]) * (p[1] - start[1]) - (end[1] - start[1]) * (p[0] - start[0]);
  }

  #lineDist(pt, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // If the line segment is a single point, return distance to that point
    if (dx === 0 && dy === 0) {
        return Math.hypot(pt[0] - lineStart[0], pt[1] - lineStart[1]);
    }

    // Calculate projection factor t (clamped between 0 and 1)
    let t = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    // Find the closest point on the segment
    const closestX = lineStart[0] + t * dx;
    const closestY = lineStart[1] + t * dy;

    // Return the distance from the point to the closest point
    return Math.hypot(pt[0] - closestX, pt[1] - closestY);
  }

  /**
   * Calculate the repulsor impulse falloff given the type
   * of falloff configured.
   * 
   * @param {number} x - The x position of the particle
   * @param {number} y - The x position of the particle
   * @param {number} dist - The distance to the affector
   * @returns 
   */
  #getFallOff(x, y, dist) {
    switch (+this.falloffType) {
      case +ParticleAffector.FALLOFF_TYPE.LINEAR:
        return $Math.clamp(1.0 - (dist / this.radius), 0.0, 1.0);  
      case +ParticleAffector.FALLOFF_TYPE.SQUARED:
        return $Math.clamp(1.0 / (dist * dist), 0.0, 1.0);
      case +ParticleAffector.FALLOFF_TYPE.ATTENUATE:
        return 1.0 / ((1.0 + this.rolloffFactor) * (dist - this.radius));
      case +ParticleAffector.FALLOFF_TYPE.CUSTOM:
        return this.customFalloff(x, y, dist);
    }
  }

  /**
   * Calculate the effector falloff based on the particle 
   * position and distance to the effector.
   *
   * @param {number} x - The x position of the particle
   * @param {number} y - The x position of the particle
   * @param {number} dist - The distance to the affector
   * @returns 
   */
  customFalloff(x, y, dist) {
    return 0.0;
  }

  /**
   * Change the enums to their ordinals
   * @returns {Object}
   */
  dehydrate() {
      const props = super.dehydrate();
      props.falloffType = +props.falloffType;
      props.shape = +props.shape;
      return props;
  }

  /**
   * Change the enums back to their values
   * @returns 
   */
  rehydrate() {
      const obj = super.rehydrate();
      obj.falloffType = ParticleAffector.FALLOFF_TYPE.at(obj.falloffType);
      obj.shape = ParticleAffector.SHAPE.at(obj.shape);
      return obj;
  }

}