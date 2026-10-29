const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness({lite=false,reduced=false,saveData=false,firstLoaded=true}={}) {
  const timers=new Map(),requests=[],events={},windowEvents={},nodes=[];let id=0,observer,mutate,motionChanged;
  function element(){const classes=new Set();const e={attrs:{},style:{},children:[],events:{},hidden:false,textContent:'',offsetWidth:400,
    classList:{add(...keys){keys.forEach(k=>classes.add(k));},remove(...keys){keys.forEach(k=>classes.delete(k));},contains:k=>classes.has(k),toggle(k,on){on?classes.add(k):classes.delete(k);}},
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},removeAttribute(k){delete this.attrs[k];},
    appendChild(e){this.children.push(e);},addEventListener(k,fn){this.events[k]=fn;},remove(){this.removed=true;}};nodes.push(e);return e;}
  const frame=element(),image=element(),label=element(),button=element(),card=element(),root=element();
  const initial={src:'assets/gallery/bixby_bridge.webp',file:'bixby_bridge.jpeg',location:'Monterey County, CA'};
  const catalog=[initial,{src:'assets/gallery/disneyland.webp',file:'disneyland.jpeg',location:'Anaheim, CA'}];
  image.attrs['data-src']=initial.src;image.currentSrc=initial.src;image.complete=firstLoaded;image.naturalWidth=firstLoaded?1200:0;
  label.textContent=initial.location;button.hidden=true;
  frame.querySelector=s=>s==='img'?image:s==='button'?button:label;
  frame.closest=()=>card;card.contains=e=>[card,button].includes(e);
  const document={hidden:false,documentElement:root,getElementById:()=>frame,createElement:()=>element(),addEventListener(k,f){events[k]=f;}};
  const motion={matches:reduced,addEventListener(k,f){motionChanged=f;}};
  const window={SiteRuntime:{lightweight:lite},GALLERY_PHOTOS:catalog,setTimeout(fn,ms){const i=++id;timers.set(i,{fn,ms});return i;},clearTimeout(i){timers.delete(i);},addEventListener(k,f){windowEvents[k]=f;},
    matchMedia:q=>q.includes('reduced-motion')?motion:{matches:false}};
  window.IntersectionObserver=function(fn){observer=fn;this.observe=()=>{};};window.MutationObserver=function(fn){mutate=fn;this.observe=()=>{};};
  function Image(){const i=element();requests.push(i);return i;}
  const urls=[];
  const context={window,document,navigator:{connection:{saveData}},Math:{random:()=>0,floor:Math.floor},Image,IntersectionObserver:window.IntersectionObserver,MutationObserver:window.MutationObserver,
    TRANSLATIONS:{en:{interests:{photo:{pause:'Pause photo slideshow',resume:'Resume photo slideshow'}}}},applyProjectUrls(_host,c){urls.push(c.attrs['data-gallery-photo']);}};
  vm.runInNewContext(fs.readFileSync('public/js/gallery-preview.js','utf8'),context);
  function tick(ms){const t=[...timers].find(([,v])=>v.ms===ms);assert.ok(t,'Expected timer '+ms);timers.delete(t[0]);t[1].fn();}
  return {frame,image,label,button,card,root,requests,timers,events,windowEvents,urls,nodes,document,tick,visible(v){observer?.([{isIntersecting:v}]);},mutate(){mutate?.();},motion(v){motion.matches=v;motionChanged?.();},timersOf(ms){return [...timers.values()].filter(t=>t.ms===ms).length;}};
}
test('gallery loads only its visible next photo, updates location and destination, and releases its old layer',()=>{
 const h=harness();assert.equal(h.requests.length,0);assert.equal(h.timersOf(6000),0);
 h.visible(true);h.tick(6000);assert.equal(h.requests.length,1);assert.ok(h.requests[0].src.endsWith('disneyland.webp'));
 h.requests[0].onload();h.tick(160);assert.equal(h.label.textContent,'Anaheim, CA');assert.equal(h.urls.at(-1),'disneyland.jpeg');
 h.tick(1100);const layers=h.frame.children;assert.equal(layers.length,2);assert.equal(layers.filter(l=>l.style.backgroundImage).length,1);
 assert.equal(h.timersOf(6000),1);assert.equal(h.image.removed,true);
});
test('offscreen, hidden tabs, dialogs, and pause cancel requests and do not rotate until resumed',()=>{
 const h=harness();h.visible(true);h.tick(6000);const pending=h.requests[0];h.visible(false);
 assert.equal(pending.onload,null);assert.equal(h.timers.size,0);
 h.visible(true);h.button.events.click();assert.equal(h.button.attrs['aria-label'],'Resume photo slideshow');assert.equal(h.timers.size,0);
 h.button.events.focusin?.();h.card.events.focusin({target:h.button});h.button.events.click();assert.equal(h.timersOf(6000),1,'keyboard resume works while the pause control stays focused');
 h.document.hidden=true;h.events.visibilitychange();assert.equal(h.timers.size,0);
 h.document.hidden=false;h.events.visibilitychange();assert.equal(h.timersOf(6000),1);
 h.root.classList.add('page-scroll-locked');h.mutate();assert.equal(h.timers.size,0);
 h.root.classList.remove('page-scroll-locked');h.mutate();assert.equal(h.timersOf(6000),1);
 h.windowEvents.pagehide();assert.equal(h.timers.size,0);h.windowEvents.pageshow();assert.equal(h.timersOf(6000),1);
});
test('Watch, data-saving, and reduced-motion views keep a still photo with no extra image or scheduler',()=>{
 for(const opts of [{lite:true},{reduced:true},{saveData:true}]){const h=harness(opts);h.visible(true);assert.equal(h.requests.length,0);assert.equal(h.frame.children.length,0);assert.equal(h.timers.size,0);assert.equal(h.button.hidden,true);assert.equal(h.image.removed,undefined);}
 const h=harness({reduced:true});h.visible(true);h.motion(false);assert.equal(h.frame.children.length,2);assert.equal(h.timersOf(6000),1);h.motion(true);assert.equal(h.timers.size,0);
});
test('failed or timed-out next photos leave the current photograph, label, and destination intact',()=>{
 const h=harness();h.visible(true);h.tick(6000);h.requests[0].onerror();assert.equal(h.label.textContent,'Monterey County, CA');assert.equal(h.urls.at(-1),'bixby_bridge.jpeg');assert.equal(h.timersOf(6000),1);
 h.tick(6000);h.tick(12000);assert.equal(h.label.textContent,'Monterey County, CA');assert.equal(h.timersOf(6000),1);
});
test('gallery catalog has local bounded assets for every reference photo, and all six languages cover personal additions',()=>{
 const c={window:{}};vm.runInNewContext(fs.readFileSync('public/js/gallery-photos.js','utf8'),c);assert.equal(c.window.GALLERY_PHOTOS.length,122);
 for(const p of c.window.GALLERY_PHOTOS){assert.ok(fs.existsSync('public/'+p.src));assert.ok(p.location&&p.file&&p.caption);}
 vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+fs.readFileSync('public/js/erhu-content.js','utf8')+';this.packs=TRANSLATIONS;this.erhu=ERHU_WIKI;',c);
 for(const lang of ['en','es','zh','zh-Hant','ja','ko']){const p=c.packs[lang];for(const key of ['view','pause','resume'])assert.ok(p.interests.photo[key]);assert.ok(c.erhu[lang].recordingDetails);assert.ok(c.erhu[lang].videoIntro);assert.ok(!/\{(build|photo|erhu)\}/.test(p.about.p1));}
 assert.equal(c.packs['zh-Hant'].interests.photo.view,'看看我拍的照片');assert.equal(c.packs.ja.interests.photo.view,'私の写真を見る');
 assert.equal(c.erhu['zh-Hant'].recordingDetails,'錄影說明');assert.equal(c.erhu.ja.recordingDetails,'録画について');
});

test('a slow first photograph never starts a second request before its own image is ready',()=>{
 const h=harness({firstLoaded:false});h.visible(true);assert.equal(h.timers.size,0);assert.equal(h.requests.length,0);
 h.frame.classList.add('is-img-loading');h.image.complete=true;h.image.naturalWidth=1200;h.image.events.load();assert.equal(h.timersOf(6000),1);
 assert.equal(h.frame.classList.contains('is-img-loading'),false,'the shared loading label clears even when its original image is detached');
 assert.equal(h.frame.classList.contains('is-img-ready'),true);
});
