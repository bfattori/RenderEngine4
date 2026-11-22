
const DemoHelper = {
  $: null,

  initialize: function() {
    const body = document.querySelector('body');
    const helpers = `
      <!-- Demo Information -->
      <div class='information hide'></div>

      <!-- Code Window -->
      <div class="code-window hide"><div class="title"></div><div class="close">❌</div><div class="code"></div></div>

      <!-- others... -->
    `;

    DemoHelper.$ = document.createElement('div');
    DemoHelper.$.id = 'DemoHelpers';
    DemoHelper.$.innerHTML = helpers;
    body.appendChild(DemoHelper.$);

    const extras = document.createElement('div');
    extras.id = 'DemoHelpersExtra';
    body.appendChild(extras);

    DemoHelper.$.querySelector('div.code-window div.close').addEventListener('click', () => DemoHelper.hideCode());
  },
  
  loadFile: async function(fileName, isClass) {
    if (isClass) {
      const content = await import(fileName, { assert: { type: 'module' } });
      return content.default;
    } else {
      const text = await import(fileName, { with: { type: 'text' }});
      return text.default.replaceAll('<', '&lt;');
    }
  },

  showCode: async function(fileName, { title, className, scroll} = {title: fileName, className: null, scroll: 0}) {
    const content = await DemoHelper.loadFile(fileName, className !== null);
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
  },

  showExtraInfo: function(info, { left, top, right, width, height } = {}) {
    const infoWindow = document.createElement('div');
    infoWindow.classList.add('information','extra');
    infoWindow.innerHTML = info;
    if (left) infoWindow.style.left = `${left}px`;
    if (right) infoWindow.style.right = `${right}px`;
    if (top) infoWindow.style.top = `${top}px`;
    if (width) infoWindow.style.width = `${width}px`;
    if (height) infoWindow.style.height = `${height}px`;
    document.getElementById('DemoHelpersExtra').appendChild(infoWindow);
  }
};

DemoHelper.initialize();
export default DemoHelper;
