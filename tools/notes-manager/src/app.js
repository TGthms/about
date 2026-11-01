import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {TableKit} from '@tiptap/extension-table';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {EditorView, basicSetup} from 'codemirror';
import {javascript} from '@codemirror/lang-javascript';
import {json} from '@codemirror/lang-json';
import {python} from '@codemirror/lang-python';
import {html as htmlLanguage} from '@codemirror/lang-html';
import {css} from '@codemirror/lang-css';
import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {copy,getAt,setAt,moveItem,fieldSpec,emptyValue,newBlock,needsSource} from './model.js';

const $ = selector => document.querySelector(selector);
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (key in node && !key.startsWith('aria-')) node[key] = value;
    else node.setAttribute(key,value);
  }
  node.append(...children); return node;
};
const button = (text, fn, cls = '') => el('button',{type:'button',text,class:cls,onclick:fn});
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
const languages = {en:'English',zh:'简体中文','zh-Hant':'繁體中文',ja:'日本語',ko:'한국어',es:'Español'};
const blockHelp = {
  text:'Continue your writing after another block.',photo:'One photograph, with a description and optional caption.',
  gallery:'A group of 2–12 photographs, displayed together.',video:'A short upload or a hosted video. Playback starts on request.',
  audio:'A recording with playback controls and an optional transcript.',table:'Column headings and rows of information.',
  aside:'A highlighted observation or clarification.',details:'Optional text readers can expand by selecting a heading.',
  link:'A destination with a title, description, and optional photograph.',download:'A file your readers can save.',
  quote:'Quoted words with their author, source, or verse reference.',code:'Code shown as text, with a Copy button. It is never executed.',
  comparison:'Two images with a before-and-after slider, and a simple fallback.'
};
const state = {schema:null,items:[],opened:null,doc:null,version:-1,editors:[],epoch:0,saved:0,savePromise:null,
  previewEpoch:0,previewRunning:false,previewWanted:false,blocked:false,recovery:null,theme:'light',previewTheme:'light',drag:null};
let saveTimer, recoveryTimer, previewTimer, toastTimer, runTimer;
const modalStack=[];
state.previewScroll=new Map();
state.client=crypto.randomUUID();try{state.client=sessionStorage.getItem('notes:client')||state.client;sessionStorage.setItem('notes:client',state.client);}catch{}
const store={
  get(key){try{return localStorage.getItem(key);}catch{return null;}},
  set(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}},
  remove(key){try{localStorage.removeItem(key);}catch{}},
  keys(){try{return Array.from({length:localStorage.length},(_,i)=>localStorage.key(i));}catch{return [];}}
};

