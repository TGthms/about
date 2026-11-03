"""Synthetic parity fixture. Never opens the author's private repository."""
import base64
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from PIL import Image,ImageCms

ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('block_fixture',ROOT/'tests/notes_blocks_test.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
if len(sys.argv)==1:
    case=module.BlocksTests();case.setUp()
    try:
        before=case.private/'media/images/before.png'
        with Image.open(before) as image:image.save(before,icc_profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
        doc={**case.post,'published':False,'slug':'formats','font':'serif','editor_version':2,'body':'<h2>A first section</h2><p>Writing on one device, continuing on another.</p>',
             'same_study':{'type':'same-study','before_block':3,'introduction':'A signal to decode.'},
             'blocks':[{'type':'text','body':'<p>Another paragraph.</p>'},{'type':'photo','image':'/media/images/before.png','alt':'Blue landscape'},
                       {'type':'video','source':{'type':'hosted','url':'https://example.test/video.mp4'},'caption':'A short clip'},
                       {'type':'table','caption':'A table','columns':['Place','Value'],'rows':[{'cells':['Detroit','1']}]}]+case.blocks,
             'translations':[{'language':'zh','title':'跨设备写作','body':'<p>在手机上写，在 Mac 上继续。</p>','published':True}]}
        kinds={'images':'photographs','audio':'audio','downloads':'downloads'}
        files=[{'path':'/'+p.relative_to(case.private).as_posix(),'kind':kinds[p.parent.name],'name':p.name,'data':base64.b64encode(p.read_bytes()).decode()} for p in case.private.rglob('*') if p.is_file() and 'media' in p.parts]
        print(json.dumps({'document':doc,'files':files},ensure_ascii=False))
    finally:case.tearDown()
else:
    value=json.load(sys.stdin)
    with tempfile.TemporaryDirectory() as temporary:
        private=Path(temporary)/'content';(private/'notes').mkdir(parents=True)
        for file in value['files']:
            path=private/file['path'].lstrip('/');path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(base64.b64decode(file['data']))
        selected=private/'notes/example.json';selected.write_text(json.dumps(value['document'],ensure_ascii=False))
        output=Path(temporary)/'preview';module.notes.build(private,ROOT/'public',selected,output)
        page=output/(value['document']['slug']+'.html');print(page.read_text())
