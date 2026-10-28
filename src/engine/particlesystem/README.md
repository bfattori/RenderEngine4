# Particle System
The RenderEngine4 provides a particle system grown for speed and flexibility. The particle system runs either on the main thread, or in worker threads, based on configuration. Threaded particles allows for more particles in-game and run in near-real-time, unbounded from the engine's update/render loop. When run _in the main thread,_ the particle system and render loop are bound and can cause slowdowns or delays.

The particle engine provides a simple API for creating particle effects, which can be used to add visual flair to games or simulations. Additionally occlusion masking of particles is near-automatic with hinting to help the system know what to show and what to hide in the final output. This allows the particles to run within the render planes provided by the render contexts.

## **Spark** Memory Manager
The `Spark` memory manager is designed to make memory management flexible, yet still performant while minimizing garbage collection. Memory is allocated at start time for particle storage and is retained until the game exits. Particle memory is overwritten in a circular fashion to eliminate new allocations at runtime.

The `Spark` memory manager extends from the `DataView` with methods added for memory types not native to it. For example, `Spark` allows for the creation of `VecF32` or `VecF32Array` which represent two 32-bit floats per element. Or the `Color32` type that can store hex color values and retrieve them in native web hex-color format.

### Memory Management
With `Spark`, manipulating memory becomes _your task_. Each particle memory segment is the size (in bytes) of the _largest_ particle type used. Inside the `Particle` or `BasicParticle`, memory is read and written directly with pre-computed byte offsets. Only numerical types are stored in the particle memory so operations can be fast. The trade-off between using `Objects` vs fixed allocation is made up for by the reduced amount of garbage collection that occurs.

Standard JavaScript memory management is highly-optimized to work with JavaScript object types. Creating and destroying thousands of particles requires frequent garbage collection and causes stuttering in the game loop. But, by using a fixed memory allocator, we can virtually eliminate garbage collection. 

An example of writing and reading memory is shown below. Particle lifecycle methods are passed a `memSegment` representing the block of memory allocated for the particle.

```javascript
  spawn(worldPos, time, memSegment) {
    // lifespan 
    const lifeSpan = $Math.getRangeValueInt(this.lifeSpan);
    const variance = $Math.getRangeValueInt(this.lifeVariance);
    memSegment.setUint16(Particle.OFFSETS.LF_REMAINING, lifeSpan + variance);
    memSegment.setUint16(Particle.OFFSETS.LF_ORIGINAL, lifeSpan + variance);

    // opaque Id
    memSegment.setUint8(Particle.OFFSETS.OPAQUE_ID, this.opaqueId);

    // spawn time
    memSegment.setBigUint64(Particle.OFFSETS.SPAWN_TIME, BigInt(Math.floor(time)));

    // position
    memSegment.setVecF32(Particle.OFFSETS.POSITION, worldPos);
  }
```

During update, a particle may need to read and write values in the memory segment. Updating a value pulled from the memory segment _will not change the value in memory_. If you update a value in the function scope, you **must explicitly write-back** any values you want to retain into the particle's instantaneous memory.

```javascript
  update(time, deltaTime, memSegment, life) {
      super.update(time, deltaTime, memSegment, life);
      
      const fade = memSegment.getFloat32(DiffuseParticle.OFFSETS.FADE);
      if (fade > 0.0) {
        let alpha = memSegment.getFloat32(DiffuseParticle.OFFSETS.ALPHA);
        alpha -= fade;
        memSegment.setFloat32(DiffuseParticle.OFFSETS.ALPHA, Math.max(0.0, alpha));

        if (alpha <= 0) {
          this.cleanUp(memSegment);
        }
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

# Particle Threading using WebWorkers
The RenderEngine4 supports multi-threading to enhance particle performance. However, it is important to remember that even with multiple workers, the particle engine is still running on the CPU only. While you can increase the number of particles being rendered at once, the overall performance will still be limited by the CPU's processing power.

## Particle Manager
The threaded particle system uses a `ParticleManager` as a controller for the `$ParticleEngine`. The manager reroutes calls normally processed by the particle system to the orchestrator. The `ParticleManager` runs in the main thread and spawns the `Orchestrator` in a worker thread to break from the game's update-render loop.

## Particle Orchestrator
The `Orchestrator` is responsible for spawning `ParticleWorker`s and managing the distribution of particle types, effects, affectors, and particles themselves. It is also the system that combines the images generated by the `ParticleWorker`s. The combined image is what is provided to the `ParticleManager` for display at the next game loop refresh.

The orchestrator coordinates all of the workers and updates the `ParticleManager` with the results of the `ParticleWorker`s.

## Particle Worker
Each worker is running its own `$ParticleEngine` and manages a segment of the overall budget for particles. The workers are responsible for creating and updating particles, as well as rendering their view of particles to send to the `Orchestrator`.

Particle workers run separate from the game loop, allowing them to process thousands of particles without impacting the game loop's performance. A worker runs a very simple update-render loop for particles, an nothing else.

Particle workers generate several frames of rendered particles, often faster than the game loop can render one frame. Because of this, it is possible to tune the timing for the workers so they better match the game loop.
