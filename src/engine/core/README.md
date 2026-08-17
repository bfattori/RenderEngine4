# System Core
Herein lies the core functionality of the **RenderEngine4**. These classes and libraries provide the foundation for engine operation and base classes used throughout the engine.

To include most of the core classes used throughout the game, import `lib.js` and
select the classes you want from that. Example:
```js
import { Paths, RenderEngineError, Config } from './core/lib.js';
```

## `Config`
These are standardized containers to hold configuration data. The common pattern can be universally shared across different parts of the engine. `Config` objects utilize `Util.lombok` to instrument the fields defined in the configuration with setters and getters automatically, reducing the need to create them yourself.

> ### `TransferrableConfig` Sub-class
> WebWorker- and Network-safe configuration objects can dehydrate for transmission, then rehydrate for use in another location. This is useful for passing complex configuration objects, with non-primitive types, between different parts of the engine, across different processes, or across network boundaries.


## `Console`
The **RenderEngine4** console decorates the built-in console, plus adds `PRAGMA` for debugging operations, and `PERF` for setting performance marks with `MEASURE` to record performance metrics in the browser's performance monitor for those marks. `PRAGMA`, `PERF`, and `MEASURE` are stripped from production builds.

## `Engine`
The engine is the heart of the **RenderEngine4**. It has references to the main state controllers and has the update and render loop.

## `Enum`
A Java Enum-like object that provides a consistent way to represent constant values as Symbols, but still access the ordinal and optional string representation of the `Enum`.

## `EventEngine`
The event engine is a pub/sub model, provided globally to the running environment. It also is the factory for `GameObject` instance's event context.

## `FixedPointMath`
A basic fixed-point mathematics library for dealing with floating point as integers. It can be used when floating point is too heavy, or unsupported by hardware.

## `GameWorld`
The game world orchestrates the objects within the world. It coordinates with the world camera, and manages `GameObject` instances, provides for and tests collisions against the world collision model, and retains references to the `RenderContext` and `Camera`.

## `$Math` (Math.js)
The `$Math` library provides functions useful in game development. Random number generators, trigonometric functions, vector math, scalar operations, dot- and cross-product, and more.

## `Matrix2d` (Matrix.js)
The `Matrix2d` class extends the `DOMMatrix` object to implement additional methods apparently missing from `DOMMatrix`, and some additional static utility methods.

## `RenderEngineError`
The base class for all exceptions thrown by the **RenderEngine4**.

## `Util`
Several useful utility functions for color manipulation, hashing,npm and an `org.projectlombok.lombok`'esque function that generates setters and getters from an array of field names, or from an object with pre-existing values with configurable setters.