async function api(path, data, raw) {
  const response = await fetch(path, data === undefined ? {} : {method:'POST',headers:{'X-Notes-Manager':'1',...(raw?{}:{'Content-Type':'application/json'})},body:raw?data:JSON.stringify(data)});
  let value; try {value=await response.json();} catch {throw new Error('The local manager did not respond. Your recovered writing remains in this browser.');}
  if(!response.ok){const error=new Error(value.error||'The operation could not finish.');Object.assign(error,value,{code:response.status});throw error;} return value;
}
function toast(message, action) {
  clearTimeout(toastTimer); const node=$('#toast');node.replaceChildren(document.createTextNode(message));
  if(action)node.append(button('Undo',()=>{action();node.hidden=true;}));node.hidden=false;
  toastTimer=setTimeout(()=>node.hidden=true,action?12000:5000);
}
function notice(message, action) {
  const node=$('#notice');node.replaceChildren(document.createTextNode(message));node.hidden=false;
  if(action)node.append(button(action.label,action.run));
}
function errorNotice(error) {notice(error.message);if(error.errors)showChecks(error.errors,error.warnings||[]);}
function modal(title, children, wide=false, nested=false) {
  const dialog=$('#modal');
  if(nested&&dialog.open)modalStack.push({title:$('#modal-title').textContent,children:[...$('#modal-body').childNodes],width:dialog.style.maxWidth,focus:document.activeElement});
  $('#modal-title').textContent=title;$('#modal-body').replaceChildren(...children);
  dialog.style.maxWidth=wide?'1050px':'700px'; if(!dialog.open)dialog.showModal();return dialog;
}
function closeModal(){
  const previous=modalStack.pop();
  if(previous){$('#modal-title').textContent=previous.title;$('#modal-body').replaceChildren(...previous.children);$('#modal').style.maxWidth=previous.width;previous.focus?.focus();}
  else $('#modal').close();
}
function closeAllModals(){modalStack.length=0;$('#modal').close();}
$('#modal-close').onclick=closeModal;
$('#modal').addEventListener('cancel',event=>{if(modalStack.length){event.preventDefault();closeModal();}});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
function confirmDialog(title, text, label, action) {
  const error=el('p',{role:'alert'}),proceed=button(label,async()=>{
    proceed.disabled=true;
    try{await action();closeModal();}catch(e){error.textContent=e.message;proceed.disabled=false;}
  },'primary');
  modal(title,[el('p',{text}),error,el('div',{class:'dialog-actions'},[button('Cancel',closeModal,'quiet'),proceed])],false,true);
}
function storagePrefix(){return 'notes-local:'+state.repository+':'+state.opened.path+':';}
function storageKey(){return storagePrefix()+state.client;}
function versionPath(){return state.version<0?[]:['translations',state.version];}
function currentVersion(){return state.version<0?state.doc:state.doc.translations[state.version];}
function update(path,value){setAt(state.doc,path,value);if(path.length===1&&path[0]==='font')$('.writing-pane').dataset.font=value;changed();}
function remember(){
  if(!state.doc)return;
  const record={document:state.doc,etag:state.opened.etag,updated:new Date().toISOString(),client:state.client};
  if(!store.set(storageKey(),JSON.stringify(record)))notice('Browser recovery storage is unavailable. Local disk recovery and saving remain active.');
  clearTimeout(recoveryTimer);
  const path=state.opened.path,document=copy(state.doc),etag=state.opened.etag;
  recoveryTimer=setTimeout(()=>api('/api/recovery',{path,document,etag,client:state.client}).catch(()=>{}),250);
}
function changed(){
  state.epoch++;remember();$('#save-status').textContent='Saving on this Mac…';
  clearTimeout(saveTimer);if(!state.blocked)saveTimer=setTimeout(()=>save().catch(errorNotice),1400);
  requestPreview();wordCount();
}
async function save(){
  clearTimeout(saveTimer);
  if(!state.doc||state.blocked)return false;
  if(state.savePromise){await state.savePromise;if(state.saved!==state.epoch)return save();return true;}
  if(state.saved===state.epoch)return true;
  const epoch=state.epoch,path=state.opened.path,value=copy(state.doc),etag=state.opened.etag;
  state.savePromise=(async()=>{
    try{
      const result=await api('/api/save',{path,document:value,etag});
      state.opened.etag=result.etag;state.opened.status=result.status;state.saved=epoch;
      $('#release-state').textContent=result.status;
      if(state.epoch===epoch){$('#save-status').textContent='Saved on this Mac';store.remove(storageKey());}
      refreshLibrary().catch(()=>{});return true;
    }catch(error){
      if(error.conflict){state.blocked=true;showFileConflict(error.conflict);}
      $('#save-status').textContent='Writing kept in recovery · save needs attention';throw error;
    }finally{state.savePromise=null;}
  })();
  return state.savePromise;
}
function showFileConflict(conflict){
  const fields=el('div',{class:'comparison-fields'},[
    el('section',{},[el('h3',{text:'Your current writing'}),versionPanel(conflict.local)]),
    el('section',{},[el('h3',{text:'Saved file on this Mac'}),versionPanel(conflict.online)])]);
  modal('Another version was saved',[el('p',{text:'Your writing is preserved. Keep it as a new private draft, or review the saved version. Nothing will be published.'}),fields,
    el('div',{class:'dialog-actions'},[
      button('Review saved version',async()=>{state.blocked=false;closeModal();await openNote(conflict.path,true);}),
      button('Keep my writing as a new draft',async()=>{try{const created=await api('/api/create',{document:conflict.local});state.blocked=false;closeModal();await openNote(created.path,true);toast('A separate private draft was created.');}catch(e){errorNotice(e);}},'primary')])],true);
}
async function refreshLibrary(){state.items=await api('/api/notes');renderLibrary();}
function renderLibrary(){
  const query=$('#search').value.toLocaleLowerCase(),filter=$('#filter').value;
  const items=state.items.filter(item=>(!filter||item.status===filter)&&[item.title,item.search||'',...(item.categories||[])].join(' ').toLocaleLowerCase().includes(query));
  $('#note-list').replaceChildren(...items.map(item=>{
    const node=button('',()=>openNote(item.path).catch(errorNotice),'note-item');node.setAttribute('aria-current',String(item.path===state.opened?.path));
    node.append(el('strong',{text:item.title}),el('small',{text:item.date+' · '+item.status}));return node;
  }));
  if(!items.length)$('#note-list').append(el('p',{text:'No matching notes.',class:'help'}));
}
async function openNote(path, force=false){
  if(state.opening)return;
  state.opening=true;$('#workspace').inert=true;
  try{
  if(!force&&state.doc&&!(await save())){toast('Choose how to handle recovered writing first.');return;}
  clearTimeout(saveTimer);clearTimeout(recoveryTimer);clearTimeout(previewTimer);
  const opened=await api('/api/note?path='+encodeURIComponent(path));
  closeAllModals();
  destroyEditors();state.opened=opened;state.doc=copy(opened.document);state.version=-1;state.epoch=0;state.saved=0;state.blocked=false;
  state.previewEpoch++;state.previewWanted=false;
  state.previewFrameId=null;$('#preview').removeAttribute('src');$('#preview-placeholder').hidden=false;
  $('#empty').hidden=true;$('#workspace').hidden=false;$('#notice').hidden=true;
  for(const id of ['save','settings','publish','history'])$('#'+id).disabled=false;
  const browser=[];try{for(const key of store.keys())if(key.startsWith(storagePrefix()))browser.push(JSON.parse(store.get(key)));}catch{}
  const recovery=[opened.recovery,...browser].filter(Boolean).sort((a,b)=>String(b.updated).localeCompare(String(a.updated)))[0];
  state.recovery=recovery&&JSON.stringify(recovery.document)!==JSON.stringify(state.doc)?recovery:null;
  state.blocked=Boolean(state.recovery);$('#recovery').hidden=!state.recovery;
  $('#save-status').textContent=state.recovery?'Choose a recovered or saved version':'Saved on this Mac';
  $('#release-state').textContent=opened.status;renderDocument();renderLibrary();requestPreview(true);
  store.set('notes:last:'+state.repository,path);
  $('.library').classList.remove('is-open');
  libraryAccessibility();
  }finally{state.opening=false;$('#workspace').inert=false;}
}
$('#restore-recovery').onclick=()=>{state.doc=copy(state.recovery.document);state.doc.slug=state.opened.document.slug;state.recovery=null;state.blocked=false;$('#recovery').hidden=true;renderDocument();changed();};
$('#discard-recovery').onclick=async()=>{try{const client=state.recovery?.client||'legacy';await api('/api/recovery',{path:state.opened.path,discard:true,client});store.remove(storagePrefix()+client);state.recovery=null;state.blocked=false;$('#recovery').hidden=true;$('#save-status').textContent='Saved on this Mac';}catch(e){errorNotice(e);}};
function createNote(){
  const input=el('input',{placeholder:'Title (you can leave this empty)',maxLength:160,'aria-label':'Title'});
  const today=new Date(),date=el('input',{type:'date',value:[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-'),'aria-label':'Date'});
  const submit=button('Start writing',async()=>{try{if(state.doc&&!(await save()))return;const created=await api('/api/create',{title:input.value,date:date.value});closeModal();await refreshLibrary();await openNote(created.path,true);}catch(e){errorNotice(e);}},'primary');
  modal('A new note',[el('p',{text:'Start privately. You can add photographs, recordings, and other content as you write.'}),input,el('p'),date,el('div',{class:'dialog-actions'},[submit])]);input.focus();
}

function destroyEditors(){for(const editor of state.editors)editor.destroy();state.editors=[];}
function codeField(path,label){
  const host=el('div',{class:'code-editor'}),language=String(getAt(state.doc,[...path.slice(0,-1),'language'])||'javascript').toLowerCase();
  const syntax=/^(javascript|js|typescript|ts|jsx|tsx)$/.test(language)?javascript({typescript:/^(ts|typescript|tsx)$/.test(language),jsx:/jsx|tsx/.test(language)}):
    language==='json'?json():/^(python|py)$/.test(language)?python():language==='html'?htmlLanguage():language==='css'?css():[];
  const colors=HighlightStyle.define([{tag:tags.keyword,color:'var(--code-keyword)'},{tag:[tags.string,tags.regexp],color:'var(--code-string)'},
    {tag:[tags.number,tags.bool],color:'var(--code-number)'},{tag:tags.comment,color:'var(--muted)',fontStyle:'italic'}]);
  const view=new EditorView({doc:getAt(state.doc,path)||'',parent:host,extensions:[basicSetup,syntax,syntaxHighlighting(colors),EditorView.lineWrapping,
    EditorView.contentAttributes.of({'aria-label':label,spellcheck:'false'}),
    EditorView.theme({'&':{backgroundColor:'var(--paper)',color:'var(--text)',fontSize:'12px'},'.cm-content':{fontFamily:'ui-monospace,monospace',minHeight:'170px',caretColor:'var(--text)'},
      '.cm-scroller':{overflow:'auto',maxHeight:'460px'},'.cm-gutters':{backgroundColor:'var(--bg)',color:'var(--muted)',borderColor:'var(--line)'},
      '&.cm-focused':{outline:'2px solid var(--accent)'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'var(--accent-soft)'},
      '.cm-cursor':{borderLeftColor:'var(--text)'},'.cm-selectionBackground':{backgroundColor:'var(--accent-soft)!important'},'.cm-panels':{backgroundColor:'var(--bg)',color:'var(--text)'}}),
    EditorView.updateListener.of(event=>{if(event.docChanged)update(path,event.state.doc.toString());})]});
  state.editors.push(view);return host;
}
function richField(path, main=false){
  const wrapper=el('div',{class:'rich'+(main?' main-text':'')}),toolbar=el('div',{class:'rich-toolbar',role:'toolbar','aria-label':'Text formatting'}),host=el('div');
  const original=getAt(state.doc,path)||'';let source=needsSource(original,document),editor,textarea;
  const sourceButton=button('HTML',()=>{source=!source;renderMode();},'');sourceButton.title='Edit HTML source';
  function write(value){update(path,value);}
  function renderMode(){
    if(editor){editor.destroy();state.editors=state.editors.filter(e=>e!==editor);editor=null;}
    host.replaceChildren();toolbar.replaceChildren();
    if(source){
      toolbar.append(el('span',{class:'help',text:'HTML source · rendered safely in the preview'}),sourceButton);
      textarea=el('textarea',{class:'source-editor',spellcheck:false,value:getAt(state.doc,path)||'','aria-label':'HTML source',oninput:event=>write(event.target.value)});
      host.append(textarea);sourceButton.textContent='Writing view';
      if(needsSource(getAt(state.doc,path)||'',document))host.prepend(el('div',{class:'source-warning',text:'This text contains formatting the visual editor does not cover. Source mode preserves it. Use a separate Text block for new visual writing.'}));
      return;
    }
    // Refuse a lossy conversion; users may always continue with a separate Text block.
    if(needsSource(getAt(state.doc,path)||'',document)){source=true;renderMode();return;}
    sourceButton.textContent='HTML';const editHost=el('div');host.append(editHost);
    editor=new Editor({element:editHost,extensions:[StarterKit.configure({heading:{levels:[2,3,4]},link:{openOnClick:false,autolink:true}}),
      Image.configure({inline:true,allowBase64:false}),TableKit.configure({table:{resizable:false}}),Subscript,Superscript],
      content:getAt(state.doc,path)||'',editorProps:{attributes:{'aria-label':main?'Main text':'Text','spellcheck':'true'},
        handleKeyDown(view,event){
          if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&view.state.selection.$from.parent.textContent===''){
            event.preventDefault();blockMenu();return true;
          }return false;
        },handlePaste(_view,event){if(event.clipboardData?.files.length){event.preventDefault();uploadInline(event.clipboardData.files[0],editor);return true;}return false;}},
      onUpdate:({editor})=>write(editor.getHTML()),onSelectionUpdate:()=>refreshButtons()});
    state.editors.push(editor);
    const tools=[['B','Bold',()=>editor.chain().focus().toggleBold().run(),'bold'],['I','Italic',()=>editor.chain().focus().toggleItalic().run(),'italic'],
      ['U','Underline',()=>editor.chain().focus().toggleUnderline().run(),'underline'],['H2','Section heading',()=>editor.chain().focus().toggleHeading({level:2}).run(),'heading'],
      ['H3','Subheading',()=>editor.chain().focus().toggleHeading({level:3}).run()],['•','Bullet list',()=>editor.chain().focus().toggleBulletList().run(),'bulletList'],
      ['1.','Numbered list',()=>editor.chain().focus().toggleOrderedList().run(),'orderedList'],['“”','Quote',()=>editor.chain().focus().toggleBlockquote().run(),'blockquote'],
      ['↗','Link',()=>editLink(editor)],['⌘','Inline code',()=>editor.chain().focus().toggleCode().run(),'code'],
      ['↶','Undo',()=>editor.chain().focus().undo().run()],['↷','Redo',()=>editor.chain().focus().redo().run()]];
    for(const [text,label,fn,active]of tools){const node=button(text,fn);node.title=label;node.setAttribute('aria-label',label);if(active)node.dataset.active=active;
      node.addEventListener('mousedown',event=>event.preventDefault());toolbar.append(node);}
    toolbar.append(sourceButton);refreshButtons();
  }
  function refreshButtons(){if(editor)for(const b of toolbar.querySelectorAll('[data-active]'))b.setAttribute('aria-pressed',String(editor.isActive(b.dataset.active)));}
  wrapper.append(toolbar,host);renderMode();return wrapper;
}
function editLink(editor){
  const input=el('input',{type:'url',value:editor.getAttributes('link').href||'',placeholder:'https://… or /notes.html','aria-label':'Link address'});
  modal('Add a link',[input,el('div',{class:'dialog-actions'},[
    button('Remove link',()=>{editor.chain().focus().unsetLink().run();closeModal();}),
    button('Apply',()=>{if(!/^(https:\/\/|mailto:|\/(?!\/))/.test(input.value)){input.setCustomValidity('Use HTTPS, email, or a path on this site.');input.reportValidity();return;}
      editor.chain().focus().extendMarkRange('link').setLink({href:input.value}).run();closeModal();},'primary')])]);input.focus();
}
async function uploadInline(file,editor){
  try{
    const result=await uploadFile(file,'photographs');
    const input=el('input',{placeholder:'Describe this photograph','aria-label':'Image description'});
    modal('Describe the photograph',[el('p',{text:'This description makes the image available to readers who cannot see it.'}),input,
      el('div',{class:'dialog-actions'},[button('Insert photograph',()=>{if(!input.value.trim()){input.focus();return;}editor.chain().focus().setImage({src:result.path,alt:input.value}).run();closeModal();},'primary')])]);
  }catch(e){errorNotice(e);}
}
function renderDocument(){
  state.titleObserver?.disconnect();
  destroyEditors();const parent=$('#document'),path=versionPath(),version=currentVersion();parent.replaceChildren();
  const title=el('textarea',{class:'document-title',placeholder:'Untitled',value:version.title||'',rows:1,'aria-label':'Article title',maxLength:160,
    oninput:event=>{event.target.style.height='auto';event.target.style.height=event.target.scrollHeight+'px';update([...path,'title'],event.target.value);}});
  parent.append(title,richField([...path,'body'],true));
  let titleWidth=0;state.titleObserver=new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==titleWidth){titleWidth=width;title.style.height='auto';title.style.height=title.scrollHeight+'px';}});state.titleObserver.observe(title);
  $('.writing-pane').dataset.font=state.doc.font||'default';
  if(version.same_study)parent.append(el('p',{class:'help',text:'The article’s existing SAME experiment is preserved. It appears in the preview and cannot be removed accidentally here.'}));
  const blocks=version.blocks||=[];
  blocks.forEach((block,index)=>{
    const spec=state.schema.components.blocks.blocks.find(b=>b.name===block.type),blockPath=[...path,'blocks',index];
    const card=el('section',{class:'block','aria-label':(spec?.label||block.type)+' block'}),head=el('div',{class:'block-head'});
    const handle=el('span',{text:'⠿',class:'drag-handle',draggable:true,title:'Drag to reorder','aria-hidden':'true'});
    handle.addEventListener('dragstart',event=>{state.drag=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index));});
    handle.addEventListener('dragend',()=>{state.drag=null;document.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));});
    card.addEventListener('dragover',event=>{if(state.drag!==null){event.preventDefault();card.classList.add('drag-over');}});
    card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
    card.addEventListener('drop',event=>{if(state.drag!==null){event.preventDefault();moveItem(blocks,state.drag,index);state.drag=null;renderDocument();changed();}});
    const up=button('↑',()=>reorder(index,-1),'quiet');up.title='Move block up';up.disabled=index===0;
    const down=button('↓',()=>reorder(index,1),'quiet');down.title='Move block down';down.disabled=index===blocks.length-1;
    const duplicate=button('⧉',()=>{blocks.splice(index+1,0,copy(block));renderDocument();changed();},'quiet');duplicate.title='Duplicate block';
    const remove=button('✕',()=>{const previous=copy(blocks);blocks.splice(index,1);renderDocument();changed();toast('Block removed.',()=>{currentVersion().blocks=previous;renderDocument();changed();});},'quiet');remove.title='Remove block';
    head.append(handle,el('strong',{text:spec?.label?.split(' — ')[0]||block.type}),up,down,duplicate,remove);
    const content=el('div',{class:'block-content'});if(blockHelp[block.type])content.append(el('p',{class:'help',text:blockHelp[block.type]}));
    const collapse=button('⌃',()=>{content.hidden=!content.hidden;collapse.textContent=content.hidden?'⌄':'⌃';collapse.setAttribute('aria-expanded',String(!content.hidden));},'quiet');
    collapse.title='Collapse or expand block';collapse.setAttribute('aria-expanded','true');head.insertBefore(collapse,up);
    if(block.type==='table')content.append(tableEditor(blockPath));
    else if(spec)for(const field of spec.fields||[])renderField(content,field,blockPath);
    else content.append(el('p',{class:'help',text:'This existing content is preserved unchanged. Its result appears in the preview.'}));
    card.append(head,content);parent.append(card);
  });
  const choices=[el('option',{value:'-1',text:languages[state.doc.language]+' · original'})];
  (state.doc.translations||[]).forEach((v,i)=>choices.push(el('option',{value:String(i),text:(languages[v.language]||v.language)+(v.published?'':' · draft')})));
  $('#language-version').replaceChildren(...choices);$('#language-version').value=String(state.version);wordCount();
}
function reorder(index,delta){moveItem(currentVersion().blocks,index,index+delta);renderDocument();changed();}
function wordCount(){
  if(!state.doc)return;const version=currentVersion(),text=[version.body,...(version.blocks||[]).map(b=>b.body||b.text||'')].join(' ');
  const template=document.createElement('template');template.innerHTML=text;
  const plain=template.content.textContent||'',count=(plain.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]|[\p{L}\p{N}]+/gu)||[]).length;
  $('#word-count').textContent=count.toLocaleString()+' words / characters';
}
function versionPanel(value){
  const root=el('div',{class:'version-panel'});
  const plain=markup=>{const template=document.createElement('template');template.innerHTML=markup||'';return [...template.content.childNodes].map(n=>n.textContent).join('\n\n');};
  const versions=[value,...(value.translations||[])];
  for(const version of versions){
    root.append(el('small',{text:languages[version.language]||version.language||''}),el('h3',{text:version.title||'Untitled'}));
    if(version.summary)root.append(el('p',{text:version.summary}));
    root.append(el('p',{text:plain(version.body),class:'version-prose'}));
    for(const block of version.blocks||[]){
      const description=block.type==='table'?[(block.columns||[]).join(' | '),...(block.rows||[]).map(r=>(r.cells||[]).join(' | '))].join('\n'):
        block.type==='gallery'?(block.images||[]).map(i=>[i.alt,i.caption,i.image].filter(Boolean).join(' · ')).join('\n'):
        [block.title,block.caption,block.text,plain(block.body),block.author,block.source?.url||block.source?.file||(typeof block.source==='string'?block.source:''),block.file,block.url,block.image?.image||(typeof block.image==='string'?block.image:''),block.alt,block.code].filter(Boolean).join('\n');
      root.append(el('small',{text:state.schema.components.blocks.blocks.find(s=>s.name===block.type)?.label?.split(' — ')[0]||block.type}),el('pre',{text:description||JSON.stringify(block,null,2)}));
    }
  }
  root.append(el('details',{},[el('summary',{text:'Full saved data'}),el('textarea',{readOnly:true,value:JSON.stringify(value,null,2),'aria-label':'Full saved data'})]));
  return root;
}

