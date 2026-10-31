#!/usr/bin/env python3
"""Export published notes only. The private content repository is never deployed."""
import argparse
import base64
import datetime as dt
import hashlib
import html
import importlib.util
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlparse, unquote
import xml.etree.ElementTree as ET

ORIGIN = 'https://timgong.me'
ROOT = Path(__file__).resolve().parents[2]
LANGS = {'en': 'English', 'es': 'Español', 'zh': '简体中文', 'zh-Hant': '繁體中文', 'ja': '日本語', 'ko': '한국어'}
FONTS = {'default', 'sans', 'serif', 'mono'}
CATEGORIES = {'projects': 'Projects', 'learning': 'Learning', 'photography': 'Photography', 'life': 'Life', 'birthday': 'Birthday'}
LOCALES = {'en': 'en_US', 'es': 'es_ES', 'zh': 'zh_CN', 'zh-Hant': 'zh_TW', 'ja': 'ja_JP', 'ko': 'ko_KR'}
RSS_ICON = '<svg viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M143.5-143.5Q120-167 120-200t23.5-56.5Q167-280 200-280t56.5 23.5Q280-233 280-200t-23.5 56.5Q233-120 200-120t-56.5-23.5ZM680-120q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"/></svg>'
SHARE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6,22q-0.82,0-1.41-0.59T4,20V10Q4,9.17 4.59,8.59T6,8H9v2H6V20H18V10H15V8h3q0.82,0 1.41,0.59T20,10V20q0,0.82-0.59,1.41T18,22H6Zm5-6V4.82L9.4,6.43L8,5l4-4l4,4L14.6,6.43L13,4.82V16H11Z"/></svg>'

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

def categories(post):
    values = post.get('categories') or []
    if not isinstance(values, list) or len(values) > 8:
        raise ValueError('Choose up to eight category names.')
    result = {}
    for value in values:
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= 48:
            raise ValueError('Category names must contain 1–48 characters.')
        value = value.strip()
        key = value.casefold()
        if key not in CATEGORIES: key = 'c-' + hashlib.sha256(key.encode()).hexdigest()[:12]
        result[key] = CATEGORIES.get(key, value)
    if post.get('birthday') is True: result['birthday'] = 'Birthday'
    return result

def is_birthday(post):
    return post.get('birthday') is True or any(isinstance(v, str) and v.strip().casefold() == 'birthday' for v in (post.get('categories') or []))

def temporary_birthday(post):
    retention = post.get('birthday_visibility', '24-hours')
    if retention not in ('24-hours', 'keep-link'): raise ValueError('Choose Remove article or Keep direct link for Birthday visibility.')
    return is_birthday(post)

def birthday_publication_time(private, path):
    """Use the first committed publication, never the editable display date."""
    released = private / '.release-metadata.json'
    if released.exists():
        stamp = json.loads(released.read_text()).get(path.name, {}).get('birthday_at')
        if stamp: return dt.datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    def git(*args):
        result = subprocess.run(['git', '-C', str(private), *args], capture_output=True, text=True)
        if result.returncode: raise ValueError('Birthday publishing requires the private repository’s full Git history.')
        return result.stdout.strip()
    if git('rev-parse', '--is-shallow-repository') == 'true':
        raise ValueError('Birthday publishing requires fetch-depth: 0 in the private workflow.')
    relative = path.relative_to(private).as_posix()
    for entry in git('log', '--reverse', '--format=%H %cI', '--', relative).splitlines():
        commit, timestamp = entry.split(' ', 1)
        result = subprocess.run(['git', '-C', str(private), 'show', commit + ':' + relative], capture_output=True, text=True)
        if result.returncode: continue  # A deletion has no file to inspect.
        old = json.loads(result.stdout)
        if old.get('published') is True and is_birthday(old):
            return dt.datetime.fromisoformat(timestamp).astimezone(dt.timezone.utc)
    raise ValueError('Save the published Birthday note in the private editor before exporting it.')

def expiry_attr(post):
    return f' data-note-expires="{esc(post["_expires"])}"' if post.get('_expires') else ''

def availability(post):
    if not post.get('_expires'): return ''
    return '<span class="note-availability"><time datetime="' + esc(post['_expires']) + '" data-note-expiry-label>Until ' + esc(post['_expires'].replace('T', ' ').replace('Z', ' UTC')) + '</time></span>'

def category_labels(post, prefix, links=True):
    result = []
    for key, label in categories(post).items():
        tag = 'a' if links else 'span'
        href = f' href="{prefix}notes/topics/{key}.html"' if links else ''
        result.append(f'<{tag}{href} data-note-category="{key}">{esc(label)}</{tag}>')
    return '<span class="note-categories">' + ''.join(result) + '</span>' if result else ''

