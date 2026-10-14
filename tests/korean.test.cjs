const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function data(){
 const context={window:{}};
 for(const file of ['i18n/data.js','erhu-content.js','site-history-content.js','psalm-content.js','legal/ui-content.js','legal/privacy-content.js','legal/terms-content.js']) vm.runInNewContext(fs.readFileSync('public/js/'+file,'utf8'),context);
 vm.runInNewContext('this.packs=TRANSLATIONS;this.langs=SUPPORTED_LANGS;this.options=LANG_OPTIONS;this.erhu=ERHU_WIKI;this.history=PERSONAL_HUB;this.psalm=PSALM_23;',context);
 return context;
}
function coverage(reference, translation, path='') {
 for(const [key,value] of Object.entries(reference)) {
  const label=path+'.'+key;
  if(typeof value==='string') {
   assert.equal(typeof translation[key],'string',label);
   assert.ok(translation[key].trim(),label);
   assert.deepEqual([...translation[key].matchAll(/\{\w+\}/g)].map(x=>x[0]).sort(),[...value.matchAll(/\{\w+\}/g)].map(x=>x[0]).sort(),label+' placeholders');
  } else if(value && typeof value==='object') { assert.ok(translation[key],label);coverage(value,translation[key],label); }
 }
}
test('Korean is sixth, directly after Japanese, with complete home copy and placeholders',()=>{
 const c=data(); assert.deepEqual(Array.from(c.langs),['en','es','zh','zh-Hant','ja','ko']);
 assert.equal(c.options.at(-1).label,'한국어');coverage(c.packs.en,c.packs.ko,'home');
});
test('Korean covers every legal section, erhu paragraph, milestone, and Scripture credit',()=>{
 const c=data();coverage(c.erhu.en,c.erhu.ko,'erhu');coverage(c.history.copy.en,c.history.copy.ko,'history');
 c.history.milestones.forEach(x=>coverage(x.copy.en,x.copy.ko,'milestone '+x.version));
 for(const name of ['privacy','terms']){
  const doc=c.window.LEGAL_DOCUMENTS[name];coverage(doc.en,doc.ko,name);
  assert.deepEqual(Array.from(doc.ko.sections,x=>x.id),Array.from(doc.en.sections,x=>x.id));
 }
 coverage(c.window.LEGAL_UI.en,c.window.LEGAL_UI.ko,'legal UI');
 assert.equal(c.psalm.ko.verses.length,6);assert.ok(c.psalm.ko.copyright.includes('1985'));
 assert.ok(c.psalm.ko.citation.includes('KLB'));assert.ok(c.packs.ko.about.p2.includes('{psalm}'));
});
test('all six languages cover match controls and honest copy feedback',()=>{
 const c=data();for(const lang of c.langs){coverage(c.packs.en.rally,c.packs[lang].rally,lang+'.rally');coverage(c.packs.en.contact,c.packs[lang].contact,lang+'.contact');}
});
