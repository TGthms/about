import test from 'node:test';
import assert from 'node:assert/strict';
import {copy,getAt,setAt,moveItem,newBlock,fieldSpec} from '../src/model.js';

test('editing a nested translation preserves the original and unknown metadata',()=>{
  const original={body:'Original',custom:{protected:true},translations:[{language:'zh',body:'旧内容',same_study:{type:'same-study',before_block:0}}]};
  const edited=copy(original);setAt(edited,['translations',0,'body'],'新内容');
  assert.equal(getAt(edited,['translations',0,'body']),'新内容');assert.equal(edited.body,'Original');
  assert.deepEqual(edited.custom,original.custom);assert.deepEqual(edited.translations[0].same_study,original.translations[0].same_study);
  assert.equal(original.translations[0].body,'旧内容');
  const empty={};setAt(empty,['translations',0,'body'],'New');assert.deepEqual(empty,{translations:[{body:'New'}]});
});
test('reordering retains the exact block objects and rejects invalid destinations',()=>{
  const blocks=[{type:'quote',text:'One'},{type:'code',code:'Two'},{type:'photo',alt:'Three'}],one=blocks[0];
  moveItem(blocks,0,2);assert.equal(blocks[2],one);moveItem(blocks,2,3);assert.equal(blocks[2],one);
});
test('new content uses the shared file schema without hidden article-specific content',()=>{
  const components={text:{type:'rich-text'},protected:{type:'block',hidden:true}};
  const block=newBlock({name:'audio',fields:[{name:'title',type:'string'},{name:'source',type:'block'},{name:'body',component:'text'},{name:'protected',component:'protected'}]},components);
  assert.deepEqual(block,{type:'audio',title:'',source:null,body:''});
  assert.equal(fieldSpec({name:'body',component:'text'},components).type,'rich-text');
});
