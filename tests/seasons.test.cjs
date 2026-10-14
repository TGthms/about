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
  assert.equal(calendar.resolve(new Date(start+15000),'countdown',start).phase,'greeting');
  assert.equal(calendar.resolve(new Date(start+45000),'countdown',start).target,start+15000);
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
  let now=date.getTime(), id=0, plays=0, stops=0;
  const events={}, timers=new Map(), scripts=[], observers=[];
  function node() {
    const attributes=new Map(), children={};
    return {hidden:true, textContent:'', children, attributes, className:'',
      classList:{toggle(){}}, style:{},
      setAttribute:(k,v)=>attributes.set(k,String(v)),getAttribute:k=>attributes.get(k)||null,
      removeAttribute:k=>attributes.delete(k), addEventListener:(n,f)=>events['button:'+n]=f,
      querySelector:s=>children[s]||(children[s]=node()),remove(){this.removed=true;},focus(){},
    };
  }
  const nodes=Object.fromEntries(['hero','season-label','season-reference','season-verse','season-verse-text','season-credits','season-countdown','season-until','season-minutes','season-seconds','season-dismiss'].map(id=>[id,node()]));
  const root=node(); root.setAttribute('data-language','en');
  const photo=nodes.hero.querySelector('.hero__backdrop img'); photo.setAttribute('data-hero-src','assets/main-modern.webp');
  Object.defineProperty(photo,'src',{set(v){photo.setAttribute('src',v);}});
  const motion={matches:reduced,addEventListener:(n,f)=>events['motion:'+n]=f};
  const document={documentElement:root,hidden,baseURI:'http://localhost:8000/',
    getElementById:id=>nodes[id],createElement:()=>node(),
    currentScript:{getAttribute:name=>'js/'+name+'.js'},
    head:{appendChild:n=>scripts.push(n)},body:{appendChild(){}},
    addEventListener:(n,f)=>events[n]=f,
  };
  const window={SeasonCalendar:{current:()=>calendar.state(new Date(now)),photo:calendar.photo},
    matchMedia:()=>motion, innerWidth:1280,
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;}, clearTimeout:id=>timers.delete(id),
    addEventListener:(n,f)=>events[n]=f,
    Fireworks:{Fireworks:class {start(){plays++;} stop(){stops++;}}}
  };
  const context={window,document,URL,Promise,Date:class extends Date {static now(){return now;}},
    MutationObserver:class {constructor(fn){observers.push(fn);}observe(){}},
    TRANSLATIONS:{en:{hero:{note:'Original introduction'}},ko:{hero:{note:'원래 소개'}}},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/js/seasons.js','utf8'),context);
  return {nodes,window,document,motion,events,timers,scripts,photo,
    get plays(){return plays;},get stops(){return stops;},
    async loadContent() {vm.runInContext(fs.readFileSync('public/js/season-content.js','utf8'),context);window.SEASON_CONTENT=context.SEASON_CONTENT;scripts.find(s=>s.src.includes('content')).onload();await Promise.resolve();},
    async loadFireworks(){scripts.find(s=>s.src.includes('fireworks')).onload();await Promise.resolve();},
    advance(date){now=date.getTime();events.pageshow({persisted:true});},
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
  assert.equal(h.nodes['season-seconds'].textContent,'00');assert.equal(h.nodes['season-countdown'].hidden,false);
  assert.equal(h.nodes['season-label'].textContent,'Happy New Year');
  h.advance(new Date(2027,0,1,0,0,3));assert.equal(h.nodes['season-countdown'].hidden,true);
  assert.equal(h.scripts.filter(s=>s.src.includes('fireworks')).length,0);
});

test('fireworks end at midnight plus 30 seconds, do not replay on focus, and clean up on hide',async()=>{
  const h=harness(new Date(2027,0,1,0,0,3));await h.loadContent();await h.loadFireworks();
  assert.equal(h.plays,1);assert.equal(h.nodes['season-dismiss'].hidden,false);
  assert.ok([...h.timers.values()].some(t=>t.delay===27000));
  h.document.hidden=true;h.events.visibilitychange();assert.equal(h.stops,1);
  h.document.hidden=false;h.events.visibilitychange();await Promise.resolve();assert.equal(h.plays,1);
  assert.equal(h.nodes['season-dismiss'].hidden,true);
  const automatic=harness(new Date(2027,0,1,0,0,3));await automatic.loadContent();await automatic.loadFireworks();
  [...automatic.timers.values()].find(t=>t.delay===27000).fn();
  assert.equal(automatic.stops,1);assert.equal(automatic.nodes['season-dismiss'].hidden,true);
});

test('late library loading, Escape, and reduced-motion changes cannot start unwanted fireworks',async()=>{
  for(const action of ['late','escape','motion','hidden']){
    const h=harness(new Date(2027,0,1,0,0,3));await h.loadContent();
    if(action==='late')h.advance(new Date(2027,0,1,0,0,31));
    if(action==='escape')h.events.keydown({key:'Escape'});
    if(action==='motion'){h.motion.matches=true;h.events['motion:change']();}
    if(action==='hidden'){h.document.hidden=true;h.events.visibilitychange();}
    await h.loadFireworks();assert.equal(h.plays,0,action);
  }
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
