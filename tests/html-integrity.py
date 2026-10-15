from html.parser import HTMLParser
from pathlib import Path
import hashlib
import re

root = Path('public')
errors = []

class Check(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.labels = []
        self.anchors = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
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
            path = root / value.split('?', 1)[0].split('#', 1)[0]
            if not path.is_file():
                errors.append(f'Missing asset: {value}')
            elif value.startswith(('js/', 'css/')):
                version = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
                if value != str(path.relative_to(root)) + '?v=' + version:
                    errors.append(f'Resource version: {value}')
        for key in ('srcset', 'data-srcset'):
            for candidate in a.get(key, '').split(','):
                parts = candidate.strip().split()
                if parts and not (root / parts[0]).is_file():
                    errors.append(f'Missing responsive image: {parts[0]}')
        if tag == 'a' and a.get('target') == '_blank':
            if not {'noopener', 'noreferrer'}.issubset(a.get('rel', '').split()):
                errors.append(f'External link rel: {href}')

preferences = Path('public/js/preferences.js').read_text()
markup = preferences.split('root.innerHTML = `', 1)[1].split('`;', 1)[0]
for page in root.glob('*.html'):
    checker = Check()
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
