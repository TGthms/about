// Runs only on the author's device. No Python rendering or image encoding on Cloudflare.
import {loadPyodide} from '/runtime/314.0.7/pyodide.mjs';
let runtime;
const media=new Map();
async function start(){
  if(runtime)return runtime;
  runtime=(async()=>{
    postMessage({status:'Preparing the preview engine on this device…'});
    const engine=await loadPyodide({indexURL:new URL('/runtime/314.0.7/',location.href).href,stdout:()=>{},stderr:()=>{}});
    await engine.loadPackage('pillow');
    const response=await fetch('/renderer.json');if(!response.ok)throw new Error('Sign in again to load the private preview engine.');
    const files=await response.json();
    for(const [name,text]of Object.entries(files)){engine.FS.mkdirTree(name.slice(0,name.lastIndexOf('/')));engine.FS.writeFile(name,text);}
    engine.runPython(`import sys, importlib.util, json, shutil
from pathlib import Path
sys.path.insert(0, '/workspace/scripts/notes')
spec=importlib.util.spec_from_file_location('notes_renderer', '/workspace/scripts/notes/build.py')
notes=importlib.util.module_from_spec(spec);spec.loader.exec_module(notes)
private=Path('/draft'); private.mkdir(exist_ok=True); (private/'notes').mkdir(exist_ok=True); (private/'media').mkdir(exist_ok=True)
output=Path('/preview'); output.mkdir(exist_ok=True)
cache=Path('/cache');(cache/'assets/notes').mkdir(parents=True,exist_ok=True)
media_cache=notes.Media(private,cache,preview=True)
notes.Media=lambda *_args,**_kwargs:media_cache
def render(payload):
    value=json.loads(payload)
    for p in (private/'notes').glob('*'): p.unlink()
    selected=private/'notes/example.json'; selected.write_text(json.dumps(value['document'],ensure_ascii=False))
    errors,warnings=notes.authoring.issues(value['document'],private,strict=False)
    if errors:return json.dumps({'errors':errors,'warnings':warnings})
    for p in output.glob('*'): p.unlink()
    notes.build(private,Path('/workspace/public'),selected,output)
    slug=value['document'].get('slug') or 'example'
    language=value.get('language') or value['document'].get('language','en')
    suffix='.'+language if language!=value['document'].get('language','en') else ''
    page=output/(slug+suffix+'.html')
    if not page.exists():page=next(output.glob('*.html'))
    markup=page.read_text().replace('<html ','<html data-theme="'+('dark' if value.get('theme')=='dark' else 'light')+'" ',1)
    markup=markup.replace('</head>','<style>.site-header,.site-footer,.note-return{display:none!important}.notes-main{padding-top:32px!important}</style></head>')
    return json.dumps({'html':markup,'warnings':warnings})
`);
    return engine;
  })();
  try{return await runtime;}catch(error){runtime=null;throw error;}
}
async function colorManaged(bytes){
  // The browser's native decoder handles ICC conversion; originals remain untouched.
  const bitmap=await createImageBitmap(new Blob([bytes]),{imageOrientation:'from-image',colorSpaceConversion:'default'});
  try{if(bitmap.width*bitmap.height>60_000_000)throw new Error('Resize this preview image below 60 megapixels.');
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{colorSpace:'srgb'});
    if(!context)throw new Error('Color-managed preview is unavailable in this browser.');context.drawImage(bitmap,0,0);
    return new Uint8Array(await(await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
  }finally{bitmap.close();}
}
async function render(message){
  const engine=await start();
  const refs=[...new Set(JSON.stringify(message.document).match(/\/media\/(?:images|videos|audio|downloads)\/[a-zA-Z0-9_.-]+/g)||[])];
  // A bounded test cache prevents repeatedly downloading each image while typing.
  for(const ref of refs){
    if(!media.has(ref)){
      const response=await fetch('/api/file?path='+encodeURIComponent(ref));if(!response.ok)throw new Error('A private upload is unavailable. Sign in again or choose the file again.');
      let bytes=new Uint8Array(await response.arrayBuffer());
      if(ref.startsWith('/media/images/'))bytes=await colorManaged(bytes);
      if(bytes.byteLength>40*1024*1024)throw new Error('This image needs too much preview memory on this device. Use the Mac preview for this file.');
      engine.FS.mkdirTree('/draft'+ref.slice(0,ref.lastIndexOf('/')));engine.FS.writeFile('/draft'+ref,bytes);media.set(ref,bytes.byteLength);
    }
  }
  for(const [ref]of media)if(!refs.includes(ref)){engine.FS.unlink('/draft'+ref);media.delete(ref);}
  engine.globals.set('payload',JSON.stringify(message));
  try{return JSON.parse(engine.runPython('render(payload)'));}finally{engine.globals.delete('payload');}
}
let chain=Promise.resolve();
self.onmessage=event=>{chain=chain.then(async()=>{
  const {id,...message}=event.data;
  try{const started=performance.now(),result=await render(message);postMessage({id,...result,elapsed_ms:Math.round(performance.now()-started),memory_bytes:(await runtime)._module.HEAPU8.byteLength});}
  catch(error){postMessage({id,error:String(error.message||error).slice(0,2000)});}
});};
