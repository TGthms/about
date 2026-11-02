"""Synthetic public Notes archive; no access to the author's private repository."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import importlib.util
import json
import shutil
import signal
import tempfile
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('search_build',ROOT/'scripts/notes/build.py');notes=importlib.util.module_from_spec(spec);spec.loader.exec_module(notes)
root=Path(tempfile.mkdtemp(prefix='notes-search-check-'))
content=root/'content';public=root/'public';(content/'notes').mkdir(parents=True);(content/'media').mkdir();public.mkdir()
for name in ('css','js'):shutil.copytree(ROOT/'public'/name,public/name)
for name in ('index.html','sitemap.xml','favicon.svg'):shutil.copyfile(ROOT/'public'/name,public/name)
for i in range(8):
    value={'published':True,'date':'2026-01-01' if i<4 else '2025-01-01','language':'en','title':'Public note '+str(i),'body':'<p>Orchard apples and morning photographs.</p>'}
    if i==0:value.update(title='<img src=x onerror=alert(1)>',translations=[{'published':True,'language':'zh','title':'果园随记','body':'<p>清晨在果园拍照。</p>'}])
    (content/'notes'/('note-'+str(i)+'.json')).write_text(json.dumps(value))
notes.build(content,public)
class Quiet(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(public),**kw)
    def log_message(self,*args):pass
ThreadingHTTPServer.request_queue_size=64
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
def stop(*args):raise KeyboardInterrupt
signal.signal(signal.SIGTERM,stop)
print(json.dumps({'url':'http://127.0.0.1:'+str(server.server_port)+'/notes.html'}),flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close();shutil.rmtree(root)
