const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const positions = [300, 900, 1800];
  const links = ['about', 'projects', 'connect'].map(id => ({
    attrs: { href: '#' + id },
    getAttribute(key) { return this.attrs[key]; },
    setAttribute(key, value) { this.attrs[key] = value; },
    removeAttribute(key) { delete this.attrs[key]; },
  }));
  let height = 72, locked = false;
  const properties = {}, handlers = {}, frames = [];
  const document = {
    querySelector: () => ({ getBoundingClientRect: () => ({ height }) }),
    querySelectorAll: () => links,
    getElementById: id => ({ getBoundingClientRect: () => ({ top: positions[['about', 'projects', 'connect'].indexOf(id)] }) }),
    documentElement: { classList: { contains: () => locked }, style: { setProperty: (key, value) => properties[key] = value } },
  };
  const window = { addEventListener: (key, callback) => handlers[key] = callback, requestAnimationFrame: callback => frames.push(callback) };
  vm.runInNewContext(fs.readFileSync('public/js/home-navigation.js', 'utf8'), { document, window });
  return { positions, links, properties, handlers, frames, setHeight: value => height = value, setLocked: value => locked = value };
}

test('section marker follows scrolling without changing links and clears above About', () => {
  const h = harness();
  assert.ok(h.links.every(link => !link.attrs['aria-current']));
  h.positions[0] = -400; h.positions[1] = 90;
  h.handlers.scroll(); h.handlers.scroll();
  assert.equal(h.frames.length, 1, 'scroll work is coalesced');
  h.frames.shift()();
  assert.equal(h.links[1].attrs['aria-current'], 'location');
  assert.equal(h.links[1].attrs.href, '#projects');
  h.positions[0] = 300; h.positions[1] = 900;
  h.handlers.scroll(); h.frames.shift()();
  assert.ok(h.links.every(link => !link.attrs['aria-current']));
});

test('header offsets follow resizing and ignore transient dialog scroll positions', () => {
  const h = harness();
  assert.equal(h.properties['--top-bar-h'], '72px');
  h.setHeight(108); h.handlers.resize(); h.frames.shift()();
  assert.equal(h.properties['--top-bar-h'], '108px');
  h.setLocked(true); h.positions[2] = 0;
  h.handlers.scroll(); h.frames.shift()();
  assert.ok(h.links.every(link => !link.attrs['aria-current']));
});
