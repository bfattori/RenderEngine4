// What's going on here...
DemoHelper.showInfo( 
  `<p>
  The <b>RenderEngine4</b> is a powerful game engine written entirely in JavaScript. It is designed to be easy to use and 
  understand, making it ideal for beginners as well as experienced developers. Its features include a built-in particle engine, 
  a scene graph, and a rendering pipeline. The engine is designed to be highly customizable, allowing developers to create their
  own game mechanics and visual effects.
  </p><p>
  The engine is built on the idea of composition, from within the codebase itself to the way the engine functions. Starting
  with the way the engine is configured, properties in the constructor become properties of the object instance automatically.
  </p><p>
  Take a look at the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/config/Config.js', {className:'Config'})">Config</a> class and its sub-classes.
  <code>Config</code> uses the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/Util.js', {className: 'Util', scroll:3500})">Util.lombok()</a> method to generate 
  the getter and setter methods. This is a handy function used in a few places in the engine.
  </p>
`);

export default {};