function renderField(parent,raw,base,override){
  const field=fieldSpec(raw,state.schema.components);if(field.hidden)return;
  const path=override||[...base,field.name],value=getAt(state.doc,path);
  const wrapper=el('div',{class:'field'}),label=el('label',{class:'field-label',text:field.label||field.name});
  if(field.required)label.append(el('span',{class:'required',text:'Required'}));
  wrapper.append(label);
  if(field.description)wrapper.append(el('p',{class:'help',text:field.description}));
  const control=el('div');wrapper.append(control);parent.append(wrapper);
  if(field.readonly){control.append(el('code',{text:String(value||'Automatic')}));return;}
  if(field.list){
    const list=Array.isArray(value)?value:[];
    const draw=()=>{control.replaceChildren();list.forEach((_item,index)=>{
      const card=el('div',{class:'list-item'}),actions=el('div',{class:'list-item-top'});
      for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,()=>{moveItem(list,index,index+delta);update(path,list);draw();},'quiet');b.disabled=index+delta<0||index+delta>=list.length;actions.append(b);}
      actions.append(button('Remove',()=>{const removed=list.splice(index,1)[0];update(path,list);draw();toast('Item removed.',()=>{list.splice(index,0,removed);update(path,list);draw();});},'quiet'));card.append(actions);
      renderField(card,{...field,name:String(index),label:(field.type==='object'?'Item ':'')+(index+1),list:false,description:''},[],[...path,index]);control.append(card);
    });const add=button('＋ Add '+(field.label||'item').replace(/\s*\(optional\)/,''),()=>{list.push(emptyValue({...field,list:false},state.schema.components));update(path,list);draw();},'list-add');
    add.disabled=Boolean(field.list.max&&list.length>=field.list.max);control.append(add);};draw();return;
  }
  if(field.type==='object'){
    if(!value)setAt(state.doc,path,{});control.className='object-group';for(const child of field.fields||[])renderField(control,child,path);return;
  }
  if(field.type==='block'){
    const specs=field.blocks||[],draw=()=>{control.replaceChildren();const current=getAt(state.doc,path);
      if(!current){const select=el('select',{'aria-label':field.label||field.name},[el('option',{value:'',text:'Choose…'}),...specs.map(s=>el('option',{value:s.name,text:s.label||s.name}))]);
        select.onchange=()=>{if(select.value){update(path,newBlock(specs.find(s=>s.name===select.value),state.schema.components));draw();}};control.append(select);return;}
      const spec=specs.find(s=>s.name===current.type);if(!spec){control.append(el('p',{text:'Existing content is preserved.'}));return;}
      control.append(el('p',{class:'help',text:spec.label||spec.name}));for(const child of spec.fields||[])renderField(control,child,path);
      control.append(button('Remove '+(field.label||'selection').toLowerCase(),()=>{update(path,null);draw();},'quiet'));
    };draw();return;
  }
  if(field.type==='rich-text'){control.append(richField(path));return;}
  if(field.type==='image'||field.type==='file'){
    const draw=()=>{control.replaceChildren();const selected=getAt(state.doc,path);
      if(selected&&field.type==='image')control.append(el('img',{src:selected,alt:'Selected upload',class:'file-thumb',loading:'lazy'}));
      const row=el('div',{class:'file-choice'});
      row.append(button(selected?'Replace…':'Choose or upload…',()=>mediaPicker(field.options?.media||'photographs',result=>{update(path,result.path);draw();})));
      if(selected)row.append(button('Clear',()=>{update(path,'');draw();},'quiet'),el('code',{text:selected.split('/').at(-1)}));control.append(row);
    };draw();return;
  }
  if(field.type==='boolean'){
    wrapper.classList.add('toggle');const input=el('input',{type:'checkbox',checked:value===true,'aria-label':field.label||field.name,onchange:e=>{update(path,e.target.checked);if(['birthday','highlight'].includes(field.name))settings();}});
    const text=el('div');text.append(label);if(field.description)text.append(wrapper.querySelector('.help'));wrapper.replaceChildren(input,text);return;
  }
  let input;
  if(field.type==='select'){
    input=el('select',{'aria-label':field.label||field.name},(field.options?.values||[]).map(option=>typeof option==='string'?el('option',{value:option,text:option}):el('option',{value:option.name,text:option.label||option.name})));
    input.value=value??field.default??'';input.onchange=event=>{update(path,event.target.value);};
  }else if(field.type==='code'){
    control.append(codeField(path,field.label||field.name));return;
  }else if(field.type==='text'){
    input=el('textarea',{value:value||'','aria-label':field.label||field.name,class:field.type==='code'?'code-input':'',spellcheck:field.type!=='code',oninput:event=>update(path,event.target.value)});
    if(field.type==='code')input.onkeydown=event=>{if(event.key==='Tab'){event.preventDefault();const start=input.selectionStart,end=input.selectionEnd;input.setRangeText('  ',start,end,'end');update(path,input.value);}};
  }else{
    input=el('input',{type:field.type==='date'?'date':field.type==='number'?'number':'text',value:value??'',maxLength:field.options?.maxlength||524288,'aria-label':field.label||field.name,
      oninput:event=>update(path,field.type==='number'?Number(event.target.value):event.target.value)});
    if(field.name==='language'&&getAt(state.doc,path.slice(0,-1))?.type==='code')input.onchange=()=>renderDocument();
  }
  label.htmlFor=input.id='field-'+crypto.randomUUID();input.required=Boolean(field.required);control.append(input);
}
function tableEditor(path){
  const block=getAt(state.doc,path),host=el('div');block.columns||=[];block.rows||=[];
  const draw=()=>{host.replaceChildren();const caption=el('input',{value:block.caption||'',placeholder:'Table title (required)','aria-label':'Table title',oninput:e=>update([...path,'caption'],e.target.value)});host.append(caption);
    const table=el('table',{class:'table-editor'}),head=el('tr');
    block.columns.forEach((column,index)=>head.append(el('th',{},[el('input',{value:column,'aria-label':'Column '+(index+1),oninput:e=>update([...path,'columns',index],e.target.value)}),button('×',()=>{block.columns.splice(index,1);block.rows.forEach(row=>row.cells.splice(index,1));changed();draw();})])));
    head.append(el('th',{text:''}));table.append(el('thead',{},[head]));const body=el('tbody');
    block.rows.forEach((row,i)=>{const tr=el('tr');block.columns.forEach((_col,j)=>tr.append(el('td',{},[el('input',{value:row.cells?.[j]||'','aria-label':'Row '+(i+1)+', column '+(j+1),oninput:e=>update([...path,'rows',i,'cells',j],e.target.value)})])));
      tr.append(el('td',{},[button('×',()=>{block.rows.splice(i,1);changed();draw();})]));body.append(tr);});table.append(body);host.append(el('div',{class:'table-scroll'},[table]));
    const addColumn=button('＋ Column',()=>{block.columns.push('');block.rows.forEach(row=>(row.cells||=[]).push(''));changed();draw();});addColumn.disabled=block.columns.length>=8;
    host.append(el('div',{class:'table-actions'},[addColumn,button('＋ Row',()=>{block.rows.push({cells:block.columns.map(()=> '')});changed();draw();})]));};draw();return host;
}
function blockMenu(){
  if(!state.doc)return;const search=el('input',{type:'search',placeholder:'Find a content format…','aria-label':'Find a content format'}),grid=el('div',{class:'block-menu'});
  const draw=()=>{grid.replaceChildren(...state.schema.components.blocks.blocks.filter(spec=>(spec.label+' '+blockHelp[spec.name]).toLowerCase().includes(search.value.toLowerCase())).map(spec=>{
    const b=button('',()=>{const block=newBlock(spec,state.schema.components);if(spec.name==='table'){block.columns=['',''];block.rows=[{cells:['','']}];}
      (currentVersion().blocks||=[]).push(block);closeModal();renderDocument();changed();requestAnimationFrame(()=>$('#document .block:last-child')?.scrollIntoView({behavior:'smooth',block:'center'}));});
    b.append(el('strong',{text:spec.label.split(' — ')[0]}),el('small',{text:blockHelp[spec.name]||''}));return b;}));};
  search.oninput=draw;modal('Add content',[search,grid]);draw();search.focus();
}
function settings(){
  if(!state.doc)return;const root=el('div');
  const groups=[['This note',['date','language','summary','categories','font']],['Images',['sharing_image','list_image']],['Homepage',['highlight','highlight_until']],['Birthday',['birthday','birthday_visibility']]];
  for(const [title,names]of groups){const section=el('section',{class:'settings-section'},[el('h3',{text:title})]);for(const name of names){
    if(name==='highlight_until'&&!state.doc.highlight||name==='birthday_visibility'&&!state.doc.birthday)continue;
    const spec=state.schema.fields.find(f=>f.name===name);renderField(section,spec,[]);
  }root.append(section);}
  if(state.version>=0){const section=el('section',{class:'settings-section'},[el('h3',{text:'This translation'})]);
    renderField(section,{name:'published',label:'Include this language when publishing',type:'boolean',description:'This only takes effect when you explicitly publish the note.'},versionPath());
    renderField(section,{name:'summary',label:'Short introduction',type:'text'},versionPath());root.prepend(section);}
  const section=el('section',{class:'settings-section'},[el('h3',{text:'Article address'}),el('code',{text:'timgong.me/notes/'+state.doc.slug+'.html'}),el('p',{class:'help',text:'The address stays fixed when you edit the title.'})]);root.append(section);
  section.append(button('Make a private duplicate',()=>confirmDialog('Duplicate this note?','The new copy will be a draft with its own address. The current article stays unchanged.','Create draft copy',async()=>{
    const created=await api('/api/create',{document:state.doc});await openNote(created.path,true);
  })));
  if(state.opened.status!=='Draft'&&state.opened.status!=='Withdrawn')section.append(button('Withdraw from website…',()=>publicationDialog(true),'quiet'));
  modal('Note settings',[root]);
}
function addLanguage(){
  const existing=new Set([state.doc.language,...(state.doc.translations||[]).map(t=>t.language)]),select=el('select',{'aria-label':'Translation language'},Object.entries(languages).filter(([code])=>!existing.has(code)).map(([code,label])=>el('option',{value:code,text:label})));
  if(!select.options.length){toast('All six language versions already exist.');return;}
  modal('Add a language version',[el('p',{text:'Translations are optional. A new version starts privately and is included in publication only when you enable it.'}),select,
    el('div',{class:'dialog-actions'},[button('Add version',()=>{(state.doc.translations||=[]).push({language:select.value,title:'',summary:'',body:'',blocks:[],published:false});state.version=state.doc.translations.length-1;closeModal();renderDocument();changed();},'primary')])]);
}

