"""Cache keys follow edited assets without changing content or remote links."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('versions', Path(__file__).resolve().parents[1] / 'scripts/version-assets.py')
versions = importlib.util.module_from_spec(spec); spec.loader.exec_module(versions)

class ResourceVersionsTests(unittest.TestCase):
    def test_nested_and_absolute_paths_refresh_idempotently_after_text_edits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'notes').mkdir(); (root / 'js').mkdir(); (root / 'css').mkdir()
            asset = root / 'js/copy.js'; asset.write_text('const text = "A few words";')
            style = root / 'css/site.css'; style.write_text('body { color: black; }')
            page = root / 'notes/post.html'
            page.write_text('<p>Keep my words.</p><script src="../js/copy.js?v=old"></script><link href=\'/css/site.css\' rel="stylesheet"><a href="https://example.com/js/copy.js">Remote</a>')
            # Existing generated versions are hexadecimal; malformed versions are left for integrity validation.
            page.write_text(page.read_text().replace('?v=old','?v=abc123'))
            self.assertEqual(versions.refresh(root), 1)
            self.assertEqual(versions.refresh(root), 0)
            old = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
            self.assertIn('?v=' + old, page.read_text())
            asset.write_text('const text = "Words";')
            self.assertEqual(versions.refresh(root), 1)
            self.assertNotIn('?v=' + old, page.read_text())
            self.assertIn('<p>Keep my words.</p>', page.read_text())
            self.assertIn('href="https://example.com/js/copy.js"', page.read_text())
    def test_missing_resources_still_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root / 'index.html').write_text('<script src="js/missing.js"></script>')
            with self.assertRaises(ValueError): versions.refresh(root)
    def test_paths_cannot_escape_the_deployment_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'public'; root.mkdir()
            (Path(tmp) / 'js').mkdir(); (Path(tmp) / 'js/outside.js').write_text('private')
            (root / 'index.html').write_text('<script src="../js/outside.js"></script>')
            with self.assertRaises(ValueError): versions.refresh(root)

if __name__ == '__main__': unittest.main()
