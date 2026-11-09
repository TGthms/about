"""Reusable content survives publication, private previews, and narrow-screen fallbacks."""
import base64
import copy
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
import wave
import yaml
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
def module(name):
 s=importlib.util.spec_from_file_location('blocks_test_'+name,ROOT/'scripts/notes'/f'{name}.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
notes=module('build');authoring=module('authoring');releases=module('releases');uploader=module('preview_upload')

class BlocksTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name).resolve();self.private=self.root/'content';self.public=self.root/'public'
  for p in ('notes','media/images','media/audio','media/downloads'):(self.private/p).mkdir(parents=True,exist_ok=True)
  for name,color in [('before','steelblue'),('after','goldenrod')]:Image.new('RGB',(240,160),color).save(self.private/f'media/images/{name}.png')
  with wave.open(str(self.private/'media/audio/sample.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(8000);w.writeframes(b'\0\0'*800)
  (self.private/'media/downloads/data.csv').write_text('place,value\nDetroit,1\n')
  self.public.mkdir()
  for d in ('js','css'):shutil.copytree(ROOT/'public'/d,self.public/d)
  for f in ('index.html','sitemap.xml'):shutil.copyfile(ROOT/'public'/f,self.public/f)
  self.blocks=[
   {'type':'gallery','images':[{'image':f'/media/images/{name}.png','alt':f'{name} landscape','caption':name} for name in ('before','after')],'caption':'Two photographs'},
   {'type':'audio','title':'A recording','source':{'type':'upload','file':'/media/audio/sample.wav'},'transcript':'A quiet recording.'},
   {'type':'aside','title':'A personal observation','body':'<p>My note.</p>'},
   {'type':'details','title':'How this works','body':'<h2>Optional detail</h2><p>An explanation.</p>'},
   {'type':'link','title':'A project','url':'https://example.com/project','description':'What this link offers.','image':{'type':'custom','image':'/media/images/before.png','alt':'Project photograph'}},
   {'type':'download','title':'Example data','file':'/media/downloads/data.csv'},
   {'type':'quote','text':'A quotation.','author':'An author','source':'A book','url':'https://example.com/book'},
   {'type':'code','code':'const x = "<script>doNotRun()</script>";\nconsole.log(x);','filename':'example.js','language':'JavaScript'},
   {'type':'comparison','before':{'image':'/media/images/before.png','alt':'Before view'},'after':{'image':'/media/images/after.png','alt':'After view'},'caption':'The same scene'}]
  self.post={'title':'Content formats','date':'2026-10-31','language':'en','published':True,'body':'<p>Introduction.</p>','blocks':self.blocks}
  self.path=self.private/'notes/example.json';self.path.write_text(json.dumps(self.post))
 def tearDown(self):self.temp.cleanup()
 def test_all_nine_blocks_render_semantically_and_without_active_author_code(self):
  self.assertEqual(authoring.issues(self.post,self.private),([],[]));notes.build(self.private,self.public)
  page=(self.public/'notes/example.html').read_text()
  for kind in notes.content_blocks.KINDS:self.assertIn(f'data-note-block="{kind}"',page)
  self.assertIn('<audio controls preload="none"',page);self.assertIn('<details class="note-details"',page)
  self.assertIn('<h3>Optional detail</h3>',page);self.assertNotIn('id="section-1"',page)
  self.assertIn('&lt;script&gt;doNotRun()',page);self.assertNotIn('<script>doNotRun()',page)
  self.assertIn('note-blocks.js?v=',page);self.assertIn('note-blocks.css?v=',page)
  self.assertIn('data-code-copy hidden',page);self.assertIn('note-comparison__control" hidden',page)
  self.assertIn('class="note-link-card',page);self.assertIn('target="_blank" rel="noopener noreferrer"',page)
  self.assertEqual(len(list((self.public/'assets/notes').glob('*.wav'))),1)
  self.assertEqual(len(list((self.public/'assets/notes').glob('*.csv'))),1)
  self.assertNotIn('note-blocks.js',(self.public/'notes.html').read_text())
 def test_previews_bundle_audio_downloads_and_only_trusted_enhancement_scripts(self):
  out=self.root/'preview';notes.build(self.private,self.public,self.path,out)
  page=(out/'example.html').read_text()
  self.assertIn('data:audio/wav;base64,',page);self.assertIn('data:text/csv;base64,',page)
  self.assertNotIn('<script src=',page);self.assertIn('Optional controls;',page)
  files=uploader.bundle(out)
  self.assertTrue(any(f.endswith('.wav') for f in files));self.assertTrue(any(f.endswith('.csv') for f in files))
  self.assertNotIn('data:audio/wav',files['example.html'][0].decode());self.assertIn('data:audio/wav',page)
 def test_validation_points_to_missing_media_descriptions_and_unsupported_files(self):
  cases=[({'type':'gallery','images':[]},'Photos'),({'type':'comparison','before':{},'after':{}},'Before'),
   ({'type':'audio','title':'Audio','source':{'type':'hosted','url':'https://example.com/listen'}},'Audio URL'),
   ({'type':'download','title':'File','file':'/media/downloads/missing.html'},'File'),
   ({'type':'details','title':'','body':''},'Heading'),({'type':'quote','text':''},'Quotation'),
   ({'type':'code','code':' '},'Code'),({'type':'link','title':'Unsafe','url':'javascript:alert(1)'},'Link')]
  for block,label in cases:self.assertIn(label,'\n'.join(authoring.issues({**self.post,'blocks':[block]},self.private)[0]))
  photo=copy.deepcopy(self.blocks[0]);photo['images'][1]['alt']=''
  self.assertIn('Photo 2 → Image description','\n'.join(authoring.issues({**self.post,'blocks':[photo]},self.private)[0]))
  bad=copy.deepcopy(self.blocks[4]);bad['image']['alt']=''
  self.assertIn('Image description','\n'.join(authoring.issues({**self.post,'blocks':[bad]},self.private)[0]))
 def test_media_limits_traversal_and_all_download_formats(self):
  for ref in ('/media/../secret.wav','https://example.com/audio.wav','/media/audio/missing.wav'):
   block={**self.blocks[1],'source':{'type':'upload','file':ref}}
   self.assertTrue(authoring.issues({**self.post,'blocks':[block]},self.private)[0])
  p=self.private/'media/downloads/large.zip'
  with p.open('wb') as f:f.truncate(21*1024*1024)
  self.assertIn('20 MB','\n'.join(authoring.issues({**self.post,'blocks':[{'type':'download','title':'Large','file':'/media/downloads/large.zip'}]},self.private)[0]))
  for ext,mime in authoring.DOWNLOAD_TYPES.items():
   p=self.private/f'media/downloads/test.{ext}';p.write_bytes(b'fixture')
   url,actual,size=notes.Media(self.private,self.root/'output').file('/media/downloads/test.'+ext,'../','download')
   self.assertEqual(actual,mime);self.assertEqual(size,7);self.assertTrue(url.endswith('.'+ext))
 def test_new_media_are_revision_pinned_and_unrelated_uploads_stay_private(self):
  def git(*args):return subprocess.run(['git','-C',str(self.private),*args],check=True,capture_output=True,text=True).stdout.strip()
  git('init');git('config','user.name','Test');git('config','user.email','test@example.com');git('add','.');git('commit','-m','Saved content')
  releases.initialize(self.private);notes.build(self.private,self.public)
  before={p.relative_to(self.public):p.read_bytes() for p in (self.public/'assets/notes').rglob('*') if p.is_file()}
  (self.private/'media/audio/sample.wav').write_bytes(b'UNPUBLISHED_AUDIO')
  (self.private/'media/downloads/data.csv').write_text('UNPUBLISHED_DOWNLOAD')
  (self.private/'media/downloads/private.txt').write_text('UNREFERENCED_SECRET')
  git('add','.');git('commit','-m','Private media changes');notes.build(self.private,self.public)
  self.assertEqual(before,{p.relative_to(self.public):p.read_bytes() for p in (self.public/'assets/notes').rglob('*') if p.is_file()})
 def test_local_links_and_quotation_attribution_are_safely_escaped(self):
  media=notes.Media(self.private,self.root/'output')
  post={**self.post,'blocks':[{'type':'link','title':'<img onerror=alert(1)>','url':'/index.html#projects'}, {'type':'quote','text':'<script>x</script>','author':'<b>Author</b>','url':'javascript:alert(1)'}]}
  markup=notes.body(post,media,'')
  self.assertIn('https://timgong.me/index.html#projects',markup);self.assertNotIn('target="_blank"',markup)
  self.assertIn('&lt;b&gt;Author&lt;/b&gt;',markup);self.assertNotIn('javascript:',markup)
 def test_all_languages_have_readable_static_labels_and_editor_guidance(self):
  c=yaml.safe_load((ROOT/'scripts/notes/private-repository/.pages.yml').read_text())
  blocks={b['name']:b for b in c['components']['blocks']['blocks']}
  for kind in notes.content_blocks.KINDS:self.assertIn(kind,blocks);self.assertTrue(any(f.get('description') for f in blocks[kind]['fields']))
  self.assertNotIn('same-study',blocks)
  for language in notes.LANGS:
   post={**self.post,'language':language}
   markup=notes.body(post,notes.Media(self.private,self.root/'output'), '')
   for key in ('copyCode','beforeImage','afterImage'):
    text=dict(zip(notes.content_blocks.WORD_KEYS,notes.content_blocks.WORDS[language]))[key]
    self.assertIn(text,markup)

if __name__=='__main__':unittest.main()
