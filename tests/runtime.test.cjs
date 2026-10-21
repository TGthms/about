const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function runtime({viewport=1280,width=1280,height=800,ua='Safari',search=''}={}) {
 const attrs={};
 const context={navigator:{userAgent:ua},document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v}},window:{location:{search},screen:{width,height},matchMedia:()=>({matches:viewport<=320})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('public/js/runtime.js','utf8'),context);
 return {context,attrs,api:context.window.SiteRuntime};
}
test('watch identification and constrained viewport/screen select lightweight mode before preload',()=>{
 for(const options of [{viewport:224},{viewport:320},{width:224,height:274},{width:274,height:224},{ua:'Apple Watch watchOS'},{ua:'Mozilla WatchOS'},{search:'?lite=1'},{search:'?occasion=easter&lite=1'}]){
  const r=runtime(options);assert.equal(r.api.lightweight,true);assert.ok('data-lightweight' in r.attrs);
 }
 for(const options of [{search:'?lite=10'},{viewport:321},{viewport:390,width:390,height:844},{}]) assert.equal(runtime(options).api.lightweight,false);
});
test('compact photos cover every existing local photo and leave unknown or remote URLs alone',()=>{
 const r=runtime({viewport:240});
 const html=fs.readFileSync('public/index.html','utf8');
 const photos=[...html.matchAll(/data-(?:src|hero-src)="([^"]+)"/g)].map(m=>m[1]);
 photos.push('assets/erhu/erhu-instrument.jpg',...['christmas','good-friday','easter','palm-sunday','thanksgiving','new-year'].map(x=>'assets/seasonal/'+x+'.webp'));
 for(const src of photos){const small=r.api.image(src);assert.ok(small.startsWith('assets/compact/'),src);assert.ok(fs.existsSync('public/'+small),small);}
 for(const src of ['assets/projects/future.jpg','https://example.com/image.jpg','assets/example.svg'])assert.equal(r.api.image(src),src);
 assert.equal(runtime().api.image('assets/main-modern.webp'),'assets/main-modern.webp');
});
test('calendar preload and hero choose the same compact image without a high resolution source set',()=>{
 const r=runtime({viewport:240}),links=[];
 Object.assign(r.context,{URLSearchParams,Date});
 r.context.window.location={search:'?occasion=easter'};
 r.context.document.head={appendChild:l=>links.push(l)};r.context.document.createElement=()=>({});
 vm.runInContext(fs.readFileSync('public/js/season-calendar.js','utf8'),r.context);
 assert.equal(links[0].href,'assets/compact/seasonal/easter.webp');assert.equal(links[0].imageSrcset,undefined);
 const calendar=r.context.window.SeasonCalendar;
 assert.equal(calendar.imageSet(),null);assert.equal(calendar.photo(),'assets/compact/main-modern.webp');
});
test('constrained decorative modules allocate no haptics, popover, or birthday resources',()=>{
 const window={SiteRuntime:{lightweight:true}};
 for(const file of ['haptics','github-card','birthday']){
  vm.runInNewContext(fs.readFileSync('public/js/'+file+'.js','utf8'),{window});
  if(file==='github-card')window.initGithubCard();
 }
});
