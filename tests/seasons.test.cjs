const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const calendar = require('../public/js/season-calendar.js');

test('Western Easter, Good Friday, and Palm Sunday move correctly across years', () => {
  for (const [year,month,day] of [[2026,3,5],[2027,2,28],[2028,3,16],[2038,3,25],[1818,2,22],[2100,2,28]]) {
    const easter = calendar.easter(year);
    assert.equal(easter.getFullYear(),year);
    assert.equal(easter.getMonth(),month);
    assert.equal(easter.getDate(),day);
    for (const [offset,occasion] of [[0,'easter'],[-2,'good-friday'],[-7,'palm-sunday']]) {
      assert.equal(calendar.state(new Date(year,month,day+offset,12)).occasion,occasion);
    }
    assert.equal(calendar.state(new Date(year,month,day-1,12)).occasion,'');
  }
});

test('Christmas and the fourth Thursday of November last exactly their local day', () => {
  for (let year=2026;year<2050;year++) {
    assert.equal(calendar.state(new Date(year,11,25,0)).occasion,'christmas');
    assert.equal(calendar.state(new Date(year,11,25,23,59,59)).occasion,'christmas');
    assert.equal(calendar.state(new Date(year,11,26)).occasion,'');
    const days = Array.from({length:30},(_,i)=>i+1).filter(day=>calendar.state(new Date(year,10,day)).occasion==='thanksgiving');
    assert.equal(days.length,1);
    assert.ok(days[0]>=22 && days[0]<=28);
    assert.equal(new Date(year,10,days[0]).getDay(),4);
  }
});

test('countdown begins at 23:50, reaches midnight, and the greeting lasts January 1', () => {
  const before=calendar.state(new Date(2026,11,31,23,49,59,999));
  assert.equal(before.occasion,'');
  assert.equal(before.next,new Date(2026,11,31,23,50).getTime());
  const start=calendar.state(new Date(2026,11,31,23,50));
  assert.equal(start.phase,'countdown'); assert.equal(start.year,2027);
  assert.equal(start.target-new Date(2026,11,31,23,50).getTime(),600000);
  const midnight=calendar.state(new Date(2027,0,1));
  assert.equal(midnight.phase,'greeting'); assert.equal(midnight.target,start.target);
  assert.equal(calendar.state(new Date(2027,0,1,23,59)).occasion,'new-year');
  assert.equal(calendar.state(new Date(2027,0,2)).occasion,'');
});

test('visitor timezone, rather than UTC or Los Angeles, determines midnight and holidays', () => {
  const code = `const c=require('./public/js/season-calendar.js'); console.log(JSON.stringify(c.state(new Date('2026-12-31T10:55:00Z'))));`;
  const east=JSON.parse(execFileSync(process.execPath,['-e',code],{env:{...process.env,TZ:'Pacific/Auckland'}}));
  const west=JSON.parse(execFileSync(process.execPath,['-e',code],{env:{...process.env,TZ:'America/Los_Angeles'}}));
  assert.equal(east.phase,'countdown'); assert.equal(west.occasion,'');
  assert.equal(east.target,Date.parse('2026-12-31T11:00:00Z'));
});

test('previews have a real progressing midnight transition without accepting arbitrary date overrides', () => {
  const start=new Date(2026,5,2,12).getTime();
  assert.equal(calendar.resolve(new Date(start),'countdown',start).phase,'countdown');
  assert.equal(calendar.resolve(new Date(start+15000),'countdown',start).phase,'countdown');
  assert.equal(calendar.resolve(new Date(start+75000),'countdown',start).phase,'greeting');
  assert.equal(calendar.resolve(new Date(start+105000),'countdown',start).target,start+75000);
  assert.equal(calendar.resolve(new Date(start),'final-minute',start).target,start+60000);
  assert.equal(calendar.resolve(new Date(start),'final-seconds',start).target,start+10000);
  assert.equal(calendar.resolve(new Date(start),'christmas',start).occasion,'christmas');
  assert.equal(calendar.resolve(new Date(start),'<script>',start).occasion,'');
});

