"""Publication boundary tests: private input must never be copied wholesale."""
import importlib.util
import json
import datetime as dt
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('notes', ROOT / 'scripts/notes/build.py')
notes = importlib.util.module_from_spec(spec); spec.loader.exec_module(notes)

class NotesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.private = self.root / 'private'; self.public = self.root / 'public'
        (self.private / 'notes').mkdir(parents=True)
        (self.private / 'media/images').mkdir(parents=True)
        self.public.mkdir()
        for directory in ('css', 'js'):
            shutil.copytree(ROOT / 'public' / directory, self.public / directory)
        for filename in ('index.html', 'sitemap.xml'):
            shutil.copyfile(ROOT / 'public' / filename, self.public / filename)
    def tearDown(self):
        self.temp.cleanup()
    def post(self, filename='example', **values):
        value = {'published': True, 'title': 'A small moment', 'date': '2026-10-28', 'language': 'en', 'body': '<p>A little text.</p>', **values}
        path = self.private / 'notes' / (filename + '.json'); path.write_text(json.dumps(value)); return path
    def image(self, name='photo.png', size=(2200, 1400)):
        path = self.private / 'media/images' / name
        Image.new('RGB', size, '#456789').save(path)
        return '/media/images/' + name
    def build(self):
        return notes.build(self.private, self.public)
    def sinks(self):
        return '\n'.join(path.read_text() for path in self.public.rglob('*') if path.suffix in ('.html', '.xml', '.json'))
    def release_tools(self):
        spec = importlib.util.spec_from_file_location('releases', ROOT / 'scripts/notes/releases.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        return module
    def save_revision(self):
        def git(*args):
            return subprocess.run(['git', '-C', str(self.private), *args], check=True, capture_output=True, text=True).stdout.strip()
        if not (self.private / '.git').exists():
            git('init'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.com')
        git('add', '.'); git('commit', '-m', 'Saved revision')
        return git('rev-parse', 'HEAD')
    def test_released_text_and_media_stay_pinned_while_published_note_is_edited(self):
        photo = self.image('shared.png', (80, 60))
        self.post(body='<p>Released text.</p>', cover=photo, cover_alt='Blue photograph', translations=[{'language':'zh','published':False,'cover':'/media/images/not-uploaded-yet.png','body':'PRIVATE TRANSLATION'}])
        self.save_revision(); releases = self.release_tools(); releases.initialize(self.private)
        self.build(); before = self.sinks(); files = {p.name: p.read_bytes() for p in (self.public / 'assets/notes').iterdir()}
        Image.new('RGB', (80, 60), 'red').save(self.private / 'media/images/shared.png')
        self.post(body='<p>PRIVATE REVISION</p>', cover=photo, cover_alt='Red photograph')
        self.post('other-draft', published=False, body='<p>UNRELATED SECRET</p>')
        self.save_revision(); self.build()
        self.assertEqual(before, self.sinks())
        self.assertEqual(files, {p.name: p.read_bytes() for p in (self.public / 'assets/notes').iterdir()})
        releases.select(self.private, 'notes/example.json'); self.build()
        self.assertIn('PRIVATE REVISION', self.sinks()); self.assertNotIn('UNRELATED SECRET', self.sinks())
        self.post(published=False); self.save_revision(); self.build()
        self.assertTrue((self.public / 'notes/example.html').exists())
        releases.select(self.private, 'notes/example.json'); self.build()
        self.assertFalse((self.public / 'notes/example.html').exists())
    def test_explicit_release_can_pin_the_revision_selected_in_the_editor(self):
        self.post(body='<p>Previewed revision.</p>'); selected = self.save_revision()
        releases = self.release_tools(); releases.initialize(self.private)
        self.post(body='<p>Later private save.</p>'); self.save_revision()
        releases.select(self.private, 'notes/example.json', revision=selected); self.build()
        self.assertIn('Previewed revision.', self.sinks()); self.assertNotIn('Later private save.', self.sinks())
    def test_release_validation_failure_preserves_last_publication_pin(self):
        self.post(); self.save_revision(); releases = self.release_tools(); releases.initialize(self.private)
        before = (self.private / '.published.json').read_bytes()
        self.post(cover='/media/images/missing.png', cover_alt='Missing'); self.save_revision()
        result = subprocess.run(['python3', str(ROOT / 'scripts/notes/releases.py'), 'select', '--content', str(self.private), '--public', str(self.public), '--payload', json.dumps({'context':{'path':'notes/example.json'}})], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.private / '.published.json').read_bytes(), before)
        self.build(); self.assertTrue((self.public / 'notes/example.html').exists())
        for path in ['../notes/example.json', 'notes/../secret.json', '/notes/example.json']:
            with self.assertRaises(ValueError): releases.select(self.private, path)
    def test_birthday_clock_starts_at_explicit_release_and_does_not_restart(self):
        self.post(birthday=True); self.save_revision(); releases = self.release_tools()
        # An empty publication index represents a new, never-published note.
        releases.save(self.private, {'version':1, 'entries':{}})
        first = dt.datetime.now(dt.timezone.utc)
        releases.select(self.private, 'notes/example.json', first)
        self.post(birthday=True, title='An edited birthday'); self.save_revision()
        value = releases.select(self.private, 'notes/example.json', first + dt.timedelta(hours=2))
        self.assertEqual(value['entries']['notes/example.json']['birthday_at'], first.isoformat().replace('+00:00','Z'))
        self.build(); self.assertIn('Available for 24 hours', self.sinks())
    def test_birthday_kept_link_leaves_discovery_but_article_and_media_remain(self):
        self.post('ordinary')
        photo = self.image('birthday.png', (80, 60))
        self.post('birthday', birthday=True, birthday_visibility='keep-link', highlight=True, cover=photo, cover_alt='Birthday photograph')
        old = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=25)
        with patch.object(notes, 'birthday_publication_time', return_value=old): self.build()
        article = (self.public / 'notes/birthday.html').read_text()
        self.assertIn('this link stays available', article)
        self.assertIn('data-note-birthday', article)
        self.assertNotIn('href="../notes/topics/birthday.html"', article)
        self.assertNotIn('data-note-expires=', article)
        self.assertIn('content="noindex"', article)
        for name in ['index.html','notes.html','feed.xml','sitemap.xml']:
            self.assertNotIn('notes/birthday.html', (self.public / name).read_text())
        self.assertFalse((self.public / 'notes/topics/birthday.html').exists())
        self.assertEqual(json.loads((self.public / 'notes-expiry.json').read_text()), [])
        self.assertTrue(list((self.public / 'assets/notes').iterdir()))
    def test_silent_study_includes_optional_challenge_in_both_article_languages(self):
        for lang in ['en', 'zh']:
            markup = notes.same_study(lang)
            self.assertIn('data-study-challenge', markup)
            self.assertIn('data-quiz-field="area"', markup)
            self.assertIn('data-study-answers role="status"', markup)
    def test_thumbnail_override_preserves_sharing_cover_and_valid_responsive_sizes(self):
        cover = self.image('cover.png', (1200, 630)); thumb = self.image('thumb.png', (600, 400))
        self.post(cover=cover, cover_alt='Cover title', thumbnail=thumb, thumbnail_alt='Waveform detail', highlight=True)
        self.build()
        index = (self.public / 'notes.html').read_text(); article = (self.public / 'notes/example.html').read_text()
        self.assertIn('Waveform detail', index); self.assertNotIn('Cover title', index)
        self.assertIn('Cover title', article); self.assertIn('96px', index)
        self.assertNotIn('sizes="[', index)
        self.assertIn('Waveform detail', (self.public / 'index.html').read_text())
        self.post(cover=cover, cover_alt='Cover title'); self.build()
        self.assertIn('Cover title', (self.public / 'notes.html').read_text())
    def test_previous_slugs_redirect_each_language_without_duplicate_feed_entries(self):
        self.post('new-address', translations=[{'language':'zh','published':True,'title':'标题','body':'<p>文字</p>'}])
        (self.private / '.release-metadata.json').write_text(json.dumps({'new-address.json':{'aliases':['old-address']}}))
        self.build()
        for suffix in ['', '.zh']:
            redirect = (self.public / ('notes/old-address' + suffix + '.html')).read_text()
            self.assertIn('content="0;url=https://timgong.me/notes/new-address' + suffix + '.html"', redirect)
            self.assertIn('content="noindex"', redirect)
        self.assertNotIn('old-address', (self.public / 'feed.xml').read_text())
        self.post('old-address')
        with self.assertRaises(ValueError): self.build()
    def test_birthday_clock_uses_first_publication_and_survives_edits_and_republication(self):
        def git(*args, stamp=None):
            env = dict(os.environ)
            if stamp: env.update(GIT_AUTHOR_DATE=stamp, GIT_COMMITTER_DATE=stamp)
            return subprocess.run(['git', '-C', str(self.private), *args], check=True, capture_output=True, text=True, env=env)
        git('init'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.com')
        def save(stamp, **values):
            path = self.post(**values); git('add', '.'); git('commit', '-m', 'Save', stamp=stamp); return path
        save('2026-10-20T09:00:00Z', published=False, birthday=True)
        path = save('2026-10-29T09:00:00Z', birthday=True)
        save('2026-10-29T10:00:00Z', birthday=True, title='An edit', date='2020-01-01')
        save('2026-10-29T11:00:00Z', birthday=True, published=False)
        save('2026-10-29T12:00:00Z', birthday=True)
        self.assertEqual(notes.birthday_publication_time(self.private, path).isoformat(), '2026-10-29T09:00:00+00:00')
        active = notes.read_posts(self.private, now=dt.datetime.fromisoformat('2026-10-30T08:59:59+00:00'))
        self.assertEqual(active[0]['_expires'], '2026-10-30T09:00:00Z')
        self.assertEqual(notes.read_posts(self.private, now=dt.datetime.fromisoformat('2026-10-30T09:00:00+00:00')), [])

    def test_birthday_export_and_cleanup_cover_all_public_surfaces_and_preserve_shared_media(self):
        shared = self.image('shared.png', (100, 60)); birthday_only = self.image('birthday.png', (120, 70))
        self.post('ordinary', cover=shared, cover_alt='Shared photograph', highlight=True)
        self.post('birthday', birthday=True, highlight=True, cover=shared, cover_alt='Shared photograph', blocks=[{'type':'photo', 'image':birthday_only, 'alt':'Birthday photograph'}], translations=[{'language':'zh','published':True,'title':'生日','body':'<p>生日快乐。</p>'}])
        publication = dt.datetime.now(dt.timezone.utc)
        with patch.object(notes, 'birthday_publication_time', return_value=publication): self.build()
        article = (self.public / 'notes/birthday.html').read_text()
        self.assertIn('Available for 24 hours', article)
        self.assertIn('data-note-expires=', article)
        self.assertIn('data-note-birthday', article)
        self.assertIn('name="robots" content="noindex"', article)
        self.assertIn('js/notes-lifetime.js?v=', article)
        self.assertTrue((self.public / 'notes/birthday.zh.html').exists())
        self.assertIn('data-notes-lifetime', (self.public / 'index.html').read_text())
        self.assertIn('data-note-expires=', (self.public / 'notes.html').read_text())
        self.assertTrue((self.public / 'notes/topics/birthday.html').exists())
        self.assertNotIn('/notes/birthday', (self.public / 'feed.xml').read_text())
        self.assertNotIn('/notes/birthday', (self.public / 'sitemap.xml').read_text())
        self.assertEqual(len(json.loads((self.public / 'notes-expiry.json').read_text())), 1)
        before = set(p.name for p in (self.public / 'assets/notes').iterdir())
        with patch.object(notes, 'birthday_publication_time', return_value=publication - dt.timedelta(hours=25)): self.build()
        self.assertFalse((self.public / 'notes/birthday.html').exists())
        self.assertFalse((self.public / 'notes/birthday.zh.html').exists())
        self.assertFalse((self.public / 'notes/topics/birthday.html').exists())
        self.assertNotIn('data-note-expires=', (self.public / 'index.html').read_text())
        self.assertNotIn('data-notes-lifetime', (self.public / 'index.html').read_text())
        self.assertNotIn('birthday.html', (self.public / 'notes.html').read_text())
        after = set(p.name for p in (self.public / 'assets/notes').iterdir())
        self.assertTrue(after); self.assertLess(len(after), len(before))
        self.assertEqual(json.loads((self.public / 'notes-expiry.json').read_text()), [])

    def test_birthday_category_alone_activates_expiry_and_drafts_need_no_clock(self):
        self.assertTrue(notes.is_birthday({'categories':[' Birthday ']}))
        self.assertEqual(notes.categories({'birthday':True})['birthday'], 'Birthday')
        draft = self.post(birthday=True, published=False)
        with patch.object(notes, 'birthday_publication_time', side_effect=AssertionError('Draft leaked')):
            self.assertEqual(notes.read_posts(self.private), [])
            notes.build(self.private, self.public, draft, self.root / 'preview')
        preview = (self.root / 'preview/example.html').read_text()
        self.assertIn('Available for 24 hours', preview)
        self.assertNotIn('src="../js/birthday.js', preview)
    def test_drafts_and_unreferenced_uploads_never_export(self):
        self.post('secret', published=False, title='PRIVATE_DRAFT_ABC', body='<p>PRIVATE_BODY_XYZ</p>')
        self.image('private-only.png')
        self.assertEqual(self.build()['posts'], 0)
        self.assertNotIn('PRIVATE_', self.sinks())
        self.assertEqual(list((self.public / 'assets/notes').iterdir()), [])
        self.assertEqual(list((self.public / 'notes').iterdir()), [])
        self.assertIn('Nothing here just yet.', (self.public / 'notes.html').read_text())
    def test_original_and_only_published_translations_export(self):
        secret = self.image('unfinished-translation.png')
        self.post(translations=[{'language': 'ja', 'published': False, 'title': 'PRIVATE_TRANSLATION', 'blocks': [{'type': 'photo', 'image': secret, 'alt': 'PRIVATE_IMAGE'}]}, {'language': 'zh-Hant', 'published': True, 'title': '一些隨記', 'body': '<p>生活中的小事。</p>'}])
        self.build()
        self.assertTrue((self.public / 'notes/example.html').is_file())
        self.assertTrue((self.public / 'notes/example.zh-Hant.html').is_file())
        self.assertFalse((self.public / 'notes/example.ja.html').exists())
        self.assertNotIn('PRIVATE_', self.sinks())
        rss = ET.parse(self.public / 'feed.xml')
        self.assertEqual(len(rss.findall('./channel/item')), 1)
        self.assertIn('hreflang="zh-Hant"', (self.public / 'notes/example.html').read_text())
    def test_responsive_images_have_bounded_dimensions_and_safe_metadata(self):
        photo = self.image()
        self.post(blocks=[{'type': 'photo', 'image': photo, 'alt': 'A coastal view', 'caption': 'Along the coast.'}])
        self.build()
        assets = list((self.public / 'assets/notes').glob('*.webp'))
        self.assertEqual(len(assets), 4)
        widths = []
        for path in assets:
            with Image.open(path) as image:
                widths.append(image.width)
                self.assertFalse(image.getexif())
        self.assertEqual(sorted(widths), [320, 640, 1280, 1920])
        markup = (self.public / 'notes/example.html').read_text()
        self.assertIn('srcset=', markup)
        self.assertIn('loading="lazy"', markup)
        self.assertIn('A coastal view', markup)
        self.assertNotIn('/media/', markup)
        self.assertIn('max-width: 320px', markup)
        self.assertIn('-share.jpg', markup)
    def test_video_does_not_autoload_and_has_direct_access(self):
        (self.private / 'media/videos').mkdir()
        (self.private / 'media/videos/clip.mp4').write_bytes(b'video-fixture')
        photo = self.image()
        self.post(blocks=[{'type': 'video', 'file': '/media/videos/clip.mp4', 'poster': photo, 'caption': 'A short clip', 'transcript': 'A short introduction.'}])
        self.build()
        markup = (self.public / 'notes/example.html').read_text()
        self.assertIn('preload="none"', markup)
        self.assertIn('playsinline', markup)
        self.assertIn('Open video', markup)
        self.assertIn('Transcript', markup)
        self.assertNotIn('autoplay', markup)
        self.assertRegex(markup, r'poster="\.\./assets/notes/[a-f0-9]+-320.webp"')
        self.assertRegex(markup, r'data-note-poster="\.\./assets/notes/[a-f0-9]+-1920.webp"')
    def test_html_is_sanitized_in_body_metadata_and_feed(self):
        self.post(body='<p onclick="steal()">Hello <strong>world</strong>.</p><script>HIDDEN_SCRIPT</script><iframe src="https://evil.example">HIDDEN_FRAME</iframe><a href="javascript:steal()">bad link</a><a href="https://example.org">Good link</a>')
        self.build()
        markup = (self.public / 'notes/example.html').read_text()
        self.assertNotIn('onclick', markup)
        self.assertNotIn('javascript:', markup)
        self.assertNotIn('HIDDEN_', self.sinks())
        self.assertIn('<strong>world</strong>', markup)
        self.assertIn('rel="noopener noreferrer"', markup)
    def test_media_cannot_escape_private_uploads(self):
        self.post(blocks=[{'type': 'photo', 'image': '/media/../../secret.png', 'alt': 'A photo'}])
        with self.assertRaises(ValueError): self.build()
        self.assertFalse((self.public / 'notes.html').exists())
    def test_media_symlinks_cannot_publish_outside_files(self):
        outside = self.root / 'outside.png'; Image.new('RGB', (20, 20)).save(outside)
        (self.private / 'media/images/link.png').symlink_to(outside)
        self.post(blocks=[{'type': 'photo', 'image': '/media/images/link.png', 'alt': 'A photo'}])
        with self.assertRaises(ValueError): self.build()
    def test_duplicate_routes_and_translations_fail_closed(self):
        self.post('first', slug='same')
        self.post('second', slug='same')
        with self.assertRaises(ValueError): self.build()
        (self.private / 'notes/second.json').unlink()
        self.post('first', translations=[{'language': 'en', 'published': True, 'body': 'Duplicate'}])
        with self.assertRaises(ValueError): self.build()
    def test_unpublishing_removes_page_assets_feed_and_sitemap_entries(self):
        photo = self.image(); self.post(blocks=[{'type': 'photo', 'image': photo, 'alt': 'A view'}]); self.build()
        self.assertTrue((self.public / 'notes/example.html').exists())
        self.post(published=False); self.build()
        self.assertFalse((self.public / 'notes/example.html').exists())
        self.assertEqual(list((self.public / 'assets/notes').iterdir()), [])
        self.assertNotIn('/notes/example.html', (self.public / 'sitemap.xml').read_text())
        self.assertEqual(len(ET.parse(self.public / 'feed.xml').findall('./channel/item')), 0)
    def test_pagination_and_resource_paths_are_real(self):
        for i in range(23): self.post(f'note-{i}')
        self.build()
        self.assertTrue((self.public / 'notes/page-2.html').exists())
        markup = (self.public / 'notes/page-2.html').read_text()
        self.assertIn('href="../notes.html"', markup)
        self.assertIn('src="../js/notes.js?v=', markup)
        self.assertIn('https://timgong.me/notes/page-2.html', markup)
        self.assertEqual(len(ET.parse(self.public / 'feed.xml').findall('./channel/item')), 20)
    def test_private_preview_is_self_contained_and_does_not_mutate_public_tree(self):
        photo = self.image(size=(100, 60))
        draft = self.post(published=False, title='PRIVATE_PREVIEW', blocks=[{'type': 'photo', 'image': photo, 'alt': 'Private photo'}])
        original = (self.public / 'index.html').read_bytes()
        dest = self.root / 'preview'
        notes.build(self.private, self.public, draft, dest)
        markup = (dest / 'example.html').read_text()
        self.assertIn('PRIVATE_PREVIEW', markup)
        self.assertIn('data:image/webp;base64,', markup)
        self.assertNotIn('<script', markup)
        self.assertNotIn('rel="stylesheet"', markup)
        self.assertIn('href="https://timgong.me/notes.html"', markup)
        self.assertNotIn('href="../', markup)
        self.assertEqual((self.public / 'index.html').read_bytes(), original)
        self.assertFalse((self.public / 'notes.html').exists())

    def test_same_study_loads_only_on_its_article_and_never_executes_author_code(self):
        self.post(blocks=[{'type':'same-study', 'introduction':'<script>PRIVATE_EXECUTION</script>'}], translations=[{'language':'zh', 'published':True, 'body':'<p>一段信号。</p>', 'blocks':[{'type':'same-study'}]}])
        self.build()
        page = (self.public / 'notes/example.html').read_text()
        translated = (self.public / 'notes/example.zh.html').read_text()
        self.assertIn('js/same-study.js?v=', page)
        self.assertIn('css/same-study.css?v=', page)
        self.assertIn('&lt;script&gt;PRIVATE_EXECUTION&lt;/script&gt;', page)
        self.assertNotIn('<script>PRIVATE_EXECUTION', page)
        self.assertIn('data-study-fallback', page)
        self.assertIn('data-study-enhanced hidden', page)
        self.assertIn('读懂这段信号', translated)
        self.assertIn('lang="en"', notes.same_study('ja'))
        self.assertNotIn('读懂这段信号', notes.same_study('zh-Hant'))
        self.assertNotIn('same-study.js', (self.public / 'notes.html').read_text())
        self.assertNotIn('same-study.js', (self.public / 'index.html').read_text())
        self.post(blocks=[]); self.build()
        self.assertNotIn('same-study.js', (self.public / 'notes/example.html').read_text())

    def test_same_study_private_preview_embeds_only_trusted_local_component(self):
        draft = self.post(published=False, body='<script>AUTHOR_SCRIPT</script><p>Private text.</p>', blocks=[{'type':'same-study'}])
        original = (self.public / 'index.html').read_bytes()
        dest = self.root / 'preview'
        notes.build(self.private, self.public, draft, dest)
        page = (dest / 'example.html').read_text()
        self.assertEqual(page.count('<script>'), 1)
        self.assertIn('A silent, bounded model', page)
        self.assertNotIn('AUTHOR_SCRIPT', page)
        self.assertNotIn('<script src=', page)
        self.assertNotIn('rel="stylesheet"', page)
        self.assertEqual((self.public / 'index.html').read_bytes(), original)
    def test_home_entrance_is_compact_and_hero_uses_notes_icon(self):
        self.post(); self.build()
        markup = (self.public / 'index.html').read_text()
        self.assertLess(markup.index('id="about"'), markup.index('id="notes"'))
        self.assertLess(markup.index('id="notes"'), markup.index('id="interests"'))
        self.assertIn('class="hero__notes-label"', markup)
        self.assertIn('data-notes-carousel', markup)
        self.assertNotIn('notes/secret', markup)
    def test_titles_with_backslashes_and_markup_remain_plain_text(self):
        self.post(title='A \\ B <script>text</script>')
        self.build()
        markup = (self.public / 'index.html').read_text()
        self.assertIn('A \\ B &lt;script&gt;text&lt;/script&gt;', markup)
    def test_resource_hashing_does_not_rewrite_the_authors_words(self):
        self.post(body='<p>My file is js/a-new-file.js. A CSS value is url(example).</p>')
        self.build()
        markup = (self.public / 'notes/example.html').read_text()
        self.assertIn('js/a-new-file.js. A CSS value is url(example).', markup)
        self.assertIn('src="../js/notes.js?v=', markup)

    def test_featured_latest_is_one_card_and_other_highlights_have_hidden_fallback(self):
        photo = self.image(size=(100, 60))
        self.post(cover=photo, cover_alt='A cover', highlight=True, translations=[{'language':'ja', 'title':'お知らせ', 'body':'<p>こんにちは。</p>', 'published':True}, {'language':'ko', 'body':'PRIVATE_KOREAN', 'published':False}])
        self.build()
        home = (self.public / 'index.html').read_text().split('<!-- notes-entrance:start -->')[1].split('<!-- notes-entrance:end -->')[0]
        self.assertEqual(home.count('class="notes-spotlight '), 1)
        self.assertIn('notes-spotlight__image', home)
        self.assertIn('data-note-versions=', home)
        self.assertIn('お知らせ', home)
        self.assertNotIn('PRIVATE_KOREAN', home)
        self.post('newer', date='2026-10-29')
        self.build()
        home = (self.public / 'index.html').read_text()
        self.assertIn('data-note-featured="false" hidden', home)
        self.assertIn('.notes-spotlight[hidden] { display: none;', (self.public / 'css/home.css').read_text())

    def test_fonts_are_bounded_and_reach_translations_and_preview(self):
        draft = self.post(font='serif', translations=[{'language':'es', 'published':True, 'body':'<p>Hola.</p>'}])
        self.build()
        self.assertIn('data-note-font="serif"', (self.public / 'notes/example.es.html').read_text())
        dest = self.root / 'preview'
        notes.build(self.private, self.public, draft, dest)
        self.assertIn('data-note-font="serif"', (dest / 'example.html').read_text())
        self.post(font='bad" onclick="alert(1)')
        with self.assertRaises(ValueError): self.build()

    def test_categories_export_only_published_posts_and_have_static_safe_routes(self):
        self.post('secret', published=False, categories=['PRIVATE_CATEGORY'])
        self.post('one', categories=['Projects', 'Music & faith'])
        self.post('two', categories=['projects'])
        self.build()
        page = (self.public / 'notes/topics/projects.html').read_text()
        self.assertIn('notes/one.html', page)
        self.assertIn('notes/two.html', page)
        self.assertIn('../../index.html#notes', page)
        self.assertIn('https://timgong.me/notes/topics/projects.html', page)
        custom = list((self.public / 'notes/topics').glob('c-*.html'))
        self.assertEqual(len(custom), 1)
        self.assertIn('Music &amp; faith', custom[0].read_text())
        self.assertNotIn('PRIVATE_CATEGORY', self.sinks())
        self.post('one', categories=['<script>alert(1)</script>']); self.build()
        self.assertNotIn('<script>alert(1)</script>', self.sinks())

    def test_category_pagination_and_validation(self):
        for i in range(21): self.post(f'note-{i}', categories=['learning'])
        self.build()
        page = (self.public / 'notes/topics/learning-page-2.html').read_text()
        self.assertIn('learning.html', page)
        self.assertIn('https://timgong.me/notes/topics/learning-page-2.html', page)
        self.assertIn('src="../../js/notes.js?v=', page)
        self.post(categories='not-a-list')
        with self.assertRaises(ValueError): self.build()
        self.post(categories=['x' * 49])
        with self.assertRaises(ValueError): self.build()

    def test_archive_covers_have_thumbnail_sizes_and_category_previews_use_live_links(self):
        photo = self.image(size=(1200,630))
        draft = self.post(cover=photo,cover_alt='A cover',categories=['Learning'])
        self.build()
        archive = (self.public / 'notes.html').read_text()
        self.assertIn('(max-width: 480px) 96px',archive)
        self.assertIn('208px',archive)
        self.assertIn('note-card__copy',archive)
        dest = self.root / 'preview'
        notes.build(self.private,self.public,draft,dest)
        preview = (dest / 'example.html').read_text()
        self.assertIn('href="https://timgong.me/index.html#notes"',preview)
        self.assertIn('href="https://timgong.me/notes/topics/learning.html"',preview)
        self.assertNotIn('href="../',preview)

    def test_long_articles_have_unique_keyboard_targets_and_short_notes_stay_simple(self):
        self.post(body='<h2>First &amp; second</h2><p>Text.</p><h2>重复</h2><p>Text.</p><h2>重复</h2>')
        self.build()
        page = (self.public / 'notes/example.html').read_text()
        self.assertIn('note-reading-layout', page)
        for i in range(1,4):
            self.assertEqual(page.count(f'id="section-{i}"'), 1)
            self.assertIn(f'href="#section-{i}"', page)
        self.assertIn('tabindex="-1"', page)
        self.assertIn('class="note-return"',page)
        self.assertIn('../index.html#notes',page)
        self.assertNotIn('class="site-nav"',page)
        self.post(body='<p>A short update.</p>'); self.build()
        self.assertNotIn('note-reading-layout', (self.public / 'notes/example.html').read_text())

    def test_carousel_uses_all_active_features_and_preserves_a_latest_fallback(self):
        self.post('old-feature', highlight=True, date='2026-10-20')
        self.post('other-feature', highlight=True, date='2026-10-21')
        self.post('expired', highlight=True, highlight_until='2000-01-01')
        self.post('latest', date='2026-10-29')
        self.post('draft', published=False, highlight=True, title='PRIVATE_FEATURE')
        self.build()
        home = (self.public / 'index.html').read_text().split('<!-- notes-entrance:start -->')[1].split('<!-- notes-entrance:end -->')[0]
        self.assertEqual(home.count('data-note-featured="true"'), 2)
        self.assertEqual(home.count('data-note-featured="false" hidden'), 1)
        self.assertNotIn('PRIVATE_FEATURE', home)
        self.assertNotIn('notes/expired.html', home)
        self.assertNotIn('Small updates, photographs, and things along the way.', home)

    def test_about_entry_context_is_not_added_to_archive_story_or_share_urls(self):
        self.post('2026-10-29-that-noise-was-data', slug='that-noise-was-data', highlight=True, translations=[{'language':'zh','published':True,'title':'信号','body':'<p>文字。</p>'}])
        self.build()
        home = (self.public / 'index.html').read_text()
        entrance = home.split('<!-- notes-entrance:start -->')[1].split('<!-- notes-entrance:end -->')[0]
        self.assertIn('notes/that-noise-was-data.html?from=about', entrance)
        self.assertIn('notes/that-noise-was-data.zh.html?from=about', entrance)
        self.assertNotIn('?from=about', (self.public / 'notes.html').read_text())
        story = home.split('<!-- note-story:2026-10-29-that-noise-was-data:start -->')[1].split('<!-- note-story:2026-10-29-that-noise-was-data:end -->')[0]
        self.assertNotIn('?from=about', story)
        for suffix in ('', '.zh'):
            page = (self.public / f'notes/that-noise-was-data{suffix}.html').read_text()
            self.assertIn('data-note-site-return hidden', page)
            self.assertIn(f'rel="canonical" href="https://timgong.me/notes/that-noise-was-data{suffix}.html"', page)
            header = page.split('<header class="note-header">')[1].split('</header>')[0]
            self.assertIn('id="note-share"', header)
            self.assertIn('fill="currentColor"', header)
            self.assertIn('<span data-i18n="notes.share">Share this note</span>', header)
            self.assertEqual(page.count('id="note-share"'), 1)
            self.assertNotIn('id="note-share"', page.split('<footer class="note-end">')[1])

    def test_project_story_links_only_reference_published_versions_and_disappear_on_unpublish(self):
        self.post('2026-10-29-that-noise-was-data', slug='that-noise-was-data', translations=[{'language':'zh','published':True,'title':'信号','body':'<p>文字。</p>'},{'language':'ja','published':False,'title':'PRIVATE_STORY_TRANSLATION'}])
        self.build()
        home=(self.public/'index.html').read_text()
        story=home.split('<!-- note-story:2026-10-29-that-noise-was-data:start -->')[1].split('<!-- note-story:2026-10-29-that-noise-was-data:end -->')[0]
        self.assertIn('featured-card__story',story)
        self.assertIn('notes/that-noise-was-data.zh.html',story)
        self.assertNotIn('PRIVATE_STORY_TRANSLATION',story)
        self.post('2026-10-29-that-noise-was-data', slug='a-new-address')
        self.build()
        home=(self.public/'index.html').read_text()
        story=home.split('<!-- note-story:2026-10-29-that-noise-was-data:start -->')[1].split('<!-- note-story:2026-10-29-that-noise-was-data:end -->')[0]
        self.assertIn('notes/a-new-address.html',story)
        self.post('2026-10-29-that-noise-was-data',published=False);self.build()
        home=(self.public/'index.html').read_text()
        story=home.split('<!-- note-story:2026-10-29-that-noise-was-data:start -->')[1].split('<!-- note-story:2026-10-29-that-noise-was-data:end -->')[0]
        self.assertEqual(story,'')

    def test_previews_allow_missing_descriptions_but_publishing_still_requires_them(self):
        photo = self.image(size=(100, 60))
        draft = self.post(cover=photo, cover_alt='', blocks=[{'type':'photo', 'image':photo, 'alt':''}], translations=[{'language':'ko', 'published':False, 'body':'<p>비공개 번역</p>'}])
        dest = self.root / 'preview'
        notes.build(self.private, self.public, draft, dest)
        self.assertTrue((dest / 'example.ko.html').exists())
        self.assertIn('Image description pending', (dest / 'example.html').read_text())
        with self.assertRaises(ValueError): self.build()
        self.assertNotIn('비공개 번역', self.sinks())

    def test_follow_link_opens_plain_html_with_copyable_rss_address(self):
        self.post(); self.build()
        archive = (self.public / 'notes.html').read_text()
        follow = (self.public / 'subscribe.html').read_text()
        self.assertIn('href="subscribe.html"', archive)
        self.assertIn('id="feed-address"', follow)
        self.assertIn('value="https://timgong.me/feed.xml"', follow)
        self.assertIn('href="feed.xml"', follow)
        self.assertIn('https://timgong.me/subscribe.html', (self.public / 'sitemap.xml').read_text())

if __name__ == '__main__': unittest.main()
