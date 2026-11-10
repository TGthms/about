"""Public addresses used by the site and the Notes exporter."""
from pathlib import PurePosixPath
import re
from urllib.parse import urlsplit

STABLE_ORIGIN = 'https://t-g.pages.dev'
CANONICAL_ORIGIN = 'https://timgong.me'
LEGACY_ORIGIN = 'https://timgong.me'


def canonical_url(path):
    path = '/' + path.lstrip('/')
    if CANONICAL_ORIGIN == STABLE_ORIGIN:
        if path == '/index.html':
            path = '/'
        elif path.endswith('.html'):
            path = path[:-5]
    elif not path.endswith('/') and (not PurePosixPath(path).suffix or
                                     path.startswith('/notes/') and not path.endswith('.html')):
        path += '.html'
    return CANONICAL_ORIGIN + path


def refresh(public):
    """Apply the selected canonical origin to committed static metadata."""
    local = r'https://(?:timgong\.me|t-g\.pages\.dev)(/[^"<\s]*)'
    canonical = r'(<link rel="(?:canonical|sitemap)"[^>]* href="|<link rel="alternate" hreflang="[^"]+" href="|<meta property="og:url" content="|"url":\s*")'
    share = r'(<meta (?:property="og:image"|name="twitter:image") content="|"image":\s*")'
    for page in sorted(public.rglob('*.html')):
        before = page.read_text()
        head, sep, body = before.partition('</head>')
        if not sep:
            continue
        head = re.sub(canonical + local, lambda m: m[1] + canonical_url(m[2]), head)
        head = re.sub(share + local, lambda m: m[1] + STABLE_ORIGIN + m[2], head)
        prefix = '../' * (len(page.relative_to(public).parts) - 1)
        head = re.sub(r'(<link rel="(?:icon|apple-touch-icon)" href=")(?:https://(?:timgong\.me|t-g\.pages\.dev))?/',
                      lambda m: m[1] + prefix, head)
        after = head + sep + body
        if before != after:
            page.write_text(after)
    for name, pattern in (('sitemap.xml', r'(<loc>)'), ('robots.txt', r'(Sitemap: )')):
        path = public / name
        if not path.is_file():
            continue
        before = path.read_text()
        after = re.sub(pattern + local, lambda m: m[1] + canonical_url(m[2]), before)
        if before != after:
            path.write_text(after)


def note_listing(url):
    path = urlsplit(url).path
    return path in ('/notes', '/notes.html', '/subscribe', '/subscribe.html') or path.startswith('/notes/')
