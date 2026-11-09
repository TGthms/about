const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const service = import('../tools/notes-preview/worker.mjs');
const encoder = new TextEncoder();
const b64 = value => Buffer.from(value).toString('base64url');
const material = crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
async function token(claims, options={}) {
  const pair=await material;
  const value=b64(JSON.stringify({alg:'RS256',kid:'fixture',...options})) + '.' + b64(JSON.stringify({iat:Math.floor(Date.now()/1000)-1,exp:Math.floor(Date.now()/1000)+300,...claims}));
  return value+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,encoder.encode(value)));
}
async function environment() {
  const pair=await material;const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='fixture';
  const entries=new Map();
  return {ACCESS_TEAM_DOMAIN:'fixture.cloudflareaccess.com',ACCESS_AUDIENCE:'private-preview',OWNER_EMAIL:'owner@example.com',PREVIEW_ORIGIN:'https://preview.example.com',
    FETCH:async url=>{assert.match(url,/^https:\/\/(fixture\.cloudflareaccess\.com\/cdn-cgi\/access\/certs|token\.actions\.githubusercontent\.com\/\.well-known\/jwks)$/);return Response.json({keys:[jwk]});},
    PREVIEWS:{put:async(key,value,options)=>{entries.set(key,{value,metadata:options.metadata});assert.equal(options.expirationTtl,259200);},getWithMetadata:async key=>entries.get(key)||{value:null,metadata:null}},entries};
}
const access = (env, extra={}) => token({iss:'https://'+env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUDIENCE],email:env.OWNER_EMAIL,...extra});
const identity = (env, extra={}) => token({iss:'https://token.actions.githubusercontent.com',aud:env.PREVIEW_ORIGIN,repository:'TGthms/about-notes',ref:'refs/heads/main',workflow_ref:'TGthms/about-notes/.github/workflows/preview.yml@refs/heads/main',event_name:'workflow_dispatch',run_id:'123',run_attempt:'1',...extra});
async function put(env,name,body,extra={}) {
  const jwt=await identity(env,extra);
  return (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+'/upload/123-1/'+name,{method:'PUT',headers:{Authorization:'Bearer '+jwt,'Content-Length':String(Buffer.byteLength(body))},body}),env);
}
async function get(env,path,extra={}) {
  return (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+path,{headers:{'Cf-Access-Jwt-Assertion':await access(env),...extra}}),env);
}

