"""Editor data round trips, publication actions, and actionable validation."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location('test_' + name, ROOT / 'scripts/notes' / (name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


authoring, notes, releases = module('authoring'), module('build'), module('releases')
preview_upload, deployment = module('preview_upload'), module('deployment')


class AuthoringTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        (self.root / 'media/images').mkdir(parents=True)
        (self.root / 'media/images/photo.png').write_bytes(b'fixture')
        self.post = {'title':'Original wording', 'date':'2026-10-31', 'language':'en', 'body':'<p>Unchanged text.</p>', 'published':True}

    def tearDown(self): self.temp.cleanup()

    def test_migration_preserves_author_content_and_unknown_fields(self):
        old = {**self.post, 'slug':'established-address', 'cover':'/media/images/photo.png', 'cover_alt':'A photograph',
               'extra':{'keep':'this'}, 'categories':['Birthday','Learning'],
               'blocks':[{'type':'video','file':'/media/videos/a.mp4','url':'https://example.com/unused.mp4','caption':'Original caption'}],
               'translations':[{'language':'zh','body':'<p>原文。</p>','published':False}]}
        before = copy.deepcopy(old); new = authoring.migrate(old, 'automatic.json')
        self.assertEqual(old, before)
        self.assertEqual(new['body'], old['body']); self.assertEqual(new['translations'], old['translations'])
        self.assertEqual(new['extra'], old['extra']); self.assertEqual(new['slug'], 'established-address')
        self.assertEqual(new['sharing_image'], {'type':'custom','image':old['cover'],'alt':old['cover_alt']})
        self.assertTrue(new['birthday'])
        self.assertEqual(new['blocks'][0]['source'], {'type':'upload','file':'/media/videos/a.mp4'})
        self.assertEqual(authoring.migrate(new, 'automatic.json'), new)
        new['birthday'] = False
        self.assertFalse(authoring.migrate(new, 'automatic.json')['birthday'])

    def test_new_groups_clear_legacy_fields_and_video_choice_is_explicit(self):
        value = {**self.post,'cover':'/media/images/old.png','cover_alt':'Old', 'sharing_image':{},
                 'blocks':[{'type':'video','file':'/media/videos/old.mp4','source':{'type':'hosted','url':'https://example.com/new.webm'}}]}
        result = authoring.normalize(value)
        self.assertEqual(result['cover'],''); self.assertEqual(result['cover_alt'],'')
        self.assertEqual(result['blocks'][0]['file'],'')
        self.assertEqual(result['blocks'][0]['url'],'https://example.com/new.webm')
        self.assertEqual(value['cover'],'/media/images/old.png')

    def test_image_choices_preserve_existing_photos_and_can_return_to_defaults(self):
        value={**self.post,'editor_version':2,
               'sharing_image':{'image':'/media/images/photo.png','alt':'Original description','credit':'Kept'},
               'list_image':{'image':'','alt':''}}
        migrated=authoring.migrate(value,'post.json')
        self.assertEqual(migrated['sharing_image'],{'type':'custom',**value['sharing_image']})
        self.assertIsNone(migrated['list_image'])
        self.assertEqual(authoring.normalize(migrated)['cover'],'/media/images/photo.png')
        self.assertEqual(authoring.issues(migrated,self.root),([],[]))
        migrated['cover']='/media/images/old.png'
        migrated['sharing_image']=None
        self.assertEqual(authoring.normalize(migrated)['cover'],'')
        self.assertEqual(authoring.issues(migrated,self.root),([],[]))
        selected={**self.post,'sharing_image':{'type':'custom','image':'','alt':''}}
        self.assertIn('Sharing image → Image','\n'.join(authoring.issues(selected,self.root)[0]))
        self.assertEqual(authoring.issues(selected,self.root,strict=False)[0],[])

    def test_article_experiment_is_preserved_outside_reusable_content_menu(self):
        study={'type':'same-study','introduction':'My original introduction.'}
        old={**self.post,'editor_version':2,'blocks':[{'type':'text','body':'<p>Before.</p>'},study,{'type':'text','body':'<p>After.</p>'}],
             'translations':[{'language':'zh','published':True,'body':'<p>原文。</p>','blocks':[{'type':'same-study'}, {'type':'text','body':'<p>结尾。</p>'}]}]}
        before=copy.deepcopy(old)
        new=authoring.migrate(old,'article.json')
        self.assertEqual(old,before)
        self.assertEqual(new['same_study'],{**study,'before_block':1})
        self.assertNotIn('same-study',[b['type'] for b in new['blocks']])
        self.assertEqual(authoring.migrate(new,'article.json'),new)
        normalized=authoring.normalize(new)
        self.assertEqual(normalized['blocks'],old['blocks'])
        self.assertEqual(normalized['translations'][0]['blocks'],old['translations'][0]['blocks'])
        self.assertEqual(authoring.normalize(normalized),normalized)
        self.assertEqual(authoring.issues(new,self.root),([],[]))
        media=notes.Media(self.root,self.root/'output')
        self.assertEqual(notes.body(normalized,media,''),notes.body(old,media,''))
        config=yaml.safe_load((ROOT/'scripts/notes/private-repository/.pages.yml').read_text())
        self.assertNotIn('same-study',[b['name'] for b in config['components']['blocks']['blocks']])
        hidden=config['components']['article-study']
        self.assertTrue(hidden['hidden']);self.assertTrue(hidden['readonly'])
        fields=config['content'][0]['fields']
        for versions in (fields,next(f for f in fields if f['name']=='translations')['fields']):
            self.assertEqual(next(f for f in versions if f['name']=='same_study')['component'],'article-study')

    def test_errors_identify_all_fields_and_draft_preview_keeps_alt_as_warning(self):
        value={**self.post,'sharing_image':{'image':'/media/images/photo.png'},'categories':['x'*49],
               'blocks':[{'type':'photo','image':'/media/images/missing.png','alt':''}],
               'translations':[{'language':'en','published':True,'body':'<p>duplicate</p>'}]}
        errors,_ = authoring.issues(value,self.root)
        text='\n'.join(errors)
        for label in ('Sharing image → Image description','Categories','English → Photo 1','Translation 1'):
            self.assertIn(label,text)
        errors,warnings = authoring.issues({**self.post,'sharing_image':{'image':'/media/images/photo.png'}},self.root,strict=False)
        self.assertEqual(errors,[]); self.assertIn('Sharing image → Image description',warnings[0])
        self.assertEqual(authoring.issues(self.post,self.root),([],[]))

    def test_media_paths_and_hosted_video_links_are_checked(self):
        for src in ('/media/../secret.png','/media/images/not-there.png','https://example.com/public.png'):
            errors,_=authoring.issues({**self.post,'sharing_image':{'image':src,'alt':'Photo'}},self.root)
            self.assertTrue(errors,src)
        for url in ('http://example.com/a.mp4','https://example.com/watch','javascript:alert(1)'):
            errors,_=authoring.issues({**self.post,'blocks':[{'type':'video','source':{'type':'hosted','url':url}}]},self.root)
            self.assertIn('Hosted link','\n'.join(errors))
        self.assertEqual(authoring.issues({**self.post,'blocks':[{'type':'video','source':{'type':'hosted','url':'https://example.com/a.mp4?key=value'}}]},self.root),([],[]))

    def test_table_has_field_errors_and_semantic_escaped_output(self):
        block={'type':'table','caption':'Event comparison','columns':['Event','Area'], 'rows':[{'cells':['RWT','<script>test</script>']}]}
        post={**self.post,'blocks':[block]}
        self.assertEqual(authoring.issues(post,self.root),([],[]))
        markup=notes.body(post,notes.Media(self.root,self.root/'output'),'')
        self.assertIn('<caption>Event comparison</caption>',markup)
        self.assertIn('<th scope="col">Event</th>',markup)
        self.assertIn('&lt;script&gt;test&lt;/script&gt;',markup)
        self.assertNotIn('<script>',markup)
        block['rows'][0]['cells']=['Only one']
        self.assertIn('Row 1','\n'.join(authoring.issues(post,self.root)[0]))

    def test_pasted_table_survives_sanitization_without_unsafe_attributes(self):
        markup=notes.rich('<table onclick="alert(1)"><caption>Signals</caption><tr><th>Event</th><th scope="row">Area</th></tr><tr><td colspan="2" style="color:red">RWT</td></tr></table><p>After</p>',notes.Media(self.root,self.root/'output'),'')
        self.assertIn('<table>',markup); self.assertIn('<td colspan="2">RWT</td>',markup)
        self.assertIn('</table></div><p>After</p>',markup)
        self.assertNotIn('onclick',markup); self.assertNotIn('style=',markup)

    def test_withdraw_preserves_original_and_republication_history(self):
        (self.root/'notes').mkdir(); path=self.root/'notes/example.json'; path.write_text(json.dumps(self.post))
        def git(*args):
            return subprocess.run(['git','-C',str(self.root),*args],check=True,capture_output=True,text=True).stdout.strip()
        git('init');git('config','user.name','Test');git('config','user.email','test@example.com')
        git('add','.');git('commit','-m','Fixture')
        releases.initialize(self.root)
        before=path.read_bytes(); old=releases.load(self.root)['entries']['notes/example.json']
        releases.withdraw(self.root,'notes/example.json')
        self.assertEqual(path.read_bytes(),before)
        self.assertTrue(releases.load(self.root)['entries']['notes/example.json']['withdrawn'])
        releases.materialize(self.root,self.root/'withdrawn')
        self.assertFalse((self.root/'withdrawn/notes/example.json').exists())
        releases.select(self.root,'notes/example.json')
        entry=releases.load(self.root)['entries']['notes/example.json']
        self.assertFalse(entry['withdrawn']);self.assertEqual(entry['published_at'],old['published_at'])
        self.post['published']=False;path.write_text(json.dumps(self.post));git('add','.');git('commit','-m','Private changes')
        previous=(self.root/'.published.json').read_bytes()
        result=subprocess.run(['python3',str(ROOT/'scripts/notes/releases.py'),'select','--content',str(self.root),'--payload',json.dumps({'context':{'path':'notes/example.json'},'action':{'name':'publish-note'}})],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0);self.assertIn('Ready to publish',result.stderr)
        self.assertEqual((self.root/'.published.json').read_bytes(),previous)

    def test_editor_configuration_only_shows_required_image_fields_after_opting_in(self):
        config=yaml.safe_load((ROOT/'scripts/notes/private-repository/.pages.yml').read_text())
        self.assertTrue(config['settings']['content']['merge'])
        collection=config['content'][0];fields={f['name']:f for f in collection['fields']}
        self.assertFalse(collection['operations']['rename']);self.assertFalse(collection['operations']['delete'])
        self.assertLess(list(fields).index('body'),list(fields).index('font'))
        for key in ('sharing_image','list_image'):
            self.assertNotIn('required',fields[key])
            self.assertNotIn('(optional)',fields[key]['label'])
            self.assertEqual(fields[key]['type'],'block')
            self.assertNotIn('default',fields[key])
            self.assertEqual(fields[key]['blockKey'],'type')
            self.assertEqual(fields[key]['blocks'][0]['name'],'custom')
            self.assertTrue(all(f.get('required') for f in fields[key]['blocks'][0]['fields']))
        self.assertEqual(fields['categories']['list']['max'],8)
        self.assertEqual(fields['categories']['options']['maxlength'],48)
        actions={a['name']:a for a in collection['actions']}
        self.assertFalse(actions['publish-note']['cancelable']);self.assertFalse(actions['withdraw-note']['cancelable'])

    def test_browser_bundle_deduplicates_media_and_preserves_downloads(self):
        import base64
        data=base64.b64encode(b'private image bytes').decode()
        html='<html lang="zh-Hant"><img src="data:image/webp;base64,'+data+'" /><video poster="data:image/webp;base64,'+data+'"></video></html>'
        path=self.root/'preview.zh-Hant.html';path.write_text(html)
        files=preview_upload.bundle(self.root)
        self.assertEqual(len([n for n in files if n.endswith('.webp')]),1)
        self.assertNotIn('data:image',files[path.name][0].decode())
        self.assertEqual(path.read_text(),html)
        self.assertEqual(json.loads(files['index.json'][0])['files'][0]['language'],'zh-Hant')

    def test_browser_uploader_identifies_itself_on_health_and_upload_requests(self):
        from unittest.mock import patch
        from io import BytesIO
        (self.root/'preview.html').write_text('<html lang="en"><p>Fixture</p></html>')
        requests=[]
        def respond(request,timeout):
            requests.append(request)
            response=BytesIO(b'{"ready":true}' if request.full_url.endswith('/health') else b'')
            response.status=200 if request.full_url.endswith('/health') else 201
            return response
        with patch.object(preview_upload.urllib.request,'urlopen',side_effect=respond):
            url=preview_upload.upload(self.root,'https://preview.example.com','123-1','short-lived-fixture')
        self.assertEqual(url,'https://preview.example.com/preview/123-1/')
        self.assertEqual(len(requests),3)
        self.assertTrue(all(r.get_header('User-agent')==preview_upload.USER_AGENT for r in requests))
        self.assertIsNone(requests[0].get_header('Authorization'))

    def test_deployment_success_requires_both_hosts_and_latest_attempt(self):
        checks=[{'id':1,'name':'Cloudflare Pages','status':'completed','conclusion':'success'}]
        self.assertFalse(deployment.checks_ready(checks))
        checks.append({'id':2,'name':'Deploy to GitHub Pages','status':'completed','conclusion':'success'})
        self.assertTrue(deployment.checks_ready(checks))
        checks.append({'id':3,'name':'Cloudflare Pages','status':'in_progress','conclusion':None})
        self.assertFalse(deployment.checks_ready(checks))
        checks[-1].update(status='completed',conclusion='failure')
        with self.assertRaises(ValueError):deployment.checks_ready(checks)

    def test_workflow_python_snippets_and_preview_identity_permissions(self):
        for path in (ROOT/'scripts/notes/private-repository/.github/workflows').glob('*.yml'):
            workflow=yaml.safe_load(path.read_text())
            for job in workflow['jobs'].values():
                for step in job['steps']:
                    script=step.get('run','')
                    for marker in ("python - <<'PY'\n","python3 - <<'PYCODE'\n"):
                        if marker in script:
                            delimiter='PYCODE' if 'PYCODE' in marker else 'PY'
                            source=script.split(marker,1)[1].rsplit('\n'+delimiter,1)[0]
                            compile(source,str(path),'exec')
            if path.name=='preview.yml':self.assertEqual(workflow['permissions']['id-token'],'write')


if __name__ == '__main__': unittest.main()
