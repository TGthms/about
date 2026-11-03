import {browserPreview} from './browser-preview.js';
import {setupLayout} from './layout.js';
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
import {undo as undoCode,redo as redoCode,selectAll as selectAllCode} from '@codemirror/commands';
import {icon,setIcon} from './icons.js';
import {contextMenu,closeContextMenu} from './context-menu.js';
import {copy,getAt,setAt,moveItem,fieldSpec,emptyValue,newBlock,needsSource} from './model.js';

const onlineTest=document.documentElement.dataset.workspace==='online-test';
const savedLabel=()=>onlineTest?'Saved in private test workspace':'Saved on this Mac';
const disconnectedMessage=()=>onlineTest?'Separate online test workspace. Publishing, GitHub backup, and complete restore are disconnected; keep using the Mac manager for real notes.':'Restored workspace · GitHub backup and publication are disconnected. You can write, preview, and create local backups.';
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
const button = (text, fn, cls = '') => {const node=el('button',{type:'button',class:cls,onclick:fn});if(text.startsWith('＋ '))node.append(icon('add'),document.createTextNode(text.slice(2)));else node.textContent=text;return node;};
const iconButton=(name,label,fn,cls='quiet')=>{const node=button('',fn,cls);node.append(icon(name));node.title=label;node.setAttribute('aria-label',label);return node;};
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
  previewEpoch:0,previewRunning:false,previewWanted:false,blocked:false,recovery:null,theme:'light',previewTheme:'auto',drag:null};
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
  if(onlineTest&&path.startsWith('/api/note?'))path+='&client='+encodeURIComponent(state.client);
  const response = await fetch(path, data === undefined ? {} : {method:'POST',headers:{'X-Notes-Manager':'1',...(raw?{}:{'Content-Type':'application/json'})},body:raw?data:JSON.stringify(data)});
  let value; try {value=await response.json();} catch {throw new Error(onlineTest?'The online manager did not respond. Check your connection or reopen it to sign in again. Your recovered writing remains in this browser.':'The local manager did not respond. Your recovered writing remains in this browser.');}
  if(!response.ok){const error=new Error(value.error||'The operation could not finish.');Object.assign(error,value,{code:response.status});throw error;} return value;
}
function toast(message, action) {
  clearTimeout(toastTimer); const node=$('#toast');node.replaceChildren(document.createTextNode(message));
  if(action)node.append(button('Undo',async event=>{
    clearTimeout(toastTimer);const control=event.currentTarget;control.disabled=true;control.textContent='Undoing…';
    try{await action();node.hidden=true;}catch(error){control.disabled=false;control.textContent='Undo';errorNotice(error);}
  }));node.hidden=false;
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
  if(state.closingStudio||state.restoring)return;
  if(state.closeStudioGuard){const guard=state.closeStudioGuard;state.closeStudioGuard=null;state.closingStudio=true;guard().then(()=>{state.closingStudio=false;closeModal();}).catch(error=>{state.closingStudio=false;state.closeStudioGuard=guard;errorNotice(error);});return;}
  $('#modal').classList.remove('studio-modal');
  const previous=modalStack.pop();
  if(previous){$('#modal-title').textContent=previous.title;$('#modal-body').replaceChildren(...previous.children);$('#modal').style.maxWidth=previous.width;previous.focus?.focus();}
  else $('#modal').close();
}
function closeAllModals(){modalStack.length=0;$('#modal').close();}
$('#modal-close').onclick=closeModal;
$('#modal').addEventListener('cancel',event=>{if(modalStack.length||state.closeStudioGuard||state.closingStudio||state.restoring){event.preventDefault();closeModal();}});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
function confirmDialog(title, text, label, action) {
  const error=el('p',{role:'alert'}),proceed=button(label,async()=>{
    proceed.disabled=true;
    try{await action();if($('#modal-body').contains(proceed))closeModal();}catch(e){error.textContent=e.message;proceed.disabled=false;}
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
  if(!store.set(storageKey(),JSON.stringify(record)))notice(onlineTest?'Browser recovery storage is unavailable. Keep this tab open until cloud saving succeeds.':'Browser recovery storage is unavailable. Local disk recovery and saving remain active.');
  clearTimeout(recoveryTimer);
  const path=state.opened.path,document=copy(state.doc),etag=state.opened.etag;
  recoveryTimer=setTimeout(()=>api('/api/recovery',{path,document,etag,client:state.client}).catch(()=>{}),250);
}
function changed(){
  state.epoch++;remember();$('#save-status').textContent=onlineTest?'Saving privately…':'Saving on this Mac…';
  $('#sync-status').textContent=onlineTest?'Private autosave · publication disconnected':'Local changes waiting to sync';
  clearTimeout(saveTimer);if(!state.blocked)saveTimer=setTimeout(()=>save().catch(errorNotice),1400);
  requestPreview();wordCount();
}
async function save(){
  clearTimeout(saveTimer);if(onlineTest)clearTimeout(recoveryTimer);
  if(!state.doc||state.blocked)return false;
  if(state.savePromise){await state.savePromise;if(state.saved!==state.epoch)return save();return true;}
  if(state.saved===state.epoch)return true;
  const epoch=state.epoch,path=state.opened.path,value=copy(state.doc),etag=state.opened.etag;
  state.savePromise=(async()=>{
    try{
      const result=await api('/api/save',{path,document:value,etag});
      state.opened.etag=result.etag;state.opened.status=result.status;state.saved=epoch;
      $('#release-state').textContent=result.status;
      if(state.epoch===epoch){$('#save-status').textContent=savedLabel();store.remove(storageKey());}
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
    el('section',{},[el('h3',{text:onlineTest?'Saved version in the test workspace':'Saved file on this Mac'}),versionPanel(conflict.online)])]);
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
    node.dataset.path=item.path;node.append(el('strong',{text:item.title}),el('small',{text:item.date+' · '+item.status}));
    node.oncontextmenu=event=>{if(event.shiftKey)return;event.preventDefault();noteMenu(item.path,event.clientX,event.clientY,node);};
    node.onkeydown=event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();const r=node.getBoundingClientRect();noteMenu(item.path,r.left+15,r.bottom,node);}};
    const more=iconButton('more_horiz','Actions for '+item.title,event=>{const r=event.currentTarget.getBoundingClientRect();noteMenu(item.path,r.right,r.bottom,event.currentTarget);});more.setAttribute('aria-haspopup','menu');
    return el('div',{class:'note-row'},[node,more]);
  }));
  if(!items.length)$('#note-list').append(el('p',{text:'No matching notes.',class:'help'}));
}
async function openNote(path, force=false){
  if(state.opening||state.restoring)return;
  state.opening=true;$('#workspace').inert=true;$('#sync').disabled=true;$('#new-note').disabled=true;
  try{
  if(!force&&state.doc&&!(await save())){toast('Choose how to handle recovered writing first.');return;}
  clearTimeout(saveTimer);clearTimeout(recoveryTimer);clearTimeout(previewTimer);
  const opened=await api('/api/note?path='+encodeURIComponent(path));
  closeAllModals();
  destroyEditors();state.opened=opened;state.doc=copy(opened.document);state.version=-1;state.epoch=0;state.saved=0;state.blocked=false;
  const row={path,title:opened.title||opened.document.title||'Untitled',date:opened.document.date||'',language:opened.document.language,categories:opened.document.categories||[],status:opened.status};
  const index=state.items.findIndex(item=>item.path===path);if(index>=0)state.items[index]={...state.items[index],...row};else state.items.push(row);
  state.items.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.path.localeCompare(a.path));
  state.previewEpoch++;state.previewWanted=false;
  state.previewFrameId=null;$('#preview').removeAttribute('src');$('#preview-placeholder').hidden=false;
  $('#empty').hidden=true;$('#workspace').hidden=false;$('#notice').hidden=true;
  for(const id of ['save','settings','publish','history','note-more','compare-published'])$('#'+id).disabled=false;
  const browser=[];try{for(const key of store.keys())if(key.startsWith(storagePrefix())&&(!onlineTest||key===storageKey()))browser.push(JSON.parse(store.get(key)));}catch{}
  const recovery=[opened.recovery,...browser].filter(Boolean).sort((a,b)=>String(b.updated).localeCompare(String(a.updated)))[0];
  state.recovery=recovery&&JSON.stringify(recovery.document)!==JSON.stringify(state.doc)?recovery:null;
  state.blocked=Boolean(state.recovery);$('#recovery').hidden=!state.recovery;
  $('#save-status').textContent=state.recovery?'Choose a recovered or saved version':savedLabel();
  $('#release-state').textContent=opened.status;if(state.connected===false){$('#publish').disabled=true;notice(disconnectedMessage());}renderDocument();renderLibrary();requestPreview(true);
  store.set('notes:last:'+state.repository,path);
  $('.library').classList.remove('is-open');
  libraryAccessibility();
  }finally{state.opening=false;$('#workspace').inert=false;$('#sync').disabled=state.connected===false;$('#new-note').disabled=false;}
}
$('#restore-recovery').onclick=()=>{state.doc=copy(state.recovery.document);state.doc.slug=state.opened.document.slug;state.recovery=null;state.blocked=false;$('#recovery').hidden=true;renderDocument();changed();};
$('#discard-recovery').onclick=async()=>{try{const client=state.recovery?.client||'legacy';await api('/api/recovery',{path:state.opened.path,discard:true,client});store.remove(storagePrefix()+client);state.recovery=null;state.blocked=false;$('#recovery').hidden=true;$('#save-status').textContent=savedLabel();}catch(e){errorNotice(e);}};
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
    const toolIcons={Bold:'format_bold',Italic:'format_italic',Underline:'format_underlined','Section heading':'format_h2',Subheading:'format_h3','Bullet list':'format_list_bulleted','Numbered list':'format_list_numbered',Quote:'format_quote',Link:'link','Inline code':'code',Undo:'undo',Redo:'redo'};
    for(const [text,label,fn,active]of tools){const node=iconButton(toolIcons[label],label,fn,'');if(active)node.dataset.active=active;
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
    const handle=el('span',{class:'drag-handle',draggable:true,title:'Drag to reorder','aria-hidden':'true'},[icon('drag_indicator')]);
    handle.addEventListener('dragstart',event=>{state.drag=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(index));});
    handle.addEventListener('dragend',()=>{state.drag=null;document.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));});
    card.addEventListener('dragover',event=>{if(state.drag!==null){event.preventDefault();card.classList.add('drag-over');}});
    card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
    card.addEventListener('drop',event=>{if(state.drag!==null){event.preventDefault();moveItem(blocks,state.drag,index);state.drag=null;renderDocument();changed();}});
    const up=iconButton('arrow_upward','Move block up',()=>reorder(index,-1));up.disabled=index===0;
    const down=iconButton('arrow_downward','Move block down',()=>reorder(index,1));down.disabled=index===blocks.length-1;
    const duplicate=iconButton('content_copy','Duplicate block',()=>{blocks.splice(index+1,0,copy(block));renderDocument();changed();});
    const remove=iconButton('delete','Remove block',()=>{const previous=copy(blocks);blocks.splice(index,1);renderDocument();changed();toast('Block removed.',()=>{currentVersion().blocks=previous;renderDocument();changed();});});
    head.append(handle,el('strong',{text:spec?.label?.split(' — ')[0]||block.type}),up,down,duplicate,remove);
    const content=el('div',{class:'block-content'});if(blockHelp[block.type])content.append(el('p',{class:'help',text:blockHelp[block.type]}));
    const collapse=iconButton('expand_less','Collapse or expand block',()=>{content.hidden=!content.hidden;setIcon(collapse,content.hidden?'expand_more':'expand_less');collapse.setAttribute('aria-expanded',String(!content.hidden));});
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
      row.append(button(selected?'Replace…':'Choose or upload…',()=>mediaPicker(field.options?.media||'photographs',result=>{update(path,result.path);const altPath=[...path.slice(0,-1),'alt'];if(result.description&&!getAt(state.doc,altPath)){update(altPath,result.description);const input=parent.querySelector('input[aria-label="Image description"]');if(input)input.value=result.description;}draw();})));
      if(selected)row.append(button('Clear',()=>{update(path,'');draw();},'quiet'),el('code',{text:selected.split('/').at(-1)}));control.append(row);
    };draw();return;
  }
  if(field.type==='boolean'){
    wrapper.classList.add('toggle');const id='switch-'+crypto.randomUUID(),input=el('input',{type:'checkbox',role:'switch',id,checked:value===true,'aria-label':field.label||field.name,onchange:e=>{update(path,e.target.checked);if(['birthday','highlight'].includes(field.name))settings();}});
    const text=el('label',{htmlFor:id,class:'switch-copy'},[el('span',{class:'field-label',text:field.label||field.name})]);if(field.description)text.append(wrapper.querySelector('.help'));wrapper.replaceChildren(input,text);return;
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
    const names={text:'draft',photo:'image',gallery:'view_carousel',video:'video_library',audio:'audio_file',table:'table_chart',aside:'info',details:'expand_more',link:'link',download:'download',quote:'format_quote',code:'code',comparison:'compare'};b.classList.add('block-option');b.append(icon(names[spec.name]),el('div',{},[el('strong',{text:spec.label.split(' — ')[0]}),el('small',{text:blockHelp[spec.name]||''})]));return b;}));};
  search.oninput=draw;modal('Add content',[search,grid]);draw();search.focus();
}
function settings(){
  if(!state.doc)return;const retained=$('#modal').open&&$('#modal-title').textContent==='Note settings',scroll=$('#modal').scrollTop,focus=document.activeElement?.getAttribute('aria-label');const root=el('div');
  const groups=[['This note',['date','language','summary','categories','font']],['Images',['sharing_image','list_image']],['Homepage',['highlight','highlight_until']],['Birthday',['birthday','birthday_visibility']]];
  for(const [title,names]of groups){const section=el('section',{class:'settings-section'},[el('h3',{text:title})]);for(const name of names){
    if(name==='highlight_until'&&!state.doc.highlight||name==='birthday_visibility'&&!state.doc.birthday)continue;
    const spec=state.schema.fields.find(f=>f.name===name);renderField(section,spec,[]);
  }if(title==='Images')section.append(el('div',{class:'cover-actions'},[button('Design a cover…',()=>openStudio('sharing_image')),button('Design on-site image…',()=>openStudio('list_image'),'quiet'),button('Adjust image framing…',imageFraming,'quiet')]));root.append(section);}
  if(state.version>=0){const section=el('section',{class:'settings-section'},[el('h3',{text:'This translation'})]);
    renderField(section,{name:'published',label:'Include this language when publishing',type:'boolean',description:'This only takes effect when you explicitly publish the note.'},versionPath());
    renderField(section,{name:'summary',label:'Short introduction',type:'text'},versionPath());root.prepend(section);}
  const section=el('section',{class:'settings-section'},[el('h3',{text:'Article address'}),el('code',{text:'timgong.me/notes/'+state.doc.slug+'.html'}),el('p',{class:'help',text:'The address stays fixed when you edit the title.'})]);root.append(section);
  section.append(button('Make a private duplicate',()=>confirmDialog('Duplicate this note?','The new copy will be a draft with its own address. The current article stays unchanged.','Create draft copy',async()=>{
    const created=await api('/api/create',{document:state.doc});await openNote(created.path,true);
  })));
  if(state.opened.status!=='Draft'&&state.opened.status!=='Withdrawn')section.append(button('Withdraw from website…',()=>publicationDialog(true),'quiet'));
  modal('Note settings',[root]);
  if(retained){$('#modal').scrollTop=scroll;if(focus)$('#modal').querySelector('[aria-label="'+CSS.escape(focus)+'"]')?.focus({preventScroll:true});}
}
function addLanguage(){
  const existing=new Set([state.doc.language,...(state.doc.translations||[]).map(t=>t.language)]),select=el('select',{'aria-label':'Translation language'},Object.entries(languages).filter(([code])=>!existing.has(code)).map(([code,label])=>el('option',{value:code,text:label})));
  if(!select.options.length){toast('All six language versions already exist.');return;}
  modal('Add a language version',[el('p',{text:'Translations are optional. A new version starts privately and is included in publication only when you enable it.'}),select,
    el('div',{class:'dialog-actions'},[button('Add version',()=>{(state.doc.translations||=[]).push({language:select.value,title:'',summary:'',body:'',blocks:[],published:false});state.version=state.doc.translations.length-1;closeModal();renderDocument();changed();},'primary')])]);
}

