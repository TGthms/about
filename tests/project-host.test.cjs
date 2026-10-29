const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({ desktop = true, blocked = false } = {}) {
  let document, saved = 'cloudflare', viewportChange;
  const windowEvents = {}, documentEvents = {};
  function element() {
    return {
      attrs: {}, handlers: {}, hidden: false,
      classList: { toggle() {} },
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key] || null; },
      removeAttribute(key) { delete this.attrs[key]; },
      addEventListener(key, fn) { this.handlers[key] = fn; },
      focus() { document.activeElement = this; },
    };
  }
  const disclosure = element(), trigger = element(), sheet = element();
  disclosure.attrs['data-host-placement'] = 'section';
  sheet.attrs['data-host-placement'] = 'sheet';
  const roots = [disclosure, sheet];
  const switchers = roots.map(root => {
    const switcher = element();
    switcher.options = ['cloudflare', 'github'].map(host => {
      const button = element();
      button.attrs['data-host'] = host;
      button.closest = selector => selector === '[data-host-pref]' ? root : button;
      button.querySelector = selector => ({ textContent: selector.includes('kicker') ? host : 'Host' });
      return button;
    });
    switcher.querySelectorAll = () => switcher.options;
    switcher.querySelector = () => switcher.options.find(button => button.attrs['aria-checked'] === 'true');
    switcher.contains = target => switcher.options.includes(target);
    switcher.closest = () => root === disclosure ? disclosure : null;
    return switcher;
  });
  disclosure.contains = target => [trigger, disclosure, switchers[0], ...switchers[0].options].includes(target);
  switchers[0].hidden = true;
  disclosure.querySelector = selector => selector === '.lang-picker__trigger' ? trigger : switchers[0];
  const link = element(), card = element();
  card.attrs['data-url-cloudflare'] = 'https://main.example/';
  card.attrs['data-url-github'] = 'https://backup.example/';
  card.querySelector = selector => selector === '[data-project-single]' ? link : null;
  card.querySelectorAll = () => [];
  const root = element();
  document = {
    activeElement: trigger, documentElement: root,
    querySelector: () => disclosure,
    querySelectorAll(selector) {
      if (selector === '.host-switcher') return switchers;
      if (selector === '.host-option[data-host]') return switchers.flatMap(s => s.options);
      if (selector === '[data-host-pref]') return roots;
      if (selector === '[data-project]') return [card];
      return [];
    },
    addEventListener(key, fn) { documentEvents[key] = fn; },
  };
  const context = {
    document,
    window: {
      addEventListener(key, fn) { windowEvents[key] = fn; },
      matchMedia: () => ({ addEventListener(key, fn) { viewportChange = fn; } }),
    },
    localStorage: {
      getItem() { return saved; },
      setItem(key, value) { if (blocked) throw Error('Storage unavailable'); saved = value; },
    },
    HOST_CLOUDFLARE: 'cloudflare', HOST_GITHUB: 'github',
    DEFAULT_PROJECT_HOST: 'cloudflare', PROJECT_HOST_KEY: 'timg-project-host',
    isDesktopControls: () => desktop,
  };
  vm.runInNewContext(fs.readFileSync('public/js/i18n/project-host.js', 'utf8'), context);
  context.applyProjectHostMode();
  context.initProjectHost();
  function key(index, host, key) {
    const button = switchers[index].options[host];
    document.activeElement = button;
    switchers[index].handlers.keydown({ key, preventDefault() {} });
  }
  function click(index, host) {
    const button = switchers[index].options[host];
    switchers[index].handlers.click({ target: button, preventDefault() {} });
  }
  return { context, document, root, link, disclosure, trigger, switchers, documentEvents, windowEvents, key, click,
    resize(value) { desktop = value; viewportChange(); context.syncHostSwitcher(context.getStoredProjectHost()); } };
}

test('mobile keyboard selection never closes or focuses the desktop disclosure', () => {
  const h = harness({ desktop: false });
  h.trigger.handlers.click();
  h.key(1, 1, 'Enter');
  assert.equal(h.document.activeElement, h.switchers[1].options[1]);
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.link.attrs.href, 'https://backup.example/');
  assert.equal(h.switchers[1].options[1].attrs.tabindex, '0');
  assert.equal(h.switchers[0].options[1].attrs.tabindex, '-1');
});

test('desktop arrows select without closing; choosing returns focus to its trigger', () => {
  const h = harness();
  h.trigger.handlers.click();
  h.key(0, 0, 'ArrowRight');
  assert.equal(h.switchers[0].hidden, false);
  assert.equal(h.document.activeElement, h.switchers[0].options[1]);
  assert.equal(h.link.attrs.href, 'https://backup.example/');
  h.key(0, 1, 'Enter');
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.document.activeElement, h.trigger);
  h.trigger.handlers.click();
  h.click(0, 0);
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.document.activeElement, h.trigger);
  assert.equal(h.link.attrs.href, 'https://main.example/');
});