test('the head preloads only the selected hero photograph, including seasonal previews', () => {
  for (const [search,expected] of [['','assets/main-modern.webp'],['?occasion=christmas','assets/seasonal/christmas.webp'],['?occasion=good-friday','assets/seasonal/good-friday.webp']]) {
    const requests=[];
    const window={location:{search}};
    const document={documentElement:{setAttribute(){}},createElement:()=>({}),head:{appendChild:link=>requests.push(link)}};
    const now=new Date(2026,5,2,12).getTime();
    vm.runInNewContext(fs.readFileSync('public/js/season-calendar.js','utf8'),{
      window,document,URLSearchParams,
      Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
    });
    assert.equal(requests.length,1);assert.equal(requests[0].as,'image');
    assert.equal(requests[0].href,expected);assert.equal(requests[0].fetchPriority,'high');
  }
});

function harness(date, {reduced=false, hidden=false}={}) {
  let now=date.getTime(), id=0, plays=0, stops=0, locks=0, scrolls=0;
  const events={}, timers=new Map(), scripts=[], observers=[], busy=[];
  function node() {
    const attributes=new Map(), children={}, classes=new Set();
    const result={hidden:true, open:false, isConnected:true, complete:true, textContent:'', children, attributes, className:'', appended:[],
      classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}, style:{setProperty(){}},
      setAttribute:(k,v)=>attributes.set(k,String(v)),getAttribute:k=>attributes.get(k)||null,
      removeAttribute:k=>attributes.delete(k), addEventListener(n,f){events[(this.id||'node')+':'+n]=f;},
      querySelector:s=>children[s]||(children[s]=node()),remove(){this.removed=true;},focus(){document.activeElement=this;},
      appendChild(n){this.appended.push(n);},showModal(){this.open=true;},close(){this.open=false;},
    };
    Object.defineProperty(result,'src',{set(v){attributes.set('src',v);},get(){return attributes.get('src');}});
    return result;
  }
  const nodes=Object.fromEntries(['hero','hero-name','theme-toggle','meta-theme-color','meta-color-scheme','season-label','season-reference','season-verse','season-verse-text','season-credits','season-countdown','season-until','season-minutes','season-seconds','season-inline-number','season-inline-unit','season-stage','season-stage-number','season-stage-title','season-stage-year','season-stage-timer','season-stage-status'].map(id=>[id,node()]));
  Object.entries(nodes).forEach(([id,n])=>n.id=id);
  const root=node(); root.setAttribute('data-language','en');
  const photo=nodes.hero.querySelector('.hero__backdrop img'); photo.setAttribute('data-hero-src','assets/main-modern.webp');
  photo.parentElement=node();
  const initial=calendar.state(date);photo.src=calendar.photo(initial.occasion,initial.phase);
  const motion={matches:reduced,addEventListener:(n,f)=>events['motion:'+n]=f};
  const document={documentElement:root,hidden,baseURI:'http://localhost:8000/',
    getElementById:id=>nodes[id],createElement:()=>node(),querySelectorAll:()=>busy,
    currentScript:{getAttribute:name=>'js/'+name+'.js'},
    head:{appendChild:n=>scripts.push(n)},body:{appendChild(){}},
    addEventListener:(n,f)=>events[n]=f,
  };
  const window={SeasonCalendar:{current:()=>calendar.state(new Date(now)),photo:calendar.photo},
    matchMedia:()=>motion, innerWidth:1280,scrollTo(){scrolls++;},
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;}, clearTimeout:id=>timers.delete(id),
    addEventListener:(n,f)=>events[n]=f,
    Fireworks:{Fireworks:class {start(){plays++;} stop(){stops++;}}}
  };
  const savedTheme=new Map([['timg-theme-session','light']]);
  const context={window,document,URL,Promise,Date:class extends Date {static now(){return now;}},
    THEME_SESSION_KEY:'timg-theme-session',sessionStorage:{getItem:key=>savedTheme.get(key),setItem:(key,value)=>savedTheme.set(key,value),removeItem:key=>savedTheme.delete(key)},
    lockPageScroll(){locks++;},unlockPageScroll(){locks--;},
    MutationObserver:class {constructor(fn){observers.push(fn);}observe(){}},
    TRANSLATIONS:{en:{hero:{note:'Original introduction'}},ko:{hero:{note:'원래 소개'}}},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/js/i18n/theme.js','utf8'),context);
  context.applyTheme('light');
  vm.runInContext(fs.readFileSync('public/js/seasons.js','utf8'),context);
  return {nodes,window,document,motion,events,timers,scripts,photo,busy,savedTheme,context,
    get locks(){return locks;},get yearPhoto(){return photo.parentElement.appended.at(-1);},
    get scrolls(){return scrolls;},
    get plays(){return plays;},get stops(){return stops;},
    async loadContent() {vm.runInContext(fs.readFileSync('public/js/season-content.js','utf8'),context);window.SEASON_CONTENT=context.SEASON_CONTENT;scripts.find(s=>s.src.includes('content')).onload();await Promise.resolve();},
    async loadFireworks(){scripts.find(s=>s.src.includes('fireworks')).onload();await Promise.resolve();},
    advance(date){now=date.getTime();events.pageshow({persisted:false});},
    fireTimer(delay){for(const [id,t] of timers)if(t.delay===delay){timers.delete(id);t.fn();return;}throw new Error('No timer '+delay);},
    changeLanguage(lang){root.setAttribute('data-language',lang);for(const fn of observers)fn();},
  };
}

