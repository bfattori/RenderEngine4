// What's going on here...
DemoHelper.showInfo( 
  `<p>
  The <b>RenderEngine4</b>'s particle system is extremely flexible. Everything from
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/Particle.js', {className:'Particle'})">Particle</a>
  to <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/ParticleEffect.js', {className:'ParticleEffect'})">ParticleEffect</a>
  is customizable. There are several existing particle types and effects to start with, or you can
  create your own.
  </p>
  <p>
  This example features:
  <ul>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/BasicParticle.js', {className:'BasicParticle'})">BasicParticle</a>
  for the bursts using the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/effects/BurstEffect.js', {className:'BurstEffect'})">BurstEffect</a></li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/effects/FountainEffect.js', {className:'FountainEffect'})">FountainEffect</a>
  for both the fountain and trails.</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/TrailParticle.js', {className:'TrailParticle'})">TrailParticle</a>
  draws trails behind particles as they are emitted.</li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/SparkParticle.js', {className:'SparkParticle'})">SparkParticle</a>
  makes streaks with hot spots. It uses the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/effects/SparkEffect.js', {className:'SparkEffect'})">SparkEffect</a></li>
  <li><a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/types/SmokeParticle.js', {className:'SmokeParticle'})">SmokeParticle</a>
  creates wispy smoke and uses the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/particlesystem/effects/SmokeEffect.js', {className:'SmokeEffect'})">SmokeEffect</a></li>
  </ul>
  </p>
`);

export default {};