function clearOpened(){
  clearTimeout(saveTimer);clearTimeout(recoveryTimer);clearTimeout(previewTimer);destroyEditors();
  state.doc=null;state.opened=null;state.epoch=state.saved=0;state.previewFrameId=null;state.previewEpoch++;
  $('#workspace').hidden=true;$('#empty').hidden=false;$('#preview').removeAttribute('src');
  for(const id of ['save','settings','publish','history','note-more','compare-published'])$('#'+id).disabled=true;
  $('#save-status').textContent='Changes save automatically on this Mac';
}
function clearNoteRecovery(path){
  for(const key of store.keys())if(key.startsWith('notes-local:'+state.repository+':'+path+':'))store.remove(key);
}
let noteMenuTicket=0;
async function noteMenu(path,x,y,anchor){
  const ticket=++noteMenuTicket;
  try{
  const metadata=await api('/api/note?path='+encodeURIComponent(path));if(ticket!==noteMenuTicket)return;
  const active=path===state.opened?.path,canDiscard=Boolean(metadata.baseline)&&(metadata.local_changes||active&&state.epoch!==state.saved);
  const items=[{label:'Open note',icon:'draft',run:()=>openNote(path)},{label:'Duplicate as draft',icon:'content_copy',run:async()=>{
    if(state.doc)await save();const original=await api('/api/note?path='+encodeURIComponent(path));const created=await api('/api/create',{document:original.document});await refreshLibrary();await openNote(created.path,true);
  }},{label:'Design a cover…',icon:'palette',run:async()=>{if(state.opened?.path!==path)await openNote(path);await openStudio();}},{separator:true},{label:'Discard local edits…',icon:'undo',disabled:!canDiscard,run:()=>discardNote(path)},
  {label:'Move to Trash…',icon:'delete',danger:true,run:()=>deleteNote(path)},{separator:true},
  {label:'Open Trash',icon:'restore_from_trash',run:showTrash}];
  contextMenu(items.map(item=>({...item,onError:errorNotice})),{x,y,restore:()=>{const node=anchor?.isConnected?anchor:[...document.querySelectorAll('.note-item')].find(node=>node.dataset.path===path);node?.focus();}});
  }catch(error){errorNotice(error);}
}
async function discardNote(path){
  try{
    if(state.opened?.path===path){await save();clearTimeout(recoveryTimer);}
    const current=await api('/api/note?path='+encodeURIComponent(path));
    if(!current.baseline){toast('This draft has no saved GitHub or committed version yet. You can move it to Trash instead.');return;}
    confirmDialog('Discard local edits?','Restore “'+(current.document.title||'Untitled')+'” and its saved cover designs to the '+current.baseline.label+'. The published article will stay unchanged. A local recovery copy will be kept.','Discard local edits',async()=>{
      await api('/api/discard',{path,etag:current.etag,revision:current.baseline.revision,design_etags:current.design_etags});clearNoteRecovery(path);
      if(state.opened?.path===path)await openNote(path,true);await refreshLibrary();toast('Local edits discarded. The backed-up version is restored.');
    });
  }catch(error){errorNotice(error);}
}
async function deleteNote(path){
  try{
    if(state.opened?.path===path){await save();clearTimeout(recoveryTimer);}
    const current=await api('/api/note?path='+encodeURIComponent(path)),live=!['Draft','Withdrawn'].includes(current.status);
    confirmDialog(live?'Withdraw and move to Trash?':'Move this draft to Trash?',
      live?'The manager will withdraw “'+(current.document.title||'Untitled')+'” from both website hosts, then move its private original to recoverable Trash. Uploads will be kept.':
      '“'+(current.document.title||'Untitled')+'” will leave your Notes library. You can restore it from Trash. Uploads will be kept.',live?'Withdraw and move to Trash':'Move to Trash',async()=>{
        const result=await job('trash',{path,etag:current.etag});
        if(result.trashed){afterTrash(path,result.id);await refreshLibrary();}
        else{notice('Withdrawing the article. It will move to Trash only after both deployments succeed.',{label:'View progress',run:()=>window.open(result.run_url,'_blank','noopener')});if(result.run_id)watchRun(result);}
    });
  }catch(error){errorNotice(error);}
}
function afterTrash(path,id){
  clearNoteRecovery(path);if(state.opened?.path===path)clearOpened();
  toast('Moved to Trash.',async()=>{const restored=await api('/api/trash/restore',{id});await refreshLibrary();await openNote(restored.path,true);});
}
async function showTrash(){
  try{
    const items=await api('/api/trash'),list=el('div');
    for(const item of items){const row=el('div',{class:'trash-row'},[el('div',{},[el('strong',{text:item.title}),el('small',{text:new Date(item.created).toLocaleString()})]),button('Restore draft',async()=>{
      try{const restored=await api('/api/trash/restore',{id:item.id});closeAllModals();await refreshLibrary();await openNote(restored.path,true);toast('Restored as a private draft.');}catch(error){errorNotice(error);}
    })]);list.append(row);}
    if(!items.length)list.append(el('p',{text:'Trash is empty.'}));
    const empty=button('Empty Trash…',()=>{
      confirmDialog('Empty Trash permanently?',
        'Permanently remove '+items.length+' '+(items.length===1?'note':'notes')+' and their recovery copies from Trash on this Mac? You cannot undo this or restore them from Trash. Uploaded media, other local History, and existing private Git backups will be kept.',
        'Empty Trash',async()=>{
          const result=await api('/api/trash/empty',{ids:items.map(item=>item.id)});
          list.replaceChildren(el('p',{text:'Trash is empty.'}));empty.disabled=true;
          toast(result.removed+' '+(result.removed===1?'note removed':'notes removed')+' from Trash.');
        });
      $('#modal-body .primary').classList.add('danger-action');
      $('#modal-body .quiet').focus();
    },'quiet');empty.disabled=!items.length;
    modal('Trash',[el('p',{text:'Notes remain recoverable on this Mac. Restoring a note does not publish it.'}),list,el('div',{class:'dialog-actions'},[empty])]);
  }catch(error){errorNotice(error);}
}
async function workspaceBackup(){
  try{
    if(state.doc&&!(await save())){toast('Resolve recovered writing before creating or restoring a backup.');return;}
    const message=el('p',{role:'status',class:'help'}),saved=el('div'),error=el('p',{role:'alert'});
    const refresh=async()=>{const rows=await api('/api/backups');saved.replaceChildren(...rows.map(row=>el('div',{class:'backup-row'},[
      el('span',{text:new Date(row.created).toLocaleString()+' · '+(row.size/1024/1024).toFixed(1)+' MB'}),
      el('a',{href:row.url,download:'',text:'Download'}),button('Review restore…',()=>restorePreview(row.id),'quiet')])));};
    const create=button('Create private backup',async()=>{
      create.disabled=true;error.textContent='';message.textContent='Saving drafts and building your private archive…';
      try{if(state.doc&&!(await save()))return;const result=await job('backup');message.textContent='Backup ready. Download it to your private backup location.';await refresh();}
      catch(e){error.textContent=e.message;}finally{create.disabled=false;}
    },'primary');
    const file=el('input',{type:'file',accept:'.zip','aria-label':'Choose a Notes backup'});
    file.onchange=async()=>{if(!file.files[0])return;file.disabled=true;error.textContent='';message.textContent='Checking the selected archive…';
      try{const uploaded=await api('/api/backups/upload',file.files[0],true);await restorePreview(uploaded.id);}
      catch(e){error.textContent=e.message;}finally{file.disabled=false;}
    };
    modal('Workspace backups',[el('p',{text:'A private ZIP containing drafts, uploads, editable cover sources, Git history, local History, recovery, and Trash. It is not encrypted. Session tokens, browser data, caches, and HTTPS keys are excluded.'}),
      create,message,error,el('h3',{text:'Saved on this Mac'}),saved,el('h3',{text:'Restore from a backup'}),el('p',{class:'help',text:'Choose a ZIP to inspect its contents and choose where to restore it. Nothing changes during the preview.'}),file],true);
    await refresh();
  }catch(error){errorNotice(error);}
}
async function restorePreview(id){
  try{
    const review=await job('restore-preview',{id});
    const mode=el('select',{'aria-label':'Restore destination'},[el('option',{value:'separate',text:'Open a separate workspace'}),el('option',{value:'replace',text:'Restore drafts into this workspace'})]);
    const list=el('ul',{class:'restore-files'},review.changes.slice(0,100).map(row=>el('li',{text:row.change+' · '+row.path})));
    if(review.changes.length>100)list.append(el('li',{text:'…and '+(review.changes.length-100)+' more changes.'}));
    modal('Review backup restore',[el('p',{text:'Backup created '+new Date(review.created).toLocaleString()+'. '+review.files+' files checked. '+review.changes.length+' differences from this workspace.'}),
      el('label',{class:'field'},[el('span',{class:'field-label',text:'Where to restore'}),mode]),
      el('p',{class:'help',text:'A separate workspace leaves this one untouched and has publishing disconnected. Restoring here replaces drafts, uploads, History, recovery, and Trash after a safety backup; current Git settings and live publication records are preserved.'}),
      el('details',{},[el('summary',{text:'Review changed files'}),list]),
      el('div',{class:'dialog-actions'},[button('Restore…',()=>confirmDialog('Restore this backup?',mode.value==='replace'?'Replace local drafts and media with this backup? A complete safety backup will be created first. Nothing will be published.':'Create a separate local workspace from this backup? Your current workspace stays unchanged and nothing will be published.',
        mode.value==='replace'?'Back up and restore drafts':'Create restored workspace',async()=>{
          if(state.doc&&!(await save()))throw new Error('Resolve recovered writing first.');
          state.restoring=true;$('#modal-close').disabled=true;$('#workspace').inert=true;
          let result;
          try{result=await job('restore',{id,mode:mode.value,marker:review.marker,archive_hash:review.archive_hash});}
          finally{state.restoring=false;$('#modal-close').disabled=false;$('#workspace').inert=false;}
          closeAllModals();
          if(result.mode==='replace'){
            for(const key of store.keys())if(key.startsWith('notes-local:'+state.repository+':'))store.remove(key);
            clearOpened();await refreshLibrary();
            modal('Drafts restored',[el('p',{text:'Your drafts, media, and local history were restored. Live publication records were kept. Open a note to review it before publishing.'}),el('a',{href:result.safety.url,download:'',text:'Download the safety backup'})]);
          }else{
            modal('Separate workspace restored',[el('p',{text:'Your current workspace is unchanged. The restored copy has its own drafts and local history, with publishing disconnected.'}),el('code',{text:result.content}),
              button('Open restored workspace',async()=>{try{const opened=await api('/api/backups/open',{id:result.id});window.open(opened.url,'_blank','noopener');}catch(e){errorNotice(e);}},'primary'),
              el('p',{class:'help',text:'To reopen it later, double-click '+result.launcher})]);
          }
        }),'primary')])],true);
  }catch(error){errorNotice(error);}
}
function workflowHelp(){modal('Saving, syncing, and backups',[
  el('div',{class:'workflow-step'},[icon('save'),el('div',{},[el('h3',{text:'Autosaved on this Mac'}),el('p',{text:'Typing saves your working draft automatically. Command-S saves immediately. The live website stays unchanged.'})])]),
  el('div',{class:'workflow-step'},[icon('refresh'),el('div',{},[el('h3',{text:'Sync drafts'}),el('p',{text:'Sends your Mac edits, uploads, and cover designs to private GitHub, and retrieves changes made through Pages CMS or another Mac. You can review conflicting edits before resolving them. Nothing is published.'})])]),
  el('div',{class:'workflow-step'},[icon('download'),el('div',{},[el('h3',{text:'Workspace backup'}),el('p',{text:'Creates a downloadable ZIP with drafts, uploads, Git history, local History, recovery, and Trash. Use it to keep a complete backup or restore a workspace.'})])]),
  el('div',{class:'workflow-step'},[icon('publish'),el('div',{},[el('h3',{text:'Publish'}),el('p',{text:'Checks the current note, syncs its saved revision with GitHub, and updates its public article and selected translations. Your other drafts remain private.'})])])]);}

