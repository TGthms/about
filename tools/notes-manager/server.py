#!/usr/bin/env python3
"""Private, loopback-only Notes workspace. No manager files belong in public/."""
import argparse
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import copy
import datetime as dt
import difflib
import fcntl
import hashlib
import html
from http import cookies
from http.client import HTTPConnection, HTTPSConnection, HTTPException
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import ssl
import math
import subprocess
import tempfile
import threading
import time
from urllib.parse import parse_qs, unquote, urlsplit
import webbrowser

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MAX_JSON = 4 * 1024 * 1024
MAX_UPLOAD = 20 * 1024 * 1024


def module(name):
    spec = importlib.util.spec_from_file_location('manager_' + name, ROOT / 'scripts/notes' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


notes = module('build')
releases = module('releases')
preview_bundle = module('preview_upload')
_archive_spec = importlib.util.spec_from_file_location('manager_archives', HERE / 'archives.py')
archives = importlib.util.module_from_spec(_archive_spec)
_archive_spec.loader.exec_module(archives)


class Problem(ValueError):
    def __init__(self, message, status=400, **details):
        super().__init__(message)
        self.status, self.details = status, details


def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def atomic(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, name = tempfile.mkstemp(prefix='.write-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as output:
            output.write(raw)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(name, 0o600)
        os.replace(name, path)
    finally:
        if os.path.exists(name): os.unlink(name)


def run(*args, cwd=None, input=None, okay=False, timeout=120):
    env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GH_PROMPT_DISABLED': '1'}
    result = subprocess.run(args, cwd=cwd, input=input, capture_output=True, env=env, timeout=timeout)
    if result.returncode and not okay:
        # Git/gh errors may contain credential-bearing URLs; do not surface their stderr.
        raise Problem('The ' + Path(args[0]).name + ' operation could not finish. Your local writing is retained. Check your connection and GitHub sign-in.', 503)
    return result


def git(root, *args, **kwargs):
    return run('git', '-C', str(root), *args, **kwargs)


def git_text(root, *args):
    return git(root, *args).stdout.decode().strip()


class Workspace:
    def __init__(self, content, state, public=None):
        self.content, self.state = content.resolve(), state.resolve()
        self.public = (public or ROOT / 'public').resolve()
        if not (self.content / 'notes').is_dir():
            raise Problem('Choose the private Notes repository, containing notes/ and media/.')
        if self.state.is_relative_to(self.content) or self.state.is_relative_to(self.public):
            raise Problem('Recovery files must be outside both the content repository and public/.')
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.state, 0o700)
        self.lock = threading.RLock()
        self.depth = threading.local()
        self.preview_lock = threading.Lock()
        self.pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix='notes')
        self.jobs = OrderedDict()
        self.previews = OrderedDict()
        self.preview_refs = {}
        self.preview_types = {}
        self.preview_assets = self.state / 'preview-media'
        self.preview_assets.mkdir(exist_ok=True)
        self.media = notes.Media(self.content, self.state / 'preview-cache', preview=True)
        (self.media.output / 'assets/notes').mkdir(parents=True, exist_ok=True)
        self.media_times = {}
        self.repo_id = digest(str(self.content).encode())[:16]
        self.archives = archives.Archives(self, git, atomic, encode, Problem)
        self.restored_servers = {}

    @contextmanager
    def writing(self):
        with self.lock:
            if getattr(self.depth, 'active', False):
                yield
                return
            with (self.state / 'workspace.lock').open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                self.depth.active = True
                try: yield
                finally:
                    self.depth.active = False
                    fcntl.flock(lock, fcntl.LOCK_UN)

    def path(self, relative, media=False):
        if not isinstance(relative, str): raise Problem('Choose a valid file.')
        relative = unquote(relative).lstrip('/')
        if media:
            if not relative.startswith('media/') or '..' in Path(relative).parts or '\\' in relative:
                raise Problem('Choose a file from the media library.')
        else:
            try: releases.note_path(relative)
            except ValueError: raise Problem('Choose a note from the library.')
        path = self.content / relative
        if any(p.is_symlink() for p in (path, *path.parents) if p.is_relative_to(self.content)):
            raise Problem('Symbolic links cannot be edited or served.')
        if not path.resolve().is_relative_to(self.content): raise Problem('The file is outside this workspace.')
        return path

    def document(self, value):
        if (not isinstance(value, dict) or not isinstance(value.get('translations') or [], list) or
                not isinstance(value.get('blocks') or [], list) or
                any(not isinstance(v, dict) for v in (value.get('translations') or []) + (value.get('blocks') or []))):
            raise Problem('This note has an invalid content structure.')
        if len(encode(value)) > MAX_JSON: raise Problem('The note is too large. Upload media as files, not pasted data.')
        return value

    def release_index(self, saved=None):
        path = self.content / '.published.json'
        raw = saved if saved is not None else (path.read_bytes() if path.exists() else b'')
        entries = json.loads(raw).get('entries', {}) if raw else {}
        last = self.state / 'last-publication.json'
        if last.exists():
            record = json.loads(last.read_text())
            # A verified deployment updates status without silently pulling or
            # committing the working tree. A later sync supersedes this cache.
            if record.get('conclusion') == 'success' and record.get('index_base') == digest(raw):
                relative = record['path']
                entries[relative] = {**entries.get(relative, {}), 'revision': record['revision'],
                                     'withdrawn': record['action'] == 'withdraw-note'}
        return entries

    def status(self, relative, value):
        entry = self.release_index().get(relative)
        if not entry: return 'Draft'
        if entry.get('withdrawn'): return 'Withdrawn'
        try:
            released = releases.read_note(self.content, entry['revision'], relative)
            def semantic(doc):
                return notes.authoring.normalize(notes.authoring.migrate(doc, Path(relative).name))
            if semantic(released) != semantic(value): return 'Unpublished changes'
            media_changed = git_text(self.content, 'diff', '--name-only', entry['revision'], '--', 'media')
            # A changed upload can affect a released post even when its JSON is unchanged.
            refs = json.dumps(value, ensure_ascii=False)
            if any('/' + p in refs or p in refs for p in media_changed.splitlines()): return 'Unpublished changes'
            return 'Published'
        except (ValueError, Problem): return 'Published · check history'

    def library(self):
        items = []
        for path in (self.content / 'notes').glob('*.json'):
            relative = path.relative_to(self.content).as_posix()
            try:
                self.path(relative)
                value = json.loads(path.read_text())
                items.append({'path': relative, 'title': notes.title(value), 'date': value.get('date', ''),
                              'language': value.get('language', 'en'), 'categories': value.get('categories', []),
                              'search': notes.plain(' '.join([str(value.get('body', ''))] + [str(b.get('body') or b.get('text') or b.get('caption') or '') for b in value.get('blocks', [])]))[:20000],
                              'status': self.status(relative, value)})
            except (ValueError, OSError, KeyError):
                items.append({'path': relative, 'title': path.stem, 'status': 'Needs attention', 'date': ''})
        return sorted(items, key=lambda v: (v['date'], v['path']), reverse=True)

    def recovery_path(self, relative, client='legacy'):
        self.path(relative)
        if not re.fullmatch(r'[a-zA-Z0-9-]{1,64}', client): raise Problem('Invalid recovery session.')
        return self.state / 'recovery' / Path(relative).stem / (client + '.json')

    def recoveries(self, relative):
        folder = self.recovery_path(relative).parent
        paths = list(folder.glob('*.json'))
        legacy = self.state / 'recovery' / Path(relative).name
        if legacy.is_file(): paths.append(legacy)
        return sorted(paths, key=lambda p:p.stat().st_mtime, reverse=True)

    def get(self, relative):
        path = self.path(relative)
        if not path.is_file(): raise Problem('This note no longer exists locally. Sync to check online changes.', 404)
        raw = path.read_bytes()
        value = json.loads(raw)
        recoveries = self.recoveries(relative)
        baseline = self.baseline(relative)
        return {'path': relative, 'title':notes.title(value), 'document': notes.authoring.migrate(value, path.name), 'etag': digest(raw),
                'design_etags':{identity:self.cover_design(identity)['etag'] for identity in (value.get('og_designs') or {}).values()},
                'baseline': baseline, 'local_changes': bool(baseline and (baseline['etag'] != digest(raw) or any(self.cover_design(identity)['etag']!=etag for identity,etag in baseline.get('design_etags',{}).items()))),
                'status': self.status(relative, value), 'recovery': json.loads(recoveries[0].read_text()) if recoveries else None}

    def baseline(self, relative):
        self.path(relative)
        remote = git(self.content, 'rev-parse', '--verify', 'refs/remotes/origin/main', okay=True)
        revision = remote.stdout.decode().strip() if remote.returncode == 0 else git_text(self.content, 'rev-parse', 'HEAD')
        saved = git(self.content, 'show', revision + ':' + relative, okay=True)
        if saved.returncode: return None
        designs={}
        for identity in (json.loads(saved.stdout).get('og_designs') or {}).values():
            if not isinstance(identity,str) or not re.fullmatch(r'[a-f0-9]{24}',identity): continue
            source=git(self.content,'show',revision+':media/designs/'+identity+'.json',okay=True)
            designs[identity]=digest(source.stdout) if source.returncode==0 else None
        return {'revision': revision, 'etag': digest(saved.stdout), 'design_etags':designs,'label': 'fetched GitHub version' if remote.returncode == 0 else 'last committed version'}

    def comparison(self, relative):
        """Compare the saved draft against the pinned public revision, never HEAD."""
        saved, warning = None, ''
        # Fetch objects/refs only: never merge, commit, or push the working draft.
        with self.writing():
            if git(self.content, 'remote', 'get-url', 'origin', okay=True).returncode == 0:
                try:
                    git(self.content, 'fetch', 'origin', 'main', timeout=8)
                    online = git(self.content, 'show', 'refs/remotes/origin/main:.published.json', okay=True)
                    if online.returncode == 0: saved = online.stdout
                except (Problem, subprocess.SubprocessError):
                    warning = 'The online publication record could not be refreshed. This comparison uses the last locally known record; reconnect and review again before publishing.'
        current = self.get(relative)
        entry = self.release_index(saved).get(relative)
        published = releases.read_note(self.content, entry['revision'], relative) if entry else None
        before = notes.authoring.normalize(published) if published else {}
        after = notes.authoring.normalize(current['document'])
        for doc in (before, after):
            for key in ('sharing_image', 'list_image', 'same_study'): doc.pop(key, None)
        changes = []
        for key in sorted(set(before) | set(after)):
            if key in {'editor_version', 'published', 'og_designs'} or before.get(key) == after.get(key): continue
            def display(value):
                return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2)
            old, new = display(before.get(key, '')), display(after.get(key, ''))
            changes.append({'field': key, 'before': old, 'after': new,
                            'diff': '\n'.join(difflib.unified_diff(old.splitlines(), new.splitlines(), fromfile='Published', tofile='Draft', lineterm=''))})
        media = []
        def references(value):
            return set(re.findall(r'/media/[\w./-]+', json.dumps(value, ensure_ascii=False)))
        for reference in sorted(references(before) | references(after)):
            path = self.path(reference, media=True)
            old = git(self.content, 'show', entry['revision'] + ':' + reference.lstrip('/'), okay=True) if entry and reference in references(before) else None
            old_hash = digest(old.stdout) if old and not old.returncode else None
            new_hash = digest(path.read_bytes()) if path.is_file() and reference in references(after) else None
            if old_hash != new_hash:
                media.append({'path': reference, 'change': 'Added' if not old_hash else 'Removed' if not new_hash else 'Replaced'})
        slug = current['document'].get('slug') or Path(relative).stem
        return {'changes': changes, 'media': media, 'published': published is not None,
                'withdrawn': bool(entry and entry.get('withdrawn')), 'etag': current['etag'],
                'url': notes.FEED_ORIGIN + '/notes/' + slug + '.html', 'warning':warning}

    def discard(self, relative, etag, revision, design_etags=None):
        with self.writing():
            current = self.get(relative)
            if current['etag'] != etag: raise Problem('This note changed in another window. Review it before discarding.', 409)
            if design_etags is not None and current['design_etags']!=design_etags: raise Problem('A cover changed in another window. Review it before discarding.',409)
            baseline = self.baseline(relative)
            if not baseline or baseline['revision'] != revision: raise Problem('The backup changed. Review the latest version before discarding.', 409)
            path = self.path(relative)
            self.backup(relative, path.read_bytes(), 'discarded')
            for recovery in self.recoveries(relative):
                self.backup(relative, recovery.read_bytes(), 'recovery')
                recovery.unlink()
            saved = git(self.content, 'show', revision + ':' + relative).stdout
            for identity in baseline.get('design_etags',{}):
                source=git(self.content,'show',revision+':media/designs/'+identity+'.json',okay=True)
                if source.returncode: continue
                design_path=self.path('media/designs/'+identity+'.json',media=True)
                if design_path.exists(): atomic(self.state/'discarded-designs'/Path(relative).stem/(str(time.time_ns())+'-'+identity+'.json'),design_path.read_bytes())
                atomic(design_path,source.stdout)
            atomic(path, saved)
            return self.get(relative)

    def trash(self, relative, etag):
        with self.writing():
            last = self.state/'last-publication.json'
            record = json.loads(last.read_text()) if last.exists() else {}
            if record.get('path')==relative and record.get('action')=='withdraw-note' and record.get('conclusion')!='success':
                raise Problem('Wait for withdrawal to finish on both hosts before moving the original to Trash.',409)
            current = self.get(relative)
            if current['etag'] != etag: raise Problem('This note has newer edits. Review them before moving it to Trash.', 409)
            entry = self.release_index().get(relative)
            if entry and not entry.get('withdrawn'): raise Problem('Withdraw the live article before moving its private original to Trash.', 409)
            identity = secrets.token_hex(12)
            folder = self.state / 'trash' / identity
            folder.mkdir(parents=True, mode=0o700)
            atomic(folder / 'metadata.json', encode({'id': identity, 'path': relative, 'title': notes.title(current['document']), 'created': stamp()}))
            atomic(folder / 'note.json', self.path(relative).read_bytes())
            self.path(relative).unlink()
            for index, recovery in enumerate(self.recoveries(relative)):
                shutil.move(str(recovery), str(folder / ('recovery-' + str(index) + '.json')))
            return {'trashed': True, 'id': identity, 'path': relative}

    def trash_list(self):
        values = []
        for path in (self.state / 'trash').glob('*/metadata.json'):
            value = json.loads(path.read_text())
            if not value.get('restored'): values.append(value)
        return sorted(values, key=lambda v:v['created'], reverse=True)

    def empty_trash(self, identities):
        if not isinstance(identities, list) or any(not isinstance(i, str) or not re.fullmatch(r'[a-f0-9]{24}', i) for i in identities):
            raise Problem('Review Trash before emptying it.')
        with self.writing():
            current = self.trash_list()
            if len(set(identities)) != len(identities) or set(identities) != {item['id'] for item in current}:
                raise Problem('Trash changed in another window. Close and reopen Trash to review it again.', 409)
            root = self.state / 'trash'
            folders = [root / identity for identity in identities]
            if root.is_symlink() or any(folder.is_symlink() or not folder.resolve().is_relative_to(self.state) for folder in folders):
                raise Problem('Trash contains an unexpected symbolic link. No items were removed.')
            for folder in folders:
                shutil.rmtree(folder)
            return {'removed': len(folders)}

    def restore_trash(self, identity):
        if not re.fullmatch(r'[a-f0-9]{24}', str(identity)): raise Problem('Choose an item from Trash.')
        with self.writing():
            folder = self.state / 'trash' / identity
            if not (folder / 'metadata.json').is_file(): raise Problem('This item is no longer in Trash.', 404)
            metadata = json.loads((folder / 'metadata.json').read_text())
            if metadata.get('restored'): raise Problem('This item was already restored.', 409)
            value = json.loads((folder / 'note.json').read_text())
            target = self.path(metadata['path'])
            value.update(published=False, highlight=False)
            if target.exists(): result = self.create(title=value.get('title',''), value=value)
            else:
                atomic(target, encode(value))
                result = self.get(metadata['path'])
            metadata['restored'] = stamp()
            atomic(folder / 'metadata.json', encode(metadata))
            return result

    def delete_note(self, relative, etag):
        last = self.state/'last-publication.json'
        record = json.loads(last.read_text()) if last.exists() else {}
        if record.get('path')==relative and record.get('action')=='withdraw-note' and record.get('conclusion')!='success':
            if record.get('status')=='completed': return self.publication(relative,etag,'withdraw-note',trash_after=True)
            current=self.get(relative)
            if current['etag']!=etag: raise Problem('The note changed. Review it before deleting.',409)
            record.update(trash_after=True,etag=etag);atomic(last,encode(record));return record
        entry = self.release_index().get(relative)
        if entry and not entry.get('withdrawn'):
            return self.publication(relative, etag, 'withdraw-note', trash_after=True)
        return self.trash(relative, etag)

    def cover_design(self, identity):
        if not re.fullmatch(r'[a-f0-9]{24}', str(identity)): raise Problem('Invalid cover design.')
        path = self.path('media/designs/' + identity + '.json', media=True)
        if not path.exists(): return {'id':identity, 'etag':None, 'design':None}
        raw = path.read_bytes()
        return {'id':identity, 'etag':digest(raw), 'design':json.loads(raw)}

    def save_design(self, identity, design, etag):
        defaults = json.loads((HERE / 'vendor/og-studio/defaults.json').read_text())
        if not isinstance(design, dict): raise Problem('The cover design is invalid.')
        result = {}
        for key, default in defaults.items():
            value = design.get(key, default)
            if key == 'colors':
                if not isinstance(value,list) or not 4 <= len(value) <= 8 or any(not isinstance(c,str) or not re.fullmatch(r'#[a-fA-F0-9]{6}',c) for c in value): raise Problem('Use four to eight valid cover colors.')
            elif isinstance(default, bool):
                if not isinstance(value,bool): raise Problem('Invalid cover option: ' + key)
            elif isinstance(default, (int,float)):
                if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or abs(value)>10000: raise Problem('Invalid cover setting: ' + key)
            elif not isinstance(value,str) or len(value)>10000: raise Problem('Invalid cover text: ' + key)
            if key in ('backgroundData','logoData') and value:
                if not value.startswith('/media/images/'): raise Problem('Save cover images to the private media library first.')
                self.media.source(value)
            result[key] = value
        if not 100 <= result['width'] <= 4000 or not 100 <= result['height'] <= 4000: raise Problem('Use a cover canvas between 100 and 4000 pixels.')
        with self.writing():
            current = self.cover_design(identity)
            if current['etag'] != etag: raise Problem('This cover changed in another window. Your current design remains open; reopen the saved version before replacing it.',409)
            path = self.path('media/designs/' + identity + '.json', media=True)
            atomic(path, encode(result))
            return self.cover_design(identity)

    def recover(self, relative, value, base, discard=False, client='legacy'):
        with self.writing():
            path = self.recovery_path(relative, client)
            if discard:
                if path.exists():
                    self.backup(relative, path.read_bytes(), 'recovery')
                    path.unlink()
            else:
                self.document(value)
                atomic(path, encode({'document': value, 'etag': base, 'updated': stamp(), 'client': client}))
        return {'saved': True}

    def backup(self, relative, raw, kind='saved'):
        folder = self.state / 'backups' / Path(relative).stem
        name = str(time.time_ns()) + '-' + kind + '.json'
        atomic(folder / name, raw)
        # Keep ample recovery history without growing indefinitely.
        for old in sorted(folder.glob('*.json'))[:-50]: old.unlink()

    def save(self, relative, value, base):
        self.document(value)
        with self.writing():
            path = self.path(relative)
            if not path.is_file(): raise Problem('The original file is missing; your recovery copy is retained.', 409)
            old = path.read_bytes()
            if digest(old) != base:
                raise Problem('This note changed since you opened it. Your writing is in recovery; compare it before replacing either version.',
                              409, conflict={'path': relative, 'local': value, 'online': json.loads(old), 'etag': digest(old)})
            if value.get('slug') != json.loads(old).get('slug'):
                raise Problem('Article addresses stay fixed when editing an existing note.')
            raw = encode(value)
            if raw != old:
                self.backup(relative, old)
                atomic(path, raw)
            for recovery in self.recoveries(relative):
                if json.loads(recovery.read_text()).get('document') == value: recovery.unlink()
            return {'etag': digest(raw), 'status': self.status(relative, value), 'saved': stamp()}

    def create(self, title='', date=None, value=None):
        with self.writing():
            key = secrets.token_hex(4)
            date = date or dt.datetime.now().astimezone().date().isoformat()
            try: dt.date.fromisoformat(date)
            except ValueError: raise Problem('Choose a valid date.')
            stem = re.sub('[^a-z0-9]+', '-', str(title).lower()).strip('-')[:60].rstrip('-') or 'note'
            relative = 'notes/' + date + '-' + key + '.json'
            doc = copy.deepcopy(value) if value else {'title': str(title)[:160], 'date': date, 'language': 'en', 'body': '', 'blocks': [],
                'categories': [], 'translations': [], 'font': 'default', 'sharing_image': None, 'list_image': None, 'birthday': False, 'editor_version': 2}
            doc.update(slug=stem + '-' + key, published=False, highlight=False)
            if value and isinstance(doc.get('og_designs'),dict):
                forked = {}
                for target, identity in doc['og_designs'].items():
                    saved = self.cover_design(identity)
                    if saved['design']:
                        new_id = secrets.token_hex(12)
                        self.save_design(new_id,saved['design'],None)
                        forked[target] = new_id
                doc['og_designs'] = forked
            self.document(doc)
            atomic(self.path(relative), encode(doc))
            return self.get(relative)

    def history(self, relative):
        self.path(relative)
        result = []
        for path in sorted((self.state / 'backups' / Path(relative).stem).glob('*.json'), reverse=True):
            raw = json.loads(path.read_text())
            result.append({'time': dt.datetime.fromtimestamp(path.stat().st_mtime, dt.timezone.utc).isoformat(),
                           'kind': 'Recovered session' if '-recovery' in path.name else 'Before local save',
                           'document': notes.authoring.migrate(raw.get('document', raw), Path(relative).name)})
        for path in self.recoveries(relative):
            raw = json.loads(path.read_text())
            result.insert(0, {'time': raw['updated'], 'kind': 'Recovered session', 'document': raw['document']})
        return result

    def media_list(self, kind=None):
        choices = {'photographs': ('images', {'jpg','jpeg','png','webp'}), 'videos': ('videos', {'mp4','webm'}),
                   'audio': ('audio', set(notes.authoring.AUDIO_TYPES)), 'downloads': ('downloads', set(notes.authoring.DOWNLOAD_TYPES))}
        if kind not in choices: raise Problem('Choose a media library.')
        folder, extensions = choices[kind]
        files = []
        usage = {}
        def scan(value, owner):
            if isinstance(value, dict):
                for field, description in (('cover', 'cover_alt'), ('thumbnail', 'thumbnail_alt')):
                    reference, text = value.get(field), value.get(description)
                    if isinstance(reference, str) and isinstance(text, str) and text.strip():
                        usage.setdefault(reference, {'notes': {}, 'descriptions': set()})['descriptions'].add(text.strip())
                image = value.get('image')
                if isinstance(image, str) and image.startswith('/media/'):
                    row = usage.setdefault(image, {'notes': {}, 'descriptions': set()})
                    if isinstance(value.get('alt'), str) and value['alt'].strip(): row['descriptions'].add(value['alt'].strip())
                for child in value.values(): scan(child, owner)
            elif isinstance(value, list):
                for child in value: scan(child, owner)
            elif isinstance(value, str):
                for reference in re.findall(r'/media/[\w./-]+', value):
                    row = usage.setdefault(reference, {'notes': {}, 'descriptions': set()})
                    row['notes'][owner['path']] = owner
        for source in (self.content / 'notes').glob('*.json'):
            if source.is_symlink(): continue
            try:
                doc = json.loads(source.read_text())
                scan(doc, {'path': 'notes/' + source.name, 'title': notes.title(doc)})
            except (ValueError, OSError): continue
        for p in (self.content / 'media' / folder).glob('*'):
            if p.suffix.lower().lstrip('.') not in extensions or not p.is_file() or p.is_symlink(): continue
            relative = p.relative_to(self.content).as_posix()
            self.path(relative, media=True)
            row = {'path': '/' + relative, 'name': p.name, 'size': p.stat().st_size, 'modified': p.stat().st_mtime}
            info = usage.get('/' + relative, {})
            row.update(used_by=list(info.get('notes', {}).values()), descriptions=sorted(info.get('descriptions', [])))
            if folder == 'images':
                from PIL import Image
                try:
                    with Image.open(p) as image:
                        size = image.size
                        row['width'], row['height'] = size[::-1] if image.getexif().get(274) in (5, 6, 7, 8) else size
                except (OSError, ValueError): row['unreadable'] = True
            files.append(row)
        return sorted(files, key=lambda f: f['modified'], reverse=True)

    def upload(self, kind, filename, raw):
        if not raw or len(raw) > MAX_UPLOAD: raise Problem('Choose a non-empty file up to 20 MB.')
        allowed = {'photographs': ('images', {'jpg','jpeg','png','webp'}), 'videos': ('videos', {'mp4','webm'}),
                   'audio': ('audio', set(notes.authoring.AUDIO_TYPES)), 'downloads': ('downloads', set(notes.authoring.DOWNLOAD_TYPES))}
        if kind not in allowed: raise Problem('Choose a media library.')
        folder, extensions = allowed[kind]
        ext = Path(filename).suffix.lower().lstrip('.')
        if ext not in extensions: raise Problem('This file format is not supported in that library.')
        if kind == 'photographs':
            from PIL import Image
            from io import BytesIO
            try:
                with Image.open(BytesIO(raw)) as image:
                    if image.width * image.height > 60_000_000: raise Problem('Resize this photograph below 60 megapixels first.')
                    if image.format not in {'JPEG', 'PNG', 'WEBP'}: raise Problem('Upload a JPEG, PNG, or WebP photograph.')
                    image.verify()
            except (OSError, ValueError): raise Problem('The photograph could not be read. Export it again and retry.')
        stem = re.sub(r'[^\w-]+', '-', Path(filename).stem).strip('-_')[:60] or 'upload'
        name = stem + '-' + secrets.token_hex(12) + '.' + ext
        relative = 'media/' + folder + '/' + name
        with self.writing(): atomic(self.path(relative, media=True), raw)
        return {'path': '/' + relative, 'name': filename, 'size': len(raw)}

    def preview(self, relative, value, language=None, theme='light'):
        self.document(value)
        self.path(relative)
        errors, warnings = notes.authoring.issues(value, self.content, strict=False)
        if errors: raise Problem('Finish these fields to update the preview.', errors=errors, warnings=warnings)
        with self.preview_lock, tempfile.TemporaryDirectory(prefix='notes-manager-preview-') as temp:
            snapshot = Path(temp)
            selected = snapshot / 'notes' / Path(relative).name
            selected.parent.mkdir()
            selected.write_bytes(encode(value))
            # Hard links make a read-only snapshot cheap; no private directory is served.
            shutil.copytree(self.content / 'media', snapshot / 'media', copy_function=os.link, symlinks=True)
            for path in self.media.source_keys.copy():
                stat = path.stat()
                marker = (stat.st_mtime_ns, stat.st_size)
                if self.media_times.get(path) != marker:
                    self.media.source_keys.pop(path, None)
                    self.media_times[path] = marker
            old_media = notes.Media
            try:
                notes.Media = lambda *_args, **_kwargs: self.media
                notes.build(snapshot, self.public, selected, snapshot / 'rendered')
            finally:
                notes.Media = old_media
            bundled = preview_bundle.bundle(snapshot / 'rendered')
            pages = {name: payload[0].decode() for name, payload in bundled.items() if name.endswith('.html')}
            slug = value.get('slug') or Path(relative).stem
            suffix = '.' + language if language and language != value.get('language', 'en') else ''
            markup = pages.get(slug + suffix + '.html') or next(iter(pages.values()))
            markup = markup.replace('<html ', '<html data-theme="' + ('dark' if theme == 'dark' else 'light') + '" ', 1)
            # App-only affordances are absent from the public article preview.
            markup = markup.replace('</head>', '<style>.site-header,.site-footer,.note-return{display:none!important}.notes-main{padding-top:32px!important}</style></head>')
            key = secrets.token_hex(12)
            references = set()
            for name, (raw, mime) in bundled.items():
                if name.endswith('.html') or name == 'index.json' or '"' + name + '"' not in markup: continue
                references.add(name)
                destination = self.preview_assets / name
                if not destination.exists(): atomic(destination, raw)
                self.preview_types[name] = mime
                markup = markup.replace('"' + name + '"', '"/preview-media/' + key + '/' + name + '"')
            bridge = ("(()=>{const id=" + json.dumps(key) + ";let queued=false;addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;parent.postMessage({type:'notes-preview-scroll',id,position:scrollY},'*')})},{passive:true});"
                      "addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='notes-preview-restore'&&event.data.id===id&&Number.isFinite(event.data.position))scrollTo(0,Math.max(0,Math.min(10000000,event.data.position)))});"
                      "addEventListener('click',event=>{const link=event.target.closest?.('a');if(!link)return;if(link.hasAttribute('data-note-version')){event.preventDefault();parent.postMessage({type:'notes-preview-language',id,language:link.getAttribute('lang')||link.getAttribute('data-note-version')},'*')}else if(!link.getAttribute('href')?.startsWith('#')&&!link.hasAttribute('download')){link.target='_blank';link.rel='noopener noreferrer'}})})()")
            markup = markup.replace('</body>', '<script>' + bridge + '</script></body>')
            self.previews[key] = markup.encode()
            self.preview_refs[key] = references
            while len(self.previews) > 4:
                old, _ = self.previews.popitem(last=False)
                self.preview_refs.pop(old, None)
            retained = set().union(*self.preview_refs.values())
            for path in self.preview_assets.iterdir():
                if path.name not in retained:
                    path.unlink()
                    self.preview_types.pop(path.name, None)
            # Bound the persistent image cache; old files are disposable, not uploads.
            if len(self.media.cache) > 40:
                self.media.cache.clear(); self.media.source_keys.clear()
                shutil.rmtree(self.media.output / 'assets/notes'); (self.media.output / 'assets/notes').mkdir()
            return {'url': '/preview/' + key, 'warnings': warnings}

    def pending(self):
        result = git(self.content, 'status', '--porcelain', '-z', '--untracked-files=all').stdout
        rows = result.split(b'\0')
        paths = []
        while rows:
            row = rows.pop(0)
            if not row: continue
            code, name = row[:2].decode(), row[3:].decode()
            if 'R' in code or 'C' in code:
                raise Problem('A file was renamed outside the manager. Resolve that Git change before syncing.', 409)
            if not (name.startswith('notes/') or name.startswith('media/')):
                raise Problem('There are repository settings or release-index edits outside the manager. Commit or resolve them before syncing.', 409)
            paths.append(name)
        return paths

    def sync(self, resolutions=None, expected_remote=None):
        with self.writing():
            if git(self.content, 'remote', 'get-url', 'origin', okay=True).returncode:
                raise Problem('This workspace is disconnected from GitHub. Review it locally, or restore its drafts into your original workspace before syncing with GitHub.')
            if resolutions and not expected_remote: raise Problem('Compare the current online version before resolving changes.', 409)
            if git_text(self.content, 'rev-parse', '--show-toplevel') != str(self.content) or git_text(self.content, 'branch', '--show-current') != 'main':
                raise Problem('Open the main branch of the private content repository before syncing.')
            paths = self.pending()
            if paths:
                git(self.content, 'add', '--', *paths)
                git(self.content, 'commit', '-m', 'Save Notes privately from local manager')
            git(self.content, 'fetch', 'origin', 'main')
            local = git_text(self.content, 'rev-parse', 'HEAD')
            remote = git_text(self.content, 'rev-parse', 'refs/remotes/origin/main')
            base = git_text(self.content, 'merge-base', local, remote)
            if expected_remote and remote != expected_remote:
                raise Problem('Online changes arrived while you were comparing. Sync again to review the newest version.', 409)
            if local != remote and base == local:
                git(self.content, 'merge', '--ff-only', 'refs/remotes/origin/main')
                local = remote
            if local != remote and base != remote:
                def changed(a, b): return set(git_text(self.content, 'diff', '--name-only', a, b).splitlines())
                overlaps = changed(base, local) & changed(base, remote)
                conflicts = []
                for path in sorted(overlaps):
                    a = git(self.content, 'show', local + ':' + path, okay=True)
                    b = git(self.content, 'show', remote + ':' + path, okay=True)
                    if a.returncode == b.returncode and a.stdout == b.stdout: continue
                    if not path.startswith('notes/') or not path.endswith('.json') or a.returncode or b.returncode:
                        raise Problem('An upload or repository setting changed in both places. Both Git histories are retained; resolve this file before syncing: ' + path, 409)
                    choice = (resolutions or {}).get(path)
                    if choice not in ('local', 'online', 'both'):
                        conflicts.append({'path': path, 'local': json.loads(a.stdout), 'online': json.loads(b.stdout)})
                if conflicts:
                    raise Problem('These notes changed on your Mac and online. Choose which version to keep, or keep both as separate drafts.',
                                  409, conflicts=conflicts, remote=remote)
                with tempfile.TemporaryDirectory(prefix='notes-private-sync-') as temp:
                    checkout = Path(temp) / 'merge'
                    run('git', 'clone', '--shared', '--no-checkout', str(self.content), str(checkout))
                    git(checkout, 'checkout', '--detach', local)
                    for key in ('user.name', 'user.email'):
                        git(checkout, 'config', key, git_text(self.content, 'config', key))
                    merged = git(checkout, 'merge', '--no-commit', '--no-ff', remote, okay=True)
                    unmerged = set(git_text(checkout, 'diff', '--name-only', '--diff-filter=U').splitlines())
                    if merged.returncode not in (0, 1) or unmerged - overlaps:
                        raise Problem('Git could not combine these changes. Your local and online versions are retained.', 409)
                    for path in overlaps:
                        choice = (resolutions or {}).get(path)
                        if not choice: continue
                        ours = git(self.content, 'show', local + ':' + path).stdout
                        theirs = git(self.content, 'show', remote + ':' + path).stdout
                        target = checkout / path
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(ours if choice == 'local' else theirs)
                        if choice == 'both':
                            value = json.loads(ours)
                            key = secrets.token_hex(4)
                            value.update(slug=(value.get('slug') or 'note') + '-local-' + key, published=False, highlight=False)
                            value['title'] = (value.get('title') or 'Untitled') + ' — local copy'
                            (checkout / 'notes' / ('local-copy-' + key + '.json')).write_bytes(encode(value))
                    for p in (checkout / 'notes').glob('*.json'): json.loads(p.read_text())
                    git(checkout, 'add', '-A')
                    git(checkout, 'commit', '-m', 'Combine private Notes changes')
                    git(self.content, 'fetch', str(checkout), 'HEAD')
                    git(self.content, 'merge', '--ff-only', 'FETCH_HEAD')
            git(self.content, 'push', 'origin', 'HEAD:main')
            return {'revision': git_text(self.content, 'rev-parse', 'HEAD'), 'message': 'Synced privately. Nothing was published.'}

    def publication(self, relative, base, action, trash_after=False, progress=None):
        if action not in ('publish-note', 'withdraw-note'): raise Problem('Choose a publication action.')
        # Keep the selected content stable through sync and workflow dispatch.
        with self.writing():
            if progress: progress('checking')
            opened = self.get(relative)
            if opened['etag'] != base: raise Problem('The saved note changed. Reopen and review it before publishing.', 409)
            if action == 'publish-note':
                errors, _ = notes.authoring.issues(opened['document'], self.content, strict=True)
                if errors: raise Problem('Check these fields before publishing.', errors=errors)
                if opened['document'].get('published') is not True: raise Problem('Confirm publication from the editor first.')
            remote = git(self.content, 'remote', 'get-url', 'origin', okay=True)
            if remote.returncode: raise Problem('Publishing is disconnected in this restored workspace. Use your original workspace to publish.')
            origin = remote.stdout.decode().strip().rstrip('/')
            if origin.lower().removesuffix('.git') not in ('git@github.com:tgthms/about-notes', 'https://github.com/tgthms/about-notes'):
                raise Problem('Publishing is available only from the TGthms/about-notes private repository. This copy can be edited and previewed locally.')
            selected = copy.deepcopy(opened['document'])
            if progress: progress('backup')
            result = self.sync()
            refreshed = self.get(relative)
            if refreshed['document'] != selected:
                raise Problem('Sync brought a newer version of this note. Review it before publishing.', 409)
            payload = {'action': {'name': action}, 'context': {'path': relative}, 'repository': {'sha': result['revision']}}
            if progress: progress('building')
            request = json.dumps({'payload': json.dumps(payload)})
            reply = run('gh', 'workflow', 'run', 'publish.yml', '--repo', 'TGthms/about-notes', '--ref', 'main', '--json', input=request.encode())
            match = re.search(r'https://github\.com/TGthms/about-notes/actions/runs/(\d+)', (reply.stdout + reply.stderr).decode())
            url = match.group(0) if match else 'https://github.com/TGthms/about-notes/actions/workflows/publish.yml'
            index = self.content / '.published.json'
            record = {'run_url': url, 'run_id': match[1] if match else None, 'action': action, 'path': relative, 'created': stamp(),
                      'revision': result['revision'], 'etag': refreshed['etag'], 'index_base': digest(index.read_bytes() if index.exists() else b''), 'trash_after':trash_after}
            record['design_etags']={identity:self.cover_design(identity)['etag'] for identity in (selected.get('og_designs') or {}).values()}
            record['article_url'] = notes.FEED_ORIGIN + '/notes/' + (selected.get('slug') or Path(relative).stem) + '.html'
            atomic(self.state / 'last-publication.json', encode(record))
            return record

    def run_status(self, identity):
        if not re.fullmatch(r'\d{1,20}', str(identity)): raise Problem('Invalid workflow run.')
        reply = run('gh', 'api', 'repos/TGthms/about-notes/actions/runs/' + str(identity))
        data = json.loads(reply.stdout)
        # Read step names/status only; logs and credentials never reach the editor.
        steps = []
        try:
            jobs = json.loads(run('gh', 'api', 'repos/TGthms/about-notes/actions/runs/' + str(identity) + '/jobs?per_page=20').stdout)
            for job in jobs.get('jobs', []): steps.extend(job.get('steps', []))
        except (Problem, ValueError): pass
        data['steps'] = [{k: step.get(k) for k in ('name', 'status', 'conclusion')} for step in steps]
        last = self.state / 'last-publication.json'
        if data.get('status') == 'completed' and last.exists():
            with self.writing():
                record = json.loads(last.read_text())
                if str(record.get('run_id')) == str(identity):
                    record.update(status='completed', conclusion=data.get('conclusion'))
                    atomic(last, encode(record))
                    if record.get('conclusion') == 'success' and record.get('trash_after'):
                        try:
                            if any(self.cover_design(identity)['etag']!=etag for identity,etag in record.get('design_etags',{}).items()):
                                raise Problem('The cover design has newer edits. Review it before moving this note to Trash.',409)
                            deleted = self.trash(record['path'],record['etag'])
                            record.update(trashed=True, trash_id=deleted['id'], trash_after=False)
                        except Problem as error:
                            record.update(trash_error=str(error),trash_after=False)
                        atomic(last,encode(record))
                    for key in ('trashed','trash_id','trash_error','path'):
                        if key in record: data[key] = record[key]
        return {k: data.get(k) for k in ('status', 'conclusion', 'html_url', 'head_sha','trashed','trash_id','trash_error','path','steps')}

    def job(self, operation, data):
        if operation not in ('preview', 'sync', 'publish', 'withdraw','trash','backup','restore-preview','restore'): raise Problem('Unknown operation.')
        with self.lock:
            if sum(j['status'] == 'running' for j in self.jobs.values()) >= 6:
                raise Problem('The workspace is busy. Wait for the current operation.', 429)
            key = secrets.token_hex(12)
            value = {'status': 'running', 'operation': operation}
            self.jobs[key] = value
            while len(self.jobs) > 30: self.jobs.popitem(last=False)
        def work():
            try:
                if operation == 'preview': result = self.preview(data['path'], data['document'], data.get('language'), data.get('theme'))
                elif operation == 'sync': result = self.sync(data.get('resolutions'), data.get('remote'))
                elif operation == 'trash': result = self.delete_note(data['path'],data['etag'])
                elif operation == 'backup': result = self.archives.create()
                elif operation == 'restore-preview': result = self.archives.preview(data['id'])
                elif operation == 'restore': result = self.archives.restore(data['id'], data['mode'], data.get('marker'), data.get('archive_hash'))
                else: result = self.publication(data['path'], data['etag'], 'publish-note' if operation == 'publish' else 'withdraw-note', progress=lambda phase:value.update(phase=phase))
                value.update(status='done', result=result)
            except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
                value.update(status='error', error=str(error), code=getattr(error, 'status', 400), **getattr(error, 'details', {}))
            except Exception:
                value.update(status='error', error='This content could not be processed. Your saved writing is retained; check its fields or restore a local revision.', code=400)
        self.pool.submit(work)
        return {'job': key}


