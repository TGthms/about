"""Local editing must never overwrite another version or publish implicitly."""
import copy
from http.client import HTTPConnection, HTTPSConnection
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import ssl
import unittest
from unittest.mock import patch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('notes_manager', ROOT / 'tools/notes-manager/server.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)


class ManagerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.content = self.root / 'content'
        (self.content / 'notes').mkdir(parents=True)
        (self.content / 'media/images').mkdir(parents=True)
        Image.new('RGB', (120, 80), 'steelblue').save(self.content / 'media/images/example.png')
        self.path = 'notes/example.json'
        self.value = {'title': 'A note', 'slug': 'example', 'date': '2026-10-31', 'language': 'en',
                      'body': '<p>Original.</p>', 'blocks': [], 'translations': [], 'published': True,
                      'editor_version': 2, 'custom_metadata': {'keep': True}}
        (self.content / self.path).write_bytes(manager.encode(self.value))
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Test')
        self.git('config', 'user.email', 'test@example.com')
        self.git('add', '.')
        self.git('commit', '-m', 'Initial private content')
        manager.releases.initialize(self.content)
        self.git('add', '.')
        self.git('commit', '-m', 'Record released revision')
        self.app = manager.Workspace(self.content, self.root / 'state')

    def git(self, *args, cwd=None):
        return subprocess.run(['git', '-C', str(cwd or self.content), *args], check=True, capture_output=True).stdout.decode().strip()

    def tearDown(self):
        self.app.pool.shutdown(wait=True)
        self.temp.cleanup()

    def remote(self):
        remote = self.root / 'remote.git'
        subprocess.run(['git', 'init', '--bare', '-b', 'main', str(remote)], check=True, capture_output=True)
        self.git('remote', 'add', 'origin', str(remote)); self.git('push', '-u', 'origin', 'main')
        clone = self.root / 'online'
        subprocess.run(['git', 'clone', str(remote), str(clone)], check=True, capture_output=True)
        self.git('config', 'user.name', 'Online', cwd=clone); self.git('config', 'user.email', 'online@example.com', cwd=clone)
        return clone

    def test_autosave_is_local_and_preserves_unrecognized_fields_and_release_pin(self):
        pin = (self.content / '.published.json').read_bytes()
        opened = self.app.get(self.path); doc = opened['document']; doc['body'] = '<p>Private revision.</p>'
        result = self.app.save(self.path, doc, opened['etag'])
        self.assertEqual(result['status'], 'Unpublished changes')
        self.assertEqual(self.app.get(self.path)['document']['custom_metadata'], {'keep': True})
        self.assertEqual(pin, (self.content / '.published.json').read_bytes())
        self.assertIn('Original', manager.releases.read_note(self.content, self.app.release_index()[self.path]['revision'], self.path)['body'])
        self.assertIn('Original', self.app.history(self.path)[0]['document']['body'])

    def test_two_editors_cannot_silently_overwrite_each_other(self):
        opened = self.app.get(self.path); first = copy.deepcopy(opened['document']); first['title'] = 'First writer'
        self.app.save(self.path, first, opened['etag'])
        other = copy.deepcopy(opened['document']); other['title'] = 'Second writer'
        self.app.recover(self.path, other, opened['etag'])
        with self.assertRaises(manager.Problem) as error: self.app.save(self.path, other, opened['etag'])
        self.assertEqual(error.exception.status, 409)
        self.assertEqual(self.app.get(self.path)['document']['title'], 'First writer')
        self.assertEqual(self.app.get(self.path)['recovery']['document']['title'], 'Second writer')

    def test_each_editor_has_its_own_durable_recovery(self):
        opened = self.app.get(self.path)
        self.app.recover(self.path, {**opened['document'], 'title':'One'}, opened['etag'], client='window-one')
        self.app.recover(self.path, {**opened['document'], 'title':'Two'}, opened['etag'], client='window-two')
        self.assertEqual(len(self.app.recoveries(self.path)), 2)
        titles = [json.loads(p.read_text())['document']['title'] for p in self.app.recoveries(self.path)]
        self.assertCountEqual(titles, ['One', 'Two'])
        with self.assertRaises(manager.Problem): self.app.recover(self.path, self.value, opened['etag'], client='../unsafe')

    def test_existing_addresses_and_private_paths_are_protected(self):
        opened = self.app.get(self.path); opened['document']['slug'] = 'changed'
        with self.assertRaises(manager.Problem): self.app.save(self.path, opened['document'], opened['etag'])
        for path in ('../secret.json', 'notes/../../secret.json', 'notes/not-a-note.html'):
            with self.assertRaises(manager.Problem): self.app.get(path)
        outside = self.root / 'outside.png'; outside.write_bytes(b'outside')
        (self.content / 'media/images/link.png').symlink_to(outside)
        with self.assertRaises(manager.Problem): self.app.path('media/images/link.png', media=True)

    def test_new_and_duplicated_notes_are_drafts_with_unique_urls(self):
        first = self.app.create('A very clear title')
        second = self.app.create(value=first['document'])
        self.assertFalse(first['document']['published']); self.assertFalse(second['document']['highlight'])
        self.assertNotEqual(first['document']['slug'], second['document']['slug'])
        self.assertEqual(len(self.app.library()), 3)

    def test_upload_checks_actual_photograph_and_keeps_files_out_of_public(self):
        image = BytesIO(); Image.new('RGB', (10, 10)).save(image, 'PNG')
        result = self.app.upload('photographs', '../../photo.png', image.getvalue())
        self.assertTrue(result['path'].startswith('/media/images/'))
        self.assertTrue(self.app.path(result['path'], media=True).exists())
        for name, raw in [('bad.svg', b'<svg/>'), ('not-a-photo.png', b'not an image')]:
            with self.assertRaises(manager.Problem): self.app.upload('photographs', name, raw)
        self.assertEqual(len(self.app.media_list('photographs')), 2)

    def test_invalid_unfinished_draft_saves_but_preview_and_publication_report_fields(self):
        opened = self.app.get(self.path); doc = opened['document']; doc['blocks'] = [{'type':'photo', 'image':'/media/images/example.png', 'alt':''}]
        result = self.app.save(self.path, doc, opened['etag'])
        preview = self.app.preview(self.path, doc)
        self.assertIn('Image description', '\n'.join(preview['warnings']))
        with self.assertRaises(manager.Problem) as error: self.app.publication(self.path, result['etag'], 'publish-note')
        self.assertIn('Image description', '\n'.join(error.exception.details['errors']))

    def test_preview_uses_real_renderer_without_mutating_content_or_public_files(self):
        before = (self.content / self.path).read_bytes()
        doc = copy.deepcopy(self.value); doc['title'] = 'Unsaved preview'; doc['published'] = False
        result = self.app.preview(self.path, doc, theme='dark')
        page = self.app.previews[result['url'].split('/')[-1]].decode()
        self.assertIn('Unsaved preview', page); self.assertIn('data-theme="dark"', page)
        self.assertNotIn('<script src=', page)
        self.assertEqual(before, (self.content / self.path).read_bytes())
        self.assertFalse((self.content / 'notes/unsaved-preview.html').exists())

    def test_sync_commits_privately_and_fetches_online_only_changes(self):
        clone = self.remote()
        (clone / 'notes/other.json').write_bytes(manager.encode({**self.value, 'slug':'other', 'published':False}))
        self.git('add', '.', cwd=clone); self.git('commit', '-m', 'Online draft', cwd=clone); self.git('push', cwd=clone)
        opened = self.app.get(self.path); opened['document']['body'] = '<p>Local writing.</p>'
        self.app.save(self.path, opened['document'], opened['etag'])
        old_pin = (self.content / '.published.json').read_bytes()
        result = self.app.sync()
        self.assertTrue((self.content / 'notes/other.json').exists())
        self.assertEqual(old_pin, (self.content / '.published.json').read_bytes())
        self.assertEqual(self.git('rev-parse', 'origin/main'), result['revision'])
        self.assertIn('Local writing', self.app.get(self.path)['document']['body'])
        self.assertFalse(self.git('status', '--porcelain'))

    def test_same_note_conflict_is_explicit_and_keep_both_preserves_work(self):
        clone = self.remote(); online = {**self.value, 'title':'Online revision'}
        (clone / self.path).write_bytes(manager.encode(online)); self.git('add', '.', cwd=clone)
        self.git('commit', '-m', 'Online edit', cwd=clone); self.git('push', cwd=clone)
        opened = self.app.get(self.path); opened['document']['title'] = 'Local revision'
        self.app.save(self.path, opened['document'], opened['etag'])
        with self.assertRaises(manager.Problem) as error: self.app.sync()
        self.assertEqual(error.exception.status, 409)
        self.assertEqual(error.exception.details['conflicts'][0]['local']['title'], 'Local revision')
        self.app.sync({self.path:'both'}, error.exception.details['remote'])
        self.assertEqual(self.app.get(self.path)['document']['title'], 'Online revision')
        copies = list((self.content / 'notes').glob('local-copy-*.json'))
        self.assertEqual(len(copies), 1)
        duplicate = json.loads(copies[0].read_text()); self.assertIn('Local revision', duplicate['title']); self.assertFalse(duplicate['published'])

    def test_sync_refuses_unrelated_repository_edits(self):
        self.remote(); (self.content / '.pages.yml').write_text('private settings')
        with self.assertRaises(manager.Problem): self.app.sync()
        self.assertIn('private settings', (self.content / '.pages.yml').read_text())

    def test_nested_operations_do_not_deadlock_and_dispatch_exact_saved_revision(self):
        self.remote()
        opened = self.app.get(self.path)
        opened['document']['title'] = 'Released from the manager'
        saved = self.app.save(self.path, opened['document'], opened['etag'])
        pin = (self.content / '.published.json').read_bytes()
        real_run = manager.run
        calls = []
        def command(*args, **kwargs):
            if args[0] == 'git' and args[-3:] == ('remote', 'get-url', 'origin'):
                return subprocess.CompletedProcess(args, 0, b'git@github.com:TGthms/about-notes.git\n', b'')
            if args[0] == 'gh':
                if args[1] == 'api': return subprocess.CompletedProcess(args, 0, b'{"status":"completed","conclusion":"success"}', b'')
                calls.append(json.loads(kwargs['input']))
                return subprocess.CompletedProcess(args, 0, b'https://github.com/TGthms/about-notes/actions/runs/123\n', b'')
            return real_run(*args, **kwargs)
        with patch.object(manager, 'run', command):
            result = self.app.publication(self.path, saved['etag'], 'publish-note')
            self.assertEqual(self.app.get(self.path)['status'], 'Unpublished changes')
            self.app.run_status(result['run_id'])
            self.assertEqual(self.app.get(self.path)['status'], 'Published')
        payload = json.loads(calls[0]['payload'])
        self.assertEqual(payload['repository']['sha'], self.git('rev-parse','HEAD'))
        self.assertEqual(result['run_id'], '123')
        self.assertEqual(pin, (self.content / '.published.json').read_bytes())

    def test_http_requires_cookie_host_origin_and_custom_header(self):
        server = manager.serve(self.app, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        connection = HTTPConnection('127.0.0.1', server.server_port)
        def request(method,path,headers=None,body=None):
            connection.request(method,path,body=body,headers=headers or {})
            response=connection.getresponse();raw=response.read();return response,raw
        try:
            self.assertEqual(request('GET','/api/notes')[0].status,401)
            response,_=request('GET','/?token='+server.token)
            cookie=response.getheader('Set-Cookie').split(';')[0]
            self.assertEqual(response.status,303)
            session=self.app.state/('session-'+str(server.server_port)+'.json')
            session.write_bytes(manager.encode({'workspace':self.app.repo_id,'token':server.token}))
            with patch('builtins.print'):
                self.assertTrue(manager.reopen(self.app,server.server_port,no_open=True))
            self.assertEqual(request('GET','/api/notes',{'Cookie':cookie})[0].status,200)
            self.assertEqual(request('GET','/api/notes',{'Cookie':cookie,'Host':'evil.example'})[0].status,403)
            self.assertEqual(request('GET','/api/notes',{'Cookie':cookie,'Origin':'https://evil.example'})[0].status,403)
            body=json.dumps({'title':'Forbidden'})
            self.assertEqual(request('POST','/api/create',{'Cookie':cookie,'Content-Type':'application/json'},body)[0].status,403)
            headers={'Cookie':cookie,'Content-Type':'application/json','X-Notes-Manager':'1','Origin':server.origin}
            self.assertEqual(request('POST','/api/create',headers,body)[0].status,200)
            self.assertEqual(request('GET','/.git/config',{'Cookie':cookie})[0].status,404)
            self.assertEqual(request('GET','/media/../../.published.json',{'Cookie':cookie})[0].status,400)
            self.assertEqual(len(self.app.library()),2)
        finally:
            connection.close();server.shutdown();server.server_close();thread.join()

    def test_sandbox_media_capability_is_scoped_and_supports_download_ranges(self):
        folder=self.content/'media/downloads';folder.mkdir();(folder/'data.csv').write_text('place,value\nDetroit,1\n')
        doc={**self.value,'blocks':[{'type':'photo','image':'/media/images/example.png','alt':'A blue photograph'},
                                  {'type':'download','title':'Data','file':'/media/downloads/data.csv'}]}
        preview=self.app.preview(self.path,doc);key=preview['url'].split('/')[-1]
        names=self.app.preview_refs[key];csv=next(name for name in names if name.endswith('.csv'))
        server=manager.serve(self.app,0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        connection=HTTPConnection('127.0.0.1',server.server_port)
        def request(path,headers=None):
            connection.request('GET',path,headers=headers or {});response=connection.getresponse();raw=response.read();return response,raw
        try:
            response,raw=request('/preview-media/'+key+'/'+csv,{'Origin':'null','Range':'bytes=0-4'})
            self.assertEqual(response.status,206);self.assertEqual(raw,b'place');self.assertEqual(response.getheader('Content-Disposition'),'attachment')
            self.assertEqual(request('/preview-media/not-the-preview/'+csv)[0].status,404)
            self.assertEqual(request('/preview-media/'+key+'/../../secret')[0].status,404)
            self.assertEqual(request('/preview/'+key)[0].status,401)
            response,_=request('/preview/'+key,{'Cookie':'notes_local='+server.token})
            self.assertIn(server.origin,response.getheader('Content-Security-Policy'));self.assertIn('sha256-',response.getheader('Content-Security-Policy'))
        finally:connection.close();server.shutdown();server.server_close();thread.join()


    def test_discard_restores_backup_and_keeps_recovery_without_changing_release(self):
        self.remote();opened=self.app.get(self.path);baseline=opened['baseline'];pin=(self.content/'.published.json').read_bytes()
        edited={**opened['document'],'body':'<p>Local testing.</p>'};saved=self.app.save(self.path,edited,opened['etag'])
        self.app.recover(self.path,edited,saved['etag'],client='testing')
        restored=self.app.discard(self.path,saved['etag'],baseline['revision'])
        self.assertEqual(restored['document']['body'],self.value['body']);self.assertFalse(restored['local_changes'])
        self.assertEqual(pin,(self.content/'.published.json').read_bytes());self.assertFalse(restored['recovery'])
        self.assertTrue(any('Local testing' in row['document'].get('body','') for row in self.app.history(self.path)))
        with self.assertRaises(manager.Problem):self.app.discard(self.path,saved['etag'],baseline['revision'])

    def test_empty_trash_requires_current_selection_and_preserves_other_data(self):
        first = self.app.create(title='First disposable draft')
        a = self.app.delete_note(first['path'], first['etag'])
        second = self.app.create(title='Second disposable draft')
        b = self.app.delete_note(second['path'], second['etag'])
        for selection in (None, ['../notes'], [a['id']], [a['id'], a['id']]):
            with self.assertRaises(manager.Problem): self.app.empty_trash(selection)
        self.assertEqual(len(self.app.trash_list()), 2)
        original = self.app.path(self.path).read_bytes()
        upload = (self.content / 'media/images/example.png').read_bytes()
        self.assertEqual(self.app.empty_trash([a['id'], b['id']]), {'removed': 2})
        self.assertFalse(self.app.trash_list())
        self.assertFalse((self.app.state/'trash'/a['id']).exists())
        self.assertFalse((self.app.state/'trash'/b['id']).exists())
        self.assertEqual(self.app.path(self.path).read_bytes(), original)
        self.assertEqual((self.content / 'media/images/example.png').read_bytes(), upload)
        self.assertEqual(self.app.empty_trash([]), {'removed': 0})

    def test_empty_trash_will_not_delete_a_restored_note(self):
        draft = self.app.create(title='Restored draft')
        deleted = self.app.delete_note(draft['path'], draft['etag'])
        restored = self.app.restore_trash(deleted['id'])
        with self.assertRaises(manager.Problem): self.app.empty_trash([deleted['id']])
        self.assertTrue(self.app.path(restored['path']).exists())

    def test_trash_preserves_uploads_and_can_restore_without_overwriting_an_existing_note(self):
        with self.assertRaises(manager.Problem):self.app.trash(self.path,self.app.get(self.path)['etag'])
        created=self.app.create('Throwaway');pin=(self.content/'.published.json').read_bytes()
        deleted=self.app.delete_note(created['path'],created['etag']);self.assertTrue(deleted['trashed'])
        self.assertFalse(self.app.path(created['path']).exists());self.assertEqual(len(self.app.trash_list()),1)
        self.app.path(created['path']).write_bytes(manager.encode({**created['document'],'title':'Another version'}))
        restored=self.app.restore_trash(deleted['id']);self.assertNotEqual(restored['path'],created['path'])
        self.assertEqual(self.app.get(created['path'])['document']['title'],'Another version')
        self.assertFalse(restored['document']['published']);self.assertFalse(self.app.trash_list())
        self.assertTrue((self.content/'media/images/example.png').exists());self.assertEqual(pin,(self.content/'.published.json').read_bytes())

    def _pending_withdrawal(self,etag):
        record={'run_id':'123','path':self.path,'action':'withdraw-note','revision':self.git('rev-parse','HEAD'),
                'index_base':manager.digest((self.content/'.published.json').read_bytes()),'etag':etag,'trash_after':True}
        manager.atomic(self.app.state/'last-publication.json',manager.encode(record))

    def _finish_withdrawal(self,conclusion):
        real=manager.run
        def run(*args,**kwargs):
            if args[0]=='gh':return subprocess.CompletedProcess(args,0,json.dumps({'status':'completed','conclusion':conclusion}).encode(),b'')
            return real(*args,**kwargs)
        with patch.object(manager,'run',run):return self.app.run_status('123')

    def test_live_delete_waits_for_verified_withdrawal_success(self):
        opened=self.app.get(self.path)
        with patch.object(self.app,'publication',return_value={'run_id':'123'}) as dispatch:self.app.delete_note(self.path,opened['etag'])
        dispatch.assert_called_once_with(self.path,opened['etag'],'withdraw-note',trash_after=True)
        self.assertTrue(self.app.path(self.path).exists());self._pending_withdrawal(opened['etag'])
        self._finish_withdrawal('failure');self.assertTrue(self.app.path(self.path).exists());self.assertFalse(self.app.trash_list())
        self._pending_withdrawal(opened['etag']);result=self._finish_withdrawal('success')
        self.assertTrue(result['trashed']);self.assertFalse(self.app.path(self.path).exists())

    def test_newer_edits_stop_automatic_trash_after_withdrawal(self):
        opened=self.app.get(self.path);self._pending_withdrawal(opened['etag'])
        self.app.save(self.path,{**opened['document'],'title':'New writing'},opened['etag'])
        result=self._finish_withdrawal('success');self.assertIn('newer edits',result['trash_error'])
        self.assertEqual(self.app.get(self.path)['document']['title'],'New writing')

    def test_cover_designs_are_private_and_duplicates_are_independent(self):
        identity='a'*24;design=json.loads((ROOT/'tools/notes-manager/vendor/og-studio/defaults.json').read_text())
        design.update(title='A cover',backgroundData='/media/images/example.png')
        saved=self.app.save_design(identity,design,None);self.assertEqual(saved['design']['title'],'A cover')
        with self.assertRaises(manager.Problem):self.app.save_design(identity,design,None)
        with self.assertRaises(manager.Problem):self.app.save_design('b'*24,{**design,'logoData':'https://example.com/image.png'},None)
        created=self.app.create(value={**self.value,'og_designs':{'sharing_image':identity}})
        forked=created['document']['og_designs']['sharing_image'];self.assertNotEqual(forked,identity)
        self.app.save_design(forked,{**design,'title':'Independent'},self.app.cover_design(forked)['etag'])
        self.assertEqual(self.app.cover_design(identity)['design']['title'],'A cover')
        document=created['document'];document['published']=True;self.app.save(created['path'],document,created['etag'])
        self.git('add','.');self.git('commit','-m','Private design test');manager.releases.select(self.content,created['path'])
        out=self.root/'released';manager.releases.materialize(self.content,out)
        self.assertFalse((out/'media/designs').exists());self.assertTrue((self.content/'media/designs'/f'{identity}.json').exists())
        self.assertFalse((out/'media/images/example.png').exists())

    def test_discard_includes_private_cover_source_edits(self):
        identity='c'*24;design=json.loads((ROOT/'tools/notes-manager/vendor/og-studio/defaults.json').read_text())
        self.app.save_design(identity,design,None)
        opened=self.app.get(self.path);self.app.save(self.path,{**opened['document'],'og_designs':{'sharing_image':identity}},opened['etag'])
        self.git('add','.');self.git('commit','-m','Backed-up cover')
        opened=self.app.get(self.path);self.app.save_design(identity,{**design,'title':'Only the source changed'},self.app.cover_design(identity)['etag'])
        self.assertTrue(self.app.get(self.path)['local_changes'])
        with self.assertRaises(manager.Problem):self.app.discard(self.path,opened['etag'],opened['baseline']['revision'],opened['design_etags'])
        self.app.discard(self.path,opened['etag'],opened['baseline']['revision'])
        self.assertEqual(self.app.cover_design(identity)['design']['title'],design['title'])
        self.assertFalse(self.app.get(self.path)['local_changes'])
        self.assertTrue(list((self.app.state/'discarded-designs').glob('*/*.json')))

    def test_verified_https_secure_cookie_studio_policy_and_reopen(self):
        folder=self.app.state/'tls';folder.mkdir();cert=folder/'localhost.pem';key=folder/'localhost-key.pem'
        subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost',
                        '-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',str(key),'-out',str(cert)],check=True,capture_output=True)
        shutil.copyfile(cert,folder/'rootCA.pem');server=manager.serve(self.app,0,cert,key)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        connection=HTTPSConnection('127.0.0.1',server.server_port,context=ssl.create_default_context(cafile=str(cert)))
        try:
            connection.request('GET','/?token='+server.token);response=connection.getresponse();response.read()
            self.assertEqual(response.status,303);self.assertIn('; Secure',response.getheader('Set-Cookie'))
            connection.request('GET','/',headers={'Host':'localhost:'+str(server.server_port)})
            response=connection.getresponse();response.read();self.assertEqual(response.status,308);self.assertEqual(response.getheader('Location'),server.origin+'/')
            manager.atomic(self.app.state/('session-'+str(server.server_port)+'.json'),manager.encode({'workspace':self.app.repo_id,'token':server.token,'scheme':'https'}))
            with patch('builtins.print'):self.assertTrue(manager.reopen(self.app,server.server_port,True,'https'))
            headers={'Cookie':'notes_local='+server.token};connection.request('GET','/studio/index.html',headers=headers)
            response=connection.getresponse();page=response.read();self.assertEqual(response.status,200)
            self.assertIn('sha256-',response.getheader('Content-Security-Policy'));self.assertIn(b'og-manager-export',page)
            self.assertEqual(len([v for k,v in response.getheaders() if k.lower()=='content-security-policy']),1)
            self.assertIn("frame-ancestors 'self'",response.getheader('Content-Security-Policy'))
            connection.request('GET','/studio/../../server.py',headers=headers);response=connection.getresponse();response.read();self.assertEqual(response.status,404)
        finally:connection.close();server.shutdown();server.server_close();thread.join()


if __name__ == '__main__': unittest.main()