test('focus departure, outside click, Escape and viewport changes dismiss correctly', () => {
  const h = harness();
  h.trigger.handlers.click();
  h.disclosure.handlers.focusout({ relatedTarget: h.switchers[0].options[0] });
  assert.equal(h.switchers[0].hidden, false);
  h.disclosure.handlers.focusout({ relatedTarget: null });
  assert.equal(h.switchers[0].hidden, false, 'Safari pointer blur must not swallow option clicks');
  h.disclosure.handlers.focusout({ relatedTarget: {} });
  assert.equal(h.switchers[0].hidden, true);
  h.trigger.handlers.click();
  h.documentEvents.click({ target: {} });
  assert.equal(h.switchers[0].hidden, true);
  h.trigger.handlers.click();
  h.disclosure.handlers.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.document.activeElement, h.trigger);
  h.trigger.handlers.click();
  h.resize(false);
  assert.equal(h.switchers[0].hidden, true);
});

test('blocked storage does not reset the choice during language or viewport sync', () => {
  const h = harness({ blocked: true });
  h.context.setProjectHost('github');
  h.context.applyProjectHostMode();
  h.resize(false);
  assert.equal(h.context.getStoredProjectHost(), 'github');
  assert.equal(h.root.attrs['data-project-host'], 'github');
  assert.equal(h.link.attrs.href, 'https://backup.example/');
});

test('another tab updates URLs and both controls together, including cleared storage', () => {
  const h = harness();
  h.windowEvents.storage({ key: 'timg-project-host', newValue: 'github' });
  assert.equal(h.link.attrs.href, 'https://backup.example/');
  for (const switcher of h.switchers) assert.equal(switcher.options[1].attrs['aria-checked'], 'true');
  h.windowEvents.storage({ key: 'language', newValue: 'en' });
  assert.equal(h.context.getStoredProjectHost(), 'github');
  h.windowEvents.storage({ key: null, newValue: null });
  assert.equal(h.link.attrs.href, 'https://main.example/');
});

test('desktop trigger exposes its popup and focuses the selected option like the language picker', () => {
  const h = harness();
  h.trigger.handlers.click();
  assert.equal(h.switchers[0].hidden, false);
  assert.equal(h.trigger.attrs['aria-expanded'], 'true');
  assert.equal(h.document.activeElement, h.switchers[0].options[0]);
  h.trigger.handlers.click();
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.trigger.attrs['aria-expanded'], 'false');
  assert.equal(h.document.activeElement, h.trigger);
  h.trigger.handlers.keydown({key: 'ArrowDown', preventDefault() {}});
  assert.equal(h.switchers[0].hidden, false);
});

test('clicking the open selector cannot blur-close and then reopen its popup', () => {
  const h = harness();
  h.trigger.handlers.click();
  let prevented = false;
  h.trigger.handlers.mousedown({ button: 0, preventDefault() { prevented = true; } });
  // Safari can otherwise move focus to the page before dispatching click.
  if (!prevented) h.disclosure.handlers.focusout({ relatedTarget: {} });
  h.trigger.handlers.click();
  assert.equal(prevented, true);
  assert.equal(h.switchers[0].hidden, true);
  assert.equal(h.trigger.attrs['aria-expanded'], 'false');
  assert.equal(h.document.activeElement, h.trigger);
  prevented = false;
  h.trigger.handlers.mousedown({ button: 0, preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'closed trigger retains normal pointer focus');
  h.trigger.handlers.click();
  assert.equal(h.switchers[0].hidden, false);
});

test('selected gallery photographs keep their deep link when switching main and backup hosts',()=>{
 const h=harness();const link={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
 const attrs={'data-url-cloudflare':'https://travelusa.pages.dev/gallery/','data-url-github':'https://tgthms.github.io/usa-travel-guide/gallery.html','data-gallery-photo':'SFgolden_gate_bridge.jpeg'};
 const card={getAttribute:k=>attrs[k],querySelector:s=>s==='[data-project-single]'?link:null};
 h.context.applyProjectUrls('cloudflare',card);assert.equal(link.attrs.href,'https://travelusa.pages.dev/gallery/?photo=SFgolden_gate_bridge.jpeg');
 h.context.applyProjectUrls('github',card);assert.equal(link.attrs.href,'https://tgthms.github.io/usa-travel-guide/gallery.html?photo=SFgolden_gate_bridge.jpeg');
 delete attrs['data-gallery-photo'];h.context.applyProjectUrls('cloudflare',card);assert.equal(link.attrs.href,'https://travelusa.pages.dev/gallery/');
});
