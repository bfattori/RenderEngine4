import Engine from '../core/Engine.js';
import TransferrableConfig from '../core/config/TransferrableConfig.js';
import Enum from '../core/lang/Enum.js';
import $Math from '../core/lang/Math.js';
import { Matrix2d } from '../core/lang/Matrix.js';

import Particle from './Particle.js';

/**
 * @class ParticleInfluencer
 * @classdesc The `ParticleInfluencer` class is responsible for applying forces to particles within a particle system. It defines the shape, position, and falloff of the influence, 
 * and calculates the resulting impulse on particles based on their position relative to the zone of influence. The shape can be circular or linear, and can be configured for different 
 * types of falloff (linear, squared, attenuated, or custom). The zone of influence has configurable friction, restitution, and absorbtion so as to impart a physical force on particles.
 */
export default class ParticleInfluencer extends TransferrableConfig {
  #engine = null;

  static FALLOFF_TYPE = new Enum(
    'LINEAR', 
    'SQUARED', 
    'ATTENUATE', 
    'CUSTOM'
  );

  static SHAPE = new Enum(
    'CIRCLE',
    'SURFACE'
  );

  static AFFECTOR = new Enum(
    'REFLECT',
    'ABSORB',
    'KILL'
  );

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * The world position of the zone of influence.
       * @type {Array<number>} The position of the zone of influence in world space (x, y)
       */
      pos: [0, 0],

      /**
       * The shape of the zone: `CIRCLE` or `SURFACE`. The shape determines how the influence is imparted on
       * particles within its area of effect. Circular shapes impart influence around a centroid, while 
       * a surface imparts influence along a line, affected by its normal. The default is `CIRCLE`
       * @type {ParticleInfluencer#SHAPE}
       */
      shape: ParticleInfluencer.SHAPE.CIRCLE,

      /**
       * The radius for a circular zone of influence when the shape is `CIRCLE`.
       * @type {number} The distance from the center
       */
      radius: 50,

      /**
       * The shape when the affector is type `SURFACE`. A surface is defined by a 5-element array
       * made up of the starting coordinates of the surface, the ending coordinates, and the surface
       * normal vector.
       * @example [150, 200, 10, 250, [0.707, 0.706]]
       * @type {Array<number>} The surface shape in [x, y, x1, y1, normal] format
       */
      surface: [0, 0, 1, 1, [0, 1]],

      /**
       * The type of falloff applied in the zone of influence. `LINEAR` applies a linear, increasing
       * force as the particle approaches the zone. `SQUARED` applies an exponentially increasing force,
       * while `ATTENUATE` uses `rolloffFactor` to determine how influence rolls off as a factor of
       * distance from the zone. Finally `CUSTOM` allows new `ParticleInfluencers` to calulate their
       * own influence based on entirely different parameters.
       * @type {ParticleInfluencer#FALLOFF_TYPE} 
       */
      falloffType: ParticleInfluencer.FALLOFF_TYPE.LINEAR,

      /**
       * The rolloff factor for the `ATTENUATE` style of falloff.
       * @type {number} The rolloff factor
       */
      rolloffFactor: 0.0,

      /**
       * The affect the zone of influence has on a particle that interacts with it. The default
       * is to `REFLECT`. Other options are `KILL` which immediately frees the particle,
       * and `ABSORB` which acts like a gravitational force pulling toward the zone.
       * @type {ParticleInfluencer#AFFECTOR}
       */
      affect: ParticleInfluencer.AFFECTOR.REFLECT,

      /**
       * The amount of friction the influence zone imparts, causing particles to "stick".
       * @type {number} 0.0 - dead stop, 1.0 - no friction, 0.96 - about average
       */
      friction: 0.986,

      /**
       * The restitution, or bounce, of the zone of influence. This is a value between 0.0 
       * and 1.0, where 0.0 means no bounce and 1.0 means perfect bounce.
       * @type {number} 0.0 - no bounce, 1.0 - perfect bounce
       */
      restitution: 0.0,