def reading_contents(markup):
    headings = []
    def heading(match):
        text = plain(match[1])
        key = 'section-' + str(len(headings) + 1)
        headings.append((key, text))
        return f'<h2 id="{key}" tabindex="-1">{match[1]}</h2>'
    markup = re.sub(r'<h2>(.*?)</h2>', heading, markup, flags=re.S)
    if len(headings) < 3: return markup
    links = ''.join(f'<li><a href="#{key}">{esc(label)}</a></li>' for key, label in headings)
    return ('<div class="note-reading-layout"><details class="note-contents"><summary data-i18n="notes.contents">On this page</summary>'
            '<nav aria-label="On this page" data-i18n-aria="notes.contents"><ol>' + links + '</ol></nav></details>'
            '<div class="note-body">' + markup + '</div></div>')

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

    def image(self, value, alt='', prefix='../', loading='lazy', sizes='(max-width: 767px) calc(100vw - 32px), 720px'):
        if not str(alt).strip() and self.preview:
            alt = 'Image description pending'
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
                widths = sorted(set([min(width, w) for w in (320, 640, 1280, 1920)]))
                variants = []
                for size in widths:
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
        markup = (f'<img src="{esc(path)}"' + (f' srcset="{esc(srcset)}" sizes="{esc(sizes)}"' if srcset else '') +
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

def same_study(lang, introduction=''):
    # Fixed educational component: author content never becomes executable code.
    chinese = lang == 'zh'
    lang = 'zh' if chinese else 'en'
    words = {
        'en': {
            'title': 'Read the signal',
            'intro': 'Change the fields, inspect a byte, and compare three header bursts. This is a silent model, not a live alert or a full decoder.',
            'event': 'Event', 'area': 'Geographic area', 'duration': 'Valid period',
            'events': ['RWT · Weekly test', 'DMO · Practice / demo'],
            'areas': ['Los Angeles County, CA', 'Detroit / Wayne County, MI', 'Travis County, TX'],
            'durations': ['15 minutes', '30 minutes', '1 hour'],
            'labels': ['Start', 'Originator', 'Event', 'Area', 'Valid period', 'Issue time', 'Sender'],
            'fields': {
                'start': 'ZCZC marks the start of a header. The synchronization preamble comes before it and is not shown here.',
                'origin': 'EAS identifies an EAS Participant as the originator. It is a category, not a station name.',
                'event': 'The three-letter event code classifies the message. It does not contain the spoken announcement.',
                'area': 'PSSCCC separates the partition, state, and county or equivalent area. These examples use 0 for all or unspecified portions.',
                'duration': 'The four digits after + use HHMM and specify the message’s valid period.',
                'issued': '3021800 means day 302 of the year at 18:00 UTC. The year itself is not in this field.',
                'sender': 'SIGLAB followed by two spaces is a fictional, eight-character sender field for this example.'
            },
            'values': {'RWT': 'RWT = Required Weekly Test.', 'DMO': 'DMO = Practice/Demo Warning.', '006037': '0 · 06 · 037 = Los Angeles County, California.', '026163': '0 · 26 · 163 = Wayne County, Michigan, including Detroit.', '048453': '0 · 48 · 453 = Travis County, Texas.', '0015': '+0015 = 00 hours, 15 minutes.', '0030': '+0030 = 00 hours, 30 minutes.', '0100': '+0100 = 01 hour, 00 minutes.'},
            'bytes': 'Go closer: one character on the wire', 'character': 'ASCII character',
            'bitHint': 'First bit sent → last bit sent',
            'byteHint': 'Each cell is one bit, lasting 1.92 ms. 0 uses 1,562.5 Hz; 1 uses about 2,083.3 Hz. The cells show transmission order, least significant bit first—not the usual way a binary number is printed.',
            'wire': 'Bits in transmission order',
            'repetition': 'What if a burst is missing—or different?',
            'repeatIntro': 'A and B represent two complete, parseable headers that differ in one field. Each slot represents a separate physical burst. Choose which ones arrive.',
            'burst': 'Burst', 'burstOptions': ['Header A', 'Missing', 'Header B'],
            'results': {'matched': '3 / 3 · Three matching headers.', 'incomplete': '{count} / 3 · Incomplete set.', 'conflict': '{count} / 3 · Conflicting headers.'},
            'repeatHint': 'This models Signal Lab’s complete-header comparison. Matching copies do not authenticate the sender. Real receivers may use different acceptance and recovery rules.',
            'fallback': 'The header, field guide, and explanation remain readable without scripting.',
            'quiz': 'Read another header', 'quizChoose': 'Choose an answer', 'quizCheck': 'Check answers', 'quizFeedback': '{count} of 3 correct.', 'quizExplanation': '026163 identifies Wayne County, Michigan, including Detroit. +0030 means 30 minutes. DMO is a practice/demo message.',
            'reset': 'Reset experiment'
        },
        'zh': {
            'title': '读懂这段信号',
            'intro': '改动字段、查看一个字节，再比较三次报头。这里只做无声演示，不会发出警报，也不是完整的解码器。',
            'event': '事件', 'area': '地理区域', 'duration': '有效时长',
            'events': ['RWT · 每周测试', 'DMO · 练习／演示'],
            'areas': ['加利福尼亚州洛杉矶县', '密歇根州韦恩县（含底特律）', '德克萨斯州特拉维斯县'],
            'durations': ['15 分钟', '30 分钟', '1 小时'],
            'labels': ['开始标记', '发起方', '事件', '区域', '有效时长', '发布时间', '发送方'],
            'fields': {
                'start': 'ZCZC 标记报头的开始。同步用的前导码位于它之前，这里没有显示。',
                'origin': 'EAS 表示发起方属于 EAS 参与机构。这是类别，不是某个电台的名称。',
                'event': '三个字母的事件码说明消息类型，并不包含语音播报的正文。',
                'area': 'PSSCCC 依次表示分区、州和县或同等区域。这里的示例均以 0 表示全部或未指定的部分。',
                'duration': '+ 后面的四位数字采用 HHMM 格式，表示消息的有效时长。',
                'issued': '3021800 表示一年中的第 302 天、UTC 18:00。这个字段本身不含年份。',
                'sender': 'SIGLAB 后补两个空格，组成八字符的虚构发送方标识，仅用于本例。'
            },
            'values': {'RWT': 'RWT = Required Weekly Test（规定的每周测试）。', 'DMO': 'DMO = Practice/Demo Warning（练习／演示警报）。', '006037': '0 · 06 · 037 = 加利福尼亚州洛杉矶县。', '026163': '0 · 26 · 163 = 密歇根州韦恩县（含底特律）。', '048453': '0 · 48 · 453 = 德克萨斯州特拉维斯县。', '0015': '+0015 = 0 小时 15 分钟。', '0030': '+0030 = 0 小时 30 分钟。', '0100': '+0100 = 1 小时 0 分钟。'},
            'bytes': '再往里看：一个字符如何传输', 'character': 'ASCII 字符',
            'bitHint': '最先发送的位 → 最后发送的位',
            'byteHint': '每格是一位，持续 1.92 毫秒。0 对应 1,562.5 Hz，1 对应约 2,083.3 Hz。这里按实际发送顺序排列，最低有效位在前，与通常书写二进制数的顺序不同。',
            'wire': '按传输顺序排列的位',
            'repetition': '如果少收到一次，或其中一次不同呢？',
            'repeatIntro': 'A、B 代表两个完整、可解析，但有一个字段不同的报头。每个位置都是一次独立的物理发送。试着选择接收到了哪些。',
            'burst': '第', 'burstOptions': ['报头 A', '未收到', '报头 B'],
            'results': {'matched': '3 / 3 · 三次报头一致。', 'incomplete': '{count} / 3 · 接收不完整。', 'conflict': '{count} / 3 · 报头存在冲突。'},
            'repeatHint': '这里演示 Signal Lab 对完整报头的比较方式。副本一致不能证明发送方的身份，实际接收设备的接受与恢复规则也可能不同。',
            'fallback': '无需脚本，也能阅读报头、字段说明和正文。',
            'quiz': '试着读另一个报头', 'quizChoose': '请选择', 'quizCheck': '核对答案', 'quizFeedback': '答对 {count} / 3 题。', 'quizExplanation': '026163 表示密歇根州韦恩县（含底特律）；+0030 表示 30 分钟；DMO 表示练习／演示消息。',
            'reset': '重置实验'
        }
    }[lang]
    if introduction: words['intro'] = esc(introduction)
    def options(values, labels):
        return ''.join(f'<option value="{esc(v)}">{esc(label)}</option>' for v, label in zip(values, labels))
    controls = ''.join(f'<label>{words[key]}<select data-study-input="{key}">{options(values, words[labels])}</select></label>' for key, values, labels in (
        ('event', ['RWT', 'DMO'], 'events'), ('area', ['006037', '026163', '048453'], 'areas'), ('duration', ['0015', '0030', '0100'], 'durations')))
    field_keys = ['start', 'origin', 'event', 'area', 'duration', 'issued', 'sender']
    fields = ''.join(f'<button type="button" data-study-field="{key}" aria-pressed="{"true" if key == "event" else "false"}">{esc(label)}</button>' for key, label in zip(field_keys, words['labels']))
    defaults = {'event': 'RWT', 'area': '006037', 'duration': '0015'}
    fallback = ''.join(f'<dt>{esc(label)}</dt><dd>{esc(words["fields"][key])} {esc(words["values"].get(defaults.get(key), ""))}</dd>' for key, label in zip(field_keys, words['labels']))
    bursts = ''.join(f'<label>{words["burst"]} {i + 1}{" 次" if chinese else ""}<select data-study-burst>{options(["matching", "missing", "different"], words["burstOptions"])}</select></label>' for i in range(3))
    quiz_controls = ''.join(f'<label>{words[key]}<select data-quiz-field="{key}"><option value="">{words["quizChoose"]}</option>{options(values, words[labels])}</select></label>' for key, values, labels in (
        ('area', ['006037', '026163', '048453'], 'areas'), ('duration', ['0015', '0030', '0100'], 'durations'), ('event', ['RWT', 'DMO'], 'events')))
    quiz = f'<details data-study-challenge><summary>{words["quiz"]}</summary><code class="same-study__header">ZCZC-EAS-DMO-026163+0030-3021800-SIGLAB  -</code><div class="same-study__controls">{quiz_controls}</div><button type="button" class="same-study__check">{words["quizCheck"]}</button><p data-study-answers role="status"></p></details>'
    copy = esc(json.dumps({key: words[key] for key in ('fields', 'values', 'results', 'quizFeedback', 'quizExplanation')}, ensure_ascii=False, separators=(',', ':')))
    return (f'<section class="same-study" data-same-study data-study-copy="{copy}" lang="{lang}" aria-label="{esc(words["title"])}">'
            f'<h3>{words["title"]}</h3><p data-study-enhanced hidden>{words["intro"]}</p>'
            f'<div class="same-study__controls" data-study-enhanced hidden>{controls}</div>'
            '<code class="same-study__header" data-study-header>ZCZC-EAS-RWT-006037+0015-3021800-SIGLAB  -</code>'
            f'<div data-study-enhanced hidden><div class="same-study__fields">{fields}</div><p class="same-study__detail" data-study-detail aria-live="polite"></p>'
            f'<details><summary>{words["bytes"]}</summary><div class="same-study__byte-row"><label>{words["character"]}<select data-study-character>{options(["Z", "C", "-", "+", "0", " "], ["Z", "C", "-", "+", "0", "空格" if chinese else "Space"])}</select></label><code data-study-byte>0x5A</code></div>'
            f'<p class="same-study__hint">{words["bitHint"]}</p><div class="same-study__bits" aria-hidden="true">' + ''.join('<span data-study-bit>0</span>' for _ in range(8)) + '</div>'
            f'<p class="visually-hidden">{words["wire"]}: <span data-study-wire></span></p><p class="same-study__hint">{words["byteHint"]}</p></details>'
            f'<details><summary>{words["repetition"]}</summary><p>{words["repeatIntro"]}</p><div class="same-study__bursts">{bursts}</div>'
            f'<p class="same-study__result" data-study-result role="status"></p><p class="same-study__hint">{words["repeatHint"]}</p></details>{quiz}<button class="same-study__reset" type="button" data-study-reset>{words["reset"]}</button></div>'
            f'<div class="same-study__fallback" data-study-fallback><p>{words["fallback"]}</p><dl>{fallback}</dl><p>{words["repeatHint"]}</p></div></section>')

def body(post, media, prefix):
    result = rich(post.get('body'), media, prefix)
    for block in post.get('blocks') or []:
        kind = block.get('type')
        if kind == 'text': result += rich(block.get('body'), media, prefix)
        elif kind == 'photo':
            markup, _ = media.image(block.get('image'), block.get('alt'), prefix)
            result += '<figure class="note-media">' + markup + (f'<figcaption>{esc(block["caption"])}</figcaption>' if block.get('caption') else '') + '</figure>'
        elif kind == 'video': result += media.video(block, prefix)
        elif kind == 'same-study': result += same_study(post['language'], block.get('introduction', ''))
        else: raise ValueError('Unknown content block. Choose text, photo, video, or a SAME study.')
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

def thumbnail(post):
    if post.get('thumbnail'): return post['thumbnail'], post.get('thumbnail_alt') or ''
    return first_photo(post)

def read_posts(private, preview_path=None, now=None):
    posts, slugs = [], set()
    now = now or dt.datetime.now(dt.timezone.utc)
    for path in sorted((private / 'notes').glob('*.json')):
        value = json.loads(path.read_text())
        if preview_path and path.resolve() != preview_path.resolve(): continue
        if value.get('published') is not True and not preview_path: continue
        if temporary_birthday(value):
            published = now if preview_path else birthday_publication_time(private, path)
            expires = published + dt.timedelta(hours=24)
            if not preview_path and expires <= now:
                if value.get('birthday_visibility') != 'keep-link': continue
                value['_unlisted'] = True
            value['_expires'] = expires.isoformat().replace('+00:00', 'Z')
        slug = str(value.get('slug') or path.stem)
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or re.match(r'page-\d+$', slug):
            raise ValueError('Use a short link name containing lowercase letters, numbers, and hyphens.')
        if slug in slugs: raise ValueError('Each post must have a different link name.')
        slugs.add(slug)
        date(value.get('date'))
        value['slug'], value['language'] = slug, language(value.get('language'))
        value['_id'] = path.stem
        released = private / '.release-metadata.json'
        value['_aliases'] = json.loads(released.read_text()).get(path.name, {}).get('aliases', []) if released.exists() else []
        categories(value)
        if value.get('highlight_until'): date(value['highlight_until'])
        if value.get('font', 'default') not in FONTS: raise ValueError('Choose one of the available reading fonts.')
        versions = [value]
        seen = {value['language']}
        for translation in value.get('translations') or []:
            if translation.get('published') is not True and not preview_path: continue
            if preview_path and not (translation.get('body') or translation.get('blocks')): continue
            code = language(translation.get('language'))
            if code in seen: raise ValueError('Each translation must have a different language.')
            seen.add(code)
            if translation.get('font', value.get('font', 'default')) not in FONTS: raise ValueError('Choose one of the available reading fonts.')
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
    content = body(version, media, prefix)
    content = reading_contents(content)
    if not content.startswith('<div class="note-reading-layout">'): content = '<div class="note-body">' + content + '</div>'
    keep_link = original.get('birthday_visibility') == 'keep-link'
    lifetime = 'Shown in Notes for 24 hours; this link stays available.' if keep_link else 'Available for 24 hours'
    notice = '<p class="note-lifetime">' + lifetime + ' <span aria-hidden="true">·</span> <time datetime="' + esc(original['_expires']) + '" data-note-expiry-label>Until ' + esc(original['_expires'].replace('T', ' ').replace('Z', ' UTC')) + '</time></p>' if original.get('_expires') else ''
    expired = ('<section class="note-expired" hidden tabindex="-1"><a class="notes-back" href="../notes.html">← All notes</a><h1>This birthday note has ended.</h1><p>It was here for 24 hours.</p></section>' if original.get('_expires') and not keep_link else '')
    return (f'<article class="notes-post{ " notes-post--long" if "note-reading-layout" in content else ""}" lang="{esc(version["language"])}" data-note-font="{esc(version.get("font", "default"))}"{ "" if keep_link else expiry_attr(original)}>'
            f'<div class="note-return"><a class="notes-back" href="{prefix}index.html#notes" data-note-site-return hidden>← <span data-i18n="notes.backToSite">Back to site</span></a>'
            f'<a class="notes-back" href="{prefix}notes.html">← <span data-i18n="notes.all">All notes</span></a></div>'
            f'<header class="note-header"><div class="note-header__meta"><p class="note-header__date"><time datetime="{version["date"]}" data-note-date>{readable_date(version["date"])}</time> · Tim G</p>' +
            '<button class="note-share" type="button" id="note-share" hidden>' + SHARE_ICON + '<span data-i18n="notes.share">Share this note</span></button></div>' + notice + heading +
            (f'<p class="note-header__summary">{esc(version["summary"])}</p>' if version.get('summary') else '') + category_labels(original, prefix, links=not keep_link) +
            '<p class="visually-hidden" role="status" aria-live="polite" id="note-share-status"></p>' +
            '<label class="note-share-fallback" id="note-share-fallback" hidden><span data-i18n="notes.copyFailed">You can copy the link below.</span><input readonly type="url" aria-label="Post link" data-i18n-aria="notes.postLink" /></label></header>' +
            f'<nav class="note-language" aria-label="Post languages" data-i18n-aria="notes.languages">{language_picker}</nav>' +
            content +
            '<footer class="note-end">' + f'<a class="notes-back" href="{prefix}notes.html"><span data-i18n="notes.all">All notes</span> <span aria-hidden="true">→</span></a>' +
            '</footer></article>' + expired)

def variant_data(post, prefix, from_about=False):
    variants = [{'language': v['language'], 'title': title(v), 'summary': summary(v), 'href': prefix + post_filename(v, post) + ('?from=about' if from_about else '')} for v in post['_versions']]
    return 'data-note-versions="' + esc(json.dumps(variants, ensure_ascii=False, separators=(',', ':'))) + '"'

def card(post, media, prefix):
    photo, alt = thumbnail(post)
    image = ''
    if photo:
        markup, _ = media.image(photo, alt, prefix, sizes='(max-width: 480px) 96px, (max-width: 767px) 144px, 208px')
        image = markup.replace('<img ', '<img class="note-card__image" ', 1)
    heading = f'<h2 class="note-card__title" data-note-title>{esc(post["title"])}</h2>' if str(post.get('title') or '').strip() else ''
    text = summary(post)
    return (f'<li class="note-card" lang="{esc(post["language"])}"{expiry_attr(post)}><div class="note-card__date"><time datetime="{post["date"]}" data-note-date>{readable_date(post["date"])}</time>' + availability(post) + '</div>'
            f'<a class="note-card__link{ " note-card__link--photo" if image else ""}" {variant_data(post, prefix)} href="{prefix}{post_filename(post, post)}"><div class="note-card__copy">{heading}' +
            (f'<p class="note-card__excerpt" data-note-summary>{esc(text)}</p>' if text else '') +
            '<span class="note-card__meta"><span class="note-card__more"><span data-i18n="notes.read">Read note</span> <span aria-hidden="true">→</span></span>' +
            f'<span data-note-language-name>{esc(LANGS.get(post["language"], post["language"]))}</span></span></div>' + image + '</a>' + category_labels(post, prefix) + '</li>')

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
    headline = title(post) + ' — Tim G' if post else ('Follow updates — Tim G' if kind == 'follow' else 'Notes — Tim G')
    desc = summary(post) if post else ('New notes, in your own feed reader.' if kind == 'follow' else 'Notes by Tim G.')
    canonical = ORIGIN + '/' + (post['_filename'] if post else ('subscribe.html' if kind == 'follow' else ('notes.html' if not prefix else 'notes/page-1.html')))
    structured = ''
    if post:
        data = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': title(post), 'datePublished': post['date'], 'inLanguage': post['language'], 'author': {'@type': 'Person', 'name': 'Tim G', 'url': ORIGIN + '/'}, 'url': canonical, 'description': desc}
        if image: data['image'] = ORIGIN + '/' + image
        structured = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'
    markup = shell(public, html_lang=esc(post['language'] if post else 'en'), prefix=prefix, title=esc(headline), description=esc(desc), canonical=esc(canonical), image=esc(ORIGIN + '/' + (image or 'og-image.png')), image_alt=esc(image_alt or headline), og_type='article' if post else 'website', og_locale=esc(LOCALES.get(post['language'] if post else 'en', 'en_US')), structured_data=structured, alternates=alternates, kind=kind, content=content)
    if 'data-note-expires=' in content or (post and post.get('_expires')):
        expiry = expiry_attr(post) if post and post.get('birthday_visibility') != 'keep-link' else ''
        guard = resource_versions(f'<script src="{prefix}js/notes-lifetime.js"{expiry}></script>', public)
        markup = markup.replace('</head>', guard + '\n</head>')
    if post and is_birthday(post):
        if post.get('_expires'): markup = markup.replace('</head>', '<meta name="robots" content="noindex" />\n</head>')
        script = resource_versions(f'<script src="{prefix}js/birthday.js" data-note-birthday data-balloons-src="{prefix}js/vendor/balloons.js"></script>', public)
        markup = markup.replace('</body>', script + '\n</body>')
    if 'data-same-study ' in content:
        resources = resource_versions(f'<link rel="stylesheet" href="{prefix}css/same-study.css" />', public)
        markup = markup.replace('</head>', resources + '\n</head>')
        script = resource_versions(f'<script src="{prefix}js/same-study.js" defer></script>', public)
        markup = markup.replace('</body>', script + '\n</body>')
    return markup

def entrance(posts, media):
    intro = ('<section class="notes-entrance" id="notes" aria-labelledby="notes-entrance-title"><div class="container">'
             '<a class="notes-entrance__main" href="notes.html"><span class="notes-entrance__heading"><span id="notes-entrance-title" data-i18n="notes.title">Notes</span>' + RSS_ICON + '</span>'
             '<span class="notes-entrance__action"><span data-i18n="notes.explore">Explore notes</span> <span aria-hidden="true">→</span></span></a>')
    def slide(post, featured, hidden=False):
        photo, alt = thumbnail(post)
        image = ''
        if photo:
            markup, _ = media.image(photo, alt, prefix='')
            image = '<span class="notes-spotlight__image">' + markup + '</span>'
        expiry = f' data-note-highlight-until="{esc(post.get("highlight_until"))}"' if featured else ''
        return (f'<div class="notes-carousel__slide" data-note-slide data-note-featured="{str(featured).lower()}"{expiry}{expiry_attr(post)}{" hidden" if hidden else ""}>'
                f'<a class="notes-spotlight{ " notes-spotlight--photo" if image else ""}" {variant_data(post, "", from_about=True)} href="{post_filename(post, post)}?from=about">' + image +
                '<span class="notes-spotlight__copy">' + category_labels(post, '', links=False) +
                f'<span class="notes-spotlight__title" lang="{esc(post["language"])}" data-note-title>{esc(title(post))}</span>' +
                f'<span class="notes-spotlight__summary" lang="{esc(post["language"])}" data-note-summary>{esc(summary(post))}</span>' +
                '<span class="notes-spotlight__date">' + f'<time datetime="{post["date"]}" data-note-date>{readable_date(post["date"])}</time>' + availability(post) + '</span>' +
                '<span class="notes-spotlight__action"><span data-i18n="notes.read">Read note</span> <span aria-hidden="true">→</span></span></span></a></div>')
    if posts:
        today = dt.datetime.now(dt.timezone.utc).date()
        highlights = [p for p in posts if p.get('highlight') is True and (not p.get('highlight_until') or date(p['highlight_until']) >= today)]
        chosen = highlights or [posts[0]]
        slides = ''.join(slide(p, bool(highlights)) for p in chosen)
        fallback = next((p for p in posts if not p.get('_expires')), posts[0])
        if fallback['slug'] not in [p['slug'] for p in chosen]: slides += slide(fallback, False, hidden=True)
        intro += ('<div class="notes-carousel" data-notes-carousel role="region" aria-label="Featured notes" data-i18n-aria="notes.featuredNotes">'
                  '<div class="notes-carousel__viewport"><div class="notes-carousel__track">' + slides + '</div></div>'
                  '<div class="notes-carousel__controls" hidden><button type="button" data-note-prev aria-label="Previous note" data-i18n-aria="notes.previousSlide">←</button>'
                  '<div class="notes-carousel__dots" data-note-dots></div>'
                  '<button type="button" data-note-next aria-label="Next note" data-i18n-aria="notes.nextSlide">→</button></div>'
                  '<p class="visually-hidden" data-note-carousel-status role="status" aria-live="polite"></p></div>')
    return intro + '</div></section>'


def category_nav(posts, prefix, current=''):
    available = {}
    for post in posts: available.update(categories(post))
    if not available: return ''
    links = f'<a href="{prefix}notes.html"' + (' aria-current="page"' if not current else '') + ' data-i18n="notes.all">All notes</a>'
    for key, label in available.items():
        active = ' aria-current="page"' if current == key else ''
        matches = [p for p in posts if key in categories(p)]
        expiry = expiry_attr({'_expires': max(p['_expires'] for p in matches)}) if all(p.get('_expires') for p in matches) else ''
        links += f'<a href="{prefix}notes/topics/{key}.html" data-note-category="{key}"{active}{expiry}>{esc(label)}</a>'
    return '<nav class="notes-topics" aria-label="Categories" data-i18n-aria="notes.categories">' + links + '</nav>'


def follow_page(public):
    content = ('<article class="notes-follow"><a class="notes-back" href="notes.html"><span data-i18n="notes.all">All notes</span> →</a>'
        '<header class="notes-hero"><div><h1 data-i18n="notes.followTitle">Follow updates</h1>'
        '<p class="notes-hero__intro" data-i18n="notes.followIntro">New notes, in your own feed reader.</p></div></header>'
        '<p data-i18n="notes.followExplain">RSS brings new posts from the sites you follow into one app. No account on this site, email address, or notifications needed.</p>'
        '<ol class="notes-follow__steps"><li data-i18n="notes.followStep1">Open your preferred feed reader.</li>'
        '<li data-i18n="notes.followStep2">Choose its option to follow a website or add a feed.</li>'
        '<li data-i18n="notes.followStep3">Paste the address below. New notes will appear there.</li></ol>'
        '<label class="notes-follow__label" for="feed-address" data-i18n="notes.feedAddress">Feed address</label>'
        f'<div class="notes-follow__copy"><input id="feed-address" type="url" readonly value="{ORIGIN}/feed.xml" />'
        '<button type="button" id="feed-copy" hidden data-i18n="notes.copyFeed">Copy feed link</button></div>'
        '<p id="feed-status" class="notes-follow__status" role="status" aria-live="polite"></p>'
        '<a class="notes-feed-link" href="feed.xml">' + RSS_ICON + '<span data-i18n="notes.openFeed">Open RSS feed</span> ↗</a></article>')
    return page(public, content, kind='follow')

def build(private, public, preview_path=None, preview_output=None):
    private, public = private.resolve(), public.resolve()
    if not preview_path and (private / '.published.json').exists():
        spec = importlib.util.spec_from_file_location('notes_releases', Path(__file__).with_name('releases.py'))
        releases = importlib.util.module_from_spec(spec); spec.loader.exec_module(releases)
        with tempfile.TemporaryDirectory(prefix='notes-released-') as released:
            releases.materialize(private, Path(released))
            return build(Path(released), public)
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
                    # Private artifacts have no external scripts, styles, or media.
                    styles = ['styles', 'notes', 'compact']
                    interactive = 'data-same-study ' in rendered
                    if interactive: styles.append('same-study')
                    css = '\n'.join((public / f'css/{name}.css').read_text() for name in styles)
                    markup = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', markup)
                    markup = re.sub(r'<script\b[^>]*>.*?</script>', '', markup, flags=re.S)
                    css = re.sub(r'url\([^)]*\)', 'none', css)
                    markup = markup.replace('</head>', '<style>' + css.replace('</style', '<\\/style') + '</style></head>')
                    if interactive:
                        # Only this repository-owned component may execute in a preview.
                        script = (public / 'js/same-study.js').read_text().replace('</script', '<\\/script')
                        markup = markup.replace('</body>', '<script>' + script + '</script></body>')
                    # Downloaded previews keep navigation useful without a local server.
                    markup = re.sub(r'href="\.\./notes/([^"/]+\.html)"', lambda m: 'href="' + m[1] + '"', markup)
                    markup = re.sub(r'href="\.\./(notes/topics/[^"/]+\.html)"', lambda m: 'href="' + ORIGIN + '/' + m[1] + '"', markup)
                    markup = re.sub(r'href="\.\./([^"/]+\.(?:html|xml)(?:#[^"]*)?)"', lambda m: 'href="' + ORIGIN + '/' + m[1] + '"', markup)
                    markup = re.sub(r'<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>', '', markup)
                    dest = preview_output / Path(filename).name; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(markup)
                else:
                    (stage / filename).write_text(markup)
                    if not post.get('_expires'): urls.append((ORIGIN + '/' + filename, post['date']))
            if not post.get('_expires'): rss_items.append(post)
        if preview_path: return {'posts': len(posts), 'preview': True}
        for post in posts:
            for version in post['_versions']:
                for alias in post.get('_aliases', []):
                    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', alias) or alias == post['slug']: continue
                    old = post_filename({**version, 'slug': alias}, post)
                    target = ORIGIN + '/' + post_filename(version, post)
                    if (stage / old).exists(): raise ValueError('A previous address conflicts with another published note.')
                    redirect = shell(public, html_lang=esc(version['language']), prefix='../', title='This note has moved — Tim G', description='Read this note at its current address.', canonical=esc(target), image=ORIGIN + '/og-image.png', image_alt='Tim G', og_type='website', og_locale=LOCALES.get(version['language'], 'en_US'), structured_data='', alternates='', kind='redirect', content=f'<section class="note-expired"><h1>This note has moved.</h1><p><a class="notes-back" href="{esc(target)}">Read the note →</a></p><a class="notes-back" href="../notes.html">All notes →</a></section>')
                    redirect = redirect.replace('</head>', '<meta name="robots" content="noindex" /><meta http-equiv="refresh" content="0;url=' + esc(target) + '" /></head>')
                    (stage / old).write_text(redirect)
        posts = [post for post in posts if not post.get('_unlisted')]
        page_count = max(1, (len(posts) + 19) // 20)
        for index in range(page_count):
            prefix = '' if index == 0 else '../'
            filename = 'notes.html' if index == 0 else f'notes/page-{index + 1}.html'
            hero = '<header class="notes-hero"><div><h1 data-i18n="notes.title">Notes</h1></div>' + f'<a class="notes-feed-link" href="{prefix}subscribe.html">{RSS_ICON}<span data-i18n="notes.followTitle">Follow updates</span></a></header>'
            entries = ''.join(card(p, media, prefix) for p in posts[index * 20:(index + 1) * 20])
            if not entries: entries = '<div class="notes-empty"><span class="notes-empty__mark">' + RSS_ICON + '</span><h2 data-i18n="notes.emptyTitle">Nothing here just yet.</h2><p data-i18n="notes.emptyText">A place for photographs, stories, and little updates.</p></div>'
            else: entries = '<ol class="notes-list" role="list">' + entries + '</ol>'
            pagination = ''
            if page_count > 1:
                pagination = '<nav class="notes-pagination" aria-label="Notes pages" data-i18n-aria="notes.pages">'
                if index: pagination += f'<a href="{prefix}{"notes.html" if index == 1 else "notes/page-" + str(index) + ".html"}"><span data-i18n="notes.newer">Newer notes</span> →</a>'
                if index + 1 < page_count: pagination += f'<a href="{prefix}notes/page-{index + 2}.html"><span data-i18n="notes.older">Older notes</span> →</a>'
                pagination += '</nav>'
            markup = page(public, f'<a class="notes-back notes-site-return" href="{prefix}index.html#notes">← <span data-i18n="notes.backToSite">Back to site</span></a>' + hero + category_nav(posts, prefix) + entries + pagination, prefix=prefix)
            markup = markup.replace(ORIGIN + '/notes/page-1.html', ORIGIN + '/' + filename)
            (stage / filename).write_text(markup)
            urls.append((ORIGIN + '/' + filename, ''))
        available = {}
        for post in posts: available.update(categories(post))
        if available: (stage / 'notes/topics').mkdir()
        for key, label in available.items():
            matches = [p for p in posts if key in categories(p)]
            count = (len(matches) + 19) // 20
            for index in range(count):
                filename = f'notes/topics/{key}{"-page-" + str(index + 1) if index else ""}.html'
                prefix = '../../'
                entries = '<ol class="notes-list" role="list">' + ''.join(card(p, media, prefix) for p in matches[index * 20:(index + 1) * 20]) + '</ol>'
                pagination = '<nav class="notes-pagination" aria-label="Notes pages" data-i18n-aria="notes.pages">'
                if index: pagination += f'<a href="{key}{"-page-" + str(index) if index > 1 else ""}.html"><span data-i18n="notes.newer">Newer notes</span> →</a>'
                if index + 1 < count: pagination += f'<a href="{key}-page-{index + 2}.html"><span data-i18n="notes.older">Older notes</span> →</a>'
                pagination += '</nav>'
                content = (f'<a class="notes-back notes-site-return" href="{prefix}index.html#notes">← <span data-i18n="notes.backToSite">Back to site</span></a>'
                           f'<header class="notes-hero"><h1 data-note-category="{key}">{esc(label)}</h1></header>' + category_nav(posts, prefix, key) + entries + (pagination if count > 1 else ''))
                markup = page(public, content, prefix=prefix, kind='topic').replace(ORIGIN + '/notes/page-1.html', ORIGIN + '/' + filename)
                markup = markup.replace('<title>Notes — Tim G</title>', f'<title>{esc(label)} — Notes — Tim G</title>')
                (stage / filename).write_text(markup)
                urls.append((ORIGIN + '/' + filename, ''))
        atom = 'http://www.w3.org/2005/Atom'; ET.register_namespace('atom', atom)
        rss = ET.Element('rss', {'version': '2.0'}); channel = ET.SubElement(rss, 'channel')
        for key, value in [('title', 'Tim G — Notes'), ('link', ORIGIN + '/notes.html'), ('description', 'Notes by Tim G.')]: ET.SubElement(channel, key).text = value
        ET.SubElement(channel, '{' + atom + '}link', {'href': ORIGIN + '/feed.xml', 'rel': 'self', 'type': 'application/rss+xml'})
        for post in rss_items[:20]:
            item = ET.SubElement(channel, 'item'); url = ORIGIN + '/' + post_filename(post, post)
            for key, value in [('title', title(post)), ('link', url), ('description', summary(post)), ('pubDate', dt.datetime.combine(date(post['date']), dt.time(12), dt.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT'))]: ET.SubElement(item, key).text = value
            ET.SubElement(item, 'guid', {'isPermaLink': 'true'}).text = url
        ET.ElementTree(rss).write(stage / 'feed.xml', encoding='utf-8', xml_declaration=True)
        home_entrance = entrance(posts, media)
        (stage / 'subscribe.html').write_text(follow_page(public))
        urls.append((ORIGIN + '/subscribe.html', ''))
        # All content has passed validation before touching the deployment tree.
        for name in ('notes', 'assets/notes'):
            dest = public / name
            if dest.exists(): shutil.rmtree(dest)
            if (stage / name).exists(): shutil.copytree(stage / name, dest)
        for name in ('notes.html', 'subscribe.html', 'feed.xml'): shutil.copyfile(stage / name, public / name)
        (public / 'notes-expiry.json').write_text(json.dumps(sorted(p['_expires'] for p in posts if p.get('_expires'))) + '\n')
        home = public / 'index.html'; markup = home_markup
        markup, count = re.subn(r'<!-- notes-entrance:start -->.*?<!-- notes-entrance:end -->', lambda _: '<!-- notes-entrance:start -->\n' + home_entrance + '\n    <!-- notes-entrance:end -->', markup, flags=re.S)
        if count != 1: raise ValueError('The homepage Notes entrance marker is missing.')
        def story_link(match):
            identity = match[1]
            post = next((p for p in posts if p['_id'] == identity), None)
            link = (f'<a class="featured-card__story" {variant_data(post, "")}{expiry_attr(post)} href="{post_filename(post, post)}"><span data-i18n="notes.readStory">Read the story</span> <span aria-hidden="true">→</span></a>' if post else '')
            return f'<!-- note-story:{identity}:start -->{link}<!-- note-story:{identity}:end -->'
        markup = re.sub(r'<!-- note-story:([a-z0-9-]+):start -->.*?<!-- note-story:\1:end -->', story_link, markup, flags=re.S)
        markup = re.sub(r'<script[^>]+data-notes-lifetime[^>]*></script>\s*', '', markup)
        if any(p.get('_expires') for p in posts):
            script = resource_versions('<script src="js/notes-lifetime.js" data-notes-lifetime></script>', public)
            markup = markup.replace('<script src="js/notes-carousel.js', script + '\n  <script src="js/notes-carousel.js', 1)
        home.write_text(markup)
        namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'; ET.register_namespace('', namespace)
        root = sitemap.getroot()
        for entry in list(root):
            location = entry.find('{' + namespace + '}loc')
            if location is not None and (location.text in (ORIGIN + '/notes.html', ORIGIN + '/subscribe.html') or location.text.startswith(ORIGIN + '/notes/')): root.remove(entry)
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
