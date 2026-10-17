const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const events = {}, classes = new Set(), pending = [], inert = [];
  let document, locks = 0, loads = 0;
  function node() {
    return {
      listeners: {}, attrs: {}, hidden: true,
      addEventListener(key, fn) { this.listeners[key] = fn; },
      setAttribute(key, value) { this.attrs[key] = value; },
      focus(options) { document.activeElement = this; this.focusOptions = options; },
    };
  }
  const opener = node(), modal = node(), close = node(), backdrop = node(), region = node(), lastLink = node();
  region.scrollTop = 200;
  modal.classList = { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key) };
  modal.querySelector = selector => selector === '.dialog-scroll' ? region : close;
  modal.querySelectorAll = selector => selector === '[data-archived-close]' ? [close, backdrop] : [close, region, lastLink];
  document = {
    activeElement: opener,
    body: { classList: modal.classList },
    getElementById: id => id === 'archived-projects-open' ? opener : modal,
    querySelector: () => null,
    addEventListener(key, fn) { events[key] = fn; },
  };
  const window = { matchMedia: () => ({ matches: false }), setTimeout: fn => pending.push(fn) };
  const context = { document, window, loadDeferredImages: () => loads++, lockPageScroll: () => locks++, unlockPageScroll: () => locks--, setBackgroundInert: (_, on) => inert.push(on) };
  vm.runInNewContext(fs.readFileSync('public/js/preferences.js', 'utf8'), context);
  context.closeSiteDialog = window.closeSiteDialog;
  vm.runInNewContext(fs.readFileSync('public/js/archived-projects.js', 'utf8'), context);
  return { opener, modal, close, backdrop, region, lastLink, document, events, pending, inert, locks: () => locks, loads: () => loads };
}

test('archive stays modal through its exit and restores the page once', () => {
  const h = harness();
  h.opener.listeners.click(); h.opener.listeners.click();
  assert.equal(h.locks(), 1);
  assert.equal(h.loads(), 1);
  assert.equal(h.region.scrollTop, 0);
  assert.equal(h.document.activeElement, h.close);
  h.close.listeners.click(); h.backdrop.listeners.click(); h.opener.listeners.click();
  assert.equal(h.modal.hidden, false);
  assert.equal(h.locks(), 1);
  assert.equal(h.pending.length, 1);
  h.pending.shift()();
  assert.equal(h.modal.hidden, true);
  assert.equal(h.locks(), 0);
  assert.deepEqual(h.inert, [true, false]);
  assert.equal(h.opener.attrs['aria-expanded'], 'false');
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.opener.focusOptions.preventScroll, true);
  h.opener.listeners.click();
  assert.equal(h.modal.hidden, false);
  assert.equal(h.locks(), 1);
});

test('archive keyboard navigation wraps within the dialog and Escape closes', () => {
  const h = harness(); let prevented = 0;
  h.opener.listeners.click();
  h.events.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented++; } });
  assert.equal(h.document.activeElement, h.lastLink);
  h.events.keydown({ key: 'Tab', preventDefault() { prevented++; } });
  assert.equal(h.document.activeElement, h.close);
  h.events.keydown({ key: 'Escape', preventDefault() { prevented++; } });
  h.pending.shift()();
  assert.equal(prevented, 3);
  assert.equal(h.modal.hidden, true);
  assert.equal(h.locks(), 0);
});
