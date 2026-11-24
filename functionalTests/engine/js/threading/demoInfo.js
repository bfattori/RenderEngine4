// What's going on here...
DemoHelper.showInfo( `
  <p>It is possible to run the game in a thread separate from the main thread. This can help improve performance with
  games that do more processing in their game loop. Check out the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/threading/$Thread.js', {className:'$Thread'})">$Thread</a>
  class to see how thread management is handled.
  </p>
  <p>The engine will start <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/threading/MainThread.js', {className:'MainThread'})">MainThread</a> which then spawns
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/threading/GameThread.js', {className:'GameThread'})">GameThread</a> to run the game code. <code>GameThread</code> and
  <code>MainThread</code> provide the mechanism to communicate seamlessly between threads.
  </p>
  <p>The initialization is a little different in this example because only the <code>Renderer</code> runs in the main thread. Look at the file
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/functionalTests/engine/js/threading/index.js')">index.js</a> in this folder and note how it is configured. The actual game code is located 
  in <a class='class-ref' href='#' onclick="DemoHelper.showCode('/functionalTests/engine/js/threading/game.js')">game.js</a> which contains the game logic and provides the object to infer control.
  </p>
`);

export default {};