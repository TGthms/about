const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({expired = false, loading = false, article = true} = {}) {
  let now = Date.parse('2026-10-29T12:00:00Z'), serial = 0, refreshed = 0;
  const end = now + (expired ? -1 : 10000), events = {}, windows = {}, timers = new Map(), attrs = {};
  const video = {paused:0, released:0, pause(){this.paused++;}, removeAttribute(){}, load(){this.released++;}};
  const node = {
    removed:false, classList:{contains: name => article && name === 'notes-post'},
    getAttribute:()=>new Date(end).toISOString(), querySelectorAll:()=>[video], remove(){this.removed=true;},
  };
  const message = {hidden:true};
  const document = {
    hidden:false, readyState:loading ? 'loading' : 'complete',
    documentElement:{setAttribute(key,value){attrs[key]=value;}},
    currentScript:{getAttribute:()=>article ? new Date(end).toISOString() : null},
    querySelectorAll:selector=>selector === '[data-note-expires]:not(script)' && !node.removed ? [node] : [],
    querySelector:()=>message,
    dispatchEvent(event){if(events[event.type]) events[event.type](event);},
    addEventListener(name,callback){events[name]=callback;},
  };
  let expiredEvents = 0;
  events.noteexpired=()=>expiredEvents++;
  const window = {
    NotesCarousel:{refresh(){refreshed++;}},
    addEventListener(name,callback){windows[name]=callback;},
    setTimeout(fn,delay){timers.set(++serial,{fn,delay});return serial;},clearTimeout(id){timers.delete(id);},
  };
  vm.runInNewContext(fs.readFileSync('public/js/notes-lifetime.js','utf8'),{
    window,document,Event:class {constructor(type){this.type=type;}},Date:class extends Date {static now(){return now;}},
  });
  return {node,video,message,document,events,windows,timers,attrs,get refreshed(){return refreshed;},get expiredEvents(){return expiredEvents;},advance(ms){now+=ms;},fire(){const [id,t]=timers.entries().next().value;timers.delete(id);now+=t.delay;t.fn();}};
}
test('an active article uses one deadline timer and releases content, video and balloons at expiry',()=>{
  const h=harness();assert.equal(h.node.removed,false);assert.equal(h.message.hidden,true);
  assert.equal(h.timers.size,1);assert.equal(h.timers.values().next().value.delay,10000);
  h.fire();assert.equal(h.node.removed,true);assert.equal(h.message.hidden,false);
  assert.equal(h.video.paused,1);assert.equal(h.video.released,1);assert.equal(h.expiredEvents,1);assert.equal(h.timers.size,0);
});
test('cached expired articles are hidden in the head and removed when the DOM is ready',()=>{
  const h=harness({expired:true,loading:true});assert.ok(Object.hasOwn(h.attrs,'data-note-expired'));
  assert.equal(h.node.removed,false);h.events.DOMContentLoaded();assert.equal(h.node.removed,true);assert.equal(h.message.hidden,false);
});
test('hidden and restored pages recheck wall time without leaving timers running',()=>{
  const h=harness();h.document.hidden=true;h.events.visibilitychange();assert.equal(h.timers.size,0);
  h.advance(20000);h.document.hidden=false;h.events.visibilitychange();assert.equal(h.node.removed,true);
  const cached=harness();cached.windows.pagehide();assert.equal(cached.timers.size,0);
  cached.advance(20000);cached.windows.pageshow();assert.equal(cached.node.removed,true);
});
test('expired list entries trigger carousel refresh without marking ordinary pages expired',()=>{
  const h=harness({article:false});h.fire();assert.equal(h.node.removed,true);
  assert.equal(h.expiredEvents,0);assert.equal(Object.hasOwn(h.attrs,'data-note-expired'),false);
  assert.ok(h.refreshed>=2);
});
