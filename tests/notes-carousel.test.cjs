const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness({lite=false,reduced=false}={}) {
  let clock=0,serial=0,io;
  const timers=new Map(),events={},docEvents={};
  function node(attrs={}) {
    const listeners={},classes=new Set(),style={setProperty(k,v){this[k]=v;}};
    return {attrs,style,listeners,children:[],hidden:false,offsetWidth:40,
      classList:{add:k=>classes.add(k),contains:k=>classes.has(k)},
      getAttribute:k=>attrs[k]||null,setAttribute(k,v){attrs[k]=v;},removeAttribute(k){delete attrs[k];},
      addEventListener(k,v){listeners[k]=v;},appendChild(n){this.children.push(n);},contains:()=>false};
  }
  const root=node(),track=node(),controls=node(),dots=node(),prev=node(),next=node(),status=node();
  const slides=[node({'data-note-featured':'true'}),node({'data-note-featured':'true'})];
  slides.forEach(s=>{const a=node();s.querySelector=()=>a;});
  const frame=node();frame.querySelectorAll=()=>slides;
  frame.querySelector=s=>({'.notes-carousel__track':track,'.notes-carousel__controls':controls,'[data-note-dots]':dots,'[data-note-prev]':prev,'[data-note-next]':next,'[data-note-carousel-status]':status}[s]);
  const document={hidden:false,documentElement:root,querySelector:()=>frame,createElement:()=>node(),addEventListener(k,v){docEvents[k]=v;}};
  const motion={matches:reduced,addEventListener(k,v){this.listener=v;}};
  class IO {constructor(cb){this.callback=cb;io=this;}observe(){this.callback([{isIntersecting:true}]);}disconnect(){this.disconnected=true;}}
  class MO {observe(){}}
  const window={SiteRuntime:{lightweight:lite},performance:{now:()=>clock},matchMedia:()=>motion,IntersectionObserver:IO,MutationObserver:MO,addEventListener(k,v){events[k]=v;}};
  vm.runInNewContext(fs.readFileSync('public/js/notes-carousel.js','utf8'),{window,document,IntersectionObserver:IO,MutationObserver:MO,TRANSLATIONS:{en:{notes:{slideLabel:'Note {number} of {total}',previousSlide:'Previous',nextSlide:'Next',featuredNotes:'Featured'}}},setTimeout(fn,delay){const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
  return {frame,track,controls,dots,slides,prev,next,document,docEvents,events,timers,motion,io,refresh:window.NotesCarousel.refresh,advance(ms){clock+=ms;},fire(){const [id,t]=timers.entries().next().value;timers.delete(id);clock+=t.delay;t.fn();}};
}
test('expired birthday slides leave the rotation; an empty carousel releases its timer',()=>{
  const h=harness();
  h.slides[0].setAttribute('data-note-expires','2000-01-01T00:00:00Z'); h.refresh();
  assert.equal(h.slides[0].hidden,true); assert.equal(h.slides[1].inert,false);
  assert.equal(h.controls.hidden,true); assert.equal(h.timers.size,0);
  h.slides[1].setAttribute('data-note-expires','2000-01-01T00:00:00Z'); h.refresh();
  assert.equal(h.frame.hidden,true); assert.equal(h.timers.size,0);
  h.next.listeners.click(); assert.equal(h.timers.size,0);
});
test('autoplay advances every eight seconds and keeps only the active article focusable',()=>{
  const h=harness(); assert.equal(h.timers.values().next().value.delay,8000);
  assert.equal(h.slides[1].inert,true); h.fire();
  assert.equal(h.track.style.transform,'translateX(-100%)');
  assert.equal(h.slides[1].inert,false); assert.equal(h.slides[0].querySelector('a').tabIndex,-1);
  assert.equal(h.timers.values().next().value.delay,8000);
});
test('keyboard focus suspends the interval while hover and mouse clicks leave autoplay running',()=>{
  const h=harness();h.advance(1200);h.frame.listeners.focusin();assert.equal(h.timers.size,0);
  h.frame.listeners.focusout({relatedTarget:null});assert.equal(h.timers.values().next().value.delay,6800);
  h.frame.listeners.focusin({target:{matches:()=>false}});h.next.listeners.click();assert.equal(h.timers.size,1);
  assert.equal(h.frame.listeners.pointerenter,undefined);assert.equal(h.frame.listeners.pointerleave,undefined);
});
test('offscreen, hidden pages, reduced motion, and lightweight browsing avoid background autoplay',()=>{
  for(const option of [{lite:true},{reduced:true}]){const h=harness(option);assert.equal(h.timers.size,0);h.next.listeners.click();assert.equal(h.track.style.transform,'translateX(-100%)');}
  const h=harness();h.io.callback([{isIntersecting:false}]);assert.equal(h.timers.size,0);
  h.io.callback([{isIntersecting:true}]);assert.equal(h.timers.size,1);
  h.document.hidden=true;h.docEvents.visibilitychange();assert.equal(h.timers.size,0);
  h.events.pagehide();assert.equal(h.io.disconnected,true);
});
test('touch swipes change slides, suppress the accidental link click, and leave vertical scrolling alone',()=>{
  const h=harness();const target={closest:()=>false};
  h.frame.listeners.pointerdown({pointerType:'touch',clientX:180,clientY:100,target});
  h.frame.listeners.pointerup({clientX:40,clientY:110});
  assert.equal(h.track.style.transform,'translateX(-100%)');
  let prevented=false;h.frame.listeners.click({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  h.frame.listeners.pointerdown({pointerType:'touch',clientX:100,clientY:100,target});
  h.frame.listeners.pointerup({clientX:90,clientY:240});
  assert.equal(h.track.style.transform,'translateX(-100%)');assert.equal(h.timers.size,1);
});
