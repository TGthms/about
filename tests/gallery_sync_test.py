"""Exercise real local assets and failure recovery without touching either site."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gallery_sync', ROOT / 'scripts/gallery_sync.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class GallerySyncTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.about, self.gallery = self.base / 'about', self.base / 'gallery'
        (self.about / 'public/js').mkdir(parents=True)
        (self.about / 'scripts').mkdir()
        (self.gallery / 'images/gallery').mkdir(parents=True)
        shutil.copy(ROOT / 'scripts/version-assets.py', self.about / 'scripts/version-assets.py')
        (self.about / 'public/js/gallery-preview.js').write_text('// Preview\n')
        (self.about / sync.CATALOG).write_text(sync.HEADER + '[];\n')
        (self.about / 'public/index.html').write_text('''<div id="gallery-preview"><img data-src="assets/projects/gallery-og.jpg" width="1200" height="630"><span id="gallery-preview-location"></span></div><script src="js/gallery-photos.js?v=000000000000"></script>''')

    def photo(self, name='first', location='Detroit, MI', color='navy'):
        filename = name + '.jpeg'
        Image.new('RGB', (1600, 1000), color).save(self.gallery / 'images/gallery' / filename)
        return {'filename': filename, 'location': location, 'caption': name.title(), 'media': 'photo'}

    def run_sync(self, photos):
        return sync.synchronize(self.about, self.gallery, photos)

    def snapshot(self):
        return {p.relative_to(self.about).as_posix(): p.read_bytes() for p in self.about.rglob('*') if p.is_file()}

    def test_add_edit_and_unchanged_runs_preserve_assets_and_refresh_versions(self):
        photo = self.photo()
        self.assertEqual(self.run_sync([photo])['photos'], 1)
        asset = self.about / 'public/assets/gallery/first.webp'
        before = asset.read_bytes()
        with Image.open(asset) as im:
            self.assertEqual(im.size, (1200, 750))
        with Image.open(self.about / 'public/assets/compact/gallery/first.webp') as im:
            self.assertEqual(im.size, (480, 300))
        self.assertEqual(self.run_sync([photo])['updated'], 0)
        photo.update(location='Chicago, IL', caption='A & B <view>')
        with patch.object(sync, 'image_bytes', side_effect=AssertionError('Metadata must not re-encode photos')):
            self.run_sync([photo])
        self.assertEqual(asset.read_bytes(), before)
        self.assertEqual(sync.read_catalog(self.about / sync.CATALOG)[0]['location'], 'Chicago, IL')
        self.assertIn('Chicago, IL', (self.about / 'public/index.html').read_text())
        cache = hashlib.sha256((self.about / sync.CATALOG).read_bytes()).hexdigest()[:12]
        self.assertIn('?v=' + cache, (self.about / 'public/index.html').read_text())

    def test_replacing_a_source_updates_both_main_and_watch_images(self):
        photo = self.photo()
        self.run_sync([photo])
        before = self.snapshot()
        self.photo(color='maroon')
        self.run_sync([photo])
        for path in ('public/assets/gallery/first.webp', 'public/assets/compact/gallery/first.webp'):
            self.assertNotEqual(before[path], (self.about / path).read_bytes())

    def test_removing_the_default_selects_a_live_photo_and_leaves_unmanaged_assets(self):
        first, second = self.photo(), self.photo('second', 'Seattle, WA')
        self.run_sync([first, second])
        unrelated = self.about / 'public/assets/gallery/unrelated.webp'
        unrelated.write_bytes(b'not managed')
        self.run_sync([second])
        self.assertFalse((self.about / 'public/assets/gallery/first.webp').exists())
        self.assertFalse((self.about / 'public/assets/compact/gallery/first.webp').exists())
        self.assertTrue((self.about / 'public/assets/compact/gallery/second.webp').is_file())
        self.assertEqual(unrelated.read_bytes(), b'not managed')
        self.assertIn('data-src="assets/gallery/second.webp"', (self.about / 'public/index.html').read_text())

    def test_empty_gallery_removes_owned_images_but_preserves_a_project_preview(self):
        self.run_sync([self.photo()])
        self.run_sync([])
        self.assertEqual(sync.read_catalog(self.about / sync.CATALOG), [])
        self.assertEqual(list((self.about / 'public/assets/gallery').glob('*.webp')), [])
        self.assertIn('data-src="assets/projects/gallery-og.jpg"', (self.about / 'public/index.html').read_text())
        self.assertEqual(self.run_sync([self.photo('new')])['photos'], 1)

    def test_bootstrap_adopts_existing_photos_without_recompression(self):
        photo = self.photo()
        self.run_sync([photo])
        (self.about / sync.STATE).unlink()
        before = self.snapshot()
        with patch.object(sync, 'image_bytes', side_effect=AssertionError('Must keep existing image quality')):
            self.run_sync([photo])
        for path, content in before.items():
            self.assertEqual((self.about / path).read_bytes(), content)

    def test_missing_source_or_local_image_conflict_changes_nothing(self):
        first = self.photo()
        self.run_sync([first])
        before = self.snapshot()
        with self.assertRaises(FileNotFoundError):
            self.run_sync([first, {'filename': 'missing.jpeg'}])
        self.assertEqual(self.snapshot(), before)
        asset = self.about / 'public/assets/gallery/first.webp'
        asset.write_bytes(b'manually changed')
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'edited outside'):
            self.run_sync([first])
        with self.assertRaisesRegex(ValueError, 'edited locally'):
            self.run_sync([])
        self.assertEqual(self.snapshot(), before)

    def test_write_failure_rolls_back_catalog_images_and_versions(self):
        first = self.photo()
        self.run_sync([first])
        second = self.photo('second')
        before = self.snapshot()
        original = sync.replace_file
        failed = False
        def fail_once(path, data):
            nonlocal failed
            if path.name == 'gallery-photos.js' and not failed:
                failed = True
                raise OSError('Disk full')
            original(path, data)
        with patch.object(sync, 'replace_file', side_effect=fail_once):
            with self.assertRaisesRegex(OSError, 'Disk full'):
                self.run_sync([first, second])
        self.assertEqual(self.snapshot(), before)

    def test_missing_about_invalid_paths_and_symlink_sources_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'unavailable'):
            sync.synchronize(self.base / 'missing', self.gallery, [])
        before = self.snapshot()
        for name in ('../outside.jpeg', '/tmp/photo.jpeg'):
            with self.assertRaisesRegex(ValueError, 'Invalid'):
                self.run_sync([{'filename': name}])
        outside = self.base / 'outside.jpeg'
        Image.new('RGB', (50, 50)).save(outside)
        (self.gallery / 'images/gallery/link.jpeg').symlink_to(outside)
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            self.run_sync([{'filename': 'link.jpeg'}])
        self.assertEqual(self.snapshot(), before)

    def test_video_covers_are_excluded(self):
        photo = self.photo()
        video = {'filename': 'missing-cover.jpeg', 'media': 'video', 'video': 'images/gallery/videos/trip.mp4'}
        self.assertEqual(self.run_sync([photo, video])['photos'], 1)


if __name__ == '__main__':
    unittest.main()
