const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(fetchResult) {
  const nodes = [], timers = new Map(), frames = new Map();
  let id = 0;
  function node(tag = 'div') {
    const attrs = new Map(), handlers = {}, children = [], classes = new Set();
    const value = {tag, children, handlers, style: {}, hidden: false,
      className: '', textContent: '', offsetHeight: 240,
      classList: {add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x)},
      setAttribute: (k, v) => attrs.set(k, v), getAttribute: k => attrs.get(k),
      appendChild: child => children.push(child), insertBefore: child => children.push(child),
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener: (key, cb) => handlers[key] = cb,
      getBoundingClientRect: () => ({top: 300, left: 0, width: 200, height: 200}),
      matches: () => false, contains: child => children.includes(child), remove() {}};
    nodes.push(value);
    return value;
  }
  const wrap = node(), link = node('a');
  wrap.querySelector = () => link;
  const media = {};
  const window = {
    matchMedia: query => media[query] ||= {matches: query.includes('hover'), addEventListener(_key, cb) {this.change = cb;}},
    addEventListener() {},
    setTimeout: cb => {const key = ++id; timers.set(key, cb); return key;},
    clearTimeout: key => timers.delete(key),
    requestAnimationFrame: cb => {const key = ++id; frames.set(key, cb); return key;},
  };
  const context = {window, document: {
    documentElement: {getAttribute: () => 'en'},
    querySelector: () => wrap, createElement: node, createDocumentFragment: node,
  }, sessionStorage: {getItem: () => null, setItem() {}},
  fetch: fetchResult, AbortController, systemPrefersReducedMotion: () => Boolean(media['(prefers-reduced-motion: reduce)']?.matches)};
  vm.runInNewContext(fs.readFileSync('public/js/github-card.js', 'utf8'), context);
  window.initGithubCard();
  return {wrap, link, timers, frames, media,
    get: name => nodes.find(n => n.className === name),
    open: () => wrap.handlers.focusin({target: link}),
    flush: () => new Promise(resolve => setImmediate(resolve))};
}

test('failed contribution request shows unavailable instead of zero and remains accessible', async () => {
  const h = harness(() => Promise.reject(new Error('offline')));
  h.open(); await h.flush();
  assert.match(h.get('github-popover__meta').textContent, /unavailable/);
  assert.equal(h.get('github-cal').hidden, true);
  assert.equal(h.get('github-popover').getAttribute('aria-hidden'), 'false');
  assert.equal(h.link.getAttribute('aria-describedby'), 'github-contributions');
  assert.equal(h.timers.size, 0);
  h.wrap.handlers.focusout({relatedTarget: null});
  assert.equal(h.get('github-popover').getAttribute('aria-hidden'), 'true');
});

test('stalled requests time out and do not leave permanent loading text', async () => {
  const h = harness(() => new Promise(() => {}));
  h.open();
  for (const cb of h.timers.values()) cb();
  await h.flush();
  assert.match(h.get('github-popover__meta').textContent, /unavailable/);
});

test('successful contributions distinguish a real zero from a failed response', async () => {
  const h = harness(() => Promise.resolve({ok: true, json: () => Promise.resolve({contributions: [], total: {[new Date().getFullYear()]: 0}})}));
  h.open(); await h.flush();
  assert.match(h.get('github-popover__meta').textContent, /^0 contributions in /);
  assert.equal(h.get('github-cal').hidden, false);
  assert.equal(h.timers.size, 0);
});

test('malformed contribution response is not presented as real zero activity', async () => {
  const h = harness(() => Promise.resolve({ok: true, json: () => Promise.resolve({error: 'unavailable'})}));
  h.open(); await h.flush();
  assert.match(h.get('github-popover__meta').textContent, /unavailable/);
});

test('enabling reduced motion stops an already-running tilt animation', () => {
  const h = harness(() => new Promise(() => {}));
  h.get('github-popover__card').handlers.mousemove({clientX: 130, clientY: 330});
  const mq = h.media['(prefers-reduced-motion: reduce)'];
  mq.matches = true; mq.change();
  const callbacks = [...h.frames.values()]; h.frames.clear();
  callbacks.forEach(cb => cb());
  assert.equal(h.frames.size, 0);
  assert.equal(h.get('github-popover__card').style.transform, 'none');
});
