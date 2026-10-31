#!/usr/bin/env python3
"""Mirror Gallery Manager's still photographs into this site's local shuffle."""
import argparse
import fcntl
import hashlib
import html
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile

from PIL import Image, ImageOps

CATALOG = 'public/js/gallery-photos.js'
STATE = 'scripts/gallery-sync-state.json'
HEADER = '/* Local photo catalog, shared with the travel gallery. Images load on demand. */\nwindow.GALLERY_PHOTOS = '


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(root, relative):
    path = root / relative
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('Unsafe sync path: ' + relative)
    return path


def image_bytes(source, edge, quality):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGB')
        output = io.BytesIO()
        # Retain color interpretation, but do not publish EXIF/GPS metadata.
        image.save(output, 'WEBP', quality=quality, method=6,
                   **({'icc_profile': original.info['icc_profile']} if original.info.get('icc_profile') else {}))
        return output.getvalue()


def replace_file(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.gallery-', delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(data)
            stream.flush()
            os.fchmod(stream.fileno(), 0o644)
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def read_catalog(path):
    text = path.read_text()
    match = re.fullmatch(r'/\*.*?\*/\s*window\.GALLERY_PHOTOS\s*=\s*(\[.*\]);\s*', text, re.S)
    if not match:
        raise ValueError('Unrecognized About photo catalog; left unchanged.')
    return json.loads(match[1])


def photo_asset(path):
    return bool(re.fullmatch(r'public/assets/(?:compact/)?gallery/[\w.-]+\.webp', path))


def synchronize(about, gallery, photos):
    about, gallery = Path(about).resolve(), Path(gallery).resolve()
    if not (about / 'public/js/gallery-preview.js').is_file() or not (about / 'scripts/version-assets.py').is_file():
        raise ValueError('About folder is unavailable or is not the expected personal-site project.')
    lock_name = digest(str(about).encode())[:20]
    with open(Path(tempfile.gettempdir()) / ('about-gallery-' + lock_name + '.lock'), 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        return _synchronize(about, gallery, photos)


def _synchronize(about, gallery, photos):
    catalog_path = safe_path(about, CATALOG)
    before_catalog = read_catalog(catalog_path)
    state_path = safe_path(about, STATE)
    old = json.loads(state_path.read_text()) if state_path.exists() else {'version': 1, 'photos': {}, 'owned': {}}
    if old.get('version') != 1:
        raise ValueError('Unsupported gallery sync state.')
    owned = old['owned'].copy()
    # Adopt the existing shuffle without recompressing its photographs.
    if not state_path.exists():
        for row in before_catalog:
            path = 'public/' + row['src']
            if not photo_asset(path):
                raise ValueError('Unexpected asset in the existing About catalog.')
            for relative in (path, path.replace('assets/gallery/', 'assets/compact/gallery/')):
                local = safe_path(about, relative)
                if local.is_file():
                    owned[relative] = digest(local.read_bytes())

    writes, new_owned, records, rows = {}, {}, {}, []
    seen = set()
    for photo in photos:
        if photo.get('media') == 'video' or photo.get('video'):
            continue
        filename = photo.get('filename', '')
        if not re.fullmatch(r'[\w.-]+\.(?:jpe?g|png|webp)', filename, re.I):
            raise ValueError('Invalid gallery photo filename: ' + filename)
        relative = 'public/assets/gallery/' + Path(filename).stem + '.webp'
        if relative.casefold() in seen:
            raise ValueError('Duplicate About photo filename: ' + filename)
        seen.add(relative.casefold())
        source = safe_path(gallery, 'images/gallery/' + filename)
        source_hash = digest(source.read_bytes())  # Missing sources abort before any writes.
        previous = old['photos'].get(filename, {})
        local = safe_path(about, relative)
        existing = local.read_bytes() if local.is_file() else None
        adopt = not state_path.exists() and relative in owned
        if existing is not None and relative not in owned:
            raise ValueError('An unmanaged About image already uses this name: ' + filename)
        if existing is not None and digest(existing) != owned[relative]:
            raise ValueError('An About image was edited outside Gallery Manager: ' + filename)
        if existing is None or (not adopt and previous.get('source') != source_hash):
            existing = image_bytes(source, 1200, 85)
            writes[relative] = existing
        new_owned[relative] = digest(existing)
        records[filename] = {'source': source_hash}
        rows.append({'src': relative.removeprefix('public/'), 'file': filename,
                     'location': photo.get('location') or '', 'caption': photo.get('caption') or ''})

    index_path = safe_path(about, 'public/index.html')
    index = index_path.read_text()
    frame = re.search(r'(<div[^>]+id="gallery-preview"[^>]*>)(.*?)(</div>)', index, re.S)
    if not frame:
        raise ValueError('About gallery preview was not found; left unchanged.')
    initial = re.search(r'data-src="([^"]+)"', frame[2])
    if not initial:
        raise ValueError('About gallery preview image was not found; left unchanged.')
    fallback = next((row for row in rows if row['src'] == html.unescape(initial[1])), rows[0] if rows else None)
    body = frame[2]
    if fallback:
        relative = 'public/' + fallback['src']
        compact = relative.replace('assets/gallery/', 'assets/compact/gallery/')
        path = safe_path(about, compact)
        # Only the still frame needs a Watch variant: lightweight mode never rotates.
        compact_data = path.read_bytes() if path.is_file() else None
        if compact_data is not None and (compact not in owned or digest(compact_data) != owned[compact]):
            raise ValueError('The About Watch image was edited outside Gallery Manager.')
        image = writes.get(relative) or safe_path(about, relative).read_bytes()
        changed_image = relative in writes
        if compact_data is None or changed_image:
            compact_data = image_bytes(io.BytesIO(image), 480, 82)
            writes[compact] = compact_data
        new_owned[compact] = digest(compact_data)
        with Image.open(io.BytesIO(image)) as image_info:
            width, height = image_info.size
        src, location = fallback['src'], fallback['location']
    else:
        # An empty gallery keeps a neutral project preview, never a deleted photo.
        src, location, width, height = 'assets/projects/gallery-og.jpg', '', 1200, 630
    body = re.sub(r'(<span\b[^>]*id="gallery-preview-location")([^>]*)(>)',
                  lambda m: m[1] + re.sub(r'\s+hidden(?:="[^"]*")?', '', m[2]) + ('' if location else ' hidden') + m[3], body, count=1)
    body = re.sub(r'(<img\b[^>]*\bdata-src=")[^"]+("[^>]*>)', lambda m: m[1] + html.escape(src, quote=True) + m[2], body, count=1)
    body = re.sub(r'(<img\b[^>]*\bwidth=")\d+', lambda m: m[1] + str(width), body, count=1)
    body = re.sub(r'(<img\b[^>]*\bheight=")\d+', lambda m: m[1] + str(height), body, count=1)
    body = re.sub(r'(<span\b[^>]*id="gallery-preview-location"[^>]*>).*?(</span>)', lambda m: m[1] + html.escape(location) + m[2], body, count=1, flags=re.S)
    index = index[:frame.start(2)] + body + index[frame.end(2):]
    writes['public/index.html'] = index.encode()
    writes[CATALOG] = (HEADER + json.dumps(rows, indent=2, ensure_ascii=False) + ';\n').encode()

    # Use the site's versioning rules; plan every HTML change before committing anything.
    spec = importlib.util.spec_from_file_location('asset_versions', about / 'scripts/version-assets.py')
    versions = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(versions)
    public = about / 'public'
    for page in sorted(public.rglob('*.html')):
        relative = page.relative_to(about).as_posix()
        text = writes.get(relative, page.read_bytes()).decode()
        def version(match):
            ref = match[3]
            asset = public / ref.lstrip('/') if ref.startswith('/') else page.parent / ref
            if not asset.resolve().is_relative_to(public.resolve()) or not asset.is_file():
                raise ValueError('Missing or invalid local resource: ' + ref)
            content = writes.get(asset.relative_to(about).as_posix(), asset.read_bytes())
            return match[1] + match[2] + ref + '?v=' + digest(content)[:12] + match[2]
        writes[relative] = versions.RESOURCE.sub(version, text).encode()
    writes[STATE] = (json.dumps({'version': 1, 'photos': records, 'owned': new_owned}, indent=2, sort_keys=True) + '\n').encode()
    deleted = []
    for relative, expected in owned.items():
        if not photo_asset(relative):
            raise ValueError('Unsafe owned image path in sync state.')
        if relative in new_owned:
            continue
        path = safe_path(about, relative)
        if path.is_file():
            if digest(path.read_bytes()) != expected:
                raise ValueError('A removed About image was edited locally: ' + relative)
            deleted.append(relative)
    writes = {relative: data for relative, data in writes.items()
              if not safe_path(about, relative).is_file() or safe_path(about, relative).read_bytes() != data}
    # Snapshot only affected files. A failed write restores both photos and catalog.
    backups = {relative: safe_path(about, relative).read_bytes() if safe_path(about, relative).is_file() else None
               for relative in list(writes) + deleted}
    try:
        for relative, data in writes.items():
            replace_file(safe_path(about, relative), data)
        for relative in deleted:
            safe_path(about, relative).unlink()
    except BaseException:
        for relative, data in backups.items():
            if data is None:
                safe_path(about, relative).unlink(missing_ok=True)
            else:
                replace_file(safe_path(about, relative), data)
        raise
    return {'status': 'synced', 'photos': len(rows), 'updated': len(writes), 'removed': len(deleted),
            'message': f"{len(rows)} photos synced to About. Changes are local; publish each site separately."}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gallery', type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(synchronize(Path(__file__).resolve().parent.parent, args.gallery, json.load(sys.stdin))))
    except Exception as error:
        print(json.dumps({'status': 'error', 'message': str(error)}))
        sys.exit(1)