class Handler(BaseHTTPRequestHandler):
    server_version = 'NotesLocal/1'
    def log_message(self, *_): pass  # Draft paths, query tokens, and uploads never enter access logs.

    @property
    def app(self): return self.server.workspace

    def authenticated(self):
        try:
            jar = cookies.SimpleCookie(self.headers.get('Cookie', ''))
            value = jar.get('notes_local_'+str(self.server.server_port))
            return bool(value and secrets.compare_digest(value.value, self.server.token))
        except cookies.CookieError: return False

    def respond(self, status, raw, kind='application/json', extra=None, preview=False):
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Robots-Tag', 'noindex, nofollow, noarchive')
        if preview:
            scripts = re.findall(rb'<script\b[^>]*>(.*?)</script>', raw, re.S)
            import base64
            hashes = ' '.join("'sha256-" + base64.b64encode(hashlib.sha256(s).digest()).decode() + "'" for s in scripts)
            policy = "default-src 'none'; script-src " + (hashes or "'none'") + "; style-src 'unsafe-inline'; img-src " + self.server.origin + " data:; media-src " + self.server.origin + " data: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
        else:
            policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        self.send_header('Content-Security-Policy', (extra or {}).get('Content-Security-Policy',policy))
        for key, value in (extra or {}).items():
            if key.lower()!='content-security-policy': self.send_header(key, value)
        self.end_headers()
        try: self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError): pass

    def json(self, value, status=200): self.respond(status, encode(value))

    def guard(self, mutation=False):
        if self.headers.get('Host') != '127.0.0.1:' + str(self.server.server_port): raise Problem('Open the manager using its local launch link.', 403)
        origin = self.headers.get('Origin')
        if origin and origin != self.server.origin: raise Problem('This request did not come from the local manager.', 403)
        if self.headers.get('Sec-Fetch-Site') == 'cross-site': raise Problem('Cross-site requests are blocked.', 403)
        if not self.authenticated(): raise Problem('Use the launch link printed by the local manager.', 401)
        if mutation and self.headers.get('X-Notes-Manager') != '1': raise Problem('Use the local editor to make changes.', 403)

    def do_GET(self):
        try:
            url = urlsplit(self.path); query = parse_qs(url.query)
            if self.headers.get('Host')=='localhost:'+str(self.server.server_port):
                destination=self.server.origin+(url.path or '/')+('?' + url.query if url.query else '')
                return self.respond(308,b'',extra={'Location':destination})
            if url.path == '/' and query.get('token'):
                if self.headers.get('Host') != '127.0.0.1:' + str(self.server.server_port) or not secrets.compare_digest(query['token'][0], self.server.token):
                    raise Problem('Invalid launch link.', 403)
                return self.respond(303, b'', extra={'Location': '/', 'Set-Cookie': 'notes_local_'+str(self.server.server_port)+'=' + self.server.token + '; HttpOnly; SameSite=Strict; Path=/' + ('; Secure' if self.server.origin.startswith('https:') else '')})
            if url.path.startswith('/preview-media/'):
                # Opaque sandbox frames cannot rely on SameSite cookies. A random,
                # per-preview capability grants read access only to that page's media.
                if self.headers.get('Host') != '127.0.0.1:' + str(self.server.server_port): raise Problem('Invalid local host.', 403)
                parts = url.path.split('/')
                if len(parts) != 4 or parts[3] not in self.app.preview_refs.get(parts[2], set()): raise Problem('Preview media is unavailable. Refresh the preview.', 404)
                name = parts[3]; path = self.app.preview_assets / name; mime = self.app.preview_types[name]
                size = path.stat().st_size; headers = {'Accept-Ranges':'bytes'}; start, end = 0, size - 1
                ranged = self.headers.get('Range')
                if ranged:
                    match = re.fullmatch(r'bytes=(\d+)-(\d*)', ranged)
                    if not match: return self.respond(416, b'', mime, extra={'Content-Range':'bytes */' + str(size)})
                    start = int(match[1]); end = min(int(match[2]) if match[2] else size - 1, size - 1)
                    if start > end: return self.respond(416, b'', mime, extra={'Content-Range':'bytes */' + str(size)})
                    headers['Content-Range'] = f'bytes {start}-{end}/{size}'
                if path.suffix in {'.pdf','.zip','.txt','.csv','.json'}: headers['Content-Disposition'] = 'attachment'
                with path.open('rb') as source: source.seek(start); raw = source.read(end - start + 1)
                return self.respond(206 if ranged else 200, raw, mime, extra=headers)
            self.guard()
            if url.path == '/api/ping': return self.json({'workspace':self.app.repo_id,'application':'notes-local'})
            if url.path == '/api/session':
                last = self.app.state / 'last-publication.json'
                return self.json({'repository': self.app.repo_id, 'schema': json.loads((HERE / 'schema.json').read_text()),
                    'notes': self.app.library(), 'connected':git(self.app.content,'remote','get-url','origin',okay=True).returncode==0,
                    'last_publication': json.loads(last.read_text()) if last.exists() else None})
            if url.path == '/api/notes': return self.json(self.app.library())
            if url.path == '/api/note': return self.json(self.app.get(query.get('path', [''])[0]))
            if url.path == '/api/comparison': return self.json(self.app.comparison(query.get('path', [''])[0]))
            if url.path == '/api/backups': return self.json(self.app.archives.list())
            if url.path == '/api/backups/download':
                identity = query.get('id', [''])[0]
                path = self.app.archives.path(identity)
                self.send_response(200)
                for key, value in {'Content-Type':'application/zip', 'Content-Length':str(path.stat().st_size),
                    'Content-Disposition':'attachment; filename="notes-private-backup-'+identity[:8]+'.zip"',
                    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'X-Robots-Tag':'noindex'}.items(): self.send_header(key,value)
                self.end_headers()
                with path.open('rb') as source: shutil.copyfileobj(source, self.wfile, 1024*1024)
                return
            if url.path == '/api/trash': return self.json(self.app.trash_list())
            if url.path == '/api/design': return self.json(self.app.cover_design(query.get('id',[''])[0]))
            if url.path == '/api/history': return self.json(self.app.history(query.get('path', [''])[0]))
            if url.path == '/api/media': return self.json(self.app.media_list(query.get('kind', ['photographs'])[0]))
            if url.path == '/api/run': return self.json(self.app.run_status(query.get('id', [''])[0]))
            if url.path.startswith('/api/jobs/'):
                job = self.app.jobs.get(url.path.rsplit('/', 1)[-1])
                if not job: raise Problem('This operation is no longer available.', 404)
                return self.json(job)
            if url.path.startswith('/preview/'):
                raw = self.app.previews.get(url.path.rsplit('/', 1)[-1])
                if raw is None: raise Problem('Refresh the preview from the editor.', 404)
                return self.respond(200, raw, 'text/html; charset=utf-8', preview=True)
            if url.path == '/favicon.ico': return self.respond(204, b'', 'image/x-icon')
            if url.path.startswith('/media/'):
                path = self.app.path(url.path, media=True)
                if not path.is_file() or path.stat().st_size > MAX_UPLOAD: raise Problem('This upload is unavailable.', 404)
                kind = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
                if path.suffix.lower() not in {'.jpg','.jpeg','.png','.webp','.mp4','.webm','.mp3','.m4a','.ogg','.wav'}:
                    return self.respond(200, path.read_bytes(), kind, extra={'Content-Disposition': 'attachment'})
                return self.respond(200, path.read_bytes(), kind)
            if url.path.startswith('/studio/'):
                relative = url.path.removeprefix('/studio/')
                allowed = {'index.html','fonts/DMSans-Variable.ttf','fonts/OFL.txt'}
                if relative not in allowed: raise Problem('Not found.',404)
                path = HERE / 'vendor/og-studio' / relative
                raw = path.read_bytes()
                extra = {'Content-Security-Policy': "default-src 'self'; script-src 'sha256-" + __import__('base64').b64encode(hashlib.sha256(re.search(rb'<script>(.*?)</script>',raw,re.S)[1]).digest()).decode() + "'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"} if relative=='index.html' else None
                return self.respond(200,raw,mimetypes.guess_type(path.name)[0] or 'application/octet-stream',extra=extra)
            assets = {'/': 'index.html', '/app.js': 'app.js', '/app.js.LEGAL.txt': 'app.js.LEGAL.txt', '/style.css': 'style.css'}
            if url.path not in assets: raise Problem('Not found.', 404)
            path = HERE / 'static' / assets[url.path]
            return self.respond(200, path.read_bytes(), mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
        except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
            self.json({'error': str(error), **getattr(error, 'details', {})}, getattr(error, 'status', 400))

    def do_POST(self):
        try:
            self.guard(mutation=True)
            url = urlsplit(self.path)
            length = int(self.headers.get('Content-Length', '0'))
            if url.path == '/api/backups/upload': return self.json(self.app.archives.receive(self.rfile, length))
            limit = MAX_UPLOAD if url.path == '/api/upload' else MAX_JSON
            if not 0 < length <= limit: raise Problem('The request is empty or too large.', 413)
            raw = self.rfile.read(length)
            if url.path == '/api/upload':
                query = parse_qs(url.query)
                return self.json(self.app.upload(query.get('kind', [''])[0], query.get('name', [''])[0], raw))
            if self.headers.get('Content-Type') != 'application/json': raise Problem('Use a JSON request.', 415)
            data = json.loads(raw)
            if not isinstance(data, dict): raise Problem('Use a JSON object for this request.')
            if url.path == '/api/save': return self.json(self.app.save(data['path'], data['document'], data['etag']))
            if url.path == '/api/recovery': return self.json(self.app.recover(data['path'], data.get('document'), data.get('etag'), data.get('discard', False), data.get('client', 'legacy')))
            if url.path == '/api/create': return self.json(self.app.create(data.get('title', ''), data.get('date'), data.get('document')))
            if url.path == '/api/discard': return self.json(self.app.discard(data['path'],data['etag'],data['revision'],data.get('design_etags')))
            if url.path == '/api/trash/empty': return self.json(self.app.empty_trash(data.get('ids')))
            if url.path == '/api/backups/open':
                identity = data.get('id', '')
                if not re.fullmatch(r'[a-f0-9]{24}', str(identity)): raise Problem('Choose a restored workspace.')
                with self.app.writing():
                    restored = self.app.state / 'restored' / identity
                    if not (restored/'repository/notes').is_dir(): raise Problem('This restored workspace is unavailable.',404)
                    if identity not in self.app.restored_servers:
                        child = Workspace(restored/'repository', restored/'local', self.app.public)
                        tls = self.app.state/'tls'
                        secure = self.server.origin.startswith('https:')
                        server = serve(child, 0, tls/'localhost.pem' if secure else None, tls/'localhost-key.pem' if secure else None)
                        self.app.restored_servers[identity] = server
                        threading.Thread(target=server.serve_forever, daemon=True).start()
                    server = self.app.restored_servers[identity]
                    return self.json({'url':server.origin+'/?token='+server.token})
            if url.path == '/api/trash/restore': return self.json(self.app.restore_trash(data['id']))
            if url.path == '/api/design': return self.json(self.app.save_design(data['id'],data['design'],data.get('etag')))
            if url.path == '/api/jobs': return self.json(self.app.job(data['operation'], data))
            raise Problem('Not found.', 404)
        except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
            self.json({'error': str(error), **getattr(error, 'details', {})}, getattr(error, 'status', 400))


def serve(workspace, port=1222, certificate=None, key=None):
    class LocalServer(ThreadingHTTPServer):
        request_queue_size = 64
    server = LocalServer(('127.0.0.1', port), Handler)
    server.workspace, server.token = workspace, secrets.token_urlsafe(32)
    server.origin = ('https' if certificate else 'http') + '://127.0.0.1:' + str(server.server_port)
    if certificate:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(str(certificate),str(key))
        server.socket = context.wrap_socket(server.socket,server_side=True)
    server.daemon_threads = True
    return server


def reopen(workspace, port, no_open=False, scheme='http'):
    """Reopening the launcher reuses this workspace, never an unrelated local app."""
    path = workspace.state / ('session-' + str(port) + '.json')
    connection = None
    try:
        session = json.loads(path.read_text())
        if session.get('scheme','http') != scheme: return False
        if session.get('workspace') != workspace.repo_id or not re.fullmatch(r'[A-Za-z0-9_-]{32,100}', session.get('token','')): return False
        if scheme == 'https':
            context=ssl.create_default_context(cafile=str(workspace.state/'tls/rootCA.pem'))
            connection=HTTPSConnection('127.0.0.1',port,timeout=2,context=context)
        else: connection = HTTPConnection('127.0.0.1',port,timeout=2)
        connection.request('GET','/api/ping',headers={'Cookie':'notes_local_'+str(port)+'='+session['token']})
        response=connection.getresponse();data=json.loads(response.read())
        if response.status != 200 or data != {'workspace':workspace.repo_id,'application':'notes-local'}: return False
        url=scheme+'://127.0.0.1:'+str(port)+'/?token='+session['token']
        print('Your Notes workspace is already running.\n'+url,flush=True)
        if not no_open: webbrowser.open(url)
        return True
    except (ValueError,OSError,HTTPException): return False
    finally:
        if connection: connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', type=Path, default=ROOT / '.private-notes')
    parser.add_argument('--state', type=Path, default=ROOT / '.notes-manager')
    parser.add_argument('--port', type=int, default=1222)
    parser.add_argument('--no-open', action='store_true')
    parser.add_argument('--http', action='store_true', help='Use loopback HTTP for isolated development tests.')
    args = parser.parse_args()
    if not (HERE / 'static/app.js').exists(): raise SystemExit('Build the manager first: cd tools/notes-manager && npm ci && npm run build')
    try:
        from PIL import Image  # Fail early with a useful setup message.
        workspace = Workspace(args.content, args.state)
        certificate=key=None
        if not args.http:
            certificate=workspace.state/'tls/localhost.pem';key=workspace.state/'tls/localhost-key.pem'
            if not certificate.is_file() or not key.is_file(): raise Problem('Set up trusted HTTPS first: open tools/notes-manager/Setup HTTPS.command. Use --http only for isolated development.')
        try: server = serve(workspace, args.port,certificate,key)
        except OSError:
            if reopen(workspace,args.port,args.no_open,scheme='http' if args.http else 'https'):
                workspace.pool.shutdown(wait=False,cancel_futures=True)
                return
            raise Problem('That local port is already in use. Choose another with --port, for example --port 1223.')
    except ImportError: raise SystemExit('Install the Notes requirements using this Python: python -m pip install -r scripts/notes/requirements.txt')
    except (Problem, OSError) as error: raise SystemExit(str(error))
    url = server.origin + '/?token=' + server.token
    session = workspace.state / ('session-' + str(server.server_port) + '.json')
    atomic(session,encode({'workspace':workspace.repo_id,'token':server.token,'scheme':'https' if certificate else 'http'}))
    print('\nNotes · local workspace\n' + url + '\nKeep this launch link private. Stop with Control-C.\n', flush=True)
    if not args.no_open: webbrowser.open(url)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally:
        server.server_close()
        for child in workspace.restored_servers.values():
            child.shutdown(); child.server_close(); child.workspace.pool.shutdown(wait=False, cancel_futures=True)
        workspace.pool.shutdown(wait=False, cancel_futures=True)
        if session.exists() and json.loads(session.read_text()).get('token') == server.token: session.unlink()


if __name__ == '__main__': main()
