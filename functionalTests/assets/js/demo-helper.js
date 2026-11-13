
const DemoHelper = {
  $: null,

  initialize: function() {
    const body = document.querySelector('body');
    const helpers = `
      <!-- Demo Information -->
      <div class='information'></div>

      <!-- Code Window -->
      <div class="code-window hide"><div class="title"></div><div class="close">❌</div><div class="code"></div></div>

      <!-- others... -->
    `;

    DemoHelper.$ = document.createElement('div');
    DemoHelper.$.id = 'DemoHelpers';
    DemoHelper.$.innerHTML = helpers;
    body.appendChild(DemoHelper.$);

    DemoHelper.$.querySelector('div.code-window div.close').addEventListener('click', () => DemoHelper.hideCode());
  },
  
  loadFile: async function(fileName) {
    const content = await import(fileName, { assert: { type: 'module' } });
    return content.default;
  },

  showCode: async function(fileName, { title = fileName, className, scroll = 0 }) {
    const content = await DemoHelper.loadFile(fileName);
    const el = DemoHelper.$.querySelector('div.code-window');
    const codeEl = el.querySelector('div.code');

    el.querySelector('div.title').innerHTML = className ? '<span class="class-name">CLASS</span> ' + className + '<span class="file-name">' + fileName + '</a>' : title;
    codeEl.innerHTML = content;
    el.classList.remove('hide');

    // set to top
    codeEl.scroll({ top: 0, behavior: 'auto' });

    setTimeout(() => {
      if (scroll > 0)
        codeEl.scrollTo({ top: scroll, behavior: 'smooth' });
    }, 450);
  },

  hideCode: function() {
    DemoHelper.$.querySelector('div.code-window').classList.add('hide');
  },

  showInfo: function(exampleInfo) {
    const infoWindow = DemoHelper.$.querySelector('div.information');
    infoWindow.innerHTML = exampleInfo;
    infoWindow.classList.remove('hide');
  }
};

DemoHelper.initialize();
export default DemoHelper;
