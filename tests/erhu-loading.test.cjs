const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(connection, deferred=false) {
  const videos=[],nodes=[],events={},inert=[],finishes=[],observers=[];let document,locks=0,language="en";
  function descendants(el) { return el.children.flatMap(child=>[child,...descendants(child)]); }
  function element(tag='div') {
    const attrs={},classes=new Set(),listeners={};
    const el={tagName:tag.toUpperCase(),children:[],attrs,listeners,isConnected:true,hidden:false,textContent:'',style:{},scrollTop:0,
      classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},
      setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],hasAttribute:k=>k in attrs,removeAttribute:k=>delete attrs[k],
      appendChild(child){if(child.parentNode)child.parentNode.removeChild(child);child.parentNode=this;this.children.push(child);return child;},
      append(...children){children.forEach(child=>this.appendChild(child));},
      removeChild(child){child.parentNode=null;this.children=this.children.filter(x=>x!==child);},
      replaceChildren(){this.children.forEach(child=>child.parentNode=null);this.children=[];},
      addEventListener(k,fn){listeners[k]=fn;},
      closest(){return this;},contains(child){return child===this||descendants(this).includes(child);},
      querySelectorAll(){return descendants(this).filter(x=>['BUTTON','A','VIDEO'].includes(x.tagName));},
      focus(options){document.activeElement=this;this.focusOptions=options;}
    };
    if(tag==='video') {Object.assign(el,{readyState:0,networkState:0,duration:NaN,paused:true,buffered:{length:0},loadCount:0,load(){this.loadCount++;},pause(){this.paused=true;}});videos.push(el);}
    nodes.push(el);return el;
  }
  const opener=element('button'),performance=element('button'),wiki=element(),modal=element(),wikiBody=element(),body=element(),close=element('button'),wikiClose=element('button');
  close.setAttribute('data-erhu-close','');wikiClose.setAttribute('data-erhu-close','');
  modal.hidden=wiki.hidden=true;modal.append(close,body);wiki.append(wikiClose,wikiBody);
  modal.querySelector=()=>close;wiki.querySelector=()=>wikiClose;
  const ids={'erhu-wiki-open':opener,'erhu-performance-open':performance,'erhu-wiki-modal':wiki,'erhu-performance-modal':modal,'erhu-wiki-body':wikiBody,'erhu-performance-body':body,'erhu-wiki-title':element('h2'),'erhu-performance-title':element('h2')};
  document={activeElement:null,readyState:'complete',body:element(),documentElement:{getAttribute:()=>language},createElement:element,getElementById:id=>ids[id],addEventListener(k,fn){events[k]=fn;}};
  const context={document,navigator:{connection},window:{setTimeout:fn=>fn(),addEventListener(){}},lockPageScroll(){locks++;},unlockPageScroll(){locks--;},setBackgroundInert(m,on){inert.push([m,on]);}};
  context.MutationObserver=function(fn){observers.push(fn);this.observe=()=>{};};
  context.window.MutationObserver=context.MutationObserver;
  if(deferred)context.closeSiteDialog=(_modal,fn)=>finishes.push(fn);
  vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+fs.readFileSync('public/js/erhu-content.js','utf8')+fs.readFileSync('public/js/erhu.js','utf8'),context);
  function click(m,target){m.listeners.click({target});}
  return {finishes,translate(lang){language=lang;observers.forEach(fn=>fn());},title:ids["erhu-performance-title"],opener,performance,wiki,modal,body,wikiBody,close,wikiClose,events,videos,nodes,document,locks:()=>locks,inert,click,open:()=>performance.listeners.click(),closePerformance:()=>click(modal,close),status:()=>nodes.findLast(x=>x.className==='erhu-wiki__video-status')};
}

