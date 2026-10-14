const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function harness(reduced=false){
 const nodes=[],timers=[];let listener;const motion={matches:reduced,addEventListener:(_,fn)=>listener=fn};
 const table={clientHeight:320,children:[],appendChild(node){this.children.push(node);node.parent=this;}};
 const c={document:{createElement(){const node={children:[],properties:{},setAttribute(){},style:{setProperty(k,v){node.properties[k]=v;}},appendChild(child){this.children.push(child);},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}};nodes.push(node);return node;}},window:{matchMedia:()=>motion,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){}}};
 vm.runInNewContext(fs.readFileSync('public/js/rally-effects.js','utf8'),c);
 return {table,timers,nodes,motion,effects:c.window.createRallyCelebration(table),reduce(){motion.matches=true;listener();}};
}
test('winning celebration is larger and longer, with one bounded layer and complete cleanup',()=>{
 const h=harness();h.effects.play(false);const count=h.table.children[0].children.length;const duration=h.timers.at(-1).ms;
 h.effects.play(true);assert.equal(h.table.children.length,1);assert.ok(h.table.children[0].children.length>count);assert.ok(h.timers.at(-1).ms>duration);
 h.timers.at(-1).fn();assert.equal(h.table.children.length,0);
 h.effects.play(false);h.effects.clear();assert.equal(h.table.children.length,0);
});
test('reduced motion skips celebrations and clears an active one when the setting changes',()=>{
 const h=harness(true);h.effects.play(true);assert.equal(h.nodes.length,0);
 h.motion.matches=false;h.effects.play(false);assert.ok(h.table.children.length);h.reduce();assert.equal(h.table.children.length,0);
});
