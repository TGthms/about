const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(scenario, failContext=false, lightweight=false){
 const events={},windowEvents={},frames=new Map(),inert=[];
 let nextFrame=0, locks=0, document, challengeHooks, clears=0, contextCalls=0;
 const celebrations=[];
 function el(tag='BUTTON'){
  return {tagName:tag,hidden:true,textContent:'',attrs:{},listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn;},
   setAttribute(k,v){this.attrs[k]=v;},
   focus(){document.activeElement=this;}};
 }
 const opener=el(),modal=el('DIV'),canvas=el('CANVAS'),serve=el(),left=el(),right=el(),close=el(),backdrop=el('DIV'),panel={scrollTop:12},score=el('SPAN'),ai=el('SPAN'),best=el('SPAN'),status=el('P');
 canvas.getContext=()=>{contextCalls++;return failContext&&contextCalls===1?null:new Proxy({}, {get:()=>()=>{}});};
 canvas.getBoundingClientRect=()=>({left:0,width:600});
 canvas.setPointerCapture=()=>{};canvas.hasPointerCapture=()=>true;
 modal.querySelector=selector=>selector==='.rally-panel'?panel:close;
 modal.querySelectorAll=selector=>selector==='[data-rally-close]'?[close,backdrop]:[close,canvas,left,serve,right];
 const countdown=el('DIV'),countdownValue=el('SPAN'),summary=el('P');
 const ids={'rally-summary':summary,'rally-countdown':countdown,'rally-countdown-value':countdownValue,'rally-open':opener,'rally-modal':modal,'rally-court':canvas,'rally-serve':serve,'rally-left':left,'rally-right':right,'rally-score':score,'rally-opponent-score':ai,'rally-best':best,'rally-status':status};
 document={activeElement:opener,hidden:false,documentElement:{getAttribute:()=> 'en'},getElementById:id=>ids[id],addEventListener:(key,fn)=>events[key]=fn};
 const context={document,localStorage:{getItem:()=>null,setItem(){}},MutationObserver:function(){this.observe=()=>{};},lockPageScroll:()=>locks++,unlockPageScroll:()=>locks--,setBackgroundInert:(_,on)=>inert.push(on),window:{SiteRuntime:{lightweight},getComputedStyle:()=>({getPropertyValue:()=> '#fff'}),requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(key,fn)=>windowEvents[key]=fn}};
 vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+fs.readFileSync('public/js/rally-engine.js','utf8'),context);
 const SeededEngine=context.window.RallyEngine;
 context.window.RallyEngine=function(){return new SeededEngine("medium",12345);};
 context.window.createRallyCelebration=()=>({play:win=>celebrations.push(win),clear:()=>clears++});
 context.window.createRallyLevelPicker=hooks=>{challengeHooks=hooks;return {close(){}};};
 if(scenario){
  const Engine=context.window.RallyEngine;
  context.window.RallyEngine=function(){
   const game=new Engine("medium", 12345),serve=game.serve;
   game.serve=function(){serve.call(this);this.you=scenario.win?4:0;this.ball={x:570,y:scenario.winner==='you'?-4:324,vx:0,vy:scenario.winner==='you'?-350:350};};
   return game;
  };
 }
 vm.runInNewContext(fs.readFileSync('public/js/rally.js','utf8'),context);
 let time=0;
 function step(){const entry=frames.entries().next().value;if(!entry)return;frames.delete(entry[0]);time+=1000/60;entry[1](time);}
 return {summary,contextCalls:()=>contextCalls,opener,modal,canvas,serve,close,left,right,panel,score,ai,best,status,events,windowEvents,document,frames,inert,step,locks:()=>locks,celebrations,challengeHooks,countdown,countdownValue,clears:()=>clears};
}
test('game opens without autoplay, pauses on blur, and closes with complete focus/scroll cleanup',()=>{
 const h=harness();h.opener.listeners.click();h.opener.listeners.click();
 assert.equal(h.locks(),1);assert.equal(h.frames.size,0);assert.equal(h.document.activeElement,h.serve);assert.equal(h.panel.scrollTop,0);
 h.serve.listeners.click();assert.equal(h.frames.size,1);assert.equal(h.serve.textContent,'Pause');
 h.step();h.windowEvents.blur();assert.equal(h.frames.size,0);assert.equal(h.serve.textContent,'Resume');
 h.events.keydown({key:'Escape',preventDefault(){}});
 assert.equal(h.modal.hidden,true);assert.equal(h.locks(),0);assert.equal(h.document.activeElement,h.opener);assert.equal(h.inert.at(-1),false);
 h.opener.listeners.click();assert.equal(h.frames.size,0);assert.equal(h.serve.textContent,'Resume');
 h.serve.listeners.click();assert.equal(h.frames.size,1);
 h.document.hidden=true;h.events.visibilitychange();assert.equal(h.frames.size,0);
});
test('keyboard focus wraps, Space serves/pauses, and a finished match can be replayed',()=>{
 const h=harness();h.opener.listeners.click();h.close.focus();
 h.events.keydown({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(h.document.activeElement,h.right);
 h.events.keydown({key:'Tab',preventDefault(){}});assert.equal(h.document.activeElement,h.close);
 h.canvas.focus();h.events.keydown({code:'Space',preventDefault(){}});assert.equal(h.serve.textContent,'Pause');
 h.events.keydown({code:'Space',preventDefault(){}});assert.equal(h.serve.textContent,'Resume');
 h.serve.listeners.click();for(let i=0;i<7200&&h.frames.size;i++)h.step();
 assert.equal(h.ai.textContent,'5');assert.equal(h.serve.textContent,'Play again');assert.equal(h.frames.size,0);
 h.serve.listeners.click();assert.equal(h.ai.textContent,'0');assert.equal(h.score.textContent,'0');assert.equal(h.frames.size,1);
});


test('only human points celebrate, with the longer effect reserved for a win',()=>{
 for(const scenario of [{winner:'you',win:false},{winner:'you',win:true},{winner:'ai',win:false}]){
  const h=harness(scenario);h.opener.listeners.click();h.serve.listeners.click();h.step();h.step();
  assert.deepEqual(h.celebrations,scenario.winner==='you'?[scenario.win]:[]);
  assert.equal(h.summary.hidden,!scenario.win);if(scenario.win)assert.ok(h.summary.textContent.includes('Longest rally this match:'));
  const before=h.clears();h.events.keydown({key:'Escape',preventDefault(){}});assert.ok(h.clears()>before);
 }
});
test('challenge selection pauses the match and a different level starts ready',()=>{
 const h=harness();h.opener.listeners.click();h.serve.listeners.click();
 h.challengeHooks.open();assert.equal(h.serve.textContent,'Resume');assert.equal(h.frames.size,0);
 h.challengeHooks.close();assert.equal(h.serve.textContent,'Pause');assert.equal(h.frames.size,1);
 h.challengeHooks.open();h.challengeHooks.change('hard');h.challengeHooks.close();
 assert.equal(h.serve.textContent,'Serve');assert.equal(h.frames.size,0);assert.equal(h.score.textContent,'0');
});

test('resume shows 3, 2, 1 in sequence and blur cancels the visible countdown',()=>{
 const h=harness();h.opener.listeners.click();h.serve.listeners.click();h.serve.listeners.click();h.serve.listeners.click();
 assert.equal(h.countdownValue.textContent,'3');assert.equal(h.countdown.hidden,false);h.step();
 for(let i=0;i<25;i++)h.step();assert.equal(h.countdownValue.textContent,'2');
 for(let i=0;i<24;i++)h.step();assert.equal(h.countdownValue.textContent,'1');
 for(let i=0;i<25;i++)h.step();assert.equal(h.countdown.hidden,true);
 h.serve.listeners.click();h.serve.listeners.click();assert.equal(h.countdown.hidden,false);
 h.windowEvents.blur();assert.equal(h.countdown.hidden,true);assert.equal(h.frames.size,0);
});


test('the canvas waits for intent and a failed allocation can retry on reopen',()=>{
 const h=harness(null,true);assert.equal(h.contextCalls(),0);
 h.opener.listeners.click();assert.equal(h.serve.disabled,true);assert.ok(h.status.textContent.includes('couldn’t load'));
 h.canvas.focus();h.events.keydown({code:'Space',preventDefault(){}});assert.equal(h.frames.size,0);
 h.close.listeners.click();h.opener.listeners.click();assert.equal(h.contextCalls(),2);assert.equal(h.serve.disabled,false);
 h.serve.listeners.click();assert.equal(h.frames.size,1);
});


test('constrained Pong uses a small backing canvas, releases it on close, and can resume',()=>{
 const h=harness(null,false,true);
 assert.equal(h.contextCalls(),0);
 h.opener.listeners.click();
 assert.equal(h.canvas.width,300);assert.equal(h.canvas.height,160);
 h.serve.listeners.click();for(let i=0;i<30;i++)h.step();
 assert.equal(h.serve.textContent,'Pause');
 h.close.listeners.click();
 assert.equal(h.canvas.width,1);assert.equal(h.canvas.height,1);assert.equal(h.frames.size,0);
 h.opener.listeners.click();
 assert.equal(h.canvas.width,300);assert.equal(h.contextCalls(),2);
 assert.equal(h.serve.textContent,'Resume');
});
