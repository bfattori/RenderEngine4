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

> #### `/config/TransferrableConfig` Sub-class
> WebWorker- and Network-safe configuration objects can dehydrate for transmission, then rehydrate for use in another location. This is useful for passing complex configuration objects, with non-primitive types, between different parts of the engine, across different processes, or across network boundaries.

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
`Spark` is an extension of `DataView` with support for data types typically found in games. It uses the `SparkHeap` for array types.

### `/memory/SparkHeap`
Creating and destroying many thousand objects can lead to a lot of garbage collection. The `SparkHeap` is a memory allocator designed to reduce the overhead of garbage collection by allocating memory in fixed-size blocks.

### `/memory/FastMemoryPool`
Fast memory pools are allocators that don't hold pointers to memory in use. It is expected that space that is allocated is only alive for a short period of time, and it can be reused without needing to free the memory first. This reduces the overhead of garbage collection by avoiding the need to allocate and deallocate memory frequently.

### `/memory/SlowMemoryPool`
The slow memory pools are allocated with a pointer and the memory is held until it is freed. Additionally, coalescing of memory is done when there is CPU idle time.