const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('first-visit language follows Traditional script hints and saved choice wins',()=>{
 for(const lang of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-TW']){
  const c={navigator:{languages:[lang]},localStorage:{getItem:()=>null}};
  vm.runInNewContext(fs.readFileSync('public/js/i18n/data.js','utf8')+fs.readFileSync('public/js/i18n/language.js','utf8'),c);
  assert.equal(c.detectLanguage(),'zh-Hant',lang);c.localStorage.getItem=()=> 'en';assert.equal(c.detectLanguage(),'en');
 }
});
test('dialog exit cleans up once, after animation, with immediate reduced-motion cleanup',()=>{
 for(const reduced of [false,true]){
  const queue=[],classes=new Set();let finished=0;
  const c={window:{matchMedia:()=>({matches:reduced}),setTimeout:fn=>queue.push(fn)},document:{querySelector:()=>null}};
  vm.runInNewContext(fs.readFileSync('public/js/preferences.js','utf8'),c);
  const modal={hidden:false,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)}};
  c.window.closeSiteDialog(modal,()=>finished++);
  if(reduced)assert.equal(finished,1);else{
   assert.equal(finished,0);c.window.closeSiteDialog(modal,()=>finished++);assert.equal(queue.length,1);
   queue.shift()();assert.equal(finished,1);assert.equal(classes.size,0);
  }
 }
});
test('ordinary hero preload and displayed source set agree; seasonal sources clear ordinary variants',()=>{
 const cal=require('../public/js/season-calendar.js');
 const attrs=new Map();const image={removeAttribute:k=>attrs.delete(k),set srcset(v){attrs.set('srcset',v)},set sizes(v){attrs.set('sizes',v)}};
 cal.setPhoto(image,'','');assert.ok(attrs.get('srcset').includes('main-1920.webp'));assert.equal(image.src,'assets/main-modern.webp');
 cal.setPhoto(image,'easter','greeting');assert.equal(attrs.has('srcset'),false);assert.equal(image.src,'assets/seasonal/easter.webp');
});
