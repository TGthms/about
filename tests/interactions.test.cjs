const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function classes() {
  const values = new Set();
  return { add: (...items) => items.forEach(x => values.add(x)), remove: (...items) => items.forEach(x => values.delete(x)), contains: x => values.has(x), toggle: (x, on) => on ? values.add(x) : values.delete(x) };
}

function imageHarness() {
  const timers = [];
  const images = [];
  const document = { readyState: 'complete', documentElement: { getAttribute: () => 'en' }, querySelectorAll: () => images, createElement: () => ({ setAttribute() {}, style: { setProperty() {} } }) };
  const context = { document, Node: { DOCUMENT_POSITION_FOLLOWING: 4, DOCUMENT_POSITION_PRECEDING: 2 }, window: { innerHeight: 900, getComputedStyle: () => ({display:'block',visibility:'visible'}), setTimeout: cb => { timers.push(cb); return timers.length; }, clearTimeout() {} } };
  vm.runInNewContext(fs.readFileSync('public/js/image-loader.js', 'utf8'), context);
  function addImage() {
    const attrs = new Map([['data-src', `image-${images.length}.jpg`]]);
    const listeners = {};
    const frame = { classList: classes(), matches: () => true, querySelector: () => frame.loader, querySelectorAll: () => [img], appendChild: loader => {frame.loader = loader; loader.parentElement = frame;} };
    const img = { classList: classes(), isConnected: true, complete: false, naturalWidth: 0, getAttribute: key => attrs.get(key), setAttribute: (key, val) => attrs.set(key,val), removeAttribute: key => attrs.delete(key), closest: sel => sel === '[hidden]' ? null : frame, getBoundingClientRect: () => ({top:0,bottom:200,width:200,height:200}), addEventListener: (type, cb) => listeners[type] = cb, compareDocumentPosition: () => 4 };
    images.push(img);
    return {img,frame, fire: type => listeners[type]()};
  }
  return {addImage, timers, start: context.window.initImageLoaders};
}

test('failed image stops loading and releases the queue', () => {
  const h = imageHarness();
  const a = h.addImage(), b = h.addImage();
  h.start();
  a.fire('error');
  assert.equal(a.frame.classList.contains('is-img-loading'), false);
  assert.equal(a.frame.classList.contains('is-img-error'), true);
  assert.equal(b.img.getAttribute('src'), 'image-1.jpg');
});

test('image timeout releases the queue and late success clears failure', () => {
  const h = imageHarness();
  const a = h.addImage(), b = h.addImage();
  h.start();
  h.timers[0]();
  assert.equal(a.frame.classList.contains('is-img-error'), true);
  assert.equal(b.img.getAttribute('src'), 'image-1.jpg');
  a.img.complete = true;
  a.img.naturalWidth = 200;
  a.fire('load');
  assert.equal(a.frame.classList.contains('is-img-error'), false);
  assert.equal(a.frame.classList.contains('is-img-ready'), true);
});

function homeHarness() {
  const timers = [], handlers = {}, socialHandlers = {}, pushed = [];
  const sub = {textContent:'realTimGong'};
  const attrs = new Map([['data-mode','wechat']]);
  const social = {classList:classes(), getAttribute:k=>attrs.get(k), querySelector:()=>sub, addEventListener:(key,cb)=>socialHandlers[key]=cb};
  let resolveCopy;
  const document = { documentElement: {classList:classes(),getAttribute:()=> 'zh'}, getElementById: id => id === 'social-card' ? social : null, querySelectorAll:()=>[], addEventListener:(key,cb)=>handlers[key]=cb, querySelector:()=>null };
  const window = { setTimeout: cb=>{timers.push(cb);return timers.length;}, clearTimeout(){}, location:{hash:''}, history:{pushState:(_a,_b,id)=>pushed.push(id)} };
  const context = {document,window,navigator:{clipboard:{writeText:()=>new Promise(resolve=>resolveCopy=resolve)}}, requestAnimationFrame:cb=>cb()};
  vm.runInNewContext(fs.readFileSync('public/js/main.js','utf8'),context);
  return {timers, handlers, socialHandlers, attrs, sub, document, pushed, resolveCopy:()=>resolveCopy()};
}

test('pending clipboard result cannot overwrite a newly translated social card', async () => {
  const h=homeHarness();
  h.socialHandlers.click({preventDefault(){}});
  h.socialHandlers['social-card-reset']();
  h.attrs.set('data-mode','instagram'); h.sub.textContent='@timg.ins';
  h.resolveCopy();
  await Promise.resolve();
  assert.equal(h.sub.textContent,'@timg.ins');
});

test('old copy-feedback timer cannot overwrite Instagram after language change', async () => {
  const h=homeHarness();
  h.socialHandlers.click({preventDefault(){}});
  h.resolveCopy(); await Promise.resolve();
  const feedback=h.timers.at(-1);
  h.socialHandlers['social-card-reset']();
  h.attrs.set('data-mode','instagram'); h.sub.textContent='@timg.ins';
  feedback();
  assert.equal(h.sub.textContent,'@timg.ins');
});

test('delegated navigation handles newly rendered links, focus, and URL history', () => {
  const h=homeHarness(); let focused=false, scrolled=false;
  const target={hasAttribute:()=>true, scrollIntoView:()=>scrolled=true, focus:()=>focused=true};
  h.document.querySelector=()=>target;
  const event={target:{closest:()=>({getAttribute:()=> '#projects'})},button:0,preventDefault(){}};
  h.handlers.click(event);
  assert.equal(focused,true); assert.equal(scrolled,true); assert.deepEqual(h.pushed,['#projects']);
  h.handlers.click({...event,metaKey:true});
  assert.equal(h.pushed.length,1);
});

test('all five language packs contain the new home copy and navigation labels', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8') + '\nthis.packs = TRANSLATIONS;', context);
  for (const lang of ['en','es','zh','zh-Hant','ja']) {
    const pack = context.packs[lang];
    for (const key of ['eyebrow','tagline','note','contact']) assert.ok(pack.hero[key], `${lang}: hero.${key}`);
    assert.ok(pack.a11y.sections, lang);
    assert.ok(pack.a11y.explore, lang);
    for (const key of ['build','photo','erhu']) assert.ok(pack.about.links[key], lang);
  }
});