async function uploadFile(file,kind){return api('/api/upload?kind='+encodeURIComponent(kind)+'&name='+encodeURIComponent(file.name),file,true);}
async function mediaPicker(kind,choose){
  const error=el('p',{role:'alert'}),input=el('input',{type:'file','aria-label':'Upload a file'}),upload=el('label',{class:'upload-zone',text:'Upload a file · up to 20 MB'},[input]),search=el('input',{type:'search',placeholder:'Find an upload…','aria-label':'Search uploads'}),grid=el('div',{class:'media-grid'});
  input.accept={photographs:'.jpg,.jpeg,.png,.webp',videos:'.mp4,.webm',audio:'.mp3,.m4a,.ogg,.wav',downloads:'.pdf,.zip,.txt,.csv,.json'}[kind];
  const select=result=>{if(choose){closeModal();choose(result);}else mediaDetails(result,kind);};
  input.onchange=async()=>{if(!input.files[0])return;input.disabled=true;error.textContent='Uploading to your private local library…';try{const result=await uploadFile(input.files[0],kind);select(result);if(!choose){input.disabled=false;error.textContent='Uploaded privately.';}}catch(e){error.textContent=e.message;input.disabled=false;}};
  modal((choose?'Choose ':'Browse ')+({photographs:'photographs',videos:'videos',audio:'audio',downloads:'downloads'}[kind]||'files'),[upload,error,el('p'),search,grid],false,true);
  try{const items=await api('/api/media?kind='+kind);const draw=()=>grid.replaceChildren(...items.filter(i=>i.name.toLowerCase().includes(search.value.toLowerCase())).map(item=>{
    const b=button('',()=>select(item));if(kind==='photographs')b.append(el('img',{src:item.path,alt:'',loading:'lazy'}));
    b.append(el('small',{text:item.name}),el('small',{text:(item.size/1024/1024).toFixed(2)+' MB'}));return b;}));search.oninput=draw;draw();}catch(e){error.textContent=e.message;}
}
function mediaDetails(item,kind){
  const content=[el('p',{text:item.name||item.path.split('/').at(-1)})];
  if(kind==='photographs')content.push(el('img',{src:item.path,alt:'Private library photograph',class:'media-detail-image'}));
  if(kind==='audio'||kind==='videos')content.push(el(kind==='audio'?'audio':'video',{src:item.path,controls:true,preload:'none',class:'media-detail-image'}));
  content.push(el('p',{class:'help',text:'Original uploads stay private. Their optimized public versions are created only when a referenced note is published.'}),el('code',{text:item.path}));
  const a=el('a',{href:item.path,target:'_blank',rel:'noopener noreferrer',text:'Open original ↗'});content.push(el('p',{},[a]));
  modal('Private upload',content,false,true);
}
function mediaLibrary(){
  modal('Media library',[el('p',{text:'Browse or upload private files. Add them to a note using its image, audio, video, or download controls.'}),
    el('div',{class:'block-menu'},Object.entries({photographs:'Photographs',videos:'Videos',audio:'Audio recordings',downloads:'Downloads'}).map(([kind,label])=>button(label,()=>mediaPicker(kind,null))))]);
}

