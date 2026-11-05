# System Core
Herein lies the core functionality of the **RenderEngine4**. These classes and libraries provide the foundation for engine operation and base classes used throughout the engine.

## `Engine`
The engine is the heart of the **RenderEngine4**. It has references to the main state controllers and has the update and render loop.


## `EventEngine`
The event engine is a pub/sub model, provided globally to the running environment. It also is the factory for `GameObject` instance's event context.

## `GameWorld`
The game world orchestrates the objects within the world. It coordinates with the world camera, and manages `GameObject` instances, provides for and tests collisions against the world collision model, and retains references to the `RenderContext` and `Camera`.

## `RenderEngineError`
The base class for all exceptions thrown by the **RenderEngine4**.

## `Util`
Several useful utility functions for color manipulation, hashing,npm and an `org.projectlombok.lombok`'esque function that generates setters and getters from an array of field names, or from an object with pre-existing values with configurable setters.

### `/config/Config`
These are standardized containers to hold configuration data. The common pattern can be universally shared across different parts of the engine. `Config` objects utilize `Util.lombok` to instrument the fields defined in the configuration with setters and getters automatically, reducing the need to create them yourself.

### `/config/TransferrableConfig`
Sub-class of `Config`, these are WebWorker- and Network-safe configuration objects can dehydrate for transmission, then rehydrate for use in another location. This is useful for passing complex configuration objects, with non-primitive types, between different parts of the engine, across different processes, or across network boundaries.

### `/lang/Console`
The **RenderEngine4** console decorates the built-in console, plus adds `PRAGMA` for debugging operations, and `PERF` for setting performance marks with `MEASURE` to record performance metrics in the browser's performance monitor for those marks. `PRAGMA`, `PERF`, and `MEASURE` are stripped from production builds.

### `/lang/Enum`
A Java Enum-like object that provides a consistent way to represent constant values as Symbols, but still access the ordinal and optional string representation of the `Enum`.

### `/lang/FixedPointMath`
A basic fixed-point mathematics library for dealing with floating point as integers. It can be used when floating point is too heavy, or unsupported by hardware.

### `/lang/$Math` (Math.js)
The `$Math` library provides functions useful in game development. Random number generators, trigonometric functions, vector math, scalar operations, dot- and cross-product, and more.

### `/lang/Matrix2d` (Matrix.js)
The `Matrix2d` class extends the `DOMMatrix` object to implement additional methods apparently missing from `DOMMatrix`, and some additional static utility methods.

### `/memory/Spark`
`Spark` extends the browser's native `DataView` with support for data types typically found in games. This is type used internally by the `SparkHeap` and the memory pools.

### `/memory/SparkHeap`
Creating and destroying many thousand objects can lead to a lot of garbage collection. The `SparkHeap` is a memory allocator designed to reduce the overhead of garbage collection by allocating memory in fixed-size blocks. It allocates `Spark` memory units in the size required by the game's needs.

### `/memory/FastMemoryPool`
Fast memory pools are `SparkHeap` allocators that don't hold pointers to the memory in use. It is expected that space that is allocated is only alive for a short period of time, and it can be reused without needing to free the memory first. This reduces the overhead of garbage collection by avoiding the need to allocate and deallocate memory frequently. These are used by the `$Math` and `$ParticleEngine` classes to improve performance.

### `/memory/SlowMemoryPool`
The slow memory pools are `SparkHeap` allocators with a pointer where the memory is held until it is freed. Additionally, coalescing of memory is done automatically when there is CPU idle time. Objects in a slow memory pool may be held for much longer periods of time than objects in fast memory pools since they must be freed before they can be reused.


## The **Spark** Memory Manager
The `Spark` data view is designed to make memory management flexible, yet still performant while minimizing garbage collection. Memory is allocated at start time for particle storage and is retained until the game exits. Particle memory is overwritten in a circular fashion to eliminate new allocations at runtime.

`Spark` extends from the `DataView` with methods added for memory types not native to it. For example, `Spark` allows for the creation of `VecF32` or `VecF32Array` which represent two 32-bit floats per element. Or the `Color32` type that can store hex color values and retrieve them in native web hex-color format.

### Memory Management Examples
In the particle system, a particle's memory segment is the size (in bytes) of the _largest_ particle type used. Inside the `Particle` or `BasicParticle`, memory is read and written directly with pre-computed byte offsets. Only numerical types are stored in memory so operations can be fast. The trade-off between using variable `Object` allocation vs fixed allocation is made up for by the reduced amount of garbage collection that occurs.

Standard JavaScript memory management is highly-optimized to work with JavaScript object types. Creating and destroying thousands of particles requires frequent garbage collection and causes stuttering in the game loop. But, by using a fixed memory allocator, we can virtually eliminate garbage collection.

An example of writing and reading memory is shown below. Particle lifecycle methods are passed a `memSegment` representing the `Spark` data view for the particle.

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

During update, a particle may need to read and write values in the memory segment. Updating a primitive value pulled from the memory segment _will not change the value in memory_. Primitive values are copy-by-value and must be explicitly written-back if the value must be retained. For array types, if you update an indexed value in the function scope, there is no need to perform a write-back. **Reading and writing array values _manipulates memory directly._**

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
Optionally, to avoid the introduction of the variable, one might consider this more efficient code:

```javascript
      memSegment.setFloat32(DiffuseParticle.OFFSETS.ALPHA, Math.max(0.0, memSegment.getFloat32(DiffuseParticle.OFFSETS.ALPHA) - fade));
```