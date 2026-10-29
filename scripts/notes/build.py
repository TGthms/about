#!/usr/bin/env python3
"""Export published notes only. The private content repository is never deployed."""
import argparse
import base64
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET

ORIGIN = 'https://timgong.me'
ROOT = Path(__file__).resolve().parents[2]
LANGS = {'en': 'English', 'es': 'Español', 'zh': '简体中文', 'zh-Hant': '繁體中文', 'ja': '日本語', 'ko': '한국어'}
LOCALES = {'en': 'en_US', 'es': 'es_ES', 'zh': 'zh_CN', 'zh-Hant': 'zh_TW', 'ja': 'ja_JP', 'ko': 'ko_KR'}
RSS_ICON = '<svg viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M143.5-143.5Q120-167 120-200t23.5-56.5Q167-280 200-280t56.5 23.5Q280-233 280-200t-23.5 56.5Q233-120 200-120t-56.5-23.5ZM680-120q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"/></svg>'

def esc(value):
    return html.escape(str(value or ''), quote=True)

def language(value):
    value = str(value or 'en')
    if not re.fullmatch(r'[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*', value):
        raise ValueError('Use a valid language code, such as en or zh-Hant.')
    return value

def date(value):
    return dt.date.fromisoformat(str(value))

def readable_date(value):
    return date(value).strftime('%b %-d, %Y')

def plain(value):
    class Text(HTMLParser):
        def __init__(self):
            super().__init__(); self.parts = []; self.blocked = []
        def handle_starttag(self, tag, attrs):
            if tag in {'script', 'style', 'iframe', 'object', 'svg', 'template'}: self.blocked.append(tag)
        def handle_endtag(self, tag):
            if self.blocked and tag == self.blocked[-1]: self.blocked.pop()
        def handle_data(self, data):
            if not self.blocked: self.parts.append(data)
    parser = Text(); parser.feed(str(value or ''))
    return re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()

def summary(post):
    text = str(post.get('summary') or '').strip() or plain(post.get('body'))
    if not text:
        text = ' '.join(plain(block.get('body') or block.get('caption')) for block in post.get('blocks', []))
    return text[:240].rstrip() + ('…' if len(text) > 240 else '')

def title(post):
    return str(post.get('title') or '').strip() or summary(post)[:72] or readable_date(post['date'])

def safe_link(value):
    value = str(value or '').strip()
    parsed = urlparse(value)
    if any(ord(c) < 32 for c in value) or '\\' in value:
        return ''
    if parsed.scheme in ('https', 'mailto') and (parsed.netloc or parsed.scheme == 'mailto'):
        return value
    if value.startswith('/notes/') or value in ('/notes.html', '/feed.xml'):
        return ORIGIN + value
    return ''

