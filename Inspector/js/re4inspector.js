chrome.devtools.panels.create(
  "RenderEngine4",            // Title of the panel
  null,                       // Icon (optional)
  "/html/panel.html",              // HTML page for your panel
  function(panel) {
    // Panel-specific initialization code here
  }
);