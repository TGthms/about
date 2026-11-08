#!/usr/bin/env python3
"""Build only application code/public renderer inputs. Never read private drafts."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]

def build(runtime):
    manifest=json.loads((HERE/'runtime-manifest.json').read_text())
    output=HERE/'dist'
    for name,expected in manifest['files'].items():
        source=runtime/name
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=expected:
            raise ValueError('Missing or mismatched pinned runtime file: '+name)
    if output.is_symlink():raise ValueError('Generated output cannot be a symlink.')
    if output.exists():shutil.rmtree(output)
    output.mkdir()
    for name in manifest['files']:
        target=output/'runtime'/manifest['version']/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(runtime/name,target)
    manager=ROOT/'tools/notes-manager'
    for name in ('index.html','style.css','app.js'):
        shutil.copyfile(manager/'static'/name,output/name)
    shutil.copyfile(manager/'THIRD_PARTY_NOTICES.md',output/'editor-notices.txt')
    markup=(output/'index.html').read_text().replace('<html lang="en">','<html lang="en" data-workspace="online-test">')
    markup=markup.replace('Your local workspace','Separate online test').replace('Edits save locally. Sync drafts to exchange changes with GitHub.','Cloud autosave · test notes only').replace('<button id="sync"','<button id="sync" disabled').replace('<button id="workspace-backup" class="quiet">','<button id="workspace-backup" class="quiet" disabled>').replace('<button id="workflow-help" class="quiet">','<button id="workflow-help" class="quiet" hidden>')
    markup=markup.replace('</title>','</title><link rel="icon" href="data:,">')
    markup=markup.replace('<body>','<body><div class="online-test-banner" role="status">Online test workspace · separate from your Mac · no publishing or GitHub backup</div>')
    (output/'index.html').write_text(markup)
    with (output/'style.css').open('a') as target:target.write('\n.online-test-banner{position:relative;z-index:8;background:var(--accent-soft);padding:10px 20px;font-size:12px;text-align:center}.online-test-banner~main{height:calc(100dvh - 39px)}.library{top:39px}\n')
    shutil.copyfile(manager/'schema.json',output/'schema.json')
    shutil.copytree(manager/'vendor/og-studio',output/'studio',dirs_exist_ok=True)
    shutil.copyfile(HERE/'preview-worker.mjs',output/'preview-worker.mjs')
    frame="""<!doctype html><html><meta charset="utf-8"><title>Private preview frame</title><script>
const identity=new URLSearchParams(location.search).get('id');
addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='notes-browser-frame-render'||event.data.id!==identity||typeof event.data.html!=='string')return;document.open();document.write(event.data.html);document.close()});
parent.postMessage({type:'notes-browser-frame-ready',id:identity},'*');
</script></html>"""
    (output/'preview-frame.html').write_text(frame)
    import re,base64
    studio=(output/'studio/index.html').read_text()
    script=re.search(r'<script>(.*?)</script>',studio,re.S)[1]
    (output/'studio-policy.txt').write_text("default-src 'self'; script-src 'sha256-"+base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()+"'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'")
    sources={}
    for name in ('build.py','authoring.py','content_blocks.py','preview_upload.py'):
        sources['/workspace/scripts/notes/'+name]=(ROOT/'scripts/notes'/name).read_text()
    sources['/workspace/templates/notes-shell.html']=(ROOT/'templates/notes-shell.html').read_text()
    sources['/workspace/public/index.html']='<!-- notes-entrance:start --><!-- notes-entrance:end -->'
    sources['/workspace/public/sitemap.xml']='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />'
    for folder,names in [('css',['styles.css','notes.css','compact.css','same-study.css','note-blocks.css','note-images.css']),('js',['birthday.js','vendor/balloons.js','notes.js','notes-lifetime.js','same-study.js','note-blocks.js','note-images.js','core.js','i18n/data.js','i18n.js'])]:
        for name in names:
            source=ROOT/'public'/folder/name
            if source.exists():sources['/workspace/public/'+folder+'/'+name]=source.read_text()
    # Include empty local placeholders for stripped external resources used by shell().
    import re
    for ref in re.findall(r'(?:src|href)="(?:{{prefix}}|\.\./)((?:js|css)/[^"?]+)',sources['/workspace/templates/notes-shell.html']):
        if '/workspace/public/'+ref not in sources:
            path=ROOT/'public'/ref
            sources['/workspace/public/'+ref]=path.read_text() if path.exists() else ''
    (output/'renderer.json').write_text(json.dumps(sources,ensure_ascii=False))
    (output/'runtime-notices.txt').write_text('Pyodide '+manifest['version']+' and Pillow are self-hosted, pinned by SHA-256.\n'+(runtime/'LICENSE').read_text())
    print('Built isolated online test assets; no private content read.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--runtime',type=Path,required=True);args=parser.parse_args();build(args.runtime)