test('ordinary days load no seasonal content or effects and sleep until the next local midnight', () => {
  const h=harness(new Date(2026,5,2,12));
  assert.equal(h.scripts.length,0); assert.equal(h.nodes['season-countdown'].hidden,true);
  assert.equal([...h.timers.values()][0].delay,12*60*60*1000);
});

test('holiday copy follows language changes and returns to the original introduction the next day',async()=>{
  const h=harness(new Date(2026,11,25,12)); await h.loadContent();
  assert.equal(h.nodes['season-label'].textContent,'Merry Christmas');
  assert.equal(h.photo.getAttribute('src'),'assets/seasonal/christmas.webp');
  h.changeLanguage('ko'); assert.equal(h.nodes['season-label'].textContent,'메리 크리스마스');
  h.advance(new Date(2026,11,26));
  assert.equal(h.nodes['season-label'].hidden,true);
  assert.equal(h.nodes.hero.querySelector('.hero__note').textContent,'원래 소개');
  assert.equal(h.photo.getAttribute('src'),'assets/main-modern.webp');
});

test('reduced-motion countdown remains accurate after background throttling and at midnight',async()=>{
  const h=harness(new Date(2026,11,31,23,50),{reduced:true});await h.loadContent();
  assert.equal(h.nodes['season-minutes'].textContent,'10');assert.equal(h.nodes['season-seconds'].textContent,'00');
  h.document.hidden=true;h.events.visibilitychange();assert.equal(h.timers.size,0);
  h.document.hidden=false;h.advance(new Date(2026,11,31,23,59,58));
  assert.equal(h.nodes['season-minutes'].textContent,'00');assert.equal(h.nodes['season-seconds'].textContent,'02');
  h.advance(new Date(2027,0,1));
  assert.equal(h.nodes['season-stage-number'].textContent,'00');assert.equal(h.nodes['season-countdown'].hidden,true);
  h.fireTimer(0);assert.equal(h.nodes['season-stage'].open,false);assert.equal(h.locks,0);
  assert.notEqual(h.document.activeElement,h.nodes['hero-name']);
  assert.equal(h.nodes['hero-name'].getAttribute('tabindex'),null);
  assert.equal(h.scrolls,0);
  assert.equal(h.nodes['season-label'].textContent,'Happy New Year');
  h.advance(new Date(2027,0,1,0,0,3));assert.equal(h.nodes['season-countdown'].hidden,true);
  assert.equal(h.scripts.filter(s=>s.src.includes('fireworks')).length,0);
});