function requestPreview(immediate=false){
  clearTimeout(previewTimer);state.previewWanted=true;state.previewEpoch++;
  previewTimer=setTimeout(refreshPreview,immediate?0:800);
}
async function job(operation,data={}){
  const created=await api('/api/jobs',{operation,...data});
  for(;;){await sleep(operation==='preview'?180:500);const result=await api('/api/jobs/'+created.job);if(result.status==='done')return result.result;if(result.status==='error'){const error=new Error(result.error);Object.assign(error,result);throw error;}}
}
async function refreshPreview(){
  if(!state.doc||state.previewRunning)return;state.previewRunning=true;state.previewWanted=false;
  const epoch=state.previewEpoch,path=state.opened.path;
  $('#checks-summary').textContent='Updating preview…';
  try{
    const result=await job('preview',{path,document:copy(state.doc),language:currentVersion().language,theme:state.previewTheme});
    if(epoch===state.previewEpoch&&path===state.opened.path){
      state.previewFrameKey=path+':'+currentVersion().language;state.previewFrameId=result.url.split('/').at(-1);
      state.previewRestore=state.previewScroll.get(state.previewFrameKey)||0;
      $('#preview').src=result.url;$('#preview-placeholder').hidden=true;showChecks([],result.warnings||[]);
    }
  }catch(e){if(epoch===state.previewEpoch)showChecks(e.errors||[e.message],e.warnings||[]);}
  finally{state.previewRunning=false;if(state.previewWanted)refreshPreview();}
}
function showChecks(errors,warnings){
  const checks=$('#checks');checks.classList.toggle('has-errors',Boolean(errors.length));
  $('#checks-summary').textContent=errors.length?errors.length+' field'+(errors.length>1?'s':'')+' to finish · showing last preview':warnings.length?warnings.length+' reminder'+(warnings.length>1?'s':''):'Preview up to date';
  $('#check-list').replaceChildren(el('ul',{},[...errors,...warnings].map(text=>el('li',{text}))));if(errors.length)checks.open=true;
}

