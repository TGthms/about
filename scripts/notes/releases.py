#!/usr/bin/env python3
"""Pin published revisions in the private repository; saved drafts never go live."""
import argparse
import datetime as dt
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile
from urllib.parse import unquote

MANIFEST = '.published.json'

def git(private, *args, binary=False):
    result = subprocess.run(['git', '-C', str(private), *args], capture_output=True, text=not binary)
    if result.returncode: raise ValueError('A saved revision or referenced upload could not be read. Save the note and try again.')
    return result.stdout if binary else result.stdout.strip()

def note_path(value):
    if not re.fullmatch(r'notes/[a-zA-Z0-9][a-zA-Z0-9_-]*\.json', value):
        raise ValueError('Choose a note from the Notes collection.')
    return value

def load(private):
    value = json.loads((private / MANIFEST).read_text())
    if value.get('version') != 1 or not isinstance(value.get('entries'), dict):
        raise ValueError('The publication index is not valid.')
    return value

def read_note(private, revision, path):
    note_path(path)
    if not re.fullmatch(r'[a-f0-9]{40}', revision): raise ValueError('Use a complete saved revision.')
    return json.loads(git(private, 'show', revision + ':' + path))

def slug(value, path):
    return str(value.get('slug') or Path(path).stem)

def birthday(value):
    return value.get('birthday') is True or any(isinstance(c, str) and c.strip().casefold() == 'birthday' for c in value.get('categories', []))

def initialize(private):
    if (private / MANIFEST).exists(): raise ValueError('A publication index already exists; it was left unchanged.')
    revision = git(private, 'rev-parse', 'HEAD')
    entries = {}
    for path in sorted((private / 'notes').glob('*.json')):
        relative = path.relative_to(private).as_posix()
        current = read_note(private, revision, relative)
        if current.get('published') is not True: continue
        published_at, birthday_at, aliases = None, None, set()
        for row in git(private, 'log', '--reverse', '--format=%H %cI', '--', relative).splitlines():
            commit, stamp = row.split(' ', 1)
            # Files removed and recreated can occur in the history.
            try: old = read_note(private, commit, relative)
            except ValueError: continue
            if old.get('published') is not True: continue
            published_at = published_at or stamp
            if birthday(old): birthday_at = birthday_at or stamp
            aliases.add(slug(old, relative))
        entries[relative] = {'revision': revision, 'published_at': published_at, 'birthday_at': birthday_at,
                             'aliases': sorted(aliases - {slug(current, relative)})}
    value = {'version': 1, 'entries': entries}
    save(private, value)
    return value

def save(private, value):
    (private / MANIFEST).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def select(private, path, now=None, revision=None):
    """Select exactly the saved Git revision; a file being edited is never read."""
    path = note_path(path)
    revision = revision or git(private, 'rev-parse', 'HEAD')
    if not re.fullmatch(r'[a-f0-9]{40}', revision): raise ValueError('The saved revision is not valid.')
    git(private, 'merge-base', '--is-ancestor', revision, 'HEAD')
    note = read_note(private, revision, path)
    value = load(private)
    old = value['entries'].get(path, {})
    aliases = set(old.get('aliases', []))
    if old.get('revision'):
        aliases.add(slug(read_note(private, old['revision'], path), path))
    aliases.discard(slug(note, path))
    stamp = (now or dt.datetime.now(dt.timezone.utc)).isoformat().replace('+00:00', 'Z')
    entry = {**old, 'revision': revision, 'aliases': sorted(aliases), 'withdrawn': note.get('published') is not True}
    if not entry['withdrawn']:
        entry['published_at'] = old.get('published_at') or stamp
        if birthday(note): entry['birthday_at'] = old.get('birthday_at') or stamp
    value['entries'][path] = entry
    save(private, value)
    return value

def materialize(private, output):
    """Read only pinned note and media blobs; each upload keeps its revision."""
    output.mkdir(parents=True, exist_ok=True)
    (output / 'notes').mkdir(exist_ok=True)
    metadata = {}
    cache = set()
    for path, entry in load(private)['entries'].items():
        note_path(path)
        if entry.get('withdrawn'): continue
        revision = entry['revision']
        value = read_note(private, revision, path)
        if value.get('published') is not True: raise ValueError('A released note is not marked Published.')
        value['translations'] = [translation for translation in value.get('translations', []) if translation.get('published') is True]
        def media(reference):
            decoded = unquote(reference).lstrip('/')
            parts = PurePosixPath(decoded).parts
            if not decoded.startswith('media/') or '..' in parts or '\\' in decoded:
                raise ValueError('An upload path is outside the media library.')
            target = 'media/' + revision + '/' + decoded[len('media/'):]
            if target not in cache:
                mode = git(private, 'ls-tree', revision, '--', decoded).split(' ', 1)[0]
                if mode != '100644': raise ValueError('A referenced upload must be a regular saved file.')
                destination = output / target
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(git(private, 'show', revision + ':' + decoded, binary=True))
                cache.add(target)
            return '/' + target
        def walk(node):
            if isinstance(node, list): return [walk(n) for n in node]
            if isinstance(node, dict): return {k: walk(v) for k, v in node.items()}
            if not isinstance(node, str): return node
            if re.fullmatch(r'/?media/[^\s<>"\']+', node): return media(node)
            # Rich text image references are the only media URLs embedded in HTML.
            return re.sub(r'''(\bsrc\s*=\s*)(["'])(/?media/[^"'<>]+)\2''', lambda m: m[1] + m[2] + media(m[3]) + m[2], node)
        (output / path).write_text(json.dumps(walk(value), ensure_ascii=False))
        metadata[Path(path).name] = {key: entry.get(key) for key in ('birthday_at', 'aliases', 'published_at')}
    (output / '.release-metadata.json').write_text(json.dumps(metadata))

def builder():
    spec = importlib.util.spec_from_file_location('notes_build', Path(__file__).with_name('build.py'))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['initialize', 'select'])
    parser.add_argument('--content', type=Path, required=True)
    parser.add_argument('--payload')
    parser.add_argument('--public', type=Path, default=Path('public'))
    args = parser.parse_args()
    private = args.content.resolve()
    if args.action == 'initialize': initialize(private); return
    payload = json.loads(args.payload or '{}')
    path = note_path(payload.get('context', {}).get('path', ''))
    previous = (private / MANIFEST).read_bytes()
    try:
        select(private, path, revision=payload.get('repository', {}).get('sha'))
        # Validate everything in a disposable public tree before updating the pin.
        import shutil
        with tempfile.TemporaryDirectory(prefix='notes-release-check-') as temporary:
            public = Path(temporary) / 'public'
            shutil.copytree(args.public, public)
            builder().build(private, public)
    except Exception:
        (private / MANIFEST).write_bytes(previous)
        raise
    print('The selected saved revision passed publication checks.')

if __name__ == '__main__':
    try: main()
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit('Publication was not changed: ' + str(error))
