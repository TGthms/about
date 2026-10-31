const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness({lite=false,narrow=false,clipboard,language='en',supported=true}={}) {
 const status={},button={hidden:true,addEventListener(k,v){this[k]=v;}},code={textContent:'const sample = "<script>";',parentElement:{focus(){this.focused=true;}}};
 const block={querySelector:s=>({'[data-code-copy]':button,code,'[data-code-status]':status})[s],getAttribute:k=>k==='data-copy-success'?'Copied fallback':'Select fallback'};
 const input={value:'50',addEventListener(k,v){this[k]=v;}},control={hidden:true,querySelector:()=>input};
 const compare={classList:{add(v){this[v]=true;}},style:{setProperty(k,v){this[k]=v;}},querySelector:()=>control};
 const selection={removeAllRanges(){},addRange(r){this.range=r;}};
 const document={documentElement:{lang:language,getAttribute:()=>language},querySelectorAll:s=>s==='[data-note-code]'?[block]:[compare],createRange:()=>({selectNodeContents(c){this.code=c;}})};
 const window={SiteRuntime:{lightweight:lite},CSS:{supports:()=>supported},matchMedia:()=>({matches:narrow}),getSelection:()=>selection};
 vm.runInNewContext(fs.readFileSync('public/js/note-blocks.js','utf8'),{document,window,navigator:{clipboard},TRANSLATIONS:{en:{notes:{codeCopied:'Code copied.',codeCopyFailed:'Select the code.'}},zh:{notes:{codeCopied:'代码已复制。',codeCopyFailed:'请选中代码。'}}}});
 return {button,code,status,compare,input,control,selection};
}
test('code copying preserves literal text and announces success in the current language',async()=>{
 let copied;const h=harness({language:'zh',clipboard:{writeText:async value=>{copied=value;}}});
 assert.equal(h.button.hidden,false);h.button.click();await Promise.resolve();
 assert.equal(copied,h.code.textContent);assert.equal(h.status.textContent,'代码已复制。');assert.equal(h.button.disabled,false);
});
test('clipboard rejection or missing support selects the code for manual copying',async()=>{
 for(const clipboard of [undefined,{writeText:()=>Promise.reject(new Error('Unavailable'))},{writeText:()=>{throw new Error('Unavailable');}}]){
  const h=harness({clipboard});h.button.click();await Promise.resolve();
  assert.equal(h.code.parentElement.focused,true);assert.equal(h.selection.range.code,h.code);assert.equal(h.status.textContent,'Select the code.');assert.equal(h.button.disabled,false);
 }
});
test('comparison uses the native range and clamps the visual boundary',()=>{
 const h=harness();assert.equal(h.compare.classList['is-enhanced'],true);assert.equal(h.control.hidden,false);
 h.input.value='72';h.input.input();assert.equal(h.compare.style['--note-compare-position'],'72%');
 h.input.value='200';h.input.input();assert.equal(h.compare.style['--note-compare-position'],'100%');
});
test('Watch-sized, lightweight, or unsupported browsers retain the two-image fallback',()=>{
 for(const options of [{lite:true},{narrow:true},{supported:false}]){
  const h=harness(options);assert.equal(h.control.hidden,true);assert.equal(h.compare.classList['is-enhanced'],undefined);
 }
});