function editorContext(event){
  if(event.shiftKey||$('#modal').open)return;
  const target=event.target.closest('textarea,input:not([type=file]):not([type=checkbox]),[contenteditable=true]');
  if(!target||!target.closest('.writing-pane'))return;
  event.preventDefault();
  const selected=getSelection(),range=selected?.rangeCount?selected.getRangeAt(0).cloneRange():null;
  const inputSelection=typeof target.selectionStart==='number'?[target.selectionStart,target.selectionEnd]:null;
  const editor=state.editors.find(editor=>editor instanceof EditorView?editor.dom.contains(target):editor.view.dom.contains(target));
  const rich=editor&&!(editor instanceof EditorView),code=editor instanceof EditorView;
  const restore=()=>{
    if(code)editor.focus();else if(rich)editor.view.focus();else target.focus({preventScroll:true});
    if(inputSelection)target.setSelectionRange(...inputSelection);
    else if(range){const selection=getSelection();selection.removeAllRanges();selection.addRange(range);}
  };
  const native=command=>{restore();return document.execCommand(command);};
  const copyOrCut=async cut=>{
    if(native(cut?'cut':'copy'))return;
    const text=inputSelection?target.value.slice(...inputSelection):code?editor.state.sliceDoc(editor.state.selection.main.from,editor.state.selection.main.to):String(getSelection()||'');
    if(!text){toast('Select some text first.');return;}
    try{await navigator.clipboard.writeText(text);if(cut){if(rich)editor.chain().focus().deleteSelection().run();else if(code)editor.dispatch({changes:{from:editor.state.selection.main.from,to:editor.state.selection.main.to,insert:''}});else{target.setRangeText('',...inputSelection,'end');target.dispatchEvent(new Event('input',{bubbles:true}));}}}
    catch{toast('Use '+(cut?'⌘X':'⌘C')+' to '+(cut?'cut':'copy')+' the selection.');}
  };
  const items=[{label:'Undo',icon:'undo',shortcut:'⌘Z',run:()=>code?undoCode(editor):rich?editor.chain().focus().undo().run():native('undo')},
    {label:'Redo',icon:'redo',shortcut:'⇧⌘Z',run:()=>code?redoCode(editor):rich?editor.chain().focus().redo().run():native('redo')},{separator:true},
    {label:'Cut',icon:'content_cut',shortcut:'⌘X',run:()=>copyOrCut(true)},{label:'Copy',icon:'content_copy',shortcut:'⌘C',run:()=>copyOrCut(false)},
    {label:'Paste',icon:'content_paste',shortcut:'⌘V',run:async()=>{restore();try{
      let text='',html='';
      if(rich&&navigator.clipboard.read){const items=await navigator.clipboard.read();for(const item of items){if(item.types.includes('text/html'))html=await(await item.getType('text/html')).text();if(item.types.includes('text/plain'))text=await(await item.getType('text/plain')).text();if(!html&&!text&&item.types.includes('image/png')){await uploadInline(new File([await item.getType('image/png')],'pasted-image.png',{type:'image/png'}),editor);return;}}}
      else text=await navigator.clipboard.readText();
      if(rich)editor.commands.insertContent(html||text.split('\n').map(line=>({type:'paragraph',content:line?[{type:'text',text:line}]:[]})));else if(code)editor.dispatch(editor.state.replaceSelection(text));else{target.setRangeText(text,target.selectionStart,target.selectionEnd,'end');target.dispatchEvent(new Event('input',{bubbles:true}));}
    }catch{toast('Press ⌘V to paste. Your browser keeps clipboard access under your control.');}}},
    {label:'Select all',icon:'select_all',shortcut:'⌘A',run:()=>code?selectAllCode(editor):rich?editor.commands.selectAll():target.select()}];
  if(rich)items.push({separator:true},...[
    ['Bold','format_bold','bold',()=>editor.chain().focus().toggleBold().run(),'⌘B'],['Italic','format_italic','italic',()=>editor.chain().focus().toggleItalic().run(),'⌘I'],
    ['Underline','format_underlined','underline',()=>editor.chain().focus().toggleUnderline().run(),'⌘U'],['Inline code','code','code',()=>editor.chain().focus().toggleCode().run()],
  ].map(([label,icon,mark,run,shortcut])=>({label,icon,checked:editor.isActive(mark),run,shortcut})),{label:'Link…',icon:'link',run:()=>editLink(editor)},
    {label:'Clear formatting',icon:'format_clear',run:()=>editor.chain().focus().unsetAllMarks().clearNodes().run()});
  items.push({separator:true},{label:'Browser menu: Shift + right-click',disabled:true});
  contextMenu(items.map(item=>({...item,onError:errorNotice})),{x:event.clientX,y:event.clientY,restore});
}
document.addEventListener('contextmenu',editorContext);