async function sync(resolutions,remote){
  if(state.doc&&!(await save())){toast('Choose a recovered version before syncing.');return false;}
  const b=$('#sync');b.disabled=true;$('#sync-status').textContent='Syncing with your private repository…';
  const startedPath=state.opened?.path,startedEpoch=state.epoch;
  try{const result=await job('sync',{resolutions,remote});$('#sync-status').textContent=result.message;
    if(state.opened&&state.opened.path===startedPath&&state.epoch===startedEpoch)await openNote(startedPath,true);
    await refreshLibrary();toast('Synced privately. Nothing was published.');return true;
  }catch(e){$('#sync-status').textContent='Local writing retained · sync needs attention';if(e.conflicts)syncConflicts(e);else errorNotice(e);return false;}finally{b.disabled=false;}
}
function syncConflicts(error){
  const choices={},entries=error.conflicts.map(conflict=>{
    const select=el('select',{'aria-label':'Resolution for '+conflict.path},[
      el('option',{value:'',text:'Choose how to keep this note…'}),el('option',{value:'both',text:'Keep online here, and my writing as a separate draft'}),
      el('option',{value:'local',text:'Use my local version'}),el('option',{value:'online',text:'Use the online version'})]);
    select.onchange=()=>choices[conflict.path]=select.value;
    return el('section',{class:'conflict-entry'},[el('strong',{text:conflict.path.split('/').at(-1)}),el('div',{class:'comparison-fields'},[
      el('section',{},[el('h3',{text:'On your Mac'}),versionPanel(conflict.local)]),
      el('section',{},[el('h3',{text:'Online'}),versionPanel(conflict.online)])]),select]);
  });
  const errorNode=el('p',{role:'alert'});
  modal('Review changes before syncing',[el('p',{text:'Both versions are retained in private history. Choosing one never publishes it.'}),...entries,errorNode,
    el('div',{class:'dialog-actions'},[button('Sync these choices',async()=>{if(error.conflicts.some(c=>!choices[c.path])){errorNode.textContent='Choose an option for each note.';return;}closeModal();await sync(choices,error.remote);},'primary')])],true);
}
function publicationDialog(withdraw=false){
  if(state.blocked){toast('Choose your recovered or saved version first.');return;}
  const title=state.doc.title||'Untitled note',translations=(state.doc.translations||[]).filter(t=>t.published).map(t=>languages[t.language]);
  const explanation=withdraw?'Remove this article from the website while keeping its private original and history. Previously public copies cannot be recalled.':
    'Publish “'+title+'”'+(translations.length?' with '+translations.join(', '):'')+'. Your other drafts remain private. This waits for both website deployments.';
  confirmDialog(withdraw?'Withdraw this note?':'Publish this note?',explanation,withdraw?'Withdraw article':'Publish now',async()=>{
    if(!withdraw){state.doc.published=true;changed();}await save();
    $('#save-status').textContent=withdraw?'Requesting withdrawal…':'Checking and publishing…';
    try{const result=await job(withdraw?'withdraw':'publish',{path:state.opened.path,etag:state.opened.etag});
      notice('Publication workflow started. The live site changes only through the deployment workflow.',{label:'View run',run:()=>window.open(result.run_url,'_blank','noopener')});
      if(result.run_id)watchRun(result);else $('#save-status').textContent='Check the workflow run for the publication result';
    }catch(e){errorNotice(e);if(e.conflicts){closeModal();syncConflicts(e);}throw e;}
  });
}
async function watchRun(record){
  clearTimeout(runTimer);
  try{const result=await api('/api/run?id='+record.run_id);
    if(result.status==='completed'){
      const good=result.conclusion==='success';$('#save-status').textContent=good?'Both website deployments finished':'Publication needs attention · see workflow';
      notice(good?(record.action==='withdraw-note'?'The article was withdrawn.':'Your article is published on both website hosts.'):'The workflow did not finish successfully. It may have updated one host; check the run before retrying.',{label:'View run',run:()=>window.open(record.run_url,'_blank','noopener')});
      await refreshLibrary();if(state.opened){const saved=await api('/api/note?path='+encodeURIComponent(state.opened.path));state.opened.status=saved.status;$('#release-state').textContent=state.epoch===state.saved?saved.status:'Unpublished changes';}return;
    }$('#save-status').textContent='Website deployment '+(result.status==='queued'?'queued':'in progress')+'…';
  }catch{$('#save-status').textContent='Publication status unavailable · your saved writing is retained';}
  runTimer=setTimeout(()=>watchRun(record),10000);
}
async function history(){
  try{
    const rows=await api('/api/history?path='+encodeURIComponent(state.opened.path)),list=el('div');
    for(const row of rows){const b=button('',()=>{
      const text=versionPanel(row.document);
      modal('Saved revision',[el('p',{text:'Restoring changes your private draft only. The published article stays unchanged until you publish again.'}),text,
        el('div',{class:'dialog-actions'},[button('Restore this writing',()=>{state.doc=copy(row.document);state.doc.slug=state.opened.document.slug;state.blocked=false;state.version=-1;closeAllModals();renderDocument();changed();},'primary')])],false,true);
    },'history-item');b.append(el('strong',{text:new Date(row.time).toLocaleString()}),el('small',{text:row.kind}));list.append(b);}
    if(!rows.length)list.append(el('p',{text:'Local revisions appear here after edits are saved. Your private Git history also retains synced revisions.'}));
    modal('Local revision history',[el('p',{text:'The latest 50 saved versions are kept on this Mac for each note.'}),list]);
  }catch(e){errorNotice(e);}
}

