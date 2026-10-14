const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({ month = 11, day = 21, reduced = false, search = '', hidden = false } = {}) {
  const events = {}, timers = new Map(), scripts = [];
  let id = 0, plays = 0, clears = 0;
  const motion = { matches: reduced, addEventListener: (name, fn) => events['motion:' + name] = fn };
  const document = {
    hidden, readyState: 'complete',
    currentScript: { getAttribute: () => 'js/vendor/balloons.js?v=test' },
    head: { appendChild: node => scripts.push(node) },
    createElement: () => ({ remove() { this.removed = true; } }),
    addEventListener: (name, fn) => events[name] = fn,
  };
  const window = {
    location: { search }, matchMedia: () => motion,
    setTimeout: fn => { timers.set(++id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn) => events[name] = fn,
  };
  vm.runInNewContext(fs.readFileSync('public/js/birthday.js', 'utf8'), {
    document, window, URLSearchParams,
    Date: class { getMonth() { return month; } getDate() { return day; } },
  });
  return {
    document, window, motion, events, scripts, timers,
    get plays() { return plays; }, get clears() { return clears; },
    flush() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
    load() {
      window.createBirthdayBalloons = () => { plays++; return { clear() { clears++; } }; };
      scripts.at(-1).onload();
    },
  };
}

test('birthday is December 21 locally; other dates load no balloon library', () => {
  for (const date of [{ month: 10, day: 21 }, { month: 11, day: 20 }, { month: 11, day: 22 }]) {
    const h = harness(date); h.flush(); h.events.pageshow({ persisted: false }); h.flush();
    assert.equal(h.scripts.length, 0);
  }
  const h = harness(); h.flush(); assert.equal(h.scripts.length, 1); h.load();
  assert.equal(h.plays, 1); assert.equal(h.scripts[0].removed, true);
});

test('every new visit celebrates, but focus and page-load events do not replay it', () => {
  for (let i = 0; i < 2; i++) {
    const h = harness(); h.events.load(); h.events.pageshow({ persisted: false }); h.flush(); h.load();
    h.document.hidden = true; h.events.visibilitychange();
    h.document.hidden = false; h.events.visibilitychange(); h.flush();
    assert.equal(h.plays, 1); assert.equal(h.clears, 1);
    h.events.pagehide(); h.events.pageshow({ persisted: true }); h.flush();
    assert.equal(h.plays, 2);
  }
});

test('reduced motion prevents loading and clears an active celebration', () => {
  const h = harness({ reduced: true }); h.flush(); assert.equal(h.scripts.length, 0);
  h.motion.matches = false; h.events['motion:change'](); h.flush(); h.load();
  h.motion.matches = true; h.events['motion:change'](); assert.equal(h.clears, 1);
});

test('a hidden tab waits, including when the library finishes loading in the background', () => {
  const h = harness({ hidden: true }); h.flush(); assert.equal(h.scripts.length, 0);
  h.document.hidden = false; h.events.visibilitychange(); h.flush();
  h.document.hidden = true; h.events.visibilitychange(); h.load(); assert.equal(h.plays, 0);
  h.document.hidden = false; h.events.visibilitychange(); h.flush(); assert.equal(h.plays, 1);
});

test('Escape cancels pending or active balloons without replaying on focus', () => {
  const pending = harness(); pending.flush(); pending.events.keydown({ key: 'Escape' }); pending.load();
  assert.equal(pending.plays, 0);
  const active = harness(); active.flush(); active.load(); active.events.keydown({ key: 'Escape' });
  assert.equal(active.clears, 1); active.events.visibilitychange(); active.flush(); assert.equal(active.plays, 1);
});

test('library failure is contained and the explicit preview works outside December 21', () => {
  const h = harness(); h.flush(); h.scripts[0].onerror(); h.events.visibilitychange(); h.flush();
  assert.equal(h.scripts.length, 1); assert.equal(h.plays, 0); assert.equal(h.scripts[0].removed, true);
  const preview = harness({ month: 1, day: 1, search: '?birthday=preview' });
  preview.flush(); preview.load(); assert.equal(preview.plays, 1);
});

function effectHarness(width = 1280, height = 720) {
  const frames = new Map(), timers = new Map(), animations = [];
  let id = 0;
  function node() {
    return {
      children: [], style: { setProperty() {} }, setAttribute() {},
      appendChild(child) { this.children.push(child); child.parent = this; },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); },
      animate() {
        let resolve, reject;
        const animation = {
          cancelled: false,
          finished: new Promise((yes, no) => { resolve = yes; reject = no; }),
          finish() { resolve(); }, cancel() { this.cancelled = true; reject(new Error('cancelled')); },
        };
        animations.push(animation); return animation;
      },
    };
  }
  const root = node();
  const window = {
    innerWidth: width, innerHeight: height,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { timers.set(++id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(fs.readFileSync('public/js/vendor/balloons.js', 'utf8'), {
    window, document: { documentElement: root, createElement: node },
  });
  return {
    root, frames, timers, animations, play: window.createBirthdayBalloons,
    frame() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } },
  };
}

test('balloons use one setup frame with bounded elements and release every animation on cancellation', async () => {
  const h = effectHarness(10000, 320), effect = h.play();
  h.frame();
  assert.equal(h.frames.size, 0); assert.ok(h.animations.length <= 12);
  effect.clear(); effect.clear();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.root.children.length, 0); assert.equal(h.timers.size, 0);
  assert.ok(h.animations.every(a => a.cancelled));
});

test('finished balloons clean themselves up; leaving before the first frame creates no animations', async () => {
  const h = effectHarness(); h.play(); h.frame(); h.animations.forEach(a => a.finish());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.root.children.length, 0); assert.equal(h.timers.size, 0);
  const pending = effectHarness(), effect = pending.play(); effect.clear(); pending.frame();
  assert.equal(pending.animations.length, 0); assert.equal(pending.root.children.length, 0);
});
