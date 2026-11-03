import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
export const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const require=createRequire(path.join(root,'tools/notes-manager/package.json'));
const {build}=require('esbuild');
const globalRequire=createRequire(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=globalRequire('miniflare');
export async function fixture(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'notes-online-test-')),origin='https://manager.test',issuer='https://identity.test';
  await build({entryPoints:[path.join(root,'tools/notes-online/worker.mjs')],outfile:path.join(temp,'worker.mjs'),bundle:true,format:'esm',platform:'neutral',external:['cloudflare:workers'],logLevel:'silent'});
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='fixture-key';
  const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(email='owner@example.test'){const raw=b64({alg:'RS256',kid:jwk.kid})+'.'+b64({iss:issuer,aud:['test-manager'],email,exp:Math.floor(Date.now()/1000)+3600});return raw+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(raw))).toString('base64url');}
  const owner=await token();const assets=path.join(root,'tools/notes-online/dist');
  const mime={html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',wasm:'application/wasm',ttf:'font/ttf'};
  const options={modules:true,script:fs.readFileSync(path.join(temp,'worker.mjs'),'utf8'),compatibilityDate:'2026-10-13',durableObjects:{WORKSPACE:{className:'NotesWorkspace',useSQLite:true}},bindings:{MANAGER_ORIGIN:origin,ACCESS_TEAM_DOMAIN:'identity.test',ACCESS_AUDIENCE:'test-manager',OWNER_EMAIL:'owner@example.test'},
    serviceBindings:{ASSETS:async request=>{const url=new URL(request.url);if(url.pathname==='/studio/index.html')return new Response(null,{status:307,headers:{Location:'/studio/'}});if(url.pathname==='/preview-frame.html')return new Response(null,{status:307,headers:{Location:'/preview-frame'+url.search}});const relative=url.pathname==='/'?'index.html':url.pathname==='/preview-frame'?'preview-frame.html':url.pathname==='/studio/'?'studio/index.html':decodeURIComponent(url.pathname.slice(1)),file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Missing fixture asset',{status:404});return new Response(fs.readFileSync(file),{headers:{'Content-Type':mime[file.split('.').at(-1)]||'application/octet-stream'}});}},
    outboundService:async request=>new URL(request.url).origin===issuer?Response.json({keys:[jwk]}):new Response('No external network in tests',{status:403})};
  let mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'test-manager',...options}],resourcePersistencePath:path.join(temp,'data'),telemetry:{enabled:false}}));
  const request=async(route,method='GET',data,extra={})=>mf.dispatchFetch(origin+route,{method,headers:{'Cf-Access-Jwt-Assertion':owner,...(method==='POST'?{'Origin':origin,'X-Notes-Manager':'1','Content-Type':'application/json'}:{}),...extra},body:data===undefined?undefined:typeof data==='string'||data instanceof Uint8Array?data:JSON.stringify(data)});
  let localOrigin;
  const server=http.createServer(async(req,res)=>{try{const parts=[];for await(const part of req)parts.push(part);const headers={...req.headers,'Cf-Access-Jwt-Assertion':owner};delete headers.host;if(headers.origin===localOrigin)headers.origin=origin;const result=await mf.dispatchFetch(origin+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(parts)});res.writeHead(result.status,Object.fromEntries(result.headers));for await(const chunk of result.body||[])res.write(chunk);res.end();}catch(error){res.writeHead(500);res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));localOrigin='http://127.0.0.1:'+server.address().port;
  return{url:localOrigin,request,token,restart:async()=>{await mf.dispose();mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'test-manager',...options}],resourcePersistencePath:path.join(temp,'data'),telemetry:{enabled:false}}));},close:async()=>{await new Promise(resolve=>server.close(resolve));await mf.dispose();fs.rmSync(temp,{recursive:true,force:true});}};
}
