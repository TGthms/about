// Separate, unpublished parity workspace. No GitHub or publication credentials.
import defaults from '../notes-manager/vendor/og-studio/defaults.json' with {type:'json'};
export class Problem extends Error {
  constructor(message,status=400,details={}){super(message);this.status=status;this.details=details;}
}
const clone=value=>JSON.parse(JSON.stringify(value));
const stamp=()=>new Date().toISOString();
const id=()=>crypto.randomUUID().replaceAll('-','');
const MAX_DOCUMENT=1024*1024,MAX_MEDIA=20*1024*1024,MAX_WORKSPACE=200*1024*1024,CHUNK=256*1024;
export const mediaKinds={photographs:['images',['jpg','jpeg','png','webp']],videos:['videos',['mp4','webm']],audio:['audio',['mp3','m4a','ogg','wav']],downloads:['downloads',['pdf','zip','txt','csv','json']]};
export function notePath(value){if(typeof value!=='string'||!/^notes\/[a-zA-Z0-9_-]+\.json$/.test(value))throw new Problem('Choose a valid note.');return value;}
export function mediaPath(value){if(typeof value!=='string'||!/^\/media\/(images|videos|audio|downloads)\/[a-zA-Z0-9_.-]+$/.test(value)||value.includes('..'))throw new Problem('Choose a valid upload.');return value;}
function document(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||new TextEncoder().encode(JSON.stringify(value)).length>MAX_DOCUMENT)throw new Problem('Use a note smaller than 1 MB.');
  if(typeof value.body!=='string'||value.blocks&&!Array.isArray(value.blocks)||value.translations&&!Array.isArray(value.translations))throw new Problem('The note has an invalid content structure.');
  return clone(value); // Unknown metadata and exact author HTML remain untouched.
}
const title=value=>String(value.title||value.body?.replace(/<[^>]*>/g,' ').trim().slice(0,80)||'Untitled');

