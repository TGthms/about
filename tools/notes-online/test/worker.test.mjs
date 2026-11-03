import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './fixture.mjs';
test('actual Workers runtime guards APIs and all assets, persists across restart, and never publishes',async()=>{
 const f=await fixture();try{
  for(const route of ['/','/runtime/314.0.7/pyodide.mjs','/api/notes','/api/file?path=/media/images/a.webp','/preview-frame.html'])assert.equal((await f.request(route,'GET',undefined,{'Cf-Access-Jwt-Assertion':''})).status,401);
  assert.equal((await f.request('/api/notes','GET',undefined,{'Cf-Access-Jwt-Assertion':await f.token('other@example.test')})).status,403);
  assert.equal((await f.request('/api/create','POST',{title:'Blocked'},{Origin:'https://attacker.test'})).status,403);
  assert.ok((await f.request('/preview-frame')).headers.get('Content-Security-Policy').includes("script-src 'unsafe-inline'"));
  assert.ok(!(await f.request('/')).headers.get('Content-Security-Policy').includes("script-src 'unsafe-inline'"));
  assert.ok((await f.request('/studio/')).headers.get('Content-Security-Policy').includes("script-src 'sha256-"));
  const session=await(await f.request('/api/session')).json();assert.equal(session.environment,'online-test');assert.equal(session.connected,false);
  const created=await(await f.request('/api/create','POST',{title:'On my phone'})).json();assert.ok(created.etag,JSON.stringify(created));
  const saved=await(await f.request('/api/save','POST',{path:created.path,etag:created.etag,document:{...created.document,body:'<p>Continue on my Mac.</p>'}})).json();assert.ok(saved.etag);
  await f.restart();assert.equal((await(await f.request('/api/note?path='+encodeURIComponent(created.path))).json()).document.body,'<p>Continue on my Mac.</p>');
  assert.equal((await f.request('/api/save','POST',{path:created.path,etag:created.etag,document:created.document})).status,409);
  assert.equal((await f.request('/api/jobs','POST',{operation:'publish',path:created.path})).status,409);
  const file=await(await f.request('/api/upload?kind=downloads&name=test.csv','POST',new Uint8Array([65,66,67]))).json();assert.ok(file.path);
  assert.deepEqual([...new Uint8Array(await(await f.request('/api/file?path='+encodeURIComponent(file.path))).arrayBuffer())],[65,66,67]);
  const moved=await(await f.request('/api/jobs','POST',{operation:'trash',path:created.path,etag:saved.etag})).json();const result=await(await f.request('/api/jobs/'+moved.job)).json();assert.equal(result.result.trashed,true);
 }finally{await f.close();}
});
