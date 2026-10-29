const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({lightweight = false, saveData = false, home = false} = {}) {
  const windows = {}, documents = {}, observers = [];
  const video = () => ({
    attrs: {poster: 'small.webp', 'data-note-poster': 'large.webp'},
    getAttribute(name) {return this.attrs[name];},
    setAttribute(name, value) {this.attrs[name] = value;},
    removeAttribute(name) {delete this.attrs[name];},
  });
  const videos = [video(), video()];
  class Observer {
    constructor(callback) {this.callback = callback; this.targets = []; this.disconnected = false; observers.push(this);}
    observe(target) {this.targets.push(target);}
    unobserve(target) {this.targets = this.targets.filter(value => value !== target);}
    disconnect() {this.disconnected = true; this.targets = [];}
  }
  const document = {
    hidden: false,
    title: 'The author’s post title',
    body: {classList: {contains: name => name === 'notes-page' && !home}, getAttribute: () => 'post'},
    documentElement: {lang: 'en', getAttribute: () => 'en', classList: {contains: () => false}, style: {setProperty() {}}},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: selector => selector === 'video[data-note-poster]' ? videos.filter(item => item.attrs['data-note-poster']) : [],
    addEventListener: (name, callback) => documents[name] = callback,
  };
  const window = {SiteRuntime: {lightweight}, IntersectionObserver: Observer, addEventListener: (name, callback) => windows[name] = callback};
  vm.runInNewContext(fs.readFileSync('public/js/notes.js', 'utf8'), {
    window, document, navigator: {connection: {saveData}}, IntersectionObserver: Observer,
    TRANSLATIONS: {en: {notes: {}}}, applyLanguage: () => 'en', detectLanguage: () => 'en',
  });
  return {window, document, windows, documents, videos, observers};
}

test('Watch, data-saving, and home pages keep video previews on the small source', () => {
  for (const settings of [{lightweight: true}, {saveData: true}, {home: true}]) {
    const h = harness(settings);
    assert.equal(h.observers.length, 0);
    assert.equal(h.videos[0].attrs.poster, 'small.webp');
    assert.equal(h.document.title, 'The author’s post title');
  }
});

test('sharp video previews load only near the viewport and release observers when hidden', () => {
  const h = harness();
  assert.equal(h.observers.length, 1);
  h.observers[0].callback([{isIntersecting: true, target: h.videos[0]}, {isIntersecting: false, target: h.videos[1]}]);
  assert.equal(h.videos[0].attrs.poster, 'large.webp');
  assert.equal(h.videos[0].attrs['data-note-poster'], undefined);
  assert.equal(h.videos[1].attrs.poster, 'small.webp');
  h.document.hidden = true; h.documents.visibilitychange();
  assert.ok(h.observers[0].disconnected);
  h.document.hidden = false; h.documents.visibilitychange();
  assert.deepEqual(h.observers[1].targets, [h.videos[1]]);
  h.windows.pagehide();
  assert.ok(h.observers[1].disconnected);
  h.windows.pageshow();
  assert.equal(h.observers.length, 3);
  assert.equal(h.document.title, 'The author’s post title');
});

test('all six languages cover every Notes interface key, including subscription help',()=>{
 const context={};
 vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+';this.packs=TRANSLATIONS;',context);
 const keys=Object.keys(context.packs.en.notes).sort();
 for(const lang of ['en','zh','zh-Hant','ja','ko','es']){
   assert.deepEqual(Object.keys(context.packs[lang].notes).sort(),keys);
   for(const key of keys) assert.ok(context.packs[lang].notes[key],lang+': '+key);
 }
});

test('entrance and archive choose only an available published language and fall back to the original',()=>{
 const variants=[{language:'en',title:'Original',summary:'Hello',href:'notes/one.html'},{language:'zh',title:'随记',summary:'你好',href:'notes/one.zh.html'}];
 let language='zh',update;
 const title={hasAttribute:()=>true},summary={hasAttribute:()=>false};
 const link={href:'',getAttribute:()=>JSON.stringify(variants),setAttribute(k,v){this[k]=v;},querySelectorAll:()=>[title,summary],querySelector:()=>null};
 const document={body:{classList:{contains:()=>false}},documentElement:{lang:'zh',getAttribute:()=>language},getElementById:()=>null,
   querySelector:()=>null,querySelectorAll:s=>s==='[data-note-versions]'?[link]:[],addEventListener(){}};
 class Observer {constructor(callback){update=callback;}observe(){}}
 vm.runInNewContext(fs.readFileSync('public/js/notes.js','utf8'),{document,window:{MutationObserver:Observer,addEventListener(){}},MutationObserver:Observer,navigator:{},TRANSLATIONS:{en:{notes:{}},zh:{notes:{}}}});
 assert.equal(link.href,'notes/one.zh.html');assert.equal(title.textContent,'随记');assert.equal(summary.lang,'zh');
 language='ko';update();assert.equal(link.href,'notes/one.html');assert.equal(title.textContent,'Original');
});
