# Debugging with the RenderEngine4
The `RenderEngine4` has a built-in debugger that can help you identify and fix issues in your code. The debugging tools are intended to be used during development, and excluded from production builds. To keep this as clean as possible, the debugging is kept separate from the engine classes.

The debugging harness is loaded into the browser before your game code executes. _Loading the bridge is optional._

**Load the DevTools Bridge & Debugging Harness**
```html
  <!-- Load the DevTools bridge -->
  <script src="/RE4/devtools/protocol/messages.js"></script>
  <script src="/RE4/devtools/bridge/re4-debug-bridge.js"></script>

  <!-- Load the debugging harness -->
  <script src="/RE4/src/engine/renderEngine4_debug.js" type="module"></script>
  
  <!-- Launch your game -->
  <script src="/game/launch.js" type="module"></script>
```

**Just the Debugging Harness**
```html
  <!-- Load the debugging harness & game -->
  <script src="/RE4/src/engine/renderEngine4_debug.js" type="module"></script>
  <script src="/game/launch.js" type="module"></script>
```

## The Debug Harness
The harness is loaded first to add a couple debug methods to the global context. These methods can be called directly from your code or through the console in the editor. The primary method for adding debugging to a class is done with `PRAGMA_INIT`. 

**Example:**
```javascript
export default class ClassName {
  constructor(name) {
    this.name = name;
  }

  doSomething() {
    ...
  }
}

await PRAGMA_INIT(ClassName);
```

### PRAGMA_INIT(ClassName)
Calling `PRAGMA_INIT(ClassName)` will load the debug object from the file at `/src/_debug/classes/ClassName.js`. Within the file, you define debug "points" that can be called from within your code with the `PRAGMA` method. These points are defined as functions that take a single `data` argument and may or may not return a value.

**Example:**
```javascript
const debug = {
  'doSomething`: ({startTime, endTime}) => {
    // perform debugging tasks, call debug rendering, etc...
  }
};

export default debug;
```

### PRAGMA(ClassName, 'debugPoint', {data})
Use `PRAGMA` to invoke a debug point and pass data to it at any point from within your code. You pass the `ClassName` class as the first argument, identifying which object owns the debug point you want. Next is the name of the debug point.

## Debugging Points
Debugging points are called from within your code with the `PRAGMA` method. Calling the debug point from within your class will invoke the point's method. You can pass whatever you want in the data to the debug point's method. Debug points are in the format "`pointName:subPointName`", where the sub-point name is optional but allows for granularity in debugging.

**Example:**
```javascript
export default class ClassName {
  constructor(name) {
    this.name = name;
  }

  doSomething() {
    ... code ...
    
    PRAGMA(ClassName, 'doSomething', { startTime, endTime });

    ... other code ...
  }
}

await PRAGMA_INIT(ClassName);
```

### Debugging Point Configuration
Debugging points are defined the the `debugOpts` property of the Engine's `flags` configuration. A debug point name will only be executed if a matching property exists in the engine's options under `debugOpts`, and the value is `true`. This allows you to fine tune the debug functionality during development. Adding additional properties to `debugOpts` enables new custom debug points.

#### DevTools Extension
The properties of `debugOpts` are configurable in real-time from the DevTools extension under the **Engine** tab.

## Production Builds & Compiling

For production builds, you should use the game compiler to remove all of the `PRAGMA` and `PRAGMA_INIT` calls from the engine and your game code. This will result in a smaller file size, faster loading times, and faster execution. 

Leaving them in is not recommended - but you can just turn off the `debug` property in the Engine's `flags` config so they don't run. The file size will be larger, especially if you include the debugging classes and debug harness.

```html
  <!-- Load the game engine & game -->
  <script src="/RE4/src/engine/renderEngine4.js" type="module"></script>
  <script src="/game/launch.js" type="module"></script>
```
