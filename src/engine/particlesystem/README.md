# Particle System
The RenderEngine4 provides a particle system grown for speed and flexibility. The particle system runs either on the main thread, or in worker threads, based on configuration. Threaded particles allows for more particles in-game and run in near-real-time, unbounded from the engine's update/render loop. When run _in the main thread,_ the particle system and render loop are bound and can cause slowdowns or delays.

The particle engine provides a simple API for creating particle effects, which can be used to add visual flair to games or simulations. Additionally occlusion masking of particles is near-automatic with hinting to help the system know what to show and what to hide in the final output. This allows the particles to run within the render planes provided by the render contexts.

## **Spark** Memory Manager
The `Spark` memory manager is designed to make memory management simple, yet still performant while minimizing garbage collection. Memory is allocated ahead of time for particle storage and remains until the particle system exits. Particle memory is overwritten in a circular fashion to eliminate new allocations at runtime. This provides for efficient memory management while still providing a simple API for creating and managing particles via `MemShape`.

The `Spark` memory manager extends from the `DataView` with methods added for memory types not native to it. For example, `Spark` allows for the creation of `VecF32` or `VecF32Array` which represent
two 32-bit floats per element. Or the `Color32` type that can store hex color values and retrieve them in native web hex-color format.

### **MemShape**
Memory shapes define a memory segment allocator. The shape is defined by the property name and memory type to access. A `MemShape` calculates the byte offsets for each property and properties to read and write the values. For example, a `MemShape` for the `BasicParticle` defines the following properties:

```javascript
  this.#particleShape = new MemShape();
  this.#particleShape.set('opaqueId',       'UInt8');
  this.#particleShape.set('spawnTime',      'UInt64');
  this.#particleShape.set('lifeSpan',       'UInt16');
  this.#particleShape.set('particleColor',  'UInt8');
  this.#particleShape.set('startSize',      'Float32');
  this.#particleShape.set('particleSize',   'Float32');
  this.#particleShape.set('sizeDecay',      'Float32');
  this.#particleShape.set('dragRate',       'Float32');
  this.#particleShape.set('dragDelta',      'Float32');
  this.#particleShape.set('tileOpaqueId',   'UInt16');
  this.#particleShape.build();
```
The call to `build()` creates the memory shape and assigns the property accessors to set and retrieve each memory type by name. The memory shape is used with the `Spark` memory manager to manage particle memory, allowing for efficient access and manipulation of particle data. This approach ensures that particles are stored in a structured format that can be easily accessed during update and render.

To use it you only need set the heap segment and then reading/writing properties is achieved with a cleaner syntax. Update and render method of particles are passed a `heap` which represents a particle's memory segment. An example:

```javascript
update(time, deltaTime, heap, pos, vel, life) {
  super.update(time, deltaTime, heap, pos, vel, life);

  // assign the segment BEFORE any operations
  this.shape.segment = heap;

  // calculate the trail if the particle has a trail length greater than 0
  const trLen = this.trailLength;
  if (trLen > 0) {
    this.shape.trail = Util.unshift(this.shape.trail, pos[0], pos[1]);
    this.shape.trTail += 1;
    this.shape.trTail = Math.min(trLen, this.shape.trTail);
  }
}
```


## **Particle Engine** - particle renderer extraordinare
_The engine has a simple task:_ **update and render particles.** It is either frame-bound to the main update/rendering loop or can run unbound (distributed to threads) with an orchestrator that utilizes smaller worker threads. Particles can be sent to the system at any point during the engine's update stage so when the update completes, waiting particles are introduced into the system and the render operation is called. Following a rendering of live particles, the output is rendered to a bitmap that can is consumed during the render portion of the engine's update/render loop.

## **Particles** - atomic unit of particly goodness
`Particle` represents a particle's configuration options and the methods that `spawn`, `update`, `render`, and `cleanUp` a particle. Particles are small and light-weight so they can me manipulated quickly with little-to-no overhead for processing and rendering. Performing complex operations, especially in the main thread, can cause a game to be unresponsive.

## **Particle Effects** - particle generators
A `ParticleEffect` is the way in which particles are generated. Effects contain options that apply to the particles used in the effect, thus pairing is important as to not create strange output. The effect has duration, frequency, quantity, and other configuration information that is applied to the particles as they are spawned, giving them their initial identity.

## Included `Particle` and `ParticleEffect` types
There are several styles of particle and effect generators to select from, or to inherit and grow upon for even more interesting effects.

#### Particle types:

- **BasicParticle** - position, velocity, drag, dragRate, and gravity
- **PhysicalParticle** - like basic, but affected by repulsors and colliders (increased CPU load)
- **BurstParticle** - Simple particle burst, outward 360&deg; emission
- **FireworksParticle** - Used with the `FireworksEffect`, generates sub-particles to simulate embers
- **SprayParticle** - A narrow-spread angle emission particle with optional trails
- **WaterParticle** - A particle that resembles water
- **SmokeParticle** - A physical particle that acts like smoke

#### Particle effects:
- **SparkEffect** - Configurable color palette, streak length, renders as lines, spawns sub-particle points, narrow spread-angle emission
- **BurstEffect** - Configurable color palette, particle sizes, renders as points, 360&deg; emission
- **PuffEffect** - Configurable color palette, particle sizes, renders as diffuse points, 360&deg; emission
- **ExplosionEffect** - Configurable color palette, particle sizes, origin smoke properties, gravity influenced, renders as points, 360&deg; emission
- **FountainEffect** - Configurable color palette, particle sizes, renders as points or sprites, spread-angle emission
- **FireworksEffect** - Pre-defined color palettes, renders as points, particles spawn sub-particles, built-in types: **Peony, chrysanthemum, comet, palm, brocade, willow, pistil, tourbillion, fish, and strobe.**
- **SmokeEffect** - Configurable color palette, renders as diffuse points, rises slowly, narrow spread-angle emission.

