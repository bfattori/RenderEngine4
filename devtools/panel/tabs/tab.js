/**
 * Tab — the base unit of the bottom area of the panel.
 * ============================================================================
 * A tab renders two regions side by side:
 *
 *   ┌──────────────┬───────────────────────────────┐
 *   │  sidebar     │  content area                 │
 *   │  (items      │  (per-item controls; built by │
 *   │  relative    │  def.buildContent or the      │
 *   │  to tab)     │  placeholder in MVP-0)        │
 *   └──────────────┴───────────────────────────────┘
 *
 * Tab definition contract (each file in panel/tabs/ exports one):
 * {
 *   id:        string,            // unique, used in the DOM + event routing
 *   label:     string,            // shown in the tab strip
 *   description?: string,         // shown in the sidebar heading hint
 *   items: [                      // sidebar entries, top to bottom
 *     { id: string, label: string, description?: string },
 *     ...
 *   ],
 *   // Optional extension points (used by MVP-1+):
 *   //   buildContent(tab, item) -> HTMLElement
 *   //   onItemShown(tab, item)  -> void   (called after the area renders)
 *   //   onData(tab, payload)    -> void   (called when routed events arrive)
 * }
 *
 * `tab.data` holds the latest routed event payload for the tab, so a future
 * buildContent implementation can read engine state without re-subscribing.
 */
import '../../protocol/messages.js';
import * as ui from '../../ui/controls.js';

export class Tab {
  /** @param {object} def  a tab definition (see contract above) */
  constructor(def) {
    if (!def || !def.id || !Array.isArray(def.items) || def.items.length === 0) {
      throw new Error(`invalid tab definition: ${JSON.stringify(def && def.id)}`);
    }
    this.def = def;
    this.activeItemId = def.items[0].id;
    this.data = null; // latest routed event payload (see main.js routing table)

    this.paneEl = null;
    this.sidebarEl = null;
    this.contentEl = null;
  }

  /** Build the tab's DOM into `mountEl` and show the first item. */
  render(mountEl) {
    const pane = document.createElement('section');
    pane.className = 'tab-pane';
    pane.dataset.tab = this.def.id;
    pane.hidden = true; // activateTab() in main.js reveals the active one

    // ---- sidebar ----------------------------------------------------------
    const sidebar = document.createElement('aside');
    sidebar.className = 'tab-sidebar';
    sidebar.appendChild(el('h3', 'sidebar-heading', this.def.label));
    if (this.def.description) {
      sidebar.appendChild(el('p', 'sidebar-desc', this.def.description));
    }

    const list = document.createElement('ul');
    list.className = 'sidebar-list';
    for (const item of this.def.items) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-item';
      btn.textContent = item.label;
      btn.dataset.item = item.id;
      if (item.description) btn.title = item.description;
      btn.addEventListener('click', () => this.showItem(item.id));
      li.appendChild(btn);
      list.appendChild(li);
    }
    sidebar.appendChild(list);

    // ---- content area -----------------------------------------------------
    const content = document.createElement('div');
    content.className = 'tab-content';
    content.setAttribute('aria-live', 'polite');

    pane.append(sidebar, content);
    mountEl.appendChild(pane);

    this.paneEl = pane;
    this.sidebarEl = sidebar;
    this.contentEl = content;

    this.showItem(this.activeItemId);
    return pane;
  }

  /**
   * Switch the content area to `itemId` and rebuild its controls.
   * Content areas are rebuilt from scratch on every switch — cheap for
   * scaffolding, and it guarantees stale state never leaks between items.
   */
  showItem(itemId) {
    this.activeItemId = itemId;
    const item = this.def.items.find((i) => i.id === itemId) || { id: itemId, label: itemId };

    this.sidebarEl.querySelectorAll('.sidebar-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.item === itemId);
    });

    this.contentEl.replaceChildren();
    const build = typeof this.def.buildContent === 'function' ? this.def.buildContent : defaultContent;
    this.contentEl.appendChild(build(this, item));

    if (typeof this.def.onItemShown === 'function') {
      try {
        this.def.onItemShown(this, item);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[RE4 Inspector] ${this.def.id} onItemShown threw:`, err);
      }
    }
    return item;
  }

  /** Update the cached engine payload for this tab (routed from events). */
  setData(payload) {
    this.data = payload;
    if (typeof this.def.onData === 'function') {
      try {
        this.def.onData(this, payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[RE4 Inspector] ${this.def.id} onData threw:`, err);
      }
    }
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

/**
 * MVP-0 placeholder content area. Replaced automatically as soon as a tab
 * definition gains a `buildContent` function.
 */
function defaultContent(tab, item) {
  const wrap = ui.section({
    title: `${tab.def.label} → ${item.label}`,
    hint: item.description || undefined,
  });
  wrap.appendChild(
    ui.emptyState({
      message: 'Content area not implemented yet (MVP-0 scaffolding).',
      detail:
        'Add a buildContent(tab, item) function to this tab definition in panel/tabs/' +
        `${tab.def.id}.js, and compose it with the control factories in ui/controls.js ` +
        '(toggle, slider, number, text, select, button, kvList, stat). ' +
        'See README §"Content areas" for a worked example.',
    })
  );
  return wrap;
}
