import {DurableObject} from 'cloudflare:workers';
import {verify} from '../notes-preview/worker.mjs';
import {Store,Problem} from './store.mjs';
const privacy={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'};
export const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...privacy,'Content-Type':'application/json'}});
const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg',wav:'audio/wav',pdf:'application/pdf',zip:'application/zip',txt:'text/plain',csv:'text/csv',json:'application/json'};
const policy="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUDIENCE||!env.OWNER_EMAIL||!env.MANAGER_ORIGIN)return reply({error:'The private online test workspace is locked until owner authentication is configured.'},503);
    if(url.origin!==env.MANAGER_ORIGIN)return reply({error:'Use the configured manager address.'},403);
    try{const user=await verify(request.headers.get('Cf-Access-Jwt-Assertion'),'https://'+env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUDIENCE);if(typeof user.email!=='string'||user.email.toLowerCase()!==env.OWNER_EMAIL.toLowerCase())return reply({error:'Owner access only.'},403);}catch{return reply({error:'Sign in through the owner-only Cloudflare Access application.'},401);}
    if(!['GET','HEAD','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
    if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||request.headers.get('X-Notes-Manager')!=='1'||request.headers.get('Sec-Fetch-Site')==='cross-site'))return reply({error:'Use the signed-in manager to make changes.'},403);
    if(url.pathname.startsWith('/media/')){const address=new URL(request.url);address.pathname='/api/file';address.search='?path='+encodeURIComponent(url.pathname);return env.WORKSPACE.get(env.WORKSPACE.idFromName('unpublished-parity-v1')).fetch(new Request(address,request));}
    if(url.pathname.startsWith('/api/'))return env.WORKSPACE.get(env.WORKSPACE.idFromName('unpublished-parity-v1')).fetch(request);
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
    for(const [key,value]of Object.entries(privacy))headers.set(key,value);
    // Runtime files contain no writing and may be cached privately after login.
    if(url.pathname.startsWith('/runtime/'))headers.set('Cache-Control','private, max-age=31536000, immutable');
    if(['/studio/index.html','/studio/','/studio'].includes(url.pathname)){headers.set('Content-Security-Policy',await env.ASSETS.fetch('https://assets/studio-policy.txt').then(r=>r.text()));return new Response(response.body,{status:response.status,headers});}
    headers.set('Content-Security-Policy',/^\/preview-frame(?:\.html)?$/.test(url.pathname)?"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'":policy);return new Response(response.body,{status:response.status,headers});
  }
};
export class NotesWorkspace extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.store=new Store(ctx.storage);}
  async fetch(request){
    try{
      const url=new URL(request.url),route=url.pathname,s=this.store,path=url.searchParams.get('path');
      if(request.method==='GET'){
        if(route==='/api/session'){const schema=await this.env.ASSETS.fetch('https://assets/schema.json').then(r=>r.json());return reply({environment:'online-test',repository:'cloud-parity-v1',connected:false,notes:s.library(),schema});}
        if(route==='/api/notes')return reply(s.library());
        if(route==='/api/note')return reply(s.get(path,url.searchParams.get('client')));
        if(route==='/api/history')return reply(s.history(path));
        if(route==='/api/trash')return reply(s.trash());
        if(route==='/api/design')return reply(s.design(url.searchParams.get('id')));
        if(route==='/api/media')return reply(s.media(url.searchParams.get('kind')));
        if(route==='/api/file'){const file=s.file(path);return new Response(file.bytes,{headers:{...privacy,'Content-Type':file.mime,'Content-Disposition':/^(image|video|audio)\//.test(file.mime)?'inline':'attachment'}});}
      }
      if(request.method==='POST'){
        const length=Number(request.headers.get('Content-Length'));
        if(route==='/api/upload'){if(length>20*1024*1024)throw new Problem('Choose a file up to 20 MB.',413);const raw=await request.arrayBuffer();const ext=url.searchParams.get('name')?.split('.').at(-1).toLowerCase();return reply(s.upload(url.searchParams.get('kind'),url.searchParams.get('name'),new Uint8Array(raw),types[ext]||'application/octet-stream'));}
        if(length>2*1024*1024)throw new Problem('This request is too large.',413);
        const raw=await request.text();if(new TextEncoder().encode(raw).length>2*1024*1024)throw new Problem('This request is too large.',413);
        let data;try{data=JSON.parse(raw);}catch{throw new Problem('Use a valid JSON request.');}
        if(!data||typeof data!=='object'||Array.isArray(data))throw new Problem('Use a JSON object.');
        const handlers={'/api/create':()=>s.create(data),'/api/save':()=>s.save(data),'/api/recovery':()=>s.recover(data),'/api/design':()=>s.saveDesign(data),'/api/trash/restore':()=>s.restore(data),'/api/trash/empty':()=>s.emptyTrash(data)};
        if(handlers[route])return reply(handlers[route]());
        if(route==='/api/jobs'&&data.operation==='trash')return reply(s.trashJob(data));
        if(route==='/api/jobs')throw new Problem('Publication, GitHub backup, and complete workspace restore are intentionally disconnected in this test version.',409);
      }
      if(route.startsWith('/api/jobs/'))return reply(s.job(route.slice('/api/jobs/'.length)));
      throw new Problem('Not found.',404);
    }catch(error){if(error instanceof Problem)return reply({error:error.message,...error.details},error.status);return reply({error:'The operation could not finish. Existing writing is retained.'},503);}
  }
}