class Media:
    def __init__(self, private, output, preview=False):
        self.private, self.output, self.preview = private, output, preview
        self.cache = {}
        self.source_keys = {}

    def source(self, value):
        value = unquote(str(value or '')).lstrip('/')
        if not value.startswith('media/') or '\\' in value:
            raise ValueError('Upload media through the editor’s media library.')
        candidate = self.private / value
        if any(parent.is_symlink() for parent in (candidate, *candidate.parents) if parent.is_relative_to(self.private)):
            raise ValueError('Media references cannot use symbolic links.')
        path = candidate.resolve()
        if not path.is_relative_to(self.private / 'media') or not path.is_file():
            raise ValueError('A referenced media file is missing or outside the media folder.')
        return path

    def image(self, value, alt='', prefix='../', loading='lazy'):
        if not str(alt).strip():
            raise ValueError('Add a short image description (alternative text) before publishing.')
        from PIL import Image, ImageOps, ImageCms
        source = self.source(value)
        key = self.source_keys.get(source)
        if key is None:
            key = hashlib.sha256(source.read_bytes()).hexdigest()[:20]
            self.source_keys[source] = key
        if key not in self.cache:
            with Image.open(source) as opened:
                if opened.width * opened.height > 60_000_000:
                    raise ValueError('Please resize photographs larger than 60 megapixels before uploading.')
                image = ImageOps.exif_transpose(opened)
                image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
                if opened.info.get('icc_profile'):
                    try:
                        profile = ImageCms.ImageCmsProfile(BytesIO(opened.info['icc_profile']))
                        image = ImageCms.profileToProfile(image, profile, ImageCms.createProfile('sRGB'), outputMode=image.mode)
                    except ImageCms.PyCMSError as error:
                        raise ValueError('This photograph has an unreadable color profile. Export it as an sRGB image and upload it again.') from error
                width, height = image.size
                sizes = sorted(set([min(width, w) for w in (320, 640, 1280, 1920)]))
                variants = []
                for size in sizes:
                    copy = image.copy()
                    copy.thumbnail((size, max(1, round(height * size / width))), Image.Resampling.LANCZOS)
                    name = f'assets/notes/{key}-{copy.width}.webp'
                    path = self.output / name; path.parent.mkdir(parents=True, exist_ok=True)
                    copy.save(path, 'WEBP', quality=85, method=6)
                    variants.append((name, copy.width, copy.height))
                self.cache[key] = variants
        variants = self.cache[key]
        largest = variants[-1]
        path = prefix + largest[0]
        srcset = ', '.join(f'{prefix}{name} {w}w' for name, w, _ in variants)
        if self.preview:
            path = 'data:image/webp;base64,' + base64.b64encode((self.output / largest[0]).read_bytes()).decode()
            srcset = ''
        markup = (f'<img src="{esc(path)}"' + (f' srcset="{esc(srcset)}" sizes="(max-width: 767px) calc(100vw - 32px), 720px"' if srcset else '') +
                  f' width="{largest[1]}" height="{largest[2]}" alt="{esc(alt)}" loading="{loading}" decoding="async" />')
        if not self.preview:
            markup = f'<picture><source media="(max-width: 320px), (max-device-width: 320px)" srcset="{esc(prefix + variants[0][0])}" />' + markup + '</picture>'
        return markup, largest[0]

    def social(self, value, alt):
        from PIL import Image, ImageOps
        _, image = self.image(value, alt)
        name = image.rsplit('-', 1)[0] + '-share.jpg'
        path = self.output / name
        if not path.exists():
            with Image.open(self.output / image) as opened:
                rgb = opened.convert('RGB')
                ImageOps.pad(rgb, (1200, 630), color=(20, 23, 25)).save(path, 'JPEG', quality=88, optimize=True)
        return name

    def video(self, block, prefix):
        value = str(block.get('file') or block.get('url') or '')
        local = not urlparse(value).scheme
        if local:
            source = self.source(value)
            if source.suffix.lower() not in ('.mp4', '.webm'):
                raise ValueError('Use an MP4 or WebM video.')
            if source.stat().st_size > 20 * 1024 * 1024:
                raise ValueError('For videos over 20 MB, use the hosted video URL field.')
            digest = hashlib.sha256(source.read_bytes()).hexdigest()[:20]
            name = f'assets/notes/{digest}{source.suffix.lower()}'
            dest = self.output / name; dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.exists(): shutil.copyfile(source, dest)
            url = prefix + name
            if self.preview:
                mime = 'video/mp4' if source.suffix.lower() == '.mp4' else 'video/webm'
                url = f'data:{mime};base64,' + base64.b64encode(source.read_bytes()).decode()
        else:
            url = safe_link(value)
            if not url.startswith('https://') or not urlparse(url).path.lower().endswith(('.mp4', '.webm')):
                raise ValueError('Use a direct HTTPS MP4 or WebM URL for hosted videos.')
        poster, large_poster = '', ''
        if block.get('poster'):
            _, name = self.image(block['poster'], block.get('caption') or 'Video still', prefix)
            key = self.source_keys[self.source(block['poster'])]
            poster = prefix + self.cache[key][0][0]
            large_poster = prefix + name
            if self.preview:
                poster = 'data:image/webp;base64,' + base64.b64encode((self.output / name).read_bytes()).decode()
                large_poster = ''
        caption = esc(block.get('caption', ''))
        transcript = str(block.get('transcript') or '').strip()
        return ('<figure class="note-media">' + f'<video controls playsinline preload="none"' + (f' poster="{esc(poster)}"' if poster else '') +
                (f' data-note-poster="{esc(large_poster)}"' if large_poster and large_poster != poster else '') +
                f' aria-label="{caption or "Video"}"><source src="{esc(url)}" type="{"video/webm" if urlparse(value).path.lower().endswith(".webm") else "video/mp4"}" /></video>' +
                (f'<figcaption>{caption}</figcaption>' if caption else '') +
                f'<a class="note-media__link" href="{esc(url)}" target="_blank" rel="noopener noreferrer"><span data-i18n="notes.openVideo">Open video</span> ↗</a>' +
                (f'<details><summary data-i18n="notes.transcript">Transcript</summary><p>{esc(transcript)}</p></details>' if transcript else '') + '</figure>')

