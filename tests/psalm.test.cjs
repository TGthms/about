const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const dataSource = fs.readFileSync('public/js/i18n/data.js', 'utf8') + fs.readFileSync('public/js/psalm-content.js', 'utf8');

function element(tag = 'div') {
  return {
    tagName: tag, children: [], attrs: {}, listeners: {}, isConnected: true,
    setAttribute(key, value) { this.attrs[key] = value; },
    getAttribute(key) { return this.attrs[key]; },
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { children.forEach(child => this.appendChild(child)); },
    replaceChildren() { this.children = []; },
    addEventListener(key, callback) { this.listeners[key] = callback; },
  };
}

test('all six Psalm editions have six verses, source credits, and clear footer attribution', () => {
  const context = {};
  vm.runInNewContext(dataSource, context);
  for (const [lang, copy] of Object.entries(context.PSALM_23)) {
    const numbers = copy.verseNumbers || copy.verses.map((_v, i) => String(i + 1));
    assert.equal(numbers.length, copy.verses.length);
    const covered = numbers.flatMap(label => {
      const match = label.match(/^(\d+)(?:[–-](\d+))?$/);
      assert.ok(match, lang);
      const start = Number(match[1]), end = Number(match[2] || match[1]);
      return Array.from({length: end - start + 1}, (_v, i) => start + i);
    });
    assert.equal(JSON.stringify(covered), '[1,2,3,4,5,6]', lang);
    for (const text of copy.verses) assert.ok(text.trim());
    for (const key of ['title', 'version', 'citation', 'copyright', 'footerCredit', 'sourceUrl', 'permissionsUrl']) assert.ok(copy[key], `${lang}: ${key}`);
    assert.ok(copy.sourceUrl.startsWith('https://'));
    assert.match(copy.readUrl, /^https:\/\/www\.bible\.com\/.*PSA\.23/);
  }
  assert.match(context.PSALM_23.en.copyright, /1973, 1978, 1984, 2011 by Biblica/);
  assert.match(context.PSALM_23.en.citation, /NIV/);
  assert.ok(context.PSALM_23.zh.footerVerse.includes("\u3000神"), "retain intentional Union Version spacing");
  assert.match(context.PSALM_23.en.footerReference, /KJV/);
  vm.runInNewContext('this.footer = TRANSLATIONS.en.footer.verse;', context);
  assert.match(context.footer, /^For God hath not/);
});

test('About renders interests as plain text and gives only Psalm 23 an interactive trigger', () => {
  for (const language of ['en', 'es', 'zh', 'zh-Hant', 'ja']) {
    const paragraphs = ['p1', 'p2'].map(key => ({ ...element('p'), getAttribute: () => key }));
    const context = { document: {
      documentElement: { getAttribute: () => language },
      querySelectorAll: () => paragraphs,
      createElement: element, createTextNode: text => ({ textContent: text }),
    }, window: {} };
    vm.runInNewContext(dataSource + fs.readFileSync('public/js/about.js', 'utf8'), context);
    context.window.renderAbout();
    assert.equal(paragraphs[0].children.filter(x => x.tagName === 'a' || x.tagName === 'button').length, 0);
    const buttons = paragraphs[1].children.filter(x => x.tagName === 'button');
    assert.equal(buttons.length, 1, language);
    assert.equal(buttons[0].attrs['aria-controls'], 'psalm-modal');
    assert.equal(buttons[0].textContent, context.PSALM_23[language].title);
    assert.ok(paragraphs.flatMap(x => x.children).every(x => !/\{\w+\}/.test(x.textContent || '')));
  }
});

test('Psalm reader handles focus, source links, duplicate opens, and a replaced About trigger', () => {
  const handlers = {};
  const opener = element('button'), replacement = element('button'), modal = element(), body = element(), panel = element(), close = element('button');
  let locks = 0;
  const inertCalls = [];
  const document = {
    activeElement: opener, documentElement: { getAttribute: () => 'en' },
    getElementById: id => ({ 'psalm-modal': modal, 'psalm-body': body })[id],
    querySelector: () => replacement,
    createElement: tag => {
      const el = element(tag);
      el.focus = options => { document.activeElement = el; el.focusOptions = options; };
      return el;
    },
    addEventListener: (key, callback) => handlers[key] = callback,
  };
  for (const el of [opener, replacement, close]) el.focus = options => { document.activeElement = el; el.focusOptions = options; };
  function descendants(el) { return el.children.flatMap(child => [child, ...descendants(child)]); }
  modal.querySelector = selector => selector === '.psalm-panel' ? panel : close;
  modal.querySelectorAll = selector => selector === '[data-psalm-close]' ? [close] : [close, ...descendants(body).filter(x => x.tagName === 'a')];
  const context = { document, window: {}, lockPageScroll: () => locks++, unlockPageScroll: () => locks--, setBackgroundInert: (_modal, on) => inertCalls.push(on) };
  vm.runInNewContext(dataSource + fs.readFileSync('public/js/psalm.js', 'utf8'), context);
  const event = { target: { closest: () => opener }, preventDefault() {} };
  handlers.click(event); handlers.click(event);
  assert.equal(locks, 1);
  assert.equal(document.activeElement, close);
  assert.equal(body.children.find(x => x.className === 'psalm-verses').children.length, 6);
  const read = body.children.find(x => x.className === 'psalm-read');
  assert.equal(read.href, 'https://www.bible.com/bible/111/PSA.23.NIV');
  assert.equal(read.target, '_blank');
  assert.equal(read.rel, 'noopener noreferrer');
  handlers.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} });
  assert.notEqual(document.activeElement, close);
  handlers.keydown({ key: 'Tab', preventDefault() {} });
  assert.equal(document.activeElement, close);
  opener.isConnected = false;
  handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(locks, 0);
  assert.equal(modal.hidden, true);
  assert.equal(document.activeElement, replacement);
  assert.equal(replacement.focusOptions.preventScroll, true);
  assert.deepEqual(inertCalls, [true, false]);
});
