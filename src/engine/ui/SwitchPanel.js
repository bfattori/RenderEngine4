import Config from '../core/config/Config.js';
import Util from '../core/Util.js';

export default class SwitchPanel extends Config {
  #panelId = null;

  constructor(parentEl, options = {}) {
    super({
      label: 'Switch Panel',
      display: {
        class: 're4-switch-panel'
      },
      groups: [
        {
          label: 'Option Group 1',
          buttons: {
            'Option 1': () => { alert('option 1'); return 'clicked 1'; },
            'Option 2': () => { alert('option 2'); return 'clicked 2'; },
            'Option 3': () => { alert('option 3'); return 'clicked 3'; },
            'Option 4': () => { alert('option 4'); return 'clicked 4'; },
            'Option 5': () => { alert('option 5'); return 'clicked 5'; },
            'Option 6': () => { alert('option 6'); return 'clicked 6'; },
          }
        }
      ]
    });
    this.merge(options);

    const $this = this;
    setTimeout(async () => {
      const panel = await $this.build(parentEl);
    }, 10);
  }
  
  async build(parentEl) {
    // create the panel element
    const id = await Util.hexHash(Date.now().toString());
    this.#panelId = `switchPanel${id}`;
    const container = document.createElement('div');
    container.id = this.#panelId;
    container.classList.add('switch-panel', this.#panelId, this.display.class);
    
    // panel title
    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = this.label;
    container.appendChild(title);
    
    // panel groups
    let idx = 1;
    for (const groupInfo of this.groups) {
      const group = document.createElement('div');
      group.classList.add('group', `group-${idx++}`);

      const groupLabel = document.createElement('div');
      groupLabel.classList.add('group-title');
      groupLabel.textContent = groupInfo.label;
      group.appendChild(groupLabel);

      const groupContainer = document.createElement('div');
      groupContainer.classList.add('button-set');
      group.appendChild(groupContainer);

      // group buttons
      for (const button in groupInfo.buttons) {
        const buttonElement = document.createElement('div');
        buttonElement.classList.add('button', `btn-${button.replaceAll(/[^\w]*/g,'')}`);
        buttonElement.textContent = button;
        groupContainer.appendChild(buttonElement);
      }

      container.appendChild(group);
    }

    // need to add to the document to measure
    parentEl.appendChild(container);

    this.#hookEvents(container);
  }

  #hookEvents(panel) {
    let idx = 1;
    for (const groupInfo of this.groups) {
      const groupClass = `div.group-${idx++}`;
      const groupEl = panel.querySelector(groupClass);
      for (const button in groupInfo.buttons) {
        const buttonEl = groupEl.querySelector(`div.btn-${button.replaceAll(/[^\w]*/g,'')}`);

        buttonEl.addEventListener('click', e => {
          const newLabel = groupInfo.buttons[button].call(this);
          if (newLabel) {
            e.currentTarget.textContent = newLabel;
          }
        });
      }
    }
  }
}