class RichText(HTMLParser):
    allowed = {'p', 'h2', 'h3', 'h4', 'strong', 'em', 'b', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'br', 'hr', 'pre', 'code', 'a', 'sub', 'sup'}
    forbidden = {'script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'template'}
    def __init__(self, media, prefix):
        super().__init__(convert_charrefs=True)
        self.media, self.prefix, self.output, self.stack, self.blocked = media, prefix, [], [], []
    def handle_starttag(self, tag, attrs):
        if self.blocked:
            if tag in self.forbidden: self.blocked.append(tag)
            return
        if tag in self.forbidden:
            self.blocked.append(tag); return
        values = dict(attrs)
        if tag == 'img':
            markup, _ = self.media.image(values.get('src'), values.get('alt'), self.prefix)
            self.output.append(markup); return
        if tag == 'h1': tag = 'h2'
        if tag not in self.allowed: return
        attr = ''
        if tag == 'a':
            link = safe_link(values.get('href'))
            if link:
                attr = f' href="{esc(link)}"'
                if not link.startswith(ORIGIN + '/') and not link.startswith('mailto:'): attr += ' target="_blank" rel="noopener noreferrer"'
        self.output.append(f'<{tag}{attr}>')
        if tag not in ('br', 'hr'): self.stack.append(tag)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in ('img', 'br', 'hr'): self.handle_endtag(tag)
    def handle_endtag(self, tag):
        if self.blocked:
            if tag == self.blocked[-1]: self.blocked.pop()
            return
        if tag == 'h1': tag = 'h2'
        if tag in self.stack:
            while self.stack:
                current = self.stack.pop(); self.output.append(f'</{current}>')
                if current == tag: break
    def handle_data(self, data):
        if not self.blocked: self.output.append(esc(data))
    def finish(self, value):
        self.feed(str(value or '')); self.close()
        while self.stack: self.output.append(f'</{self.stack.pop()}>')
        return ''.join(self.output)

def rich(value, media, prefix):
    return RichText(media, prefix).finish(value)

def body(post, media, prefix):
    result = rich(post.get('body'), media, prefix)
    for block in post.get('blocks') or []:
        kind = block.get('type')
        if kind == 'text': result += rich(block.get('body'), media, prefix)
        elif kind == 'photo':
            markup, _ = media.image(block.get('image'), block.get('alt'), prefix)
            result += '<figure class="note-media">' + markup + (f'<figcaption>{esc(block["caption"])}</figcaption>' if block.get('caption') else '') + '</figure>'
        elif kind == 'video': result += media.video(block, prefix)
        else: raise ValueError('Unknown content block. Choose text, photo, or video.')
    if not plain(result).strip() and '<img ' not in result and '<video ' not in result:
        raise ValueError('Add some text, a photograph, or a video before publishing.')
    return result

def first_photo(post):
    if post.get('cover'): return post['cover'], post.get('cover_alt') or ''
    for block in post.get('blocks') or []:
        if block.get('type') == 'photo' and block.get('image'): return block['image'], block.get('alt', '')
    class Images(HTMLParser):
        found = None
        blocked = False
        def handle_starttag(self, tag, attrs):
            if tag in RichText.forbidden: self.blocked = True
            if tag == 'img' and self.found is None and not self.blocked:
                a = dict(attrs); self.found = a.get('src'), a.get('alt', '')
        def handle_endtag(self, tag):
            if tag in RichText.forbidden: self.blocked = False
    parser = Images(); parser.feed(str(post.get('body') or ''))
    return parser.found or ('', '')

def read_posts(private, preview_path=None):
    posts, slugs = [], set()
    for path in sorted((private / 'notes').glob('*.json')):
        value = json.loads(path.read_text())
        if preview_path and path.resolve() != preview_path.resolve(): continue
        if value.get('published') is not True and not preview_path: continue
        slug = str(value.get('slug') or path.stem)
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or re.match(r'page-\d+$', slug):
            raise ValueError('Use a short link name containing lowercase letters, numbers, and hyphens.')
        if slug in slugs: raise ValueError('Each post must have a different link name.')
        slugs.add(slug)
        date(value.get('date'))
        value['slug'], value['language'] = slug, language(value.get('language'))
        if value.get('highlight_until'): date(value['highlight_until'])
        versions = [value]
        seen = {value['language']}
        for translation in value.get('translations') or []:
            if translation.get('published') is not True: continue
            code = language(translation.get('language'))
            if code in seen: raise ValueError('Each translation must have a different language.')
            seen.add(code)
            versions.append({**value, 'title': '', 'summary': '', 'body': '', 'blocks': [], **translation, 'language': code, 'translations': [], 'slug': slug, 'date': value['date']})
        value['_versions'] = versions
        posts.append(value)
    return sorted(posts, key=lambda p: (p['date'], p['slug']), reverse=True)

def post_filename(post, original):
    suffix = '' if post['language'] == original['language'] else '.' + post['language']
    return f'notes/{post["slug"]}{suffix}.html'

def version_links(post, prefix):
    return ''.join(f'<a href="{esc(prefix + post_filename(version, post))}" hreflang="{esc(version["language"])}" lang="{esc(version["language"])}" data-note-version="{esc(version["language"])}">{esc(LANGS.get(version["language"], version["language"]))}</a>' for version in post['_versions'])

def render_post(version, original, media, prefix='../'):
    versions = version_links(original, prefix).replace(f'data-note-version="{esc(version["language"])}"', f'aria-current="page" data-note-version="{esc(version["language"])}"')
    language_picker = ('<span data-note-language-label data-i18n="notes.readIn">Read in</span>' + versions) if len(original['_versions']) > 1 else f'<span data-note-language-label data-note-original="{esc(original["language"])}">Written in {esc(LANGS.get(original["language"], original["language"]))}</span>'
    heading = f'<h1>{esc(version["title"])}</h1>' if str(version.get('title') or '').strip() else '<h1 class="visually-hidden">' + esc(title(version)) + '</h1>'
    return (f'<article class="notes-post" lang="{esc(version["language"])}">'
            f'<a class="notes-back" href="{prefix}notes.html"><span data-i18n="notes.all">All notes</span> <span aria-hidden="true">→</span></a>'
            f'<header class="note-header"><p class="note-header__date"><time datetime="{version["date"]}" data-note-date>{readable_date(version["date"])}</time> · Tim G</p>{heading}' +
            (f'<p class="note-header__summary">{esc(version["summary"])}</p>' if version.get('summary') else '') + '</header>' +
            f'<nav class="note-language" aria-label="Post languages" data-i18n-aria="notes.languages">{language_picker}</nav>' +
            '<div class="note-body">' + body(version, media, prefix) + '</div>' +
            '<footer class="note-end">' + f'<a class="notes-back" href="{prefix}notes.html"><span data-i18n="notes.all">All notes</span> <span aria-hidden="true">→</span></a>' +
            '<button class="note-share" type="button" id="note-share" hidden data-i18n="notes.share">Share this note</button>' +
            '<p class="visually-hidden" role="status" aria-live="polite" id="note-share-status"></p>' +
            '<label class="note-share-fallback" id="note-share-fallback" hidden><span data-i18n="notes.copyFailed">You can copy the link below.</span><input readonly type="url" aria-label="Post link" data-i18n-aria="notes.postLink" /></label></footer></article>')

def card(post, media, prefix):
    photo, alt = first_photo(post)
    image = ''
    if photo:
        markup, _ = media.image(photo, alt, prefix)
        image = markup.replace('<img ', '<img class="note-card__image" ', 1)
    heading = f'<h2 class="note-card__title">{esc(post["title"])}</h2>' if str(post.get('title') or '').strip() else ''
    text = summary(post)
    return (f'<li class="note-card" lang="{esc(post["language"])}"><time class="note-card__date" datetime="{post["date"]}" data-note-date>{readable_date(post["date"])}</time>'
            f'<a class="note-card__link" href="{prefix}{post_filename(post, post)}">{heading}' +
            (f'<p class="note-card__excerpt">{esc(text)}</p>' if text else '') + image +
            '<span class="note-card__meta"><span class="note-card__more"><span data-i18n="notes.read">Read note</span> <span aria-hidden="true">→</span></span>' +
            f'<span>{esc(LANGS.get(post["language"], post["language"]))}</span></span></a></li>')

def resource_versions(markup, public):
    def replace(match):
        attr, prefix, resource = match[1], match[2], match[3]
        path = public / resource
        if not path.is_file(): raise ValueError('Missing page resource: ' + resource)
        return attr + prefix + resource + '?v=' + hashlib.sha256(path.read_bytes()).hexdigest()[:12] + '"'
    return re.sub(r'((?:src|href)=")((?:\.\./)*)((?:js|css)/[\w/.-]+)(?:\?v=[a-f0-9]+)?"', replace, markup)

def shell(public, **values):
    template = (ROOT / 'templates/notes-shell.html').read_text()
    for key, value in values.items(): template = template.replace('{{' + key + '}}', str(value))
    if re.search(r'{{\w+}}', template): raise ValueError('Incomplete page template.')
    return '\n'.join(line.rstrip() for line in resource_versions(template, public).splitlines()) + '\n'

def page(public, content, prefix='', kind='index', post=None, image='', image_alt='', alternates=''):
    headline = title(post) + ' — Tim G' if post else 'Notes — Tim G'
    desc = summary(post) if post else 'Small updates, photographs, and things along the way.'
    canonical = ORIGIN + '/' + (post['_filename'] if post else ('notes.html' if not prefix else 'notes/page-1.html'))
    structured = ''
    if post:
        data = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': title(post), 'datePublished': post['date'], 'inLanguage': post['language'], 'author': {'@type': 'Person', 'name': 'Tim G', 'url': ORIGIN + '/'}, 'url': canonical, 'description': desc}
        if image: data['image'] = ORIGIN + '/' + image
        structured = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'
    return shell(public, html_lang=esc(post['language'] if post else 'en'), prefix=prefix, title=esc(headline), description=esc(desc), canonical=esc(canonical), image=esc(ORIGIN + '/' + (image or 'og-image.png')), image_alt=esc(image_alt or headline), og_type='article' if post else 'website', og_locale=esc(LOCALES.get(post['language'] if post else 'en', 'en_US')), structured_data=structured, alternates=alternates, kind=kind, content=content)

def entrance(posts):
    intro = ('<section class="notes-entrance" id="notes" aria-labelledby="notes-entrance-title"><div class="container">'
             '<a class="notes-entrance__main" href="notes.html"><span class="notes-entrance__heading"><span id="notes-entrance-title" data-i18n="notes.title">Notes</span>' + RSS_ICON + '</span>'
             '<span class="notes-entrance__intro" data-i18n="notes.intro">Small updates, photographs, and things along the way.</span>'
             '<span class="notes-entrance__action"><span data-i18n="notes.explore">Explore notes</span> <span aria-hidden="true">→</span></span></a>')
    def latest(post, attr, label):
        return f'<a class="notes-entrance__latest" {attr} href="{post_filename(post, post)}"><span data-i18n="notes.{label}">{"A little update" if label == "featured" else "Latest note"}</span><span lang="{esc(post["language"])}">{esc(title(post))}</span><time datetime="{post["date"]}" data-note-date>{readable_date(post["date"])}</time></a>'
    if posts:
        today = dt.datetime.now(dt.timezone.utc).date()
        highlights = [p for p in posts if p.get('highlight') is True and (not p.get('highlight_until') or date(p['highlight_until']) >= today)]
        if highlights:
            chosen = highlights[0]
            intro += latest(chosen, f'data-note-highlight-until="{esc(chosen.get("highlight_until"))}"', 'featured')
            intro += latest(posts[0], 'data-notes-latest hidden', 'latest')
        else: intro += latest(posts[0], 'data-notes-latest', 'latest')
    return intro + '</div></section>'

def build(private, public, preview_path=None, preview_output=None):
    private, public = private.resolve(), public.resolve()
    # Validate fixed output inputs before replacing any existing public pages.
    home_markup = (public / 'index.html').read_text()
    if home_markup.count('<!-- notes-entrance:start -->') != 1 or home_markup.count('<!-- notes-entrance:end -->') != 1:
        raise ValueError('The homepage Notes entrance marker is missing.')
    sitemap = ET.parse(public / 'sitemap.xml')
    posts = read_posts(private, preview_path)
    if preview_path and not posts: raise ValueError('The selected draft could not be found.')
    with tempfile.TemporaryDirectory(prefix='notes-export-') as temp:
        stage = Path(temp); media = Media(private, stage, preview=bool(preview_path))
        (stage / 'notes').mkdir()
        (stage / 'assets/notes').mkdir(parents=True)
        urls, rss_items = [], []
        for post in posts:
            for version in post['_versions']:
                filename = post_filename(version, post); version['_filename'] = filename
                rendered = render_post(version, post, media)
                image, alt = first_photo(version); image_path = ''
                if image: image_path = media.social(image, alt)
                alternates = ''.join(f'<link rel="alternate" hreflang="{esc(v["language"])}" href="{ORIGIN}/{post_filename(v, post)}" />' for v in post['_versions'])
                markup = page(public, rendered, prefix='../', kind='post', post=version, image=image_path, image_alt=alt, alternates=alternates)
                if preview_path:
                    # A downloaded private artifact has no external images, scripts, or CSS.
                    css = '\n'.join((public / f'css/{name}.css').read_text() for name in ('styles', 'notes', 'compact'))
                    markup = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', markup)
                    markup = re.sub(r'<script\b[^>]*>.*?</script>', '', markup, flags=re.S)
                    css = re.sub(r'url\([^)]*\)', 'none', css)
                    markup = markup.replace('</head>', '<style>' + css.replace('</style', '<\\/style') + '</style></head>')
                    # Downloaded previews keep navigation useful without a local server.
                    markup = re.sub(r'href="\.\./notes/([^"/]+\.html)"', lambda m: 'href="' + m[1] + '"', markup)
                    markup = re.sub(r'href="\.\./([^"/]+\.(?:html|xml))"', lambda m: 'href="' + ORIGIN + '/' + m[1] + '"', markup)
                    markup = re.sub(r'<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>', '', markup)
                    dest = preview_output / Path(filename).name; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(markup)
                else:
                    (stage / filename).write_text(markup)
                    urls.append((ORIGIN + '/' + filename, post['date']))
            rss_items.append(post)
        if preview_path: return {'posts': len(posts), 'preview': True}
        page_count = max(1, (len(posts) + 19) // 20)
        for index in range(page_count):
            prefix = '' if index == 0 else '../'
            filename = 'notes.html' if index == 0 else f'notes/page-{index + 1}.html'
            hero = '<header class="notes-hero"><div><h1 data-i18n="notes.title">Notes</h1><p class="notes-hero__intro" data-i18n="notes.intro">Small updates, photographs, and things along the way.</p></div>' + f'<a class="notes-feed-link" href="{prefix}feed.xml">{RSS_ICON}<span data-i18n="notes.rss">Follow via RSS</span></a></header>'
            entries = ''.join(card(p, media, prefix) for p in posts[index * 20:(index + 1) * 20])
            if not entries: entries = '<div class="notes-empty"><span class="notes-empty__mark">' + RSS_ICON + '</span><h2 data-i18n="notes.emptyTitle">Nothing here just yet.</h2><p data-i18n="notes.emptyText">A place for photographs, stories, and little updates.</p></div>'
            else: entries = '<ol class="notes-list" role="list">' + entries + '</ol>'
            pagination = ''
            if page_count > 1:
                pagination = '<nav class="notes-pagination" aria-label="Notes pages" data-i18n-aria="notes.pages">'
                if index: pagination += f'<a href="{prefix}{"notes.html" if index == 1 else "notes/page-" + str(index) + ".html"}"><span data-i18n="notes.newer">Newer notes</span> →</a>'
                if index + 1 < page_count: pagination += f'<a href="{prefix}notes/page-{index + 2}.html"><span data-i18n="notes.older">Older notes</span> →</a>'
                pagination += '</nav>'
            markup = page(public, hero + entries + pagination, prefix=prefix)
            markup = markup.replace(ORIGIN + '/notes/page-1.html', ORIGIN + '/' + filename)
            (stage / filename).write_text(markup)
            urls.append((ORIGIN + '/' + filename, ''))
        atom = 'http://www.w3.org/2005/Atom'; ET.register_namespace('atom', atom)
        rss = ET.Element('rss', {'version': '2.0'}); channel = ET.SubElement(rss, 'channel')
        for key, value in [('title', 'Tim G — Notes'), ('link', ORIGIN + '/notes.html'), ('description', 'Small updates, photographs, and things along the way.')]: ET.SubElement(channel, key).text = value
        ET.SubElement(channel, '{' + atom + '}link', {'href': ORIGIN + '/feed.xml', 'rel': 'self', 'type': 'application/rss+xml'})
        for post in rss_items[:20]:
            item = ET.SubElement(channel, 'item'); url = ORIGIN + '/' + post_filename(post, post)
            for key, value in [('title', title(post)), ('link', url), ('description', summary(post)), ('pubDate', dt.datetime.combine(date(post['date']), dt.time(12), dt.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT'))]: ET.SubElement(item, key).text = value
            ET.SubElement(item, 'guid', {'isPermaLink': 'true'}).text = url
        ET.ElementTree(rss).write(stage / 'feed.xml', encoding='utf-8', xml_declaration=True)
        # All content has passed validation before touching the deployment tree.
        for name in ('notes', 'assets/notes'):
            dest = public / name
            if dest.exists(): shutil.rmtree(dest)
            if (stage / name).exists(): shutil.copytree(stage / name, dest)
        for name in ('notes.html', 'feed.xml'): shutil.copyfile(stage / name, public / name)
        home = public / 'index.html'; markup = home_markup
        markup, count = re.subn(r'<!-- notes-entrance:start -->.*?<!-- notes-entrance:end -->', lambda _: '<!-- notes-entrance:start -->\n' + entrance(posts) + '\n    <!-- notes-entrance:end -->', markup, flags=re.S)
        if count != 1: raise ValueError('The homepage Notes entrance marker is missing.')
        home.write_text(markup)
        namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'; ET.register_namespace('', namespace)
        root = sitemap.getroot()
        for entry in list(root):
            location = entry.find('{' + namespace + '}loc')
            if location is not None and (location.text == ORIGIN + '/notes.html' or location.text.startswith(ORIGIN + '/notes/')): root.remove(entry)
        for url, updated in urls:
            entry = ET.SubElement(root, '{' + namespace + '}url'); ET.SubElement(entry, '{' + namespace + '}loc').text = url
            if updated: ET.SubElement(entry, '{' + namespace + '}lastmod').text = updated
        sitemap.write(public / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    return {'posts': len(posts), 'preview': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', type=Path)
    parser.add_argument('--empty', action='store_true')
    parser.add_argument('--public', type=Path, default=ROOT / 'public')
    parser.add_argument('--preview', type=Path)
    parser.add_argument('--preview-output', type=Path)
    args = parser.parse_args()
    if not args.empty and not args.content: parser.error('Specify the private content folder, or --empty.')
    try:
        if args.empty:
            with tempfile.TemporaryDirectory() as temp: result = build(Path(temp), args.public)
        else: result = build(args.content.resolve(), args.public.resolve(), args.preview, args.preview_output)
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as error:
        raise SystemExit('Notes were not published: ' + str(error))
    print(json.dumps(result))

if __name__ == '__main__': main()