test('unconfigured previews fail closed before accepting any private bytes',async()=>{
  const env=await environment();env.ACCESS_AUDIENCE='';
  assert.equal((await put(env,'example.html','private')).status,503);assert.equal(env.entries.size,0);
  const response=await (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+'/health'),env);
  assert.deepEqual(await response.json(),{ready:false});
});
test('private pages and media require a verified owner identity',async()=>{
  const env=await environment();await put(env,'example.html','private');
  for (const path of ['/preview/123-1/example.html','/preview/123-1/photo.webp']) {
    assert.equal((await (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+path),env)).status,401);
  }
  const response=await (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+'/preview/123-1/example.html',{headers:{'Cf-Access-Jwt-Assertion':await access(env,{email:'other@example.com'})}}),env);
  assert.equal(response.status,403);
  assert.equal(await (await get(env,'/preview/123-1/example.html')).text(),'private');
});
test('expired, wrong-audience and tampered JWTs cannot read previews',async()=>{
  const env=await environment();
  for (const claims of [{exp:1},{aud:['other']},{iss:'https://attacker.example'}]) {
    const jwt=await access(env,claims);
    assert.equal((await (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+'/preview/123-1/example.html',{headers:{'Cf-Access-Jwt-Assertion':jwt}}),env)).status,401);
  }
  const jwt=await access(env);
  assert.equal((await (await service).default.fetch(new Request(env.PREVIEW_ORIGIN+'/preview/123-1/example.html',{headers:{'Cf-Access-Jwt-Assertion':jwt.slice(0,-10)+'aaaaaaaaaa'}}),env)).status,401);
});
test('uploads accept only the exact private workflow and current run',async()=>{
  const env=await environment();
  for (const claims of [{repository:'other/repo'},{ref:'refs/heads/draft'},{workflow_ref:'TGthms/about-notes/.github/workflows/publish.yml@refs/heads/main'},{run_id:'999'},{event_name:'pull_request'}]) {
    assert.equal((await put(env,'example.html','private',claims)).status,403);
  }
  assert.equal(env.entries.size,0);
  assert.equal((await put(env,'example.html','private')).status,201);
});
test('all language previews work and inline scripts use exact CSP hashes',async()=>{
  const env=await environment();
  assert.equal((await put(env,'example.zh-Hant.html','<html><script>trusted()</script></html>')).status,201);
  assert.equal((await put(env,'index.json',JSON.stringify({files:[{name:'example.zh-Hant.html',language:'zh-Hant'}]}))).status,201);
  const response=await get(env,'/preview/123-1/example.zh-Hant.html');
  assert.match(response.headers.get('Content-Security-Policy'),/script-src 'sha256-/);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  const index=await get(env,'/preview/123-1/');assert.match(await index.text(),/繁體中文/);
  assert.equal((await put(env,'index.json',JSON.stringify({files:[{name:'../escape.html',language:'en'}]}))).status,400);
});
test('preview expiration and video range requests remain private',async()=>{
  const env=await environment();await put(env,'clip.mp4','0123456789');
  const response=await get(env,'/preview/123-1/clip.mp4',{Range:'bytes=2-5'});
  assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 2-5/10');assert.equal(await response.text(),'2345');
  env.entries.get('123-1/clip.mp4').metadata.expires=Date.now()-1;
  assert.equal((await get(env,'/preview/123-1/clip.mp4')).status,404);
});

test('audio and downloadable preview files keep owner authentication and attachment rules',async()=>{
 const env=await environment();
 for(const [name,type] of [['recording.wav','audio/wav'],['example.csv','text/csv'],['data.json','application/json'],['document.pdf','application/pdf']]) {
  assert.equal((await put(env,name,'0123456789')).status,201);
  const response=await get(env,'/preview/123-1/'+name);
  assert.equal(response.headers.get('Content-Type'),type);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  if(!type.startsWith('audio/'))assert.match(response.headers.get('Content-Disposition'),/^attachment;/);
  const unauthorized=await (await service).default.fetch(new Request('https://preview.example.com/preview/123-1/'+name),env);
  assert.equal(unauthorized.status,401);
 }
 const range=await get(env,'/preview/123-1/recording.wav',{Range:'bytes=3-6'});
 assert.equal(range.status,206);assert.equal(await range.text(),'3456');
 assert.equal((await put(env,'unsafe.exe','bytes')).status,405);
});

test('comment moderation checks signed owner identity and same-origin deletion', async () => {
  const env = await environment();
  const {DatabaseSync} = require('node:sqlite');
  const {readFileSync} = require('node:fs');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('tools/notes-likes/migrations/0002_comments.sql','utf8'));
    db.prepare('INSERT INTO comments (note, submission, name, body, posted_at) VALUES (?, ?, ?, ?, ?)').run(
      'a'.repeat(64), 'b'.repeat(32), '<b>Reader</b>', '<script>unsafe()</script>', Date.now());
    env.COMMENTS_DB = {
      prepare: sql => ({bind: (...args) => ({
        all: () => ({results: db.prepare(sql).all(...args)}),
        first: () => db.prepare(sql).get(...args),
        run: () => db.prepare(sql).run(...args)
      })})
    };
    const worker = (await service).default;
    const endpoint = env.PREVIEW_ORIGIN + '/preview/moderation';
    assert.equal((await worker.fetch(new Request(endpoint), env)).status, 401);
    const other = await access(env, {email:'other@example.com'});
    assert.equal((await worker.fetch(new Request(endpoint, {headers:{'Cf-Access-Jwt-Assertion':other}}), env)).status, 403);
    const confirmation = await get(env, '/preview/moderation?delete=1');
    assert.equal(confirmation.status, 200);
    const html = await confirmation.text();
    assert.match(html, /Delete this comment/);
    assert.match(html, /&lt;script&gt;unsafe/);
    assert.doesNotMatch(html, /<script>/);
    const jwt = await access(env);
    const post = origin => worker.fetch(new Request(endpoint, {
      method:'POST', headers:{Origin:origin, 'Cf-Access-Jwt-Assertion':jwt},
      body:new URLSearchParams({id:'1'})
    }), env);
    const denied = await post('https://other.example.com');
    assert.equal(denied.status, 403);
    assert.equal(db.prepare('SELECT removed FROM comments').get().removed, 0);
    const deleted = await post(env.PREVIEW_ORIGIN);
    assert.equal(deleted.status, 303);
    assert.equal(deleted.headers.get('Location'), '/preview/moderation?removed=1');
    assert.match(await (await get(env, '/preview/moderation')).text(), /No comments here yet/);
  } finally {
    db.close();
  }
});