test('erhu media waits for interest and reuses the preloaded photo and video', () => {
  const h = harness();
  assert.equal(h.videos.length, 0);
  assert.equal(h.nodes.filter(x => x.tagName === "IMG").length, 0);
  h.opener.listeners.pointerenter();
  assert.equal(h.videos.length, 1);
  assert.equal(h.videos[0].preload, 'auto');
  const photo = h.nodes.find(x => x.tagName === 'IMG');
  assert.equal(photo.attrs.src, 'assets/erhu/erhu-instrument.jpg');
  h.opener.listeners.focus();
  assert.equal(h.nodes.filter(x => x.tagName === 'IMG').length, 1);
  h.open();
  assert.equal(h.videos.length, 1, 'opening reuses the preloaded media element');
  assert.equal(h.nodes.filter(x => x.tagName === 'IMG').length, 1);
  h.opener.listeners.click();
  assert.equal(photo.alt, 'A traditional erhu from the Metropolitan Museum of Art');
  h.performance.listeners.click();
  h.closePerformance(); h.open();
  assert.equal(h.nodes.filter(x => x.tagName === 'IMG').length, 1);
});

test('data-saving connections skip speculative video loading but can open the player', () => {
  for (const connection of [{ saveData: true }, { effectiveType: '2g' }]) {
    const h = harness(connection);
    h.opener.listeners.pointerenter();
    assert.equal(h.videos.length, 0);
    assert.equal(h.nodes.filter(x => x.tagName === 'IMG').length, 0);
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
  h.closePerformance(); h.open();
  assert.equal(video.loadCount, loadCount + 1, 'reopening retries a failed source');
  h.closePerformance();
  assert.equal(h.document.activeElement, h.performance, 'returns focus even when Safari never focused the click');
  assert.equal(h.performance.focusOptions.preventScroll, true);
});

test('every language has loading, buffering, and failure copy', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync('public/js/erhu-content.js', 'utf8'), context);
  for (const pack of Object.values(context.ERHU_WIKI)) {
    for (const key of ['videoLoading', 'videoBuffering', 'videoError']) assert.ok(pack[key]);
  }
});


test('separate dialogs keep the video out of the article and preserve native controls and both Close actions',()=>{
 const h=harness();h.open();
 assert.equal(h.body.children.filter(x=>x.tagName==='VIDEO').length,1);
 assert.equal(h.body.children.some(x=>x.className==='erhu-instrument-layout'),false);
 assert.equal(h.wiki.hidden,true);assert.equal(h.locks(),1);
 let prevented=false;h.videos[0].focus();h.events.keydown({key:'Tab',preventDefault(){prevented=true;}});
 assert.equal(prevented,false,'Tab reaches native playback controls');
 const actions=h.body.children.at(-1),about=actions.children[0],done=actions.children[1];
 done.focus();h.events.keydown({key:'Tab',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.document.activeElement,h.close);
 h.click(h.modal,about);assert.equal(h.modal.hidden,true);assert.equal(h.wiki.hidden,false);assert.equal(h.locks(),1);
 assert.equal(h.wikiBody.querySelectorAll().some(x=>x.tagName==='VIDEO'),false);
 const wikiDone=h.wikiBody.children.at(-1).children[1];h.click(h.wiki,wikiDone);
 assert.equal(h.wiki.hidden,true);assert.equal(h.locks(),0);assert.equal(h.document.activeElement,h.performance);
 h.open();h.click(h.modal,h.body.children.at(-1).children[1]);assert.equal(h.modal.hidden,true);assert.equal(h.locks(),0);
});


test('closing from a dynamic footer pauses immediately and releases resources once after the exit',()=>{
 const h=harness(undefined,true);h.open();h.videos[0].paused=false;
 const done=h.body.children.at(-1).children[1];h.click(h.modal,done);h.click(h.modal,done);h.opener.listeners.click();
 assert.equal(h.videos[0].paused,true);assert.equal(h.finishes.length,1);assert.equal(h.locks(),1);assert.equal(h.wiki.hidden,true);
 h.finishes.shift()();assert.equal(h.locks(),0);assert.equal(h.modal.hidden,true);assert.equal(h.document.activeElement,h.performance);
});

test('translating an active performance reuses its player and preserves the modal lock',()=>{
 const h=harness();h.open();const video=h.videos[0];video.currentTime=45;
 h.translate('ko');assert.equal(h.title.textContent,'저의 얼후 연주');assert.equal(h.videos.length,1);assert.equal(h.body.children.includes(video),true);
 assert.equal(video.currentTime,45);assert.equal(h.locks(),1);assert.equal(h.wiki.hidden,true);
});
