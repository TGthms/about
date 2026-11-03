// Optional online test adapter. The normal Mac workspace never starts this Worker.
let worker,pending=new Map(),frames=new Map();
window.addEventListener('message',event=>{
  if(event.source!==document.querySelector('#preview')?.contentWindow)return;
  const frame=frames.get(event.data?.id);if(!frame)return;
  if(event.data.type==='notes-browser-frame-ready'&&!frame.sent){frame.sent=true;event.source.postMessage({type:'notes-browser-frame-render',id:event.data.id,html:frame.html},'*');}
  if(event.data.type==='notes-browser-frame-rendered'){clearTimeout(frame.timer);frames.delete(event.data.id);frame.status?.(frame.warnings.length?frame.warnings.length+' reminder'+(frame.warnings.length===1?'':'s'):'Preview up to date');}
});
export async function browserPreview(message,onStatus){
  if(!worker){
    worker=new Worker('/preview-worker.mjs',{type:'module'});
    worker.onmessage=event=>{
      if(event.data.status){for(const entry of pending.values())entry.status?.(event.data.status);return;}
      const item=pending.get(event.data.id);if(!item)return;pending.delete(event.data.id);
      if(event.data.error||event.data.errors){const error=new Error(event.data.error||'Finish these fields to update the preview.');error.errors=event.data.errors;error.warnings=event.data.warnings;item.reject(error);}
      else item.resolve(event.data);
    };
    worker.onerror=()=>{for(const item of pending.values())item.reject(new Error('The browser preview engine stopped. Your saved draft is retained. Reload the editor or use the Mac manager.'));pending.clear();worker.terminate();worker=null;};
  }
  const id=crypto.randomUUID(),result=await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,status:onStatus});worker.postMessage({id,...message});});
  // Trusted renderer output is isolated in an opaque-origin sandbox, as on Mac.
  const bridge=`(()=>{const id=${JSON.stringify(id)};addEventListener('scroll',()=>parent.postMessage({type:'notes-preview-scroll',id,position:scrollY},'*'),{passive:true});addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='notes-preview-restore'&&e.data.id===id&&Number.isFinite(e.data.position))scrollTo(0,e.data.position)});addEventListener('click',e=>{const a=e.target.closest?.('a');if(!a)return;if(a.hasAttribute('data-note-version')){e.preventDefault();parent.postMessage({type:'notes-preview-language',id,language:a.getAttribute('lang')},'*')}else if(!a.getAttribute('href')?.startsWith('#')){a.target='_blank';a.rel='noopener noreferrer'}});parent.postMessage({type:'notes-browser-frame-rendered',id},'*')})()`;
  const html=result.html.replace('</body>','<script>'+bridge+'</script></body>');
  for(const frame of frames.values())clearTimeout(frame.timer);frames.clear();
  const frame={html,status:onStatus,warnings:result.warnings||[]};frame.timer=setTimeout(()=>{if(frames.has(id)){frames.delete(id);onStatus?.('The preview did not open. Refresh it or use the Mac manager.');}},15000);frames.set(id,frame);
  return{url:'/preview-frame?id='+id,id,warnings:result.warnings||[],elapsed_ms:result.elapsed_ms,memory_bytes:result.memory_bytes};
}
