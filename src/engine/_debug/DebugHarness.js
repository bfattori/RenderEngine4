import Context from '../Context.js';

const ctx = Context.getInstance();

/**
 * Default performance tooltip generator.
 * @param {Object} callInfo - Contains: `clazz`: the class, `method`: the method name, `args`: the args
 * @param {number} startTime - Starting timestamp
 * @param {number} endTime - Ending timestamp
 * @returns Text to supply to the mark or measure's tooltip in the performance timeline
 */
function perfText(callInfo, startTime, endTime) {
  const { clazz, method, args } = callInfo;
  return `${clazz.name} :: ${method}: ${startTime.toFixed(2)} ms${endTime ? ' - ' + endTime.toFixed(2) + ' ms' : ''}`;
}

/**
 * Set a performance mark in the timeline
 * @param {Object} param0 - Contains: `clazz`: the class, `method`: the method name, `args`: the args, `instance`: the class instance
 * @param {Object} config - The profiling configuration
 * @param {String} name - Optional name to add to the string "ClassName.method"
 * @returns The time of the mark
 */
function perf({clazz, method, args, instance}, config, name) {
  const time = performance.now();

  if (ctx.trackPerformance && ctx.debug) {
    name = `${clazz.name}.${method}${name ? '::' + name : ''}`;
    const toolTip = config.text || perfText;
    performance.mark(name, {
      start: time,
      detail: {
        devTools: {
          dataType: 'marker',
          color: config.color ? config.color : 'primary',
          tooltipText: toolTip({ clazz, method, args }, time)
        }
      }
    });
  }

  return time;
}

/**
 * Add a measurement to the performance timeline
 * @param {Object} param0 - Contains: `clazz`: the class, `method`: the method name, `args`: the args, `instance`: the class instance
 * @param {Object} config - The profiling configuration
 * @param {number} startTime - The starting time of the measurement
 * @param {number} endTime - The ending time of the measurement
 * @returns {number} The duration of the measurement
 */
function measure({clazz, method, args, instance }, config, startTime, endTime) {
  if (ctx.trackPerformance && ctx.debug) {
    const trackName = config.inTrack, groupName = config.asGroup;
    const toolTip = config.text || perfText;
    return performance.measure(`${clazz.name}.${method}`, {
      start: startTime,
      end: endTime,
      detail: {
        devTools: {
          dataType: trackName ? 'track-entry' : 'marker',
          color: config.color,
          track: trackName ? trackName : undefined,
          trackGroup: trackName && groupName ? groupName : undefined,
          tooltipText: toolTip({ clazz, method, args }, startTime, endTime)
        }
      }
    }).duration;
  }

  return 0;
}

/**
 * Instrument profiling for a class. This will wrap the methods defined in the profiling configuration with timing measurements.
 * The results are logged in the browser's performance tracking tool if enabled. The profiling configuration is defined in the
 * debug module for the class.
 * 
 * @param {Class} clazz - The class to instrument
 * @param {Object} profiling - The profiling configuration
 */
function instrumentProfiling(clazz, profiling) {
  for (const method of profiling.methods) {
    const classMethod = `${clazz.name}.${method}`;
    const originalMethod = clazz.prototype[method];
    if (profiling.inTrack) {
      if (!clazz.__DEBUG__.profiling['$$MEASURES'].includes(classMethod)) {
        console.verbose(`PRAGMA [  + ${classMethod} :: measure(${profiling.inTrack}${profiling.asGroup ? ':' + profiling.asGroup : ''}) ]`);

        clazz.prototype[method] = function(...args) {
          const start = performance.now();
          const result = originalMethod.apply(this, args);
          const end = performance.now();
          measure({ clazz, method, args, instance: this }, profiling, start, end);
          return result;
        };
        clazz.__DEBUG__.profiling['$$MEASURES'].push(classMethod);
      }
    } else {
      if (!clazz.__DEBUG__.profiling['$$MARKS'].includes(classMethod)) {
        console.verbose(`PRAGMA [  + ${clazz.name}.${method} :: mark() ]`);
        
        clazz.prototype[method] = function(...args) {
          perf({clazz, method, args, instance: this }, profiling, 'start');
          const result = originalMethod.apply(this, args);
          perf({clazz, method, args, instance: this }, profiling, 'end');
          return result;
        };
        clazz.__DEBUG__.profiling['$$MARKS'].push(classMethod);
      }
    }
  }
}

/**
 * Instrument a class with debug methods. This will import the debug module for
 * the class and assign it to the class's __DEBUG__ property. {@link pragma}
 * will look in this property for debug code to execute.
 * @param {Clazz} clazz - The class to instrument with debug and profiling
 */
async function pragma_init(clazz) {
  if (!clazz.__DEBUG__) {
    const className = clazz.name;
    console.verbose(`PRAGMA [ debug :: ${className} ]`);
    const DEBUG = await import(new URL(`./classes/${className}.js${ctx.preventScriptCache}`, import.meta.url));
    clazz.__DEBUG__ = DEBUG.default;

    if (clazz.__DEBUG__ && clazz.__DEBUG__.profiling) {
      // attach profiling hooks
      console.verbose(`PRAGMA [ profile :: ${className} ]`);
      clazz.__DEBUG__.profiling['$$MEASURES'] = [];
      clazz.__DEBUG__.profiling['$$MARKS'] = [];
      instrumentProfiling(clazz, clazz.__DEBUG__.profiling);
    }
  }
}

/**
 * 
 * @param {Class} clazz - The class that is calling the debug point
 * @param {String} name - The name of the debug point, in the format "debugPointName:subPointName"
 * @param {Object} data - The data to pass to the debug code
 * @returns {*} The return value of the debug code, if any
 */
function pragma(clazz, name, data) {
  if (ctx.pragmas && ctx.debug && ctx.debugOpts[name.split(':')[0]] === true)
    return clazz["__DEBUG__"][name](data);
}

const installDirectives = (owner = self) => {
  if (!owner.PRAGMA_INIT) {
    console.debug('Installing debug harness into global scope');
    
    // assign only once
    owner.PRAGMA_INIT = pragma_init;
    owner.PRAGMA = pragma;
    owner.PERF = perf;
    owner.MEASURE = measure;
  }
}

installDirectives();

export default {};
