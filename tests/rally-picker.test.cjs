const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function harness(){
 let document,observer;const changes=[],hooks=[],handlers={};
 function el(){return {hidden:false,attrs:{},listeners:{},classList:{add(){},remove(){},toggle(){}},getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},focus(){document.activeElement=this;}};}
 const root=el(),trigger=el(),menu=el(),value=el(),section=el();
 const options=['easy','medium','hard'].map(level=>{const e=el();e.attrs['data-level']=level;return e;});
 root.contains=e=>[root,trigger,menu,...options].includes(e);menu.querySelectorAll=()=>options;
 const ids={'rally-level-picker':root,'rally-level-trigger':trigger,'rally-level-menu':menu,'rally-level-value':value,'rally-level':section};
 let lang='en';document={activeElement:trigger,documentElement:{getAttribute:()=>lang},getElementById:id=>ids[id],addEventListener:(k,fn)=>handlers[k]=fn};
 const c={document,window:{},MutationObserver:function(fn){observer=fn;this.observe=()=>{};}};
 vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+fs.readFileSync('public/js/rally-picker.js','utf8'),c);
 const picker=c.window.createRallyLevelPicker({open:()=>hooks.push('open'),close:()=>hooks.push('close'),change:v=>changes.push(v)});
 const key=(key)=>root.listeners.keydown({key,preventDefault(){},stopPropagation(){}});
 return {root,trigger,menu,value,section,options,picker,document,hooks,changes,handlers,key,translate(){lang='ko';observer();}};
}
test('challenge picker selects by keyboard, translates the value, and handles Escape locally',()=>{
 const h=harness();assert.equal(h.value.textContent,'Medium');h.trigger.listeners.click();
 assert.equal(h.menu.hidden,false);assert.equal(h.document.activeElement,h.options[1]);
 h.key('ArrowDown');assert.equal(h.document.activeElement,h.options[2]);h.key('Enter');
 assert.deepEqual(h.changes,['hard']);assert.equal(h.menu.hidden,true);assert.equal(h.document.activeElement,h.trigger);
 h.translate();assert.equal(h.value.textContent,'어려움');
 h.trigger.listeners.click();h.key('Escape');assert.equal(h.menu.hidden,true);assert.deepEqual(h.hooks,['open','close','open','close']);
});
test('Tab and outside clicks dismiss the menu, and closing the game does not resume it',()=>{
 const h=harness();h.trigger.listeners.click();h.key('Tab');assert.equal(h.document.activeElement,h.trigger);
 h.trigger.listeners.click();h.handlers.click({target:{}});assert.equal(h.menu.hidden,true);
 h.trigger.listeners.click();const count=h.hooks.length;h.picker.close();assert.equal(h.hooks.length,count);assert.equal(h.menu.hidden,true);
});
