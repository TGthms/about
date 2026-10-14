const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function content() {
  const context = {};
  vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js', 'utf8') + fs.readFileSync('public/js/site-history-content.js', 'utf8'), context);
  return context.PERSONAL_HUB;
}

test('site milestones have stable chronological version labels and complete translations', () => {
  const data = content();
  assert.equal(data.currentVersion, data.milestones.length);
  const languages = ['en', 'es', 'zh', 'zh-Hant', 'ja', 'ko'];
  const keys = Object.keys(data.copy.en);
  for (const lang of languages) {
    for (const key of keys) assert.ok(data.copy[lang][key], `${lang}: ${key}`);
  }
  data.milestones.forEach((item, i) => {
    assert.equal(item.version, i + 1);
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    if (i) assert.ok(item.date >= data.milestones[i - 1].date);
    if (item.version < data.currentVersion) assert.match(item.commit, /^[a-f0-9]{7}$/);
    for (const lang of languages) {
      assert.ok(item.copy[lang].title);
      assert.ok(item.copy[lang].description);
    }
  });
});

function harness() {
  let document, locks = 0;
  const handlers = {}, inertCalls = [];
  function element(tag = 'div') {
    const attrs = {};
    return {
      tagName: tag, attrs, children: [], listeners: {}, hidden: true,
      setAttribute(key, value) { attrs[key] = value; },
      appendChild(child) { this.children.push(child); return child; },
      append(...children) { children.forEach(child => this.appendChild(child)); },
      replaceChildren() { this.children = []; },
      addEventListener(key, handler) { this.listeners[key] = handler; },
      focus(options) { this.focusOptions = options; document.activeElement = this; },
    };
  }
  const opener = element('button'), modal = element(), body = element(), close = element('button'), backdrop = element(), panel = element();
  function descendants(el) { return el.children.flatMap(child => [child, ...descendants(child)]); }
  modal.querySelector = selector => selector === '.site-history-panel' ? panel : close;
  modal.querySelectorAll = selector => selector === '[data-site-history-close]' ? [close, backdrop] : [close, ...descendants(body).filter(x => x.tagName === 'a')];
  document = {
    activeElement: opener, documentElement: { getAttribute: () => 'en' },
    createElement: element,
    getElementById: id => ({ 'site-history-open': opener, 'site-history-modal': modal, 'site-history-body': body })[id],
    addEventListener(key, handler) { handlers[key] = handler; },
  };
  const context = { document, window: {}, lockPageScroll: () => locks++, unlockPageScroll: () => locks--, setBackgroundInert: (_modal, on) => inertCalls.push(on) };
  vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js', 'utf8') + fs.readFileSync('public/js/site-history-content.js', 'utf8') + fs.readFileSync('public/js/site-history.js', 'utf8'), context);
  return { opener, modal, body, close, panel, handlers, document, inertCalls, locks: () => locks };
}

test('site dialog renders newest first, avoids duplicate locks, and traps keyboard focus', () => {
  const h = harness();
  h.opener.listeners.click(); h.opener.listeners.click();
  assert.equal(h.modal.hidden, false);
  assert.equal(h.locks(), 1);
  assert.equal(h.panel.scrollTop, 0);
  assert.equal(h.document.activeElement, h.close);
  const timeline = h.body.children.find(x => x.className === 'site-timeline');
  assert.equal(timeline.children[0].children[0].textContent, 'v16');
  assert.equal(timeline.children.at(-1).children[0].textContent, 'v1');
  h.handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} });
  const source = h.body.children.at(-1);
  assert.equal(h.document.activeElement, source);
  assert.equal(source.target, '_blank');
  assert.equal(source.rel, 'noopener noreferrer');
  h.handlers.keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(h.document.activeElement, h.close);
  h.handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(h.locks(), 0);
  assert.equal(h.modal.hidden, true);
  assert.equal(h.document.activeElement, h.opener);
  assert.equal(h.opener.focusOptions.preventScroll, true);
  assert.deepEqual(h.inertCalls, [true, false]);
});