export class Store {
  constructor(storage){
    this.storage=storage;this.sql=storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS notes(path TEXT PRIMARY KEY,doc TEXT NOT NULL,etag TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS history(note TEXT NOT NULL,id TEXT PRIMARY KEY,doc TEXT NOT NULL,created TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS history_note ON history(note,created);
      CREATE TABLE IF NOT EXISTS recovery(note TEXT NOT NULL,client TEXT NOT NULL,value TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(note,client));
      CREATE TABLE IF NOT EXISTS trash(id TEXT PRIMARY KEY,path TEXT NOT NULL,doc TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS designs(id TEXT PRIMARY KEY,value TEXT NOT NULL,etag TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS media(path TEXT PRIMARY KEY,name TEXT NOT NULL,size INTEGER NOT NULL,modified REAL NOT NULL,mime TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chunks(path TEXT NOT NULL,part INTEGER NOT NULL,value BLOB NOT NULL,PRIMARY KEY(path,part));`);
  }
  rows(sql,...args){return this.sql.exec(sql,...args).toArray();}
  atomic(fn){return this.storage.transactionSync(fn);}
  forkDesigns(value){
    if(!value||typeof value!=='object')return;
    if(value.og_designs&&typeof value.og_designs==='object')for(const [target,old]of Object.entries(value.og_designs)){
      if(typeof old!=='string'||!/^[a-f0-9]{24}$/.test(old))continue;
      const previous=this.design(old),key=id().slice(0,24);value.og_designs[target]=key;
      if(previous.design)this.sql.exec('INSERT INTO designs VALUES(?,?,?)',key,JSON.stringify(previous.design),id());
    }
    if(Array.isArray(value.translations))for(const child of value.translations)this.forkDesigns(child);
  }
  row(path){const row=this.rows('SELECT * FROM notes WHERE path=?',notePath(path))[0];if(!row)throw new Problem('This note is unavailable.',404);return row;}
  library(){return this.rows('SELECT path,doc FROM notes ORDER BY updated DESC').map(row=>{const doc=JSON.parse(row.doc);return{path:row.path,title:title(doc),date:doc.date||'',status:'Draft',categories:Array.isArray(doc.categories)?doc.categories:[],search:JSON.stringify(doc).slice(0,12000)};});}
  get(path,client){const row=this.row(path);const recovery=client?this.rows('SELECT value FROM recovery WHERE note=? AND client=?',path,client)[0]:null;return{path,document:JSON.parse(row.doc),etag:row.etag,status:'Draft',recovery:recovery?JSON.parse(recovery.value):null,baseline:null,local_changes:false,design_etags:{}};}
  create(input={}){return this.atomic(()=>{const value=input.document?document(input.document):{title:String(input.title||''),body:'',blocks:[],translations:[],date:input.date||stamp().slice(0,10),language:'en',editor_version:2};const key=id().slice(0,12),path=notePath('notes/'+key+'.json');if(input.document)this.forkDesigns(value);value.slug=String(value.slug||'note')+'-'+key;value.published=false;value.highlight??=true;this.sql.exec('INSERT INTO notes VALUES(?,?,?,?,?)',path,JSON.stringify(value),id(),stamp(),stamp());return this.get(path);});}
  save({path,document:value,etag}){value=document(value);return this.atomic(()=>{const row=this.row(path);if(row.etag!==etag)throw new Problem('Another device saved a newer version.',409,{conflict:{path,local:value,online:JSON.parse(row.doc),etag:row.etag}});if(value.slug!==JSON.parse(row.doc).slug)throw new Problem('Article addresses stay fixed when editing a note.');for(const item of this.rows('SELECT client,value FROM recovery WHERE note=?',path))if(JSON.stringify(JSON.parse(item.value).document)===JSON.stringify(value))this.sql.exec('DELETE FROM recovery WHERE note=? AND client=?',path,item.client);if(row.doc===JSON.stringify(value))return{etag:row.etag,status:'Draft',saved:row.updated};this.sql.exec('INSERT INTO history VALUES(?,?,?,?)',path,id(),row.doc,stamp());this.sql.exec('DELETE FROM history WHERE note=? AND id NOT IN (SELECT id FROM history WHERE note=? ORDER BY created DESC,rowid DESC LIMIT 50)',path,path);const next=id();this.sql.exec('UPDATE notes SET doc=?,etag=?,updated=? WHERE path=?',JSON.stringify(value),next,stamp(),path);return{etag:next,status:'Draft',saved:stamp()};});}
  recover({path,document:value,etag,client='legacy',discard=false}){this.row(path);if(typeof client!=='string'||!/^[\w-]{1,80}$/.test(client))throw new Problem('Invalid editing session.');if(discard)this.sql.exec('DELETE FROM recovery WHERE note=? AND client=?',path,client);else{value=document(value);this.sql.exec('INSERT OR REPLACE INTO recovery VALUES(?,?,?,?)',path,client,JSON.stringify({document:value,etag,client,updated:stamp()}),stamp());}return{saved:true};}
  history(path){this.row(path);const recoveries=this.rows('SELECT value,updated FROM recovery WHERE note=? ORDER BY updated DESC',path).map(row=>({document:JSON.parse(row.value).document,time:row.updated,kind:'Recovered browser session'}));return recoveries.concat(this.rows('SELECT doc,created FROM history WHERE note=? ORDER BY created DESC,rowid DESC',path).map(row=>({document:JSON.parse(row.doc),time:row.created,kind:'Before cloud save'})));}
  trashNote({path,etag}){return this.atomic(()=>{const row=this.row(path);if(row.etag!==etag)throw new Problem('The note changed. Open it again before moving it to Trash.',409);const key=id();this.sql.exec('INSERT INTO trash VALUES(?,?,?,?)',key,path,row.doc,stamp());this.sql.exec('DELETE FROM notes WHERE path=?',path);return{trashed:true,path,id:key};});}
  trash(){return this.rows('SELECT * FROM trash ORDER BY created DESC').map(row=>({id:row.id,title:title(JSON.parse(row.doc)),created:row.created,path:row.path}));}
  restore({id:key}){return this.atomic(()=>{const row=this.rows('SELECT * FROM trash WHERE id=?',key)[0];if(!row)throw new Problem('This Trash entry is unavailable.',404);const doc=JSON.parse(row.doc);doc.published=false;let path=row.path;if(this.rows('SELECT path FROM notes WHERE path=?',path).length){path='notes/restored-'+id()+'.json';doc.slug=String(doc.slug||'note')+'-restored-'+id().slice(0,8);this.forkDesigns(doc);}this.sql.exec('INSERT INTO notes VALUES(?,?,?,?,?)',path,JSON.stringify(doc),id(),stamp(),stamp());this.sql.exec('DELETE FROM trash WHERE id=?',key);return this.get(path);});}
  emptyTrash({ids}){return this.atomic(()=>{const current=this.trash().map(row=>row.id).sort();if(!Array.isArray(ids)||new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify(current))throw new Problem('Trash changed. Review it again before emptying it.',409);for(const row of this.rows('SELECT path FROM trash'))if(!this.rows('SELECT path FROM notes WHERE path=?',row.path).length){this.sql.exec('DELETE FROM history WHERE note=?',row.path);this.sql.exec('DELETE FROM recovery WHERE note=?',row.path);}this.sql.exec('DELETE FROM trash');return{removed:current.length};});}
  design(key){if(typeof key!=='string'||!/^[a-f0-9]{24}$/.test(key))throw new Problem('Invalid cover design.');const row=this.rows('SELECT * FROM designs WHERE id=?',key)[0];return{id:key,design:row?JSON.parse(row.value):null,etag:row?.etag||null};}
  saveDesign({id:key,design,etag}){
    if(!design||typeof design!=='object'||JSON.stringify(design).length>MAX_DOCUMENT)throw new Problem('Invalid cover design.');
    const safe={};
    for(const [name,fallback]of Object.entries(defaults)){
      const value=design[name]??fallback;
      if(name==='colors'){if(!Array.isArray(value)||value.length<4||value.length>8||value.some(v=>typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v)))throw new Problem('Choose four to eight valid cover colors.');}
      else if(typeof value!==typeof fallback||typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>10000)||typeof value==='string'&&value.length>10000)throw new Problem('Invalid cover setting: '+name);
      if(['backgroundData','logoData'].includes(name)&&value){mediaPath(value);if(!value.startsWith('/media/images/')||!this.rows('SELECT path FROM media WHERE path=?',value).length)throw new Problem('Choose a background or logo from this private media library.');}
      safe[name]=value;
    }
    if(safe.width<100||safe.width>4000||safe.height<100||safe.height>4000)throw new Problem('Use a cover canvas between 100 and 4000 pixels.');
    return this.atomic(()=>{const current=this.design(key);if(current.etag!==(etag||null))throw new Problem('This cover changed on another device. Reopen it before saving.',409);const next=id();this.sql.exec('INSERT OR REPLACE INTO designs VALUES(?,?,?)',key,JSON.stringify(safe),next);return{id:key,etag:next,design:safe};});
  }
  media(kind){const entry=mediaKinds[kind];if(!entry)throw new Problem('Choose a media library.');const notes=this.rows('SELECT path,doc FROM notes');return this.rows('SELECT * FROM media WHERE path LIKE ? ORDER BY modified DESC','/media/'+entry[0]+'/%').map(row=>({...row,used_by:notes.filter(note=>note.doc.includes(row.path)).map(note=>({path:note.path,title:title(JSON.parse(note.doc))})),descriptions:[]}));}
  upload(kind,name,bytes,mime){const entry=mediaKinds[kind],ext=String(name).split('.').at(-1).toLowerCase();if(!entry||!entry[1].includes(ext)||!bytes.byteLength||bytes.byteLength>MAX_MEDIA)throw new Problem('Choose a supported file up to 20 MB.',413);return this.atomic(()=>{const total=this.rows('SELECT coalesce(sum(size),0) AS size FROM media')[0].size;if(total+bytes.byteLength>MAX_WORKSPACE)throw new Problem('The test workspace has reached its 200 MB safety limit. Your existing uploads are retained.',413);const path='/media/'+entry[0]+'/'+id()+'.'+ext;this.sql.exec('INSERT INTO media VALUES(?,?,?,?,?)',path,String(name).slice(0,180),bytes.byteLength,Date.now()/1000,mime);for(let offset=0,part=0;offset<bytes.byteLength;offset+=CHUNK,part++)this.sql.exec('INSERT INTO chunks VALUES(?,?,?)',path,part,bytes.slice(offset,offset+CHUNK));return{path,name,size:bytes.byteLength};});}
  file(path){mediaPath(path);const info=this.rows('SELECT * FROM media WHERE path=?',path)[0];if(!info)throw new Problem('This upload is unavailable.',404);const bytes=new Uint8Array(info.size);let offset=0;for(const row of this.rows('SELECT value FROM chunks WHERE path=? ORDER BY part',path)){const chunk=new Uint8Array(row.value);bytes.set(chunk,offset);offset+=chunk.byteLength;}return{...info,bytes};}
  trashJob(data){const key=id(),result=this.trashNote(data);this.sql.exec('INSERT INTO jobs VALUES(?,?)',key,JSON.stringify(result));return{job:key};}
  job(key){const row=this.rows('SELECT value FROM jobs WHERE id=?',key)[0];if(!row)throw new Problem('This test operation is unavailable.',404);return{status:'done',result:JSON.parse(row.value)};}
}
