const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(connection) {
  const timers = [], videos = [], nodes = [];
  let document;
  function element(tag = 'div') {
    const attrs = {}, classes = new Set(), listeners = {};
    const el = {
      tagName: tag.toUpperCase(), children: [], attrs, listeners, isConnected: true,
      hidden: false, textContent: '', style: {},
      classList: { add: key => classes.add(key), remove: key => classes.delete(key) },
      setAttribute: (key, value) => attrs[key] = value,
      getAttribute: key => attrs[key], removeAttribute: key => delete attrs[key],
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      append(...children) { children.forEach(child => this.appendChild(child)); },
      removeChild(child) { child.parentNode = null; this.children = this.children.filter(x => x !== child); },
      replaceChildren() { this.children = []; },
      addEventListener(type, handler) { listeners[type] = handler; },
      querySelectorAll() { return []; },
      focus(options) { document.activeElement = this; this.focusOptions = options; },
    };
    if (tag === 'video') {
      Object.assign(el, { readyState: 0, networkState: 0, duration: NaN, paused: true,
        buffered: { length: 0 }, loadCount: 0,
        load() { this.loadCount++; }, pause() { this.paused = true; },
      });
      videos.push(el);
    }
    nodes.push(el);
    return el;
  }
  const opener = element('button'), modal = element(), close = element('button'), panel = element(), body = element();
  modal.querySelector = selector => selector === '.erhu-modal__close' ? close : panel;
  modal.querySelectorAll = () => [close];
  const ids = { 'erhu-wiki-open': opener, 'erhu-wiki-modal': modal, 'erhu-wiki-body': body, 'erhu-wiki-title': element('h2') };
  document = { activeElement: null, readyState: 'complete', body: element(),
    documentElement: { getAttribute: () => 'en' },
    createElement: element, getElementById: id => ids[id], addEventListener() {},
  };
  const context = { document, navigator: { connection }, window: { setTimeout: fn => timers.push(fn), addEventListener() {} } };
  vm.runInNewContext(fs.readFileSync('public/js/erhu-content.js', 'utf8') + fs.readFileSync('public/js/erhu.js', 'utf8'), context);
  return { opener, close, videos, nodes, document, open: () => opener.listeners.click(), status: () => nodes.findLast(x => x.className === 'erhu-wiki__video-status') };
}

test('video preloads on interest instead of competing with the initial hero', () => {
  const h = harness();
  assert.equal(h.videos.length, 0);
  h.opener.listeners.pointerenter();
  assert.equal(h.videos.length, 1);
  assert.equal(h.videos[0].preload, 'auto');
  h.open();
  assert.equal(h.videos.length, 1, 'opening reuses the preloaded media element');
});

test('data-saving connections skip speculative video loading but can open the player', () => {
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }]) {
    const h = harness(connection);
    h.opener.listeners.pointerenter();
    assert.equal(h.videos.length, 0);
    h.open();
    assert.equal(h.videos.length, 1);
  }
});

test('buffer percentage measures real ranges, handles unknown duration, and recovers from source errors', () => {
  const h = harness(); h.open();
  const video = h.videos[0], status = h.status();
  assert.equal(status.children[0].textContent, 'Loading video…');
  assert.equal(status.children[1].hidden, true, 'unknown duration has no fabricated percentage');
  video.duration = 100;
  video.buffered = { length: 2, start: i => [0, 20][i], end: i => [10, 30][i] };
  video.listeners.progress();
  assert.equal(status.children[0].textContent, 'Video buffered · 20%');
  assert.equal(status.children[1].value, 20);
  video.readyState = 3; video.paused = false;
  video.listeners.playing();
  assert.equal(status.hidden, true, 'playing media does not retain a loading indicator');
  video.children[0].listeners.error();
  assert.equal(status.hidden, false);
  assert.match(status.children[0].textContent, /unavailable/);
  const loadCount = video.loadCount;
  h.close.listeners.click(); h.open();
  assert.equal(video.loadCount, loadCount + 1, 'reopening retries a failed source');
  h.close.listeners.click();
  assert.equal(h.document.activeElement, h.opener, 'returns focus even when Safari never focused the click');
  assert.equal(h.opener.focusOptions.preventScroll, true);
});

test('every language has loading, buffering, and failure copy', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('public/js/erhu-content.js', 'utf8'), context);
  for (const pack of Object.values(context.ERHU_WIKI)) {
    for (const key of ['videoLoading', 'videoBuffering', 'videoError']) assert.ok(pack[key]);
  }
});
