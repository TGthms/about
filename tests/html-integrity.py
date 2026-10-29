from html.parser import HTMLParser
from pathlib import Path
import hashlib
import re

root = Path('public')
errors = []
VOID_TAGS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Check(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page
        self.ids = set()
        self.labels = []
        self.anchors = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        # A page-level modal must not inherit a card/grid stacking context.
        if a.get('role') == 'dialog' or tag == 'dialog':
            if not self.stack or self.stack[-1] != 'body':
                errors.append(f'Dialog must be a direct body child: {a.get("id", tag)}')
        if tag not in VOID_TAGS:
            self.stack.append(tag)
        element_id = a.get('id')
        if element_id:
            if element_id in self.ids:
                errors.append(f'Duplicate ID: {element_id}')
            self.ids.add(element_id)
        for key in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            self.labels.extend(a.get(key, '').split())
        href = a.get('href', '')
        if href.startswith('#') and len(href) > 1:
            self.anchors.append(href[1:])
        for key in ('href', 'src', 'data-src', 'data-hero-src', 'data-balloons-src', 'data-content-src', 'data-number-flow-src', 'data-fireworks-src'):
            value = a.get(key, '')
            if not value or value.startswith(('#', 'https:', 'http:', 'mailto:', 'data:')):
                continue
            relative = value.split('?', 1)[0].split('#', 1)[0]
            path = ((root / relative.lstrip('/')) if relative.startswith('/') else (self.page.parent / relative)).resolve()
            if not path.is_relative_to(root.resolve()):
                errors.append(f'Asset outside public folder: {value}')
                continue
            if not path.is_file():
                errors.append(f'Missing asset: {value}')
            elif path.suffix in ('.js', '.mjs', '.css'):
                version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
                if value != relative + '?v=' + version:
                    errors.append(f'Resource version: {value}')
        for key in ('srcset', 'data-srcset'):
            for candidate in a.get(key, '').split(','):
                parts = candidate.strip().split()
                if parts and not (self.page.parent / parts[0]).is_file():
                    errors.append(f'Missing responsive image: {parts[0]}')
        if tag == 'a' and a.get('target') == '_blank':
            if not {'noopener', 'noreferrer'}.issubset(a.get('rel', '').split()):
                errors.append(f'External link rel: {href}')

    def handle_endtag(self, tag):
        if tag in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index(tag)
            self.stack = self.stack[:index]

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

preferences = Path('public/js/preferences.js').read_text()
markup = preferences.split('root.innerHTML = `', 1)[1].split('`;', 1)[0]
for page in root.rglob('*.html'):
    checker = Check(page)
    checker.feed(page.read_text())
    checker.feed(markup)
    for target in checker.labels + checker.anchors:
        if target not in checker.ids:
            errors.append(f'{page}: missing target {target}')

for css in (root / 'css').glob('*.css'):
    for match in re.finditer(r'url\([\'\"]?([^\)\'\"]+)', css.read_text()):
        value = match[1]
        if not value.startswith(('data:', 'http:', 'https:', '#', '%23')) and not (css.parent / value).is_file():
            errors.append(f'{css}: missing asset {value}')

if errors:
    raise SystemExit('\n'.join(errors))
print('HTML, accessibility references, assets, and resource versions passed')