test('fireworks end at midnight plus 30 seconds, do not replay on focus, and clean up on hide',async()=>{
  const h=harness(new Date(2026,11,31,23,59,59));await h.loadContent();h.advance(new Date(2027,0,1,0,0,3));await h.loadFireworks();
  assert.equal(h.plays,1);
  assert.ok([...h.timers.values()].some(t=>t.delay===27000));
  h.document.hidden=true;h.events.visibilitychange();assert.equal(h.stops,1);
  h.document.hidden=false;h.events.visibilitychange();await Promise.resolve();assert.equal(h.plays,1);
  const automatic=harness(new Date(2026,11,31,23,59,59));await automatic.loadContent();automatic.advance(new Date(2027,0,1,0,0,3));await automatic.loadFireworks();
  automatic.fireTimer(27000);
  assert.equal(automatic.stops,1);
});

test('late library loading, Escape, and reduced-motion changes cannot start unwanted fireworks',async()=>{
  for(const action of ['late','escape','motion','hidden']){
    const h=harness(action==='late'?new Date(2026,11,31,23,59,59):new Date(2027,0,1,0,0,3));await h.loadContent();
    if(action==='late')h.advance(new Date(2027,0,1,0,0,31));
    if(action==='escape')h.events.keydown({key:'Escape'});
    if(action==='motion'){h.motion.matches=true;h.events['motion:change']();}
    if(action==='hidden'){h.document.hidden=true;h.events.visibilitychange();}
    await h.loadFireworks();assert.equal(h.plays,0,action);
  }
});

test('New Year arrivals get five seconds of fireworks throughout the day and on a new BFCache visit',async()=>{
  for(const hour of [0,12,23]) {
    const h=harness(new Date(2027,0,1,hour,15));await h.loadContent();await h.loadFireworks();
    assert.equal(h.plays,1);h.fireTimer(5000);assert.equal(h.stops,1);
    h.events.visibilitychange();await Promise.resolve();assert.equal(h.plays,1);
    h.events.pagehide();h.events.pageshow({persisted:true});await Promise.resolve();assert.equal(h.plays,2);
    assert.equal(h.photo.src,'assets/seasonal/new-year.webp');
  }
});

test('standard, in-page, and immersive countdowns change exactly at 60 and 10 seconds',async()=>{
  const h=harness(new Date(2026,11,31,23,58,59),{reduced:true});await h.loadContent();
  assert.equal(h.nodes['season-stage'].open,false);
  assert.equal(h.nodes['season-countdown'].classList.contains('is-expanded'),false);
  h.advance(new Date(2026,11,31,23,59));
  assert.equal(h.nodes['season-stage'].open,false);assert.equal(h.locks,0);
  assert.equal(h.nodes['season-countdown'].classList.contains('is-expanded'),true);
  assert.equal(h.nodes['season-inline-number'].textContent,'60');
  h.advance(new Date(2026,11,31,23,59,49));
  assert.equal(h.nodes['season-inline-number'].textContent,'11');assert.equal(h.nodes['season-stage'].open,false);
  h.advance(new Date(2026,11,31,23,59,50));
  assert.equal(h.nodes['season-stage'].open,true);assert.equal(h.locks,1);
  assert.equal(h.document.activeElement,h.nodes['season-stage']);
  assert.equal(h.nodes['season-stage-number'].textContent,'10');
  h.advance(new Date(2026,11,31,23,59,51));assert.equal(h.nodes['season-countdown'].hidden,true);
  let prevented=false;h.events.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(h.nodes['season-stage'].open,false);assert.equal(h.locks,0);
  assert.equal(h.nodes['season-countdown'].hidden,false);
  h.advance(new Date(2026,11,31,23,59,52));assert.equal(h.nodes['season-stage'].open,false);
  const html=fs.readFileSync('public/index.html','utf8');
  assert.ok(!html.includes('season-dismiss'));assert.ok(!html.includes('season-stage-return'));
});

test('the final ten seconds wait for other dialogs and release scroll and focus resources on departure',async()=>{
  const h=harness(new Date(2026,11,31,23,59,50),{reduced:true});
  h.busy.push({hidden:false,getClientRects:()=>[{}]});await h.loadContent();
  assert.equal(h.nodes['season-stage'].open,false);
  h.busy.length=0;h.advance(new Date(2026,11,31,23,59,51));assert.equal(h.nodes['season-stage'].open,true);
  h.events.pagehide();assert.equal(h.nodes['season-stage'].open,false);assert.equal(h.locks,0);assert.equal(h.timers.size,0);
});

