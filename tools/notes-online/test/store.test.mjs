import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Store,notePath,mediaPath} from '../store.mjs';
function fixture(){const db=new DatabaseSync(':memory:');const storage={sql:{exec(sql,...args){if(!args.length&&sql.includes(';')){db.exec(sql);return{toArray:()=>[]};}const rows=db.prepare(sql).all(...args);return{toArray:()=>rows};}},transactionSync(fn){db.exec('BEGIN');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};return{db,store:new Store(storage),storage};}
test('revisions survive restart, preserve unknown content, and reject stale device writes',()=>{
  const {db,store:s,storage}=fixture(),note=s.create({title:'A note'}),original={...note.document,body:'<p>手机上的写作。</p>',unknown:{keep:true},translations:[{language:'zh',body:'<p>中文</p>'}]};
  const saved=s.save({path:note.path,etag:note.etag,document:original});const restarted=new Store(storage);assert.deepEqual(restarted.get(note.path).document,original);
  assert.throws(()=>s.save({path:note.path,etag:note.etag,document:{...original,body:'A stale Mac draft'}}),error=>error.status===409&&error.details.conflict.local.body==='A stale Mac draft'&&error.details.conflict.online.body===original.body);
  assert.equal(s.history(note.path).length,1);assert.equal(s.get(note.path).etag,saved.etag);db.close();
});
test('recoveries are per device and Trash is reversible with stale-empty protection',()=>{
  const {db,store:s}=fixture(),note=s.create({title:'Recover me'});
  s.recover({path:note.path,client:'phone',document:{...note.document,body:'Phone'},etag:note.etag});s.recover({path:note.path,client:'mac',document:{...note.document,body:'Mac'},etag:note.etag});
  assert.equal(s.rows('SELECT * FROM recovery').length,2);
  const job=s.trashJob({path:note.path,etag:note.etag}),result=s.job(job.job).result;assert.equal(s.library().length,0);assert.throws(()=>s.emptyTrash({ids:[]}),{status:409});
  const restored=s.restore({id:result.id});assert.equal(restored.document.title,'Recover me');assert.equal(restored.document.published,false);assert.equal(s.trash().length,0);db.close();
});
test('chunked media retains exact bytes, rejects traversal, and covers have optimistic revisions',()=>{
  const {db,store:s}=fixture(),bytes=new Uint8Array(700000).map((_,i)=>i%251),file=s.upload('audio','example.wav',bytes,'audio/wav');assert.deepEqual(s.file(file.path).bytes,bytes);assert.equal(s.rows('SELECT * FROM chunks').length,3);
  for(const path of ['/media/images/../../a','/media/images/a.svg/other'])assert.throws(()=>mediaPath(path));assert.throws(()=>notePath('notes/../../secret'));
  const id='a'.repeat(24),first=s.saveDesign({id,design:{title:'A design'},etag:null});assert.throws(()=>s.saveDesign({id,design:{title:'stale'},etag:null}),{status:409});assert.equal(s.design(id).etag,first.etag);db.close();
});

test('duplicated notes fork editable cover sources and device recovery stays isolated',()=>{
  const {db,store:s}=fixture(),key='b'.repeat(24);s.saveDesign({id:key,design:{title:'Original cover'},etag:null});
  const first=s.create({document:{title:'Original',body:'<p>Text</p>',date:'2026-11-02',language:'en',og_designs:{sharing_image:key}}});
  const copied=s.create({document:first.document});const own=copied.document.og_designs.sharing_image;assert.notEqual(own,first.document.og_designs.sharing_image);assert.equal(s.design(own).design.title,'Original cover');
  s.recover({path:first.path,client:'phone',etag:first.etag,document:{...first.document,body:'Recovered phone text'}});assert.equal(s.get(first.path,'mac').recovery,null);assert.equal(s.get(first.path,'phone').recovery.document.body,'Recovered phone text');
  assert.ok(s.history(first.path).some(row=>row.kind==='Recovered browser session'));db.close();
});