async function uploadFile(file,kind){return api('/api/upload?kind='+encodeURIComponent(kind)+'&name='+encodeURIComponent(file.name),file,true);}
let studio=null;
async function openStudio(target='sharing_image'){
  if(!state.doc)return;
  try{
    const path=state.opened.path;state.doc.og_designs||={};
    const identity=state.doc.og_designs[target]||crypto.randomUUID().replaceAll('-','').slice(0,24);
    const saved=await api('/api/design?id='+identity);
    const hydrated=copy(saved.design),assets=new Map();
    if(hydrated)for(const key of ['backgroundData','logoData']){
      const reference=hydrated[key];if(!reference?.startsWith('/media/images/'))continue;
      const response=await fetch(reference);if(!response.ok)throw new Error('A cover image could not be loaded from the private library.');
      const blob=await response.blob(),data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
      hydrated[key]=data;assets.set(data,reference);
    }
    if(!state.doc.og_designs[target]){state.doc.og_designs[target]=identity;changed();}
    const frame=el('iframe',{src:'/studio/index.html',title:'OG Studio cover designer',class:'studio-frame',sandbox:'allow-scripts allow-same-origin allow-downloads allow-modals',allow:'clipboard-read; clipboard-write'});
    const choice=el('span',{class:'studio-target',text:target==='sharing_image'?'Sharing image':'On-site image'});
    const description=el('input',{type:'text',value:'Cover reading “'+(state.doc.title||'Untitled')+'”.',placeholder:'Describe the cover for people who cannot see it','aria-label':'Cover image description',required:true});
    description.oninput=()=>{description.dataset.edited='true';description.setCustomValidity('');};
    const message=el('span',{class:'studio-message',role:'status',text:'Opening your cover designer…'});
    const use=button('Use this cover',async()=>{
      if(!description.value.trim()){description.setCustomValidity('Add a short image description.');description.focus();description.reportValidity();return;}
      use.disabled=true;message.textContent='Preparing the cover…';
      try{await snapshotStudio();await flushStudio(studio);frame.contentWindow.postMessage({type:'og-manager-export',nonce:studio.nonce},location.origin);}
      catch(error){message.textContent=error.message;use.disabled=false;}
    },'primary');use.disabled=true;
    studio={frame,path,identity,target,etag:saved.etag,latest:hydrated,saved:hydrated,nonce:crypto.randomUUID(),assets,use,description,message,saving:null,pending:false};
    const footer=el('div',{class:'studio-footer'},[choice,el('label',{class:'studio-description'},[el('span',{text:'Image description'}),description]),use,message]);
    const dialog=modal('Cover Studio',[frame,footer],true,true);dialog.classList.add('studio-modal');
    state.closeStudioGuard=async()=>{if(!studio?.ready){studio=null;return;}await snapshotStudio();const session=studio;await flushStudio(session);studio=null;};
  }catch(error){errorNotice(error);}
}
async function designAssets(session,design){
  const result=copy(design);
  for(const key of ['backgroundData','logoData']){
    const value=result[key];if(!value?.startsWith('data:'))continue;
    if(!session.assets.has(value)){
      const match=value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);if(!match)throw new Error('Use a PNG, JPEG, or WebP image in the design.');
      const raw=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
      const uploaded=await uploadFile(new File([raw],'cover-'+key+'.'+({['image/png']:'png',['image/jpeg']:'jpg',['image/webp']:'webp'}[match[1]]),{type:match[1]}),'photographs');
      session.assets.set(value,uploaded.path);
    }result[key]=session.assets.get(value);
  }return result;
}
async function flushStudio(session){
  if(!session)return;
  if(session.saving){await session.saving;if(session.pending)return flushStudio(session);return;}
  if(!session.latest)return;
  session.pending=false;const latest=copy(session.latest);
  session.saving=(async()=>{
    const design=await designAssets(session,latest),saved=await api('/api/design',{id:session.identity,design,etag:session.etag});if(session.etag!==saved.etag)$('#sync-status').textContent=onlineTest?'Private autosave · publication disconnected':'Local changes waiting to sync';session.etag=saved.etag;session.saved=copy(latest);
    session.message.textContent=onlineTest?'Cover draft saved privately in the test workspace':'Cover draft saved on this Mac';
    session.frame.contentWindow?.postMessage({type:'og-manager-saved',nonce:session.nonce},location.origin);
  })();
  try{await session.saving;}finally{session.saving=null;}
  if(session.pending)return flushStudio(session);
}
function snapshotStudio(){
  const session=studio;if(!session)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{session.snapshot=null;reject(new Error('The designer is still loading. Try again in a moment.'));},5000);
    session.snapshot=()=>{clearTimeout(timer);resolve();};session.frame.contentWindow?.postMessage({type:'og-manager-snapshot',nonce:session.nonce},location.origin);
  });
}
window.addEventListener('message',async event=>{
  const session=studio;if(!session||event.source!==session.frame.contentWindow||event.origin!==location.origin)return;
  const data=event.data||{};
  if(data.type==='og-studio-ready'){
    session.ready=true;
    session.frame.contentWindow.postMessage({type:'og-manager-init',nonce:session.nonce,design:session.saved,title:state.doc.title||'',subtitle:state.doc.summary||''},location.origin);
    session.message.textContent='Design your cover, then use it in this note';session.use.disabled=false;return;
  }
  if(data.nonce!==session.nonce)return;
  if(data.type==='og-design-change'||data.type==='og-design-snapshot'){
    session.latest=data.design;session.pending=true;
    if(session.description.dataset.edited!=='true')session.description.value='Cover reading “'+(data.design.title||state.doc.title||'Untitled')+'”.';
    if(data.type==='og-design-snapshot')session.snapshot?.();
    else{clearTimeout(session.timer);session.timer=setTimeout(()=>flushStudio(session).catch(error=>session.message.textContent=error.message),800);}
  }
  if(data.type==='og-cover-error'){session.message.textContent=data.message;session.use.disabled=false;}
  if(data.type==='og-cover-export'){
    try{
      session.latest=data.design;await flushStudio(session);
      const uploaded=await uploadFile(new File([data.blob],'cover-'+state.doc.slug+'.webp',{type:'image/webp'}),'photographs');
      if(state.opened?.path!==session.path)throw new Error('The open note changed. The generated image remains in your media library.');
      if(studio!==session)return;
      const target=session.target;state.doc.og_designs[target]=session.identity;update([target],{type:'custom',image:uploaded.path,alt:session.description.value.trim()});
      state.closeStudioGuard=null;studio=null;closeModal();if($('#modal').open)settings();toast('Cover added to this note.');
    }catch(error){session.message.textContent=error.message;session.use.disabled=false;}
  }
});
async function mediaPicker(kind,choose){
  const error=el('p',{role:'alert'}),input=el('input',{type:'file','aria-label':'Upload a file'}),upload=el('label',{class:'upload-zone',text:'Upload a file · up to 20 MB'},[input]),search=el('input',{type:'search',placeholder:'Find an upload…','aria-label':'Search uploads'}),grid=el('div',{class:'media-grid'});
  input.accept={photographs:'.jpg,.jpeg,.png,.webp',videos:'.mp4,.webm',audio:'.mp3,.m4a,.ogg,.wav',downloads:'.pdf,.zip,.txt,.csv,.json'}[kind];
  const select=result=>{if(choose&&kind!=='photographs'){closeModal();choose(result);}else mediaDetails(result,kind,choose);};
  input.onchange=async()=>{if(!input.files[0])return;input.disabled=true;error.textContent=onlineTest?'Uploading to your private test library…':'Uploading to your private local library…';try{const result=await uploadFile(input.files[0],kind);select(result);if(!choose){input.disabled=false;error.textContent='Uploaded privately.';}}catch(e){error.textContent=e.message;input.disabled=false;}};
  modal((choose?'Choose ':'Browse ')+({photographs:'photographs',videos:'videos',audio:'audio',downloads:'downloads'}[kind]||'files'),[upload,error,el('p'),search,grid],false,true);
  try{const items=await api('/api/media?kind='+kind);const draw=()=>grid.replaceChildren(...items.filter(i=>i.name.toLowerCase().includes(search.value.toLowerCase())).map(item=>{
    const b=button('',()=>select(item));if(kind==='photographs')b.append(el('img',{src:item.path,alt:'',loading:'lazy'}));
    b.append(el('small',{text:item.name}),el('small',{text:(item.width?item.width+' × '+item.height+' · ':'')+(item.size/1024/1024).toFixed(2)+' MB'}),el('small',{text:item.used_by.length?'Used in '+item.used_by.length+' '+(item.used_by.length===1?'note':'notes'):'Not used in a draft'}));return b;}));search.oninput=draw;draw();}catch(e){error.textContent=e.message;}
}
function mediaDetails(item,kind,choose){
  const content=[el('p',{text:item.name||item.path.split('/').at(-1)})];
  if(kind==='photographs')content.push(el('img',{src:item.path,alt:'Private library photograph',class:'media-detail-image'}));
  if(kind==='audio'||kind==='videos')content.push(el(kind==='audio'?'audio':'video',{src:item.path,controls:true,preload:'none',class:'media-detail-image'}));
  if(item.width)content.push(el('p',{class:'help',text:item.width+' × '+item.height+' pixels · '+(item.size/1024/1024).toFixed(2)+' MB'}));
  if(item.used_by?.length)content.push(el('h3',{text:'Used in drafts'}),el('ul',{},item.used_by.map(note=>el('li',{},[button(note.title,()=>openNote(note.path).catch(errorNotice),'quiet')]))));
  if(item.descriptions?.length)content.push(el('h3',{text:'Existing image descriptions'}),el('ul',{},item.descriptions.map(text=>el('li',{text}))));
  if(choose){
    const description=el('input',{'aria-label':'Description to reuse',value:item.descriptions?.[0]||'',placeholder:'Describe what is in this image'});
    content.push(el('label',{class:'field'},[el('span',{class:'field-label',text:'Description to reuse'}),description]),el('p',{class:'help',text:'Used only if the destination description is empty. Review it for this article.'}),
      button('Use this image',()=>{closeModal();closeModal();choose({...item,description:description.value.trim()});},'primary'));
  }
  content.push(el('p',{class:'help',text:'Original uploads stay private. Their optimized public versions are created only when a referenced note is published.'}),el('code',{text:item.path}));
  const a=el('a',{href:item.path,target:'_blank',rel:'noopener noreferrer',text:'Open original ↗'});content.push(el('p',{},[a]));
  modal('Private upload',content,false,true);
}
function imageFraming(){
  const doc=state.doc,image=doc.list_image?.image||doc.sharing_image?.image||(doc.blocks||[]).find(b=>b.type==='photo')?.image;
  if(!image){toast('Choose an on-site or sharing image first.');return;}
  const initial=doc.thumbnail_focal||{x:50,y:50},photo=el('img',{src:image,alt:'Image framing preview'}),preview=el('div',{class:'focal-preview'},[photo]);
  const enabled=el('input',{type:'checkbox',role:'switch','aria-label':'Crop image to fill',checked:Boolean(doc.thumbnail_focal)});
  const x=el('input',{type:'range',min:0,max:100,value:initial.x,'aria-label':'Horizontal focal point'}),y=el('input',{type:'range',min:0,max:100,value:initial.y,'aria-label':'Vertical focal point'});
  const feedback=el('output');
  const draw=()=>{photo.style.objectFit=enabled.checked?'cover':'contain';photo.style.objectPosition=x.value+'% '+y.value+'%';x.disabled=y.disabled=!enabled.checked;feedback.textContent='Horizontal '+x.value+'% · Vertical '+y.value+'%';};
  x.oninput=y.oninput=enabled.onchange=draw;
  modal('On-site image framing',[el('p',{text:'Applies to the homepage Notes carousel and archive thumbnail. Your sharing image and original file stay unchanged.'}),preview,
    el('label',{class:'field toggle'},[enabled,el('span',{text:'Crop image to fill'})]),
    el('label',{class:'field'},[el('span',{text:'Horizontal focal point'}),x]),el('label',{class:'field'},[el('span',{text:'Vertical focal point'}),y]),feedback,
    el('div',{class:'dialog-actions'},[button('Save framing',()=>{if(enabled.checked)update(['thumbnail_focal'],{x:Number(x.value),y:Number(y.value)});else{delete state.doc.thumbnail_focal;changed();}closeModal();},'primary')])],false,true);draw();
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
  if(onlineTest&&operation==='preview')return browserPreview(data,status=>$('#checks-summary').textContent=status);
  const created=await api('/api/jobs',{operation,...data});
  for(;;){await sleep(operation==='preview'?180:500);const result=await api('/api/jobs/'+created.job);if(['publish','withdraw'].includes(operation)&&result.phase)publicationProgress({phase:result.phase,action:operation==='withdraw'?'withdraw-note':'publish-note'});if(result.status==='done')return result.result;if(result.status==='error'){const error=new Error(result.error);Object.assign(error,result);throw error;}}
}
async function refreshPreview(){
  if(!state.doc||state.previewRunning)return;
  const version=currentVersion(),template=document.createElement('template');template.innerHTML=version.body||'';
  if(!(template.content.textContent||'').trim()&&!(version.blocks||[]).length&&!template.content.querySelector('img')){
    state.previewWanted=false;state.previewFrameId=null;$('#preview').removeAttribute('src');$('#preview-placeholder').hidden=false;
    $('#checks').classList.remove('has-errors');$('#checks-summary').textContent='Start writing to see your article';$('#check-list').replaceChildren();return;
  }
  state.previewRunning=true;state.previewWanted=false;
  const epoch=state.previewEpoch,path=state.opened.path;
  $('#checks-summary').textContent='Updating preview…';
  try{
    const result=await job('preview',{path,document:copy(state.doc),language:currentVersion().language,theme:state.previewTheme==='auto'?state.theme:state.previewTheme});
    if(epoch===state.previewEpoch&&path===state.opened.path){
      state.previewFrameKey=path+':'+currentVersion().language;state.previewFrameId=result.id||result.url.split('/').at(-1);
      state.previewRestore=state.previewScroll.get(state.previewFrameKey)||0;
      if(onlineTest){$('#preview').dataset.renderMs=String(result.elapsed_ms);$('#preview').dataset.engineMemory=String(result.memory_bytes);}
      $('#preview').src=result.url;$('#preview-placeholder').hidden=true;showChecks([],result.warnings||[]);if(onlineTest)$('#checks-summary').textContent='Opening preview…';
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
  const b=$('#sync');b.disabled=true;$('#sync-status').textContent='Syncing drafts with GitHub…';
  const startedPath=state.opened?.path,startedEpoch=state.epoch;
  try{const result=await job('sync',{resolutions,remote});$('#sync-status').textContent='Last synced · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    if(state.opened&&state.opened.path===startedPath&&state.epoch===startedEpoch)await openNote(startedPath,true);
    await refreshLibrary();toast('Drafts synced with GitHub. Nothing was published.');return true;
  }catch(e){$('#sync-status').textContent='Saved on this Mac · sync needs attention';if(e.conflicts)syncConflicts(e);else errorNotice(e);return false;}finally{b.disabled=false;}
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
function comparisonContent(review){
  const host=el('div',{class:'publication-review'});
  if(review.warning)host.append(el('p',{class:'review-warning',text:review.warning}));
  host.append(el('p',{class:'help',text:!review.published?'This note has not been published. All content below is new.':review.withdrawn?'This article is currently withdrawn. The comparison uses its last published revision.':'Compared with the exact saved revision selected for the public website.'}));
  for(const change of review.changes){
    const title=({cover:'Sharing image',cover_alt:'Sharing image description',thumbnail:'On-site image',thumbnail_alt:'On-site image description',thumbnail_focal:'Image framing',highlight:'Feature beneath About',body:'Article text'})[change.field]||change.field.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
    const display=value=>{if(change.field!=='body')return value||'—';const template=document.createElement('template');template.innerHTML=value;return [...template.content.childNodes].map(n=>n.textContent).join('\n\n')||'—';};
    const details=el('details',{class:'change-entry'},[el('summary',{text:title}),el('div',{class:'comparison-fields'},[
      el('section',{},[el('h4',{text:'Published'}),el('pre',{text:display(change.before)})]),
      el('section',{},[el('h4',{text:'Your draft'}),el('pre',{text:display(change.after)})])])]);
    details.open=['title','summary','body'].includes(change.field);
    details.append(el('details',{},[el('summary',{text:change.field==='body'?'Show HTML changes':'Show line changes'}),el('pre',{text:change.diff})]));host.append(details);
  }
  if(review.media.length)host.append(el('h3',{text:'Uploads'}),el('ul',{},review.media.map(item=>el('li',{text:item.change+' · '+item.path.split('/').at(-1)}))));
  if(!review.changes.length&&!review.media.length)host.append(el('p',{text:'Your saved draft matches the published content.'}));
  return host;
}
async function reviewChanges(){
  if(!state.doc||state.reviewing)return;state.reviewing=true;
  try{if(!(await save()))return;const path=state.opened.path;modal('Loading publication review',[el('p',{role:'status',text:'Checking the latest publication record. Your local drafts stay unchanged.'})]);const review=await api('/api/comparison?path='+encodeURIComponent(path));if(!$('#modal').open||$('#modal-title').textContent!=='Loading publication review'||state.opened.path!==path)return;modal('Review unpublished changes',[comparisonContent(review)],true);}
  catch(error){if($('#modal-title').textContent==='Loading publication review')closeAllModals();errorNotice(error);}finally{state.reviewing=false;}
}
let publicationRecord=null;
function publicationProgress(record,result={}){
  publicationRecord=record;const panel=$('#publication-progress');panel.hidden=false;
  const steps=result.steps||[],step=name=>steps.find(s=>s.name===name),exported=step('Export, validate, and publish notes'),verified=step('Confirm both website deployments');
  const success=result.status==='completed'&&result.conclusion==='success';
  const failed=result.status==='completed'&&!success;
  const stages=[['Checking',record.phase==='checking'?'active':'done'],['Backed up',record.phase==='checking'?'waiting':record.phase==='backup'?'active':'done'],
    ['Building',success||exported?.conclusion==='success'?'done':record.run_id||record.phase==='building'?'active':'waiting'],
    ['Cloudflare ready',success?'done':verified?.status==='in_progress'?'active':'waiting'],['GitHub Pages ready',success?'done':verified?.status==='in_progress'?'active':'waiting']];
  const list=el('ol',{class:'publication-stages'},stages.map(([label,status])=>el('li',{'data-state':status,text:label})));
  const heading=el('strong',{text:success?(record.action==='withdraw-note'?'Withdrawal complete':'Published'):failed?'Publication needs attention':'Publishing your saved revision'});
  const controls=el('div',{class:'publication-controls'});
  if(record.run_url)controls.append(el('a',{href:record.run_url,target:'_blank',rel:'noopener noreferrer',text:'Workflow details ↗'}));
  if(success&&record.action!=='withdraw-note'&&record.article_url)controls.append(el('a',{href:record.article_url,target:'_blank',rel:'noopener noreferrer',class:'open-published',text:'Open published note ↗'}));
  controls.append(button('Hide',()=>panel.hidden=true,'quiet'));
  const failure=steps.find(s=>s.status==='completed'&&!['success','skipped','neutral'].includes(s.conclusion));
  panel.replaceChildren(heading,list,...(failed?[el('p',{text:failure?'Check “'+failure.name+'”. Your private writing is retained.':'The workflow did not complete successfully. Check its details before retrying; one host may already have updated.'})]:[]),controls);
}
async function publicationDialog(withdraw=false){
  if(state.blocked){toast('Choose your recovered or saved version first.');return;}
  if(!state.doc||state.reviewing)return;state.reviewing=true;
  try{
    if(!(await save()))return;
    const path=state.opened.path;if(!withdraw)modal('Loading publication review',[el('p',{role:'status',text:'Checking the latest publication record. Your local drafts stay unchanged.'})]);
    const review=withdraw?null:await api('/api/comparison?path='+encodeURIComponent(path));
    if(state.opened.path!==path||!withdraw&&(!$('#modal').open||$('#modal-title').textContent!=='Loading publication review'))return;
    if(!withdraw)closeAllModals();
    const title=state.doc.title||'Untitled note',translations=(state.doc.translations||[]).filter(t=>t.published).map(t=>languages[t.language]);
    const explanation=withdraw?'Remove this article from the website while keeping its private original and history. Previously public copies cannot be recalled.':
      'Publish “'+title+'”'+(translations.length?' with '+translations.join(', '):'')+'. The manager backs up this revision first. Your other drafts remain private.';
    confirmDialog(withdraw?'Withdraw this note?':'Review and publish',explanation,withdraw?'Withdraw article':'Publish now',async()=>{
      if(state.opened.path!==path)throw new Error('The open note changed. Review it again.');
      if(!withdraw){state.doc.published=true;changed();}await save();
      const progress={phase:'checking',action:withdraw?'withdraw-note':'publish-note'};publicationProgress(progress);
      $('#save-status').textContent=withdraw?'Requesting withdrawal…':'Checking and publishing…';
      try{const result=await job(withdraw?'withdraw':'publish',{path:state.opened.path,etag:state.opened.etag});
        publicationProgress({...result,phase:'building'});
        if(result.run_id)watchRun(result);else $('#save-status').textContent='Check the workflow run for the publication result';
      }catch(e){progress.phase='checking';publicationProgress(progress,{status:'completed',conclusion:'failure'});errorNotice(e);if(e.conflicts){closeModal();syncConflicts(e);}throw e;}
    });
    if(review)$('#modal-body').insertBefore(comparisonContent(review),$('#modal-body .dialog-actions'));
  }catch(error){if($('#modal-title').textContent==='Loading publication review')closeAllModals();errorNotice(error);}finally{state.reviewing=false;}
}
async function watchRun(record){
  clearTimeout(runTimer);
  try{const result=await api('/api/run?id='+record.run_id);publicationProgress({...record,phase:'building'},result);
    if(result.status==='completed'){
      const good=result.conclusion==='success';$('#save-status').textContent=good?'Both website deployments finished':'Publication needs attention · see workflow';
      if(result.trashed){afterTrash(result.path,result.trash_id);await refreshLibrary();notice('The article was withdrawn and its private original is in Trash.');return;}
      if(result.trash_error){notice('The article was withdrawn. '+result.trash_error);await refreshLibrary();return;}
      if(good)$('#notice').hidden=true;else notice('The workflow did not finish successfully. It may have updated one host; check the failed step before retrying.',{label:'View run',run:()=>window.open(record.run_url,'_blank','noopener')});
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
    if(!rows.length)list.append(el('p',{text:onlineTest?'Saved revisions and recovered browser sessions appear here.':'Local revisions appear here after edits are saved. Your private Git history also retains synced revisions.'}));
    modal(onlineTest?'Private revision history':'Local revision history',[el('p',{text:onlineTest?'The latest 50 saved versions are kept in this separate test workspace for each note.':'The latest 50 saved versions are kept on this Mac for each note.'}),list]);
  }catch(e){errorNotice(e);}
}

$('#search').oninput=renderLibrary;$('#filter').onchange=renderLibrary;
$('#new-note').onclick=$('#empty-new').onclick=createNote;$('#add-block').onclick=blockMenu;
$('#media-library').onclick=mediaLibrary;
$('#trash').onclick=showTrash;$('#workflow-help').onclick=workflowHelp;
$('#note-more').onclick=event=>{const r=event.currentTarget.getBoundingClientRect();noteMenu(state.opened.path,r.right,r.bottom,event.currentTarget);};
$('#compare-published').onclick=reviewChanges;$('#workspace-backup').onclick=workspaceBackup;
$('#settings').onclick=settings;$('#history').onclick=history;
$('#save').onclick=()=>save().then(ok=>{if(ok)toast(onlineTest?'Saved in private test workspace.':'Saved on this Mac.');}).catch(errorNotice);
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
  $('.library').inert=document.documentElement.classList.contains('writing-only')||narrow&&!open;$('main').inert=narrow&&open;$('#library-backdrop').hidden=!(narrow&&open);
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
function applyTheme(){
  const changed=document.documentElement.dataset.theme!==state.theme;
  document.documentElement.dataset.theme=state.theme;setIcon($('#app-theme'),state.theme==='dark'?'light_mode':'dark_mode');
  $('#app-theme').title=state.theme==='dark'?'Switch workspace to light mode':'Switch workspace to dark mode';
  $('#app-theme').setAttribute('aria-label',$('#app-theme').title);
  if(changed&&state.previewTheme==='auto')requestPreview(true);
}
$('#app-theme').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';store.set('notes:theme',state.theme);applyTheme();};
$('#preview-theme').onchange=event=>{state.previewTheme=event.target.value;store.set('notes:preview-theme',state.previewTheme);requestPreview(true);};
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',event=>{if(!store.get('notes:theme')){state.theme=event.matches?'dark':'light';applyTheme();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('.library').classList.contains('is-open'))closeLibrary();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save().catch(errorNotice);}});
window.addEventListener('beforeunload',event=>{if(state.doc&&state.epoch!==state.saved){remember();event.preventDefault();event.returnValue='';}});
async function boot(){
  try{state.previewTheme=['light','dark'].includes(store.get('notes:preview-theme'))?store.get('notes:preview-theme'):'auto';$('#preview-theme').value=state.previewTheme;
    state.theme=store.get('notes:theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');applyTheme();
    const session=await api('/api/session');Object.assign(state,{schema:session.schema,items:session.notes,repository:session.repository,connected:session.connected});renderLibrary();$('#sync').disabled=state.connected===false;
    $('#save-status').textContent=onlineTest?'Private test workspace ready':'Local workspace ready';
    if(onlineTest){$('.library-brand small').textContent='Separate online test';$('#sync-status').textContent='Cloud autosave · test notes only';$('#workspace-backup').disabled=true;$('#workspace-backup').title='Complete backup/restore is not connected in this test version';$('#compare-published').hidden=true;$('#workflow-help').hidden=true;}const last=store.get('notes:last:'+state.repository);
    if(last&&state.items.some(i=>i.path===last))await openNote(last,true);
    if(state.connected===false)notice(disconnectedMessage());
    if(session.last_publication?.run_id&&session.last_publication.status!=='completed')watchRun(session.last_publication);
  }catch(e){$('#save-status').textContent='Workspace needs attention';errorNotice(e);}
}
let checkingRemote=false;
async function continueCloudDraft(){
  if(!onlineTest||checkingRemote||document.hidden)return;
  checkingRemote=true;const path=state.opened?.path,epoch=state.epoch;
  try{await refreshLibrary();if(!path||state.opening||state.blocked||state.epoch!==state.saved||$('#modal').open)return;const latest=await api('/api/note?path='+encodeURIComponent(path));
    if(state.opened?.path===path&&state.epoch===epoch&&state.epoch===state.saved&&latest.etag!==state.opened.etag){await openNote(path,true);toast('Loaded your latest saved writing.');}
  }catch(error){if(error.code!==404)errorNotice(error);}finally{checkingRemote=false;}
}
window.addEventListener('focus',continueCloudDraft);
document.addEventListener('visibilitychange',()=>{if(!onlineTest)return;if(document.hidden){if(state.doc&&state.epoch!==state.saved)save().catch(errorNotice);}else continueCloudDraft();});
setupLayout({store,onPreview:()=>requestPreview(true)});
boot();

for(const [id,name,label]of [["new-note","add","New note"],["empty-new","draft","Write a note"],["media-library","image","Media library"],["trash","delete","Trash"],["sync","refresh","Sync drafts"],["workflow-help","info","How saving works"],["history","history","History"],["settings","settings","Settings"],["publish","publish","Publish…"],["note-more","more_horiz"],["modal-close","close"],["library-toggle","menu"],["library-close","close"],["add-language","add"],["refresh-preview","refresh"],["app-theme","dark_mode"]])setIcon($("#"+id),name,label);

applyTheme();