test('the New Year photograph decodes before midnight, crossfades, and releases the old image',async()=>{
  const h=harness(new Date(2026,11,31,23,59),{reduced:true});await h.loadContent();
  assert.equal(h.yearPhoto.src,'assets/seasonal/new-year.webp');
  const front=h.yearPhoto;front.onload();assert.equal(front.classList.contains('is-active'),false);
  h.advance(new Date(2026,11,31,23,59,50));
  h.advance(new Date(2027,0,1));assert.equal(front.classList.contains('is-active'),true);
  assert.equal(h.photo.src,'assets/main-modern.webp');
  h.fireTimer(0); // Finish the reduced-motion dialog.
  h.fireTimer(0); // Decode-safe photo replacement.
  assert.equal(h.photo.src,'assets/seasonal/new-year.webp');assert.equal(front.removed,true);
});

test('dark mode spans the countdown and celebration without changing the visitor preference',async()=>{
  for(const reduced of [false,true]) {
    const h=harness(new Date(2026,11,31,23,50),{reduced});await h.loadContent();
    assert.equal(h.document.documentElement.getAttribute('data-theme'),'dark');
    assert.equal(h.nodes['theme-toggle'].disabled,true);
    h.context.toggleTheme();assert.equal(h.savedTheme.get('timg-theme-session'),'light');
    h.advance(new Date(2026,11,31,23,59,50));h.advance(new Date(2027,0,1));
    assert.equal(h.document.documentElement.getAttribute('data-theme'),'dark');
    if(!reduced)await h.loadFireworks();
    h.fireTimer(30000);
    assert.equal(h.document.documentElement.getAttribute('data-theme'),'light');
    assert.equal(h.nodes['theme-toggle'].disabled,false);
    assert.equal(h.savedTheme.get('timg-theme-session'),'light');
    assert.equal(h.nodes.hero.querySelector('.hero__note').textContent,'Here’s to a new year filled with kindness, peace, and countless blessings.');
  }
  const welcome=harness(new Date(2027,0,1,12));await welcome.loadContent();await welcome.loadFireworks();
  assert.equal(welcome.document.documentElement.getAttribute('data-theme'),'dark');
  welcome.fireTimer(5000);assert.equal(welcome.document.documentElement.getAttribute('data-theme'),'light');
  assert.ok(!fs.readFileSync('public/index.html','utf8').includes('hero__tagline'));
});

test('every language includes all six occasions and actual Scripture text with its reference',()=>{
  const context={};vm.runInNewContext(fs.readFileSync('public/js/season-content.js','utf8'),context);
  for(const lang of ['en','es','zh','zh-Hant','ja','ko']){
    const p=context.SEASON_CONTENT[lang];
    for(const key of ['christmas','good-friday','easter','palm-sunday','thanksgiving','new-year','countdown']){
      assert.equal(p[key].length,2);assert.ok(p[key].every(v=>typeof v==='string'&&v.length>0));
    }
    for(const [key,verse] of [['good-friday','53:5'],['easter','11:25'],['thanksgiving','107:1'],['palm-sunday','12:13']]) {
      assert.ok(p.scripture[key].reference.includes(verse)); assert.ok(p.scripture[key].url.startsWith('https://'));
      assert.ok(p[key][1].length>20);assert.ok(!p[key][1].startsWith('…'));
    }
    assert.ok(p.copyright);
  }
});

test('Scripture occasions show the verse itself, cite the matching edition, and select their own photo',async()=>{
  for (const [date,occasion,reference] of [[new Date(2026,3,3),'good-friday','53:5'],[new Date(2026,3,5),'easter','11:25'],[new Date(2026,2,29),'palm-sunday','12:13'],[new Date(2026,10,26),'thanksgiving','107:1']]) {
    const h=harness(date);await h.loadContent();
    assert.equal(h.nodes['season-verse'].hidden,false);
    assert.equal(h.nodes.hero.querySelector('.hero__note').hidden,true);
    assert.ok(h.nodes['season-verse-text'].textContent.length>40);
    assert.ok(h.nodes['season-reference'].textContent.includes(reference));
    assert.equal(h.photo.getAttribute('src'),'assets/seasonal/'+occasion+'.webp');
  }
});
