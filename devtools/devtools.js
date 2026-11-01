/**
 * RenderEngine4 Inspector — DevTools entry point.
 *
 * This script runs once when DevTools opens. `chrome.devtools.panels.create`
 * lazily registers our custom panel ("RenderEngine4" in the panel strip);
 * panel.html is only loaded when the user actually clicks the panel.
 */
chrome.devtools.panels.create(
  'RenderEngine4',
  'icons/icon-32.png',
  'panel.html',
  (panel) => {
    // Reserved for the future: notify the engine bridge when the panel is
    // closed (e.g. so the game can stop emitting debug events). Not used in
    // MVP-0 — the bridge keeps its outbox bounded and the panel simply
    // stops draining it.
    // panel.addListener(() => {
    //   /* no-op in MVP-0 */
    // });
  }
);
