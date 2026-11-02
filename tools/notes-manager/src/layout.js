/** Local preferences only. Keyboard and pointer resizing share the same limits. */
export function setupLayout({store,onPreview}) {
  const root=document.documentElement,splitter=document.querySelector('#workspace-divider'),focus=document.querySelector('#writing-mode');
  let ratio=Math.max(35,Math.min(65,Number(store.get('notes:split'))||51)),drag=null;
  function apply(){root.style.setProperty('--writing-width',ratio+'%');splitter.setAttribute('aria-valuenow',String(Math.round(ratio)));}
  function set(value){ratio=Math.max(35,Math.min(65,value));apply();store.set('notes:split',String(ratio));}
  apply();
  splitter.addEventListener('keydown',event=>{
    const delta=event.key==='ArrowLeft'?-2:event.key==='ArrowRight'?2:0;
    if(delta||event.key==='Home'||event.key==='End'){event.preventDefault();set(event.key==='Home'?35:event.key==='End'?65:ratio+delta);}
  });
  splitter.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();drag=document.querySelector('#workspace').getBoundingClientRect();
    splitter.setPointerCapture(event.pointerId);root.classList.add('resizing-workspace');
  });
  splitter.addEventListener('pointermove',event=>{if(drag)set((event.clientX-drag.left)/drag.width*100);});
  const done=()=>{drag=null;root.classList.remove('resizing-workspace');};
  splitter.addEventListener('pointerup',done);splitter.addEventListener('lostpointercapture',done);
  function mode(enabled){
    root.classList.toggle('writing-only',enabled);focus.setAttribute('aria-pressed',String(enabled));
    focus.textContent=enabled?'Show preview':'Writing mode';
    const library=document.querySelector('.library');
    library.inert=enabled||matchMedia('(max-width:650px)').matches&&!library.classList.contains('is-open');
    document.querySelector('.preview-pane').inert=enabled;
    document.querySelector('#library-toggle').hidden=enabled;
    store.set('notes:writing-only',String(enabled));if(!enabled)onPreview();
  }
  focus.addEventListener('click',()=>mode(!root.classList.contains('writing-only')));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('#modal').open&&!document.querySelector('.context-menu')&&root.classList.contains('writing-only'))mode(false);});
  mode(store.get('notes:writing-only')==='true');
}
