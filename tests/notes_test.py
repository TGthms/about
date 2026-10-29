"""Publication boundary tests: private input must never be copied wholesale."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
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
    def test_home_entrance_is_compact_and_hero_uses_notes_icon(self):
        self.post(); self.build()
        markup = (self.public / 'index.html').read_text()
        self.assertLess(markup.index('id="about"'), markup.index('id="notes"'))
        self.assertLess(markup.index('id="notes"'), markup.index('id="interests"'))
        self.assertIn('class="hero__notes-label"', markup)
        self.assertIn('Latest note', markup)
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
        self.assertIn('data-notes-latest hidden', home)
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