$('#search').oninput=renderLibrary;$('#filter').onchange=renderLibrary;
$('#new-note').onclick=$('#empty-new').onclick=createNote;$('#add-block').onclick=blockMenu;
$('#media-library').onclick=mediaLibrary;
$('#settings').onclick=settings;$('#history').onclick=history;
$('#save').onclick=()=>save().then(ok=>{if(ok)toast('Saved on this Mac.');}).catch(errorNotice);
$('#sync').onclick=()=>sync();$('#publish').onclick=()=>publicationDialog();
$('#language-version').onchange=event=>{state.version=Number(event.target.value);renderDocument();requestPreview(true);};$('#add-language').onclick=addLanguage;
$('#refresh-preview').onclick=()=>requestPreview(true);
$('#preview').onload=()=>$('#preview').contentWindow?.postMessage({type:'notes-preview-restore',id:state.previewFrameId,position:state.previewRestore||0},'*');
window.addEventListener('message',event=>{
  if(event.source!==$('#preview').contentWindow||event.data?.id!==state.previewFrameId)return;
  if(event.data.type==='notes-preview-scroll'&&Number.isFinite(event.data.position))state.previewScroll.set(state.previewFrameKey,Math.max(0,Math.min(10000000,event.data.position)));
  if(event.data.type==='notes-preview-language'&&state.doc){const code=event.data.language,index=state.doc.language===code?-1:(state.doc.translations||[]).findIndex(v=>v.language===code);if(code===state.doc.language||index>=0){state.version=index;renderDocument();requestPreview(true);}}
});
function libraryAccessibility(){
  const narrow=matchMedia('(max-width:650px)').matches,open=$('.library').classList.contains('is-open');
  $('.library').inert=narrow&&!open;$('main').inert=narrow&&open;$('#library-backdrop').hidden=!(narrow&&open);
  $('#library-toggle').setAttribute('aria-expanded',String(narrow&&open));
}
$('#library-toggle').onclick=()=>{$('.library').classList.toggle('is-open');libraryAccessibility();if($('.library').classList.contains('is-open'))$('#library-close').focus();};
function closeLibrary(){$('.library').classList.remove('is-open');libraryAccessibility();$('#library-toggle').focus();}
$('#library-close').onclick=$('#library-backdrop').onclick=closeLibrary;
matchMedia('(max-width:650px)').addEventListener('change',libraryAccessibility);libraryAccessibility();
for(const b of document.querySelectorAll('[data-width]'))b.onclick=()=>{
  document.querySelectorAll('[data-width]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  $('#preview').style.width={desktop:'100%',phone:'390px',watch:'205px'}[b.dataset.width];
};
function applyTheme(){document.documentElement.dataset.theme=state.theme;}
$('#app-theme').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';store.set('notes:theme',state.theme);applyTheme();};
$('#preview-theme').onclick=()=>{state.previewTheme=state.previewTheme==='dark'?'light':'dark';requestPreview(true);};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('.library').classList.contains('is-open'))closeLibrary();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save().catch(errorNotice);}});
window.addEventListener('beforeunload',event=>{if(state.doc&&state.epoch!==state.saved){remember();event.preventDefault();event.returnValue='';}});
async function boot(){
  try{state.theme=store.get('notes:theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');applyTheme();
    const session=await api('/api/session');Object.assign(state,{schema:session.schema,items:session.notes,repository:session.repository});renderLibrary();
    $('#save-status').textContent='Local workspace ready';const last=store.get('notes:last:'+state.repository);
    if(last&&state.items.some(i=>i.path===last))await openNote(last,true);
    if(session.last_publication?.run_id)watchRun(session.last_publication);
  }catch(e){$('#save-status').textContent='Workspace needs attention';errorNotice(e);}
}
boot();
