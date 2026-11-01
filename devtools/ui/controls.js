/**
 * Controls — factory functions for content-area widgets.
 * ============================================================================
 * These are the building blocks that future (MVP-1+) content areas will use
 * to render interactive controls (toggles, sliders, inputs, read-only stats,
 * key/value lists). They are intentionally UI-only: each factory returns a
 * DOM node with a uniform imperative API:
 *
 *   node.set(value)          — update the control from engine data
 *   node.onChange(fn)        — (interactive controls) react to user input
 *
 * Content-area code then follows one uniform pattern:
 *   1. Build controls once in `buildContent(tab, item)`.
 *   2. Push updates with `node.set(...)` when events arrive.
 *   3. Send commands with `tab.connection.send(...)` in onChange handlers.
 *
 * None of these send protocol messages themselves — that keeps the transport
 * in one place (panel/connection.js).
 */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function formatNumber(value, unit) {
  const num = Number(value);
  const text = Number.isFinite(num) ? (Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/0$/, '')) : String(value);
  return unit ? `${text} ${unit}` : text;
}

/** Attach the standard onChange hook to any returned control root. */
function withOnChange(root, onChange) {
  root.onChange = (fn) => {
    root._onChange = typeof fn === 'function' ? fn : null;
    return root;
  };
  if (typeof onChange === 'function') root._onChange = onChange;
  return root;
}

function fire(root, value) {
  if (typeof root._onChange === 'function') root._onChange(value);
}

/** Container for a named group of controls. */
export function section({ title, hint } = {}) {
  const root = el('section', 'ctrl-section');
  if (title) root.appendChild(el('h4', 'ctrl-section-title', title));
  if (hint) root.appendChild(el('p', 'ctrl-hint', hint));
  return root;
}

/** Read-only label/value cell (for runtime data displays). */
export function stat({ label, value = '—' } = {}) {
  const root = el('div', 'stat-cell');
  root.appendChild(el('span', 'stat-label', label));
  const valueEl = el('span', 'stat-value', String(value));
  root.appendChild(valueEl);
  root.set = (v) => {
    valueEl.textContent = v === undefined || v === null ? '—' : String(v);
  };
  return root;
}

/** Checkbox toggle. */
export function toggle({ label, value = false, disabled = false, onChange } = {}) {
  const root = el('label', 'ctrl ctrl-toggle');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(value);
  input.disabled = disabled;
  root.append(input, el('span', 'ctrl-label', label));
  input.addEventListener('change', () => fire(root, input.checked));
  root.set = (v) => {
    input.checked = Boolean(v);
  };
  root.disabled = (d) => {
    input.disabled = Boolean(d);
  };
  return withOnChange(root, onChange);
}

/** Range slider with live value readout. */
export function slider({ label, min = 0, max = 100, step = 1, value = 0, unit = '', disabled = false, onChange } = {}) {
  const root = el('div', 'ctrl ctrl-slider');
  const head = el('div', 'ctrl-head');
  const readout = el('span', 'ctrl-readout', formatNumber(value, unit));
  head.append(el('label', 'ctrl-label', label), readout);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.disabled = disabled;

  input.addEventListener('input', () => {
    const v = Number(input.value);
    readout.textContent = formatNumber(v, unit);
    fire(root, v);
  });

  root.append(head, input);
  root.set = (v) => {
    input.value = String(v);
    readout.textContent = formatNumber(v, unit);
  };
  return withOnChange(root, onChange);
}

/** Numeric input (for parameters like thresholds, rates, counts). */
export function number({ label, value = 0, min, max, step = 1, unit = '', disabled = false, onChange } = {}) {
  const root = el('label', 'ctrl ctrl-number');
  const suffix = unit ? el('span', 'ctrl-unit', unit) : null;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  input.step = String(step);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.disabled = disabled;
  root.append(el('span', 'ctrl-label', label), input, suffix);
  input.addEventListener('change', () => {
    const v = Number(input.value);
    fire(root, Number.isNaN(v) ? input.value : v);
  });
  root.set = (v) => {
    input.value = String(v);
  };
  return withOnChange(root, onChange);
}

/** Single-line text input (paths, names, IDs). */
export function text({ label, value = '', placeholder = '', disabled = false, onChange } = {}) {
  const root = el('label', 'ctrl ctrl-text');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.disabled = disabled;
  root.append(el('span', 'ctrl-label', label), input);
  input.addEventListener('change', () => fire(root, input.value));
  root.set = (v) => {
    input.value = String(v ?? '');
  };
  return withOnChange(root, onChange);
}

/** Dropdown select. `options` accepts strings or {value,label} pairs. */
export function select({ label, value = '', options = [], disabled = false, onChange } = {}) {
  const root = el('label', 'ctrl ctrl-select');
  const input = document.createElement('select');
  input.disabled = disabled;
  for (const option of options) {
    const opt = document.createElement('option');
    if (typeof option === 'string') {
      opt.value = option;
      opt.textContent = option;
    } else {
      opt.value = String(option.value);
      opt.textContent = option.label !== undefined ? option.label : String(option.value);
    }
    input.appendChild(opt);
  }
  input.value = String(value);
  root.append(el('span', 'ctrl-label', label), input);
  input.addEventListener('change', () => fire(root, input.value));
  root.set = (v) => {
    input.value = String(v);
  };
  return withOnChange(root, onChange);
}

/** Push action button (e.g. "Clear pool", "Rebuild cache"). */
export function button({ label, kind = 'default', disabled = false, onClick } = {}) {
  const root = document.createElement('button');
  root.type = 'button';
  root.className = `ctrl-button ctrl-button-${kind}`;
  root.textContent = label;
  root.disabled = disabled;
  root.addEventListener('click', () => onClick && onClick(root));
  root.set = (v) => {
    if (typeof v === 'boolean') root.disabled = v;
  };
  return root;
}

/**
 * Key/value table (the workhorse for "inspect this thing" views).
 * rows: [ [key, value], ... ]
 */
export function kvList({ title, rows = [] } = {}) {
  const root = el('div', 'ctrl kvlist');
  if (title) root.appendChild(el('h4', 'ctrl-section-title', title));
  const table = el('table', 'kv-table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  root.appendChild(table);

  const refresh = (list) => {
    tbody.replaceChildren(
      ...[...list].map(([k, v]) => {
        const tr = document.createElement('tr');
        tr.append(el('td', 'kv-key', String(k)), el('td', 'kv-value', v === undefined || v === null ? '—' : String(v)));
        return tr;
      })
    );
  };
  refresh(rows);
  root.set = refresh;
  return root;
}

/** Placeholder shown while a content area is not yet implemented. */
export function emptyState({ message, detail } = {}) {
  const root = el('div', 'empty-state');
  if (message) root.appendChild(el('p', 'empty-state-message', message));
  if (detail) root.appendChild(el('p', 'empty-state-detail', detail));
  return root;
}
