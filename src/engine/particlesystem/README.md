# Particle System
The RenderEngine4 provides a particle system grown for speed and flexibility. The particle system runs either on the main thread, or in worker threads, based on configuration. Threaded particles allows for more particles in-game and run in near-real-time, unbounded from the engine's update/render loop. When run _in the main thread,_ the particle system and render loop are bound and can cause slowdowns or delays.

The particle engine provides a simple API for creating particle effects, which can be used to add visual flair to games or simulations. Additionally occlusion masking of particles is near-automatic with hinting to help the system know what to show and what to hide in the final output. This allows the particles to run within the render planes provided by the render contexts.

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
- **AffectedParticle** - like basic, but affected by repulsors and colliders (increased CPU load)
- **BurstParticle** - Simple particle burst, outward 360&deg; emission
- **FireworksParticle** - Used with the `FireworksEffect`, generates sub-particles to simulate embers
- **SparkParticle** - Drawn as velocity-directed lines to simulate streaks of hot metal
- **SprayParticle** - A narrow-spread angle emission particle
- **WaterParticle** - A particle that simulates water

#### Particle effects:
- **SparkEffect** - Configurable color palette, streak length, renders as lines, spawns sub-particle points, narrow spread-angle emission
- **BurstEffect** - Configurable color palette, particle sizes, renders as points, 360&deg; emission
- **PuffEffect** - Configurable color palette, particle sizes, renders as diffuse points, 360&deg; emission
- **ExplosionEffect** - Configurable color palette, particle sizes, origin smoke properties, gravity influenced, renders as points, 360&deg; emission
- **FountainEffect** - Configurable color palette, particle sizes, renders as points or sprites, spread-angle emission
- **FireworksEffect** - Pre-defined color palettes, renders as points, particles spawn sub-particles, built-in types: **Peony, chrysanthemum, comet, palm, brocade, willow, pistil, tourbillion, fish, and strobe.**
- **SmokeEffect** - Configurable color palette, renders as diffuse points, rises slowly, narrow spread-angle emission. Use an `AffectedParticle` for the best looking effect.

