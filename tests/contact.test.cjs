const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(fallbackResult = true) {
  let click, languageChange, copiedText, resolveCopy, rejectCopy;
  let language = 'en';
  const timers=[], label={}, mark={}, status={textContent:''};
  const copied = new Set();
  const button={hidden:true,querySelector:s=>s==='[data-i18n]'?label:mark,classList:{toggle:(c,on)=>on?copied.add(c):copied.delete(c)},addEventListener:(_,fn)=>click=fn};
  const context={document:{documentElement:{getAttribute:()=>language},getElementById:id=>id==='copy-email'?button:status,querySelector:()=>({textContent:'contact.timg@icloud.com'}),body:{appendChild(){}},createElement:()=>({style:{},setAttribute(){},select(){},setSelectionRange(){},remove(){}}),execCommand:()=>fallbackResult},window:{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}},navigator:{clipboard:{writeText:text=>{copiedText=text;return new Promise((resolve,reject)=>{resolveCopy=resolve;rejectCopy=reject;});}}},TRANSLATIONS:{en:{contact:{copy:'Copy email',copied:'Copied!',success:'Email copied',failed:'Copy failed'}},zh:{contact:{copy:'复制邮箱',copied:'已复制',success:'邮箱已复制',failed:'复制失败'}}},MutationObserver:function(fn){languageChange=fn;this.observe=()=>{};}};
  vm.runInNewContext(fs.readFileSync('public/js/contact.js','utf8'),context);
  return {button,label,status,copied,timers,click:()=>click(),text:()=>copiedText,resolve:()=>resolveCopy(),reject:()=>rejectCopy(),translate:()=>{language='zh';languageChange();}};
}
test('email copy reports actual completion in the current language and resets feedback', async () => {
  const h=harness(); const pending=h.click();
  assert.equal(h.text(),'contact.timg@icloud.com'); assert.equal(h.status.textContent,'');
  h.translate(); h.resolve(); await pending;
  assert.equal(h.label.textContent,'已复制'); assert.equal(h.status.textContent,'邮箱已复制');
  h.timers.at(-1)(); assert.equal(h.label.textContent,'复制邮箱');
});
test('denied clipboard and unsuccessful fallback show failure without claiming success', async () => {
  const h=harness(false); const pending=h.click(); h.reject(); await pending;
  assert.equal(h.status.textContent,'Copy failed'); assert.equal(h.label.textContent,'Copy email');
  assert.equal(h.copied.has('is-copied'),false);
});