      /**
       * When `affect` is configured for `ABSORB` this is the rate at which the repulsor pulls a particle 
       * toward it. Think of it like gravity pulling in the particle. Even with `restitution` and `friction`
       * values set, this will apply a constant pull on the particle as long as it's within range.
       * @type {number} The rate at which the repulsor affects a particle
       */
      absorbtionRate: 0.0

    }, url);
    this.merge(overrides);
    this.name = 'zoneOfInfluence';
    try {
      this.#engine = Engine.particleEngine;
    } catch (ex) {
      this.#engine = null;
    }
  }

  /**
   * Set the associated particle engine this repulsor will impact.
   * @param {ParticleEngine} pEngine - The particle engine instance
   */
  set engine(pEngine) {
      this.#engine = pEngine;
  }

  /**
   * Get the particle engine the repulsor is associated with.
   * @returns {ParticleEngine} The particle engine 
   */
  get engine() {
      return this.#engine;
  }

  /**
   * Override the name of the repulsor type. If you reuse a particle type, you need
   * to differentiate them by name or the particle engine will use the first instance
   * provided.
   * @param {String} name - The repulsor name
   */
  set name(name) {
    this.$name = name;
  }

  /**
   * Get the name of this repulsor type.
   * @returns {String} The name of the repulsor type
   */
  get name() {
    return this.$name;
  }

  /**
   * Returns a box that encompasses the particle repulsor
   * @returns {Array<number>} An array with [x, y, z, w] representing the bounding box of the repulsor
   */
  get boundingBox() {
    if (this.shape === ParticleInfluencer.SHAPE.CIRCLE) {
      return [this.pos[0] - this.radius, this.pos[1] - this.radius, this.pos[0] + this.radius, this.pos[1] + this.radius];
    } else {
      return [this.surface[0], this.surface[1], this.surface[2], this.surface[3]];
    }
  }

  /**
   * This method will be called on config objects that update their properties
   * since there doesn't appear to be an easy way to override setters.
   * @param {String} property - The property that was changed 
   * @param {*} newValue - The new value being assigned to the property
   */
  $propUpdated(property, newValue, oldValue) {
    if (property === 'pos' || property === 'radius' || property === 'surface' && this.engine !== null) {
      this.engine.updateInfluencer(this);
    }
  }

  /**
   * Impact a particle's position and velocity based on the
   * repulsor's properties. Return an object with updated position
   * and velocity for the particle.
   * @param {Array<number>} pos - The particle's poisition
   * @param {Array<number>} vel - The particle's velocity vector
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since the last frame 
   */
  applyImpulse(memSegment, time, deltaTime) {
    if (this.shape === ParticleInfluencer.SHAPE.CIRCLE) {
      this.#circleImpulse(memSegment);
    } else {
      this.#rectangleImpulse(memSegment);
    }
  }

  #circleImpulse(memSegment) {
    const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
    const vel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);

    // early out
    const dist = $Math.distance(pos, this.pos);
    if (dist < this.radius && dist > 0) {
      
      // the particle is being impacted
      if (this.affect === ParticleInfluencer.AFFECTOR.KILL) {
        this.#engine.freeParticle(memSegment);
        return;
      }

      const normX = (pos[0] - this.pos[0]) / dist;
      const normY = (pos[1] - this.pos[1]) / dist;

      const fallOff = this.#getFallOff(pos[0], pos[1], dist);
      let impulseVec = $Math.vecMulScalar($Math.vecMulScalar([normX, normY], fallOff), this.restitution);

      if (this.affect === ParticleInfluencer.AFFECTOR.ABSORB) {
        let iPos = $Math.newVecF32(this.pos[0], this.pos[1]);
        iPos = $Math.vecMulScalar($Math.normalize($Math.vecSubtract(iPos, pos)), this.absorbtionRate);
        impulseVec = $Math.vecAdd(impulseVec, iPos);
      }

      // nudge away from the repulsor
      let v = $Math.vecAdd(vel, impulseVec);
      v = $Math.vecMulScalar(v, this.friction)
      
      memSegment.setVecF32(Particle.OFFSETS.VELOCITY, v);
    }
  }

  #rectangleImpulse(memSegment) {
    const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
    const vel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);

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
    if ($Math.pointInPoly(pos, sh)) return;

    // the particle is affected
    if (this.affect === ParticleInfluencer.AFFECTOR.KILL) {
      this.#engine.freeParticle(memSegment);
      return;
    }

    // get the distance from the nearest line to determine impulse
    const lDist = this.#lineDist(sh[0], sh[3], pos);
    const rDist = this.#lineDist(sh[1], sh[2], pos);
    const tDist = this.#lineDist(sh[0], sh[1], pos);
    const bDist = this.#lineDist(sh[2], sh[3], pos);
    const d = [lDist,rDist,tDist,bDist].sort()[0];

    const normX = (pos[0] - this.pos[0]) / d;
    const normY = (pos[1] - this.pos[1]) / d;

    const fallOff = this.#getFallOff(pos[0], pos[1], d);
    const impulseVec = $Math.vecMulScalar($Math.vecMulScalar([normX, normY], fallOff), this.restitution);

    // nudge away from the repulsor
    let v = $Math.vecAdd(vel, impulseVec);
    v = $Math.vecMulScalar(v, this.friction);

    memSegment.setVecF32(Particle.OFFSETS.VELOCITY, v);
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
   * @param {number} dist - The distance to the repulsor
   * @returns 
   */
  #getFallOff(x, y, dist) {
    switch (+this.falloffType) {
      case +ParticleInfluencer.FALLOFF_TYPE.LINEAR:
        return $Math.clamp(1.0 - (dist / this.radius), 0.0, 1.0);  
      case +ParticleInfluencer.FALLOFF_TYPE.SQUARED:
        return $Math.clamp(1.0 / (dist * dist), 0.0, 1.0);
      case +ParticleInfluencer.FALLOFF_TYPE.ATTENUATE:
        return 1.0 / ((1.0 + this.rolloffFactor) * (dist - this.radius));
      case +ParticleInfluencer.FALLOFF_TYPE.CUSTOM:
        return this.customFalloff(x, y, dist);
    }
  }

  /**
   * Calculate the repulsor falloff based on the particle 
   * position and distance to the repulsor.
   *
   * @param {number} x - The x position of the particle
   * @param {number} y - The x position of the particle
   * @param {number} dist - The distance to the repulsor
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
      props.falloffType = `${props.falloffType}`;
      props.shape = `${props.shape}`;
      props.affect = `${props.affect}`
      return props;
  }

  /**
   * Change the enums back to their values
   * @returns 
   */
  async rehydrate(obj) {
      obj.falloffType = ParticleInfluencer.FALLOFF_TYPE[obj.falloffType];
      obj.shape = ParticleInfluencer.SHAPE[obj.shape];
      obj.affect = ParticleInfluencer.AFFECTOR[obj.affect];
      await super.rehydrate(obj);
      return obj;
  }

}