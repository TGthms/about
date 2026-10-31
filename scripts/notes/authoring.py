#!/usr/bin/env python3
"""Editor schema compatibility, field-level checks, and lossless draft migration."""
import argparse
import copy
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlparse

LANGUAGES = ('en', 'zh', 'zh-Hant', 'ja', 'ko', 'es')


def normalize(value):
    """Read both original flat fields and the grouped editor schema."""
    result = copy.deepcopy(value)
    for group, image, alt in (('sharing_image', 'cover', 'cover_alt'), ('list_image', 'thumbnail', 'thumbnail_alt')):
        if group in result:
            selected = result.get(group) or {}
            result[image] = selected.get('image', '')
            result[alt] = selected.get('alt', '')
    for block in result.get('blocks') or []:
        if block.get('type') == 'video':
            if 'source' in block:
                source = block.get('source') or {}
                block['file'] = source.get('file', '') if source.get('type') == 'upload' else ''
                block['url'] = source.get('url', '') if source.get('type') == 'hosted' else ''
            elif block.get('file'):
                # Older published revisions gave the upload precedence.
                block['url'] = ''
    result['translations'] = [normalize(v) for v in result.get('translations') or []]
    return result


def migrate(value, filename):
    """Change editing structure only; retain all author text and unknown fields."""
    result = copy.deepcopy(value)
    if result.get('editor_version') != 2:
        result['birthday'] = result.get('birthday') is True or any(
            isinstance(c, str) and c.strip().casefold() == 'birthday' for c in result.get('categories') or [])
    result['editor_version'] = 2
    result.setdefault('slug', Path(filename).stem)
    for group, image, alt in (('sharing_image', 'cover', 'cover_alt'), ('list_image', 'thumbnail', 'thumbnail_alt')):
        if group not in result and (result.get(image) or result.get(alt)):
            result[group] = {'image': result.get(image, ''), 'alt': result.get(alt, '')}
        if group in result:
            selected = result[group]
            if not selected or (isinstance(selected, dict) and not any(selected.values())):
                result[group] = None
            elif isinstance(selected, dict):
                result[group] = {'type': 'custom', **selected}
        result.pop(image, None)
        result.pop(alt, None)
    for version in [result] + (result.get('translations') or []):
        for block in version.get('blocks') or []:
            if block.get('type') == 'video' and 'source' not in block:
                block['source'] = ({'type': 'upload', 'file': block['file']} if block.get('file') else
                                   {'type': 'hosted', 'url': block.get('url', '')})
                block.pop('file', None)
                block.pop('url', None)
    return result


