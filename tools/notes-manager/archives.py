"""Private, portable workspace archives. Never store credentials or execute archive code."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import shlex
import stat
import sys
import tempfile
import zipfile

LIMIT = 2 * 1024 ** 3
STATE_FOLDERS = {'backups', 'recovery', 'trash', 'discarded-designs'}
CONTENT_FOLDERS = {'notes', 'media', '.github'}
CONTENT_FILES = {'.published.json', '.pages.yml', 'README.md'}


def sha(path):
    with path.open('rb') as source: return hashlib.file_digest(source, 'sha256').hexdigest()


def allowed(name):
    p = PurePosixPath(name)
    if not name or '\\' in name or p.is_absolute() or any(part in {'', '.', '..'} for part in name.split('/')): return False
    if name == 'history.bundle': return True
    if p.parts[0] == 'content' and len(p.parts) > 1:
        return p.parts[1] in CONTENT_FOLDERS or len(p.parts) == 2 and p.parts[1] in CONTENT_FILES
    return p.parts[0] == 'local' and len(p.parts) > 2 and p.parts[1] in STATE_FOLDERS


class Archives:
    def __init__(self, app, git, atomic, encode, problem):
        self.app, self.git, self.atomic, self.encode, self.problem = app, git, atomic, encode, problem
        self.root = app.state / 'archives'
        self.root.mkdir(exist_ok=True, mode=0o700)

    def path(self, identity):
        if not isinstance(identity, str) or not re.fullmatch(r'[a-f0-9]{24}', identity): raise self.problem('Choose a workspace backup.')
        path = self.root / (identity + '.zip')
        if path.is_symlink() or not path.is_file(): raise self.problem('This backup is unavailable.', 404)
        return path

    def list(self):
        return [{'id': p.stem, 'created': dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc).isoformat(),
                 'size': p.stat().st_size, 'url': '/api/backups/download?id='+p.stem}
                for p in sorted(self.root.glob('*.zip'), key=lambda p:p.stat().st_mtime, reverse=True)
                if not p.is_symlink() and re.fullmatch(r'[a-f0-9]{24}', p.stem)]

    def files(self):
        result = {}
        for label, base, folders, names in [('content', self.app.content, CONTENT_FOLDERS, CONTENT_FILES), ('local', self.app.state, STATE_FOLDERS, set())]:
            for name in sorted(folders | names):
                path = base / name
                if path.is_symlink(): raise self.problem('Remove symbolic links before making a complete backup.')
                if not path.exists(): continue
                candidates = path.rglob('*') if path.is_dir() else [path]
                for item in candidates:
                    if item.is_symlink() or any(p.is_symlink() for p in item.parents if p.is_relative_to(base)):
                        raise self.problem('Remove symbolic links before making a complete backup.')
                    if item.is_file(): result[label + '/' + item.relative_to(base).as_posix()] = item
        return result

    def create(self):
        with self.app.writing(), tempfile.TemporaryDirectory(dir=self.root) as temp:
            identity = secrets.token_hex(12)
            bundle = Path(temp) / 'history.bundle'
            self.git(self.app.content, 'bundle', 'create', str(bundle), '--all')
            files = self.files(); files['history.bundle'] = bundle
            if sum(p.stat().st_size for p in files.values()) > LIMIT: raise self.problem('This workspace exceeds the 2 GB archive limit. Use a private filesystem backup for now.')
            manifest = {'format': 'tim-notes-backup', 'version': 1, 'created': dt.datetime.now(dt.timezone.utc).isoformat(),
                        'files': {name: sha(path) for name, path in files.items()}}
            archive = Path(temp) / 'archive.zip'
            with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=3) as output:
                output.writestr('manifest.json', self.encode(manifest))
                for name, path in files.items(): output.write(path, name)
            os.chmod(archive, 0o600)
            os.replace(archive, self.root / (identity + '.zip'))
            return {'id': identity, 'created': manifest['created'], 'files': len(files), 'size': self.path(identity).stat().st_size,
                    'url': '/api/backups/download?id=' + identity}

    def receive(self, source, length):
        if not 0 < length <= LIMIT: raise self.problem('Choose a Notes backup up to 2 GB.', 413)
        identity = secrets.token_hex(12); target = self.root / (identity + '.zip')
        try:
            with target.open('xb') as output:
                os.chmod(target, 0o600)
                remaining = length
                while remaining:
                    chunk = source.read(min(1024 * 1024, remaining))
                    if not chunk: raise self.problem('The backup upload was interrupted.')
                    output.write(chunk); remaining -= len(chunk)
            self.validate(identity)
            return {'id': identity}
        except Exception:
            target.unlink(missing_ok=True)
            raise

    def validate(self, identity):
        try:
            with zipfile.ZipFile(self.path(identity)) as archive:
                entries = archive.infolist(); names = [i.filename for i in entries]
                if len(entries) > 30000 or len(set(names)) != len(names) or 'manifest.json' not in names: raise ValueError('Invalid backup contents.')
                if sum(i.file_size for i in entries) > LIMIT: raise ValueError('The expanded backup exceeds 2 GB.')
                for item in entries:
                    if item.flag_bits & 1 or stat.S_ISLNK(item.external_attr >> 16) or (item.filename != 'manifest.json' and not allowed(item.filename)):
                        raise ValueError('The backup contains an unsupported path or link.')
                if archive.getinfo('manifest.json').file_size > 4 * 1024 * 1024: raise ValueError('The backup manifest is too large.')
                manifest = json.loads(archive.read('manifest.json'))
                if manifest.get('format') != 'tim-notes-backup' or manifest.get('version') != 1 or not isinstance(manifest.get('files'), dict): raise ValueError('Choose a supported Notes workspace backup.')
                if set(manifest['files']) != set(names) - {'manifest.json'} or 'history.bundle' not in names: raise ValueError('The backup is incomplete.')
                for name, expected in manifest['files'].items():
                    with archive.open(name) as source:
                        if hashlib.file_digest(source, 'sha256').hexdigest() != expected: raise ValueError('A backup file failed its integrity check.')
                return manifest
        except (zipfile.BadZipFile, KeyError, TypeError, json.JSONDecodeError) as error:
            raise ValueError('This file is not a complete Notes backup.') from error

    def preview(self, identity):
        manifest = self.validate(identity)
        current = self.files()
        def target(name): return name.startswith(('content/notes/', 'content/media/', 'local/'))
        restored = {n: h for n, h in manifest['files'].items() if target(n)}
        present = {n: sha(p) for n, p in current.items() if target(n)}
        changes = [{'path': name, 'change': 'Added' if name not in present else 'Removed' if name not in restored else 'Changed'}
                   for name in sorted(set(present) | set(restored)) if present.get(name) != restored.get(name)]
        marker = hashlib.sha256(self.encode(present)).hexdigest()
        return {'id': identity, 'created': manifest['created'], 'files': len(manifest['files']), 'changes': changes,
                'marker': marker, 'archive_hash': sha(self.path(identity))}

    def restore(self, identity, mode, marker, archive_hash):
        if mode not in ('separate', 'replace'): raise self.problem('Choose where to restore the backup.')
        with self.app.writing():
            review = self.preview(identity)
            if review['archive_hash'] != archive_hash or mode == 'replace' and review['marker'] != marker:
                raise self.problem('The backup or local writing changed. Review the restore preview again.', 409)
            last = self.app.state / 'last-publication.json'
            if mode == 'replace' and last.exists():
                record = json.loads(last.read_text())
                if record.get('status') != 'completed': raise self.problem('Wait for the current publication to finish before restoring drafts.', 409)
            identity_new = secrets.token_hex(12)
            destination = self.app.state / 'restored' / identity_new
            destination.mkdir(parents=True, mode=0o700)
            try:
                with zipfile.ZipFile(self.path(identity)) as archive:
                    for name in json.loads(archive.read('manifest.json'))['files']:
                        output = destination / name
                        output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                        with archive.open(name) as source, output.open('xb') as target:
                            os.chmod(output, 0o600); shutil.copyfileobj(source, target, 1024 * 1024)
                # A bundle has objects and refs, not Git config, tokens, or executable hooks.
                self.git(destination, 'clone', '--quiet', '--no-checkout', str(destination/'history.bundle'), str(destination/'repository'))
                content = destination / 'repository'
                self.git(content, 'read-tree', 'HEAD')
                # Overlay the unsynced working files on the saved Git history.
                for name in CONTENT_FOLDERS:
                    shutil.rmtree(content/name, ignore_errors=True)
                shutil.copytree(destination/'content', content, dirs_exist_ok=True)
                (content/'notes').mkdir(exist_ok=True); (content/'media').mkdir(exist_ok=True)
                if mode == 'separate':
                    self.git(content, 'remote', 'remove', 'origin')
                    local = destination/'local'; local.mkdir(exist_ok=True)
                    for name in ('localhost.pem', 'localhost-key.pem', 'rootCA.pem'):
                        original = self.app.state/'tls'/name
                        if original.is_file(): self.atomic(local/'tls'/name, original.read_bytes())
                    launcher = destination/'Open restored Notes.command'
                    args = [sys.executable, str(Path(__file__).with_name('server.py')), '--content', str(content), '--state', str(local), '--port', '0']
                    launcher.write_text('#!/bin/sh\nexec '+shlex.join(args)+'\n'); launcher.chmod(0o700)
                    return {'mode': mode, 'id': identity_new, 'content': str(content), 'state': str(local), 'launcher':str(launcher)}
                safety = self.create()
                # Import historical objects without moving main, release pins, or remotes.
                self.git(self.app.content, 'fetch', '--quiet', str(destination/'history.bundle'), 'refs/*:refs/notes-backup/'+identity_new+'/*')
                swaps = []
                try:
                    for base, saved, names in [(self.app.content, content, {'notes', 'media'}), (self.app.state, destination/'local', STATE_FOLDERS)]:
                        for name in sorted(names):
                            target = base/name; old = destination/('before-'+('content' if base==self.app.content else 'local'))/name
                            old.parent.mkdir(parents=True, exist_ok=True)
                            if target.exists(): os.replace(target, old)
                            swaps.append((target, old))
                            if (saved/name).exists(): shutil.copytree(saved/name, target)
                            else: target.mkdir(parents=True, exist_ok=True)
                except Exception:
                    for target, old in reversed(swaps):
                        shutil.rmtree(target, ignore_errors=True)
                        if old.exists(): os.replace(old, target)
                    raise
                self.app.media.cache.clear(); self.app.media.source_keys.clear()
                shutil.rmtree(destination)
                return {'mode': mode, 'safety': safety}
            except Exception:
                shutil.rmtree(destination, ignore_errors=True)
                raise
