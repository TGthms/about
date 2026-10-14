const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const handlers = {}, timers = [];
  let desktop = false, headerInert = false;
  let document;
  function element() {
    const attrs = {}, classes = new Set();
    return {
      attrs, hidden: false, tabIndex: 0, disabled: false,
      style: {}, parentElement: null,
      classList: {
        contains: key => classes.has(key), add: (...keys) => keys.forEach(key => classes.add(key)),
        remove: (...keys) => keys.forEach(key => classes.delete(key)),
        toggle: (key, on) => on ? classes.add(key) : classes.delete(key),
      },
      setAttribute: (key, value) => attrs[key] = value,
      getAttribute: key => attrs[key], removeAttribute: key => delete attrs[key],
      hasAttribute: key => key in attrs,
      getClientRects: () => [1], closest: () => null,
      focus() { document.activeElement = this; },
      appendChild(child) { child.parentElement = this; },
      insertBefore(child) { child.parentElement = this; },
      addEventListener(type, fn) { this[type] = fn; },
    };
  }
  const cluster = element(), trigger = element(), panel = element(), body = element();
  const hiddenTrigger = element(), selected = element(), theme = element(), host = element(), inactiveHost = element();
  hiddenTrigger.getClientRects = () => [];
  selected.setAttribute('aria-selected', 'true');
  inactiveHost.tabIndex = -1;
  panel.querySelector = () => null;
  panel.querySelectorAll = () => [hiddenTrigger, selected, theme, host, inactiveHost];
  const ids = { 'controls-trigger': trigger, 'controls-panel': panel };
  document = { body, activeElement: body, querySelector: () => cluster, getElementById: id => ids[id], addEventListener: (key, fn) => handlers[key] = fn };
  const context = {
    document, isDesktopControls: () => desktop,
    setBackgroundInert(active,on) { if (on) headerInert = true; else if (active.parentElement === body) headerInert = false; },
    window: { matchMedia: query => ({ matches: false, addEventListener(name,fn) { if(query==='(min-width: 768px)') handlers.breakpoint=fn; } }), setTimeout: fn => timers.push(fn), cancelAnimationFrame() {} },
    requestAnimationFrame: fn => fn(),
  };
  vm.runInNewContext(fs.readFileSync('public/js/i18n/controls.js', 'utf8') + '\ninitControlsPanel();', context);
  return { document, trigger, selected, theme, host, handlers, timers, panel, cluster,
    get headerInert(){return headerInert;}, desktop(){desktop=true;handlers.breakpoint();},
    open: () => trigger.click({ stopPropagation() {} }) };
}

test('mobile preferences focus visible selected language and wrap through the close button', () => {
  const h = harness(); h.open();
  assert.equal(h.document.activeElement, h.selected);
  let prevented = false;
  h.handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.document.activeElement, h.trigger);
  h.handlers.keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(h.document.activeElement, h.selected);
  h.document.activeElement = h.theme;
  prevented = false;
  h.handlers.keydown({ key: 'Tab', preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'theme remains in the natural keyboard sequence');
});

test('Escape restores the opener even when Safari did not focus the clicked button', () => {
  const h = harness(); h.open();
  h.handlers.keydown({ key: 'Escape', preventDefault() {} });
  h.timers.forEach(fn => fn());
  assert.equal(h.document.activeElement, h.trigger);
  assert.equal(h.trigger.attrs['aria-expanded'], 'false');
});

test('resizing an open mobile sheet releases the header before moving preferences into it',()=>{
  const h=harness();h.open();assert.equal(h.headerInert,true);
  h.desktop();
  assert.equal(h.headerInert,false);
  assert.equal(h.panel.parentElement,h.cluster);
  assert.equal(h.trigger.attrs['aria-expanded'],'false');
  assert.equal(h.panel.hidden,false);
});
