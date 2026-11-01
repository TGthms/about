"""Disposable, synthetic workspace for browser checks; never touches real Notes."""
from pathlib import Path
import importlib.util
import json
import shutil
import signal
import subprocess
import tempfile
from PIL import Image

HERE = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fixture_manager', HERE / 'server.py')
manager = importlib.util.module_from_spec(spec); spec.loader.exec_module(manager)
root = Path(tempfile.mkdtemp(prefix='notes-manager-browser-')).resolve()
content = root / 'content'
(content / 'notes').mkdir(parents=True)
(content / 'media/images').mkdir(parents=True)
(content / 'media/downloads').mkdir(parents=True)
(content / 'media/downloads/example.csv').write_text('place,value\nDetroit,1\n')
Image.new('RGB', (640, 400), 'steelblue').save(content / 'media/images/sample.webp')
note = {'title':'An existing note', 'slug':'existing', 'date':'2026-10-31', 'language':'en',
        'body':'<p>Existing writing.</p>', 'blocks':[], 'translations':[], 'published':False, 'editor_version':2,
        'custom_metadata':{'preserve':True}}
(content / 'notes/example.json').write_bytes(manager.encode(note))
(content / '.published.json').write_bytes(manager.encode({'version':1,'entries':{}}))
def git(*args): return subprocess.run(['git','-C',str(content),*args],check=True,capture_output=True)
git('init','-b','main'); git('config','user.name','Manager check'); git('config','user.email','test@example.com')
git('add','.'); git('commit','-m','Synthetic fixture')
subprocess.run(['git','init','--bare','-b','main',str(root/'remote.git')],check=True,capture_output=True)
git('remote','add','origin',str(root/'remote.git'));git('push','-u','origin','main')
app = manager.Workspace(content, root / 'state'); server = manager.serve(app,0)
def stop(*_): raise KeyboardInterrupt
signal.signal(signal.SIGTERM,stop)
print(json.dumps({'root':str(root),'origin':server.origin,'url':server.origin+'/?token='+server.token}),flush=True)
try: server.serve_forever()
except KeyboardInterrupt: pass
finally:
    server.server_close();app.pool.shutdown(wait=True,cancel_futures=True);shutil.rmtree(root)