def issues(value, private, strict=True):
    """Return all actionable errors together, without changing the input."""
    errors, warnings = [], []
    def problem(label, message, draft_ok=False):
        (warnings if draft_ok and not strict else errors).append(f'{label}: {message}')
    try:
        post = normalize(value)
    except (AttributeError, TypeError):
        return ['Content: one of the image, video, or translation groups is malformed.'], []
    lang = post.get('language') or 'en'
    try:
        dt.date.fromisoformat(str(post.get('date', '')))
    except ValueError:
        problem('Date', 'choose a valid date.')
    if lang not in LANGUAGES:
        problem('Original language', 'choose one of the six available languages.')
    slug = str(post.get('slug') or '')
    if slug and (not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or re.match(r'page-\d+$', slug)):
        problem('Article address', 'use lowercase letters, numbers, and hyphens.')
    categories = post.get('categories') or []
    if not isinstance(categories, list) or len(categories) > 8:
        problem('Categories', 'choose up to eight category names.')
    elif any(not isinstance(c, str) or not 1 <= len(c.strip()) <= 48 for c in categories):
        problem('Categories', 'each name must contain 1–48 characters.')
    if post.get('birthday') is True and post.get('birthday_visibility', '24-hours') not in ('24-hours', 'keep-link'):
        problem('Birthday · after 24 hours', 'choose one of the available options.')
    if post.get('highlight_until'):
        try:
            dt.date.fromisoformat(str(post['highlight_until']))
        except ValueError:
            problem('Feature until', 'choose a valid date.')

    def local(reference, label, extensions):
        decoded = unquote(str(reference or '')).lstrip('/')
        candidate = private / decoded
        if (not decoded.startswith('media/') or '..' in Path(decoded).parts or '\\' in decoded or
                any(p.is_symlink() for p in (candidate, *candidate.parents) if p.is_relative_to(private)) or
                not candidate.resolve().is_relative_to((private / 'media').resolve())):
            problem(label, 'choose a file from the private media library.'); return None
        if not candidate.is_file():
            problem(label, 'the selected upload is missing; upload or select it again.'); return None
        if candidate.suffix.lower().lstrip('.') not in extensions:
            problem(label, 'choose a supported file format.'); return None
        return candidate

    def image(reference, alt, label):
        if not reference:
            if alt: problem(label, 'choose an image or clear its description.')
            return
        local(reference, label, ('jpg', 'jpeg', 'png', 'webp'))
        if not isinstance(alt, str) or not alt.strip():
            problem(label + ' → Image description', 'describe the image before publishing.', True)

    for key, alt, label in (('cover', 'cover_alt', 'Sharing image'), ('thumbnail', 'thumbnail_alt', 'On-site image')):
        image(post.get(key), post.get(alt), label)
    for group, label in (('sharing_image', 'Sharing image'), ('list_image', 'On-site image')):
        selected = post.get(group) or {}
        if selected.get('type') not in (None, 'custom'):
            problem(label, 'choose an image using the image control.')
        if selected.get('type') == 'custom' and not selected.get('image'):
            problem(label + ' → Image', 'select an image, or remove this image block to use the default.', True)

    class InlineImages(HTMLParser):
        def __init__(self, label):
            super().__init__(); self.label = label; self.number = 0; self.blocked = []
        def handle_starttag(self, tag, attrs):
            if tag in ('script', 'style', 'iframe', 'object', 'svg', 'template'):
                self.blocked.append(tag)
            if tag == 'img' and not self.blocked:
                self.number += 1; a = dict(attrs)
                image(a.get('src'), a.get('alt'), f'{self.label} → Image {self.number}')
        def handle_endtag(self, tag):
            if self.blocked and tag == self.blocked[-1]: self.blocked.pop()
    seen = {lang}
    versions = [(post, f'{LANGUAGES_LABELS.get(lang, lang)}')]
    for index, version in enumerate(post.get('translations') or [], 1):
        if strict and version.get('published') is not True: continue
        code = version.get('language')
        label = f'Translation {index} ({LANGUAGES_LABELS.get(code, code) or "choose a language"})'
        if code not in LANGUAGES: problem(label, 'choose a supported language.')
        if code in seen: problem(label, 'each translation must use a different language from the original and other translations.')
        seen.add(code)
        versions.append((version, label))
    for version, label in versions:
        if version.get('font', post.get('font', 'default')) not in ('default', 'sans', 'serif', 'mono'):
            problem(label + ' → Reading font', 'choose one of the available fonts.')
        InlineImages(label + ' → Text').feed(str(version.get('body') or ''))
        blocks = version.get('blocks') or []
        if not isinstance(blocks, list):
            problem(label + ' → More content', 'use a list of content blocks.'); continue
        for index, block in enumerate(blocks, 1):
            if not isinstance(block, dict):
                problem(f'{label} → Block {index}', 'choose a content block.'); continue
            kind = block.get('type')
            field = f'{label} → {str(kind or "Block").replace("-", " ").title()} {index}'
            if kind == 'photo':
                if not block.get('image'): problem(field + ' → Photo', 'choose an image.')
                else: image(block.get('image'), block.get('alt'), field)
            elif kind == 'text': InlineImages(field).feed(str(block.get('body') or ''))
            elif kind == 'video':
                file, url = block.get('file'), block.get('url')
                if bool(file) == bool(url): problem(field + ' → Source', 'choose either an upload or a hosted video link.')
                if file:
                    path = local(file, field + ' → Upload', ('mp4', 'webm'))
                    if path and path.stat().st_size > 20 * 1024 * 1024:
                        problem(field + ' → Upload', 'clips over 20 MB need a hosted video link.')
                if url and (urlparse(url).scheme != 'https' or not urlparse(url).netloc or
                            not urlparse(url).path.lower().endswith(('.mp4', '.webm')) or any(ord(c) < 32 for c in url)):
                    problem(field + ' → Hosted link', 'use a direct HTTPS MP4 or WebM URL.')
                if block.get('poster'): local(block['poster'], field + ' → Preview photograph', ('jpg', 'jpeg', 'png', 'webp'))
            elif kind == 'table':
                columns, rows = block.get('columns') or [], block.get('rows') or []
                if not str(block.get('caption') or '').strip(): problem(field + ' → Caption', 'name the table.', True)
                if not isinstance(columns, list) or not 1 <= len(columns) <= 8 or any(not isinstance(c, str) or not c.strip() for c in columns):
                    problem(field + ' → Columns', 'add one to eight named columns.')
                    columns = []
                if not isinstance(rows, list) or not rows: problem(field + ' → Rows', 'add at least one row.')
                else:
                    for row_index, row in enumerate(rows, 1):
                        cells = row.get('cells') if isinstance(row, dict) else None
                        if not isinstance(cells, list) or len(cells) != len(columns) or any(not isinstance(c, str) for c in cells):
                            problem(f'{field} → Row {row_index}', 'provide one text cell for every column.')
            elif kind != 'same-study': problem(field, 'choose text, photograph, video, table, or SAME experiment.')
    return list(dict.fromkeys(errors)), list(dict.fromkeys(warnings))


LANGUAGES_LABELS = {'en': 'English', 'zh': '简体中文', 'zh-Hant': '繁體中文', 'ja': '日本語', 'ko': '한국어', 'es': 'Español'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', type=Path, required=True)
    parser.add_argument('--migrate', action='store_true')
    args = parser.parse_args()
    for path in sorted((args.content / 'notes').glob('*.json')):
        value = json.loads(path.read_text())
        if args.migrate:
            migrated = migrate(value, path.name)
            if migrated != value: path.write_text(json.dumps(migrated, ensure_ascii=False, indent=2) + '\n')
        else:
            errors, warnings = issues(value, args.content.resolve())
            print(path.name + ': ' + ('\n'.join(errors + warnings) or 'Ready'))


if __name__ == '__main__': main()
