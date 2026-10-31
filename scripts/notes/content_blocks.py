"""Reusable Notes content, rendered as ordinary HTML with optional enhancements."""
from urllib.parse import urlparse

WORDS = {
 'en': ['Open image', 'Open audio', 'Download file', 'Copy code', 'Code copied.', 'Select and copy the code below.', 'Before', 'After', 'Compare images', 'Image comparison position'],
 'zh': ['查看大图', '打开音频', '下载文件', '复制代码', '代码已复制。', '请选中并复制下方代码。', '之前', '之后', '对比图片', '图片对比分界位置'],
 'zh-Hant': ['查看大圖', '開啟音訊', '下載檔案', '複製程式碼', '程式碼已複製。', '請選取並複製下方程式碼。', '之前', '之後', '比較圖片', '圖片比較分界位置'],
 'ja': ['画像を開く', '音声を開く', 'ファイルをダウンロード', 'コードをコピー', 'コードをコピーしました。', '下のコードを選択してコピーしてください。', '変更前', '変更後', '画像を比較', '画像の比較位置'],
 'ko': ['이미지 열기', '오디오 열기', '파일 다운로드', '코드 복사', '코드를 복사했어요.', '아래 코드를 선택해서 복사해 주세요.', '이전', '이후', '이미지 비교', '이미지 비교 위치'],
 'es': ['Abrir imagen', 'Abrir audio', 'Descargar archivo', 'Copiar código', 'Código copiado.', 'Selecciona y copia el código de abajo.', 'Antes', 'Después', 'Comparar imágenes', 'Posición de comparación de imágenes']
}
WORD_KEYS = ['openImage','openAudio','downloadFile','copyCode','codeCopied','codeCopyFailed','beforeImage','afterImage','compareImages','comparisonPosition']
KINDS = {'gallery','audio','aside','details','link','download','quote','code','comparison'}


def render(block, language, media, prefix, rich, esc, safe_link):
    kind = block.get('type')
    if kind not in KINDS: return None
    words = dict(zip(WORD_KEYS, WORDS.get(language, WORDS['en'])))
    def word(key): return f'<span data-i18n="notes.{key}">{esc(words[key])}</span>'
    def caption(text): return f'<figcaption>{esc(text)}</figcaption>' if text else ''
    def content(value):
        # Headings inside an inset or closed section do not become page contents links.
        return rich(value, media, prefix, language).replace('<h2>', '<h3>').replace('</h2>', '</h3>')
    def link_attrs(url):
        return '' if urlparse(url).netloc == 'timgong.me' else ' target="_blank" rel="noopener noreferrer"'
    if kind == 'gallery':
        items = []
        for photo in block['images']:
            image, full = media.image(photo['image'], photo.get('alt'), prefix, sizes='(max-width: 600px) calc(100vw - 32px), 350px')
            href = (image.split('src="',1)[1].split('"',1)[0] if media.preview else prefix + full)
            items.append('<figure><a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + image + '</a>' + caption(photo.get('caption')) + '</figure>')
        return '<figure class="note-gallery" data-note-block="gallery"><div class="note-gallery__grid">' + ''.join(items) + '</div>' + caption(block.get('caption')) + '</figure>'
    if kind == 'audio':
        source = block.get('source') or {}
        if source.get('type') == 'upload':
            url, mime, _ = media.file(source['file'], prefix, 'audio')
        else:
            url = safe_link(source['url']); mime = media.audio_types[urlparse(url).path.rsplit('.',1)[-1].lower()]
        return ('<figure class="note-audio" data-note-block="audio"><figcaption class="note-block-title">' + esc(block['title']) + '</figcaption>' +
                '<audio controls preload="none" aria-label="' + esc(block['title']) + '"><source src="' + esc(url) + '" type="' + mime + '" /></audio>' +
                '<a class="note-media__link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + word('openAudio') + ' ↗</a>' +
                ('<p class="note-block-caption">' + esc(block['caption']) + '</p>' if block.get('caption') else '') +
                ('<details><summary>' + '<span data-i18n="notes.transcript">' + esc({'zh':'文字稿','zh-Hant':'文字稿','ja':'文字起こし','ko':'대본','es':'Transcripción'}.get(language,'Transcript')) + '</span></summary><p class="note-preserve-lines">' + esc(block['transcript']) + '</p></details>' if block.get('transcript') else '') + '</figure>')
    if kind == 'aside':
        return '<aside class="note-aside" data-note-block="aside">' + ('<p class="note-block-title">' + esc(block['title']) + '</p>' if block.get('title') else '') + content(block['body']) + '</aside>'
    if kind == 'details':
        return '<details class="note-details" data-note-block="details"><summary>' + esc(block['title']) + '</summary><div>' + content(block['body']) + '</div></details>'
    if kind == 'link':
        url = safe_link(block['url']); photo = block.get('image') or {}; image = ''
        if photo.get('image'): image, _ = media.image(photo['image'], photo.get('alt'), prefix, sizes='160px')
        return ('<a class="note-link-card' + (' note-link-card--image' if image else '') + '" data-note-block="link" href="' + esc(url) + '"' + link_attrs(url) + '>' +
                image + '<span><strong>' + esc(block['title']) + '</strong>' + ('<span>' + esc(block['description']) + '</span>' if block.get('description') else '') +
                '<small>' + esc(urlparse(url).netloc) + ' <span aria-hidden="true">' + ('→' if not link_attrs(url) else '↗') + '</span></small></span></a>')
    if kind == 'download':
        url, _, size = media.file(block['file'], prefix, 'download')
        extension = block['file'].rsplit('.',1)[-1].upper()
        size_label = f'{size / (1024 * 1024):.1f} MB' if size >= 1024 * 1024 else f'{max(1, round(size / 1024))} KB'
        return ('<div class="note-download" data-note-block="download"><strong>' + esc(block['title']) + '</strong>' +
                ('<p>' + esc(block['description']) + '</p>' if block.get('description') else '') + '<a href="' + esc(url) + '" download>' + word('downloadFile') +
                '</a><small>' + esc(extension + ' · ' + size_label) + '</small></div>')
    if kind == 'quote':
        attribution = ' · '.join(str(block.get(key) or '').strip() for key in ('author','source') if block.get(key))
        url = safe_link(block.get('url'))
        if url: attribution = '<a href="' + esc(url) + '"' + link_attrs(url) + '>' + esc(attribution or url) + '</a>'
        else: attribution = esc(attribution)
        return '<figure class="note-quote" data-note-block="quote"><blockquote><p class="note-preserve-lines">' + esc(block['text']) + '</p></blockquote>' + ('<figcaption>' + attribution + '</figcaption>' if attribution else '') + '</figure>'
    if kind == 'code':
        label = ' · '.join(str(block.get(k) or '').strip() for k in ('filename','language') if block.get(k))
        return ('<div class="note-code" data-note-block="code" data-note-code data-copy-success="' + esc(words['codeCopied']) + '" data-copy-failed="' + esc(words['codeCopyFailed']) + '"><div class="note-code__toolbar"><span>' + esc(label) + '</span>' +
                '<button type="button" data-code-copy hidden>' + word('copyCode') + '</button></div><pre tabindex="0"><code>' + esc(block['code']) + '</code></pre>' +
                '<p class="note-block-caption" data-code-status role="status" aria-live="polite"></p></div>')
    if kind == 'comparison':
        photos = []
        for key, word_key in (('before','beforeImage'),('after','afterImage')):
            photo = block[key]; image, _ = media.image(photo['image'], photo.get('alt'), prefix)
            label = esc(photo['label']) if photo.get('label') else word(word_key)
            photos.append('<figure class="note-comparison__' + key + '">' + image + '<figcaption>' + label + '</figcaption></figure>')
        return ('<figure class="note-comparison" data-note-block="comparison" data-note-compare><div class="note-comparison__stage">' + ''.join(photos) +
                '<span class="note-comparison__divider" aria-hidden="true"></span></div><label class="note-comparison__control" hidden>' + word('compareImages') +
                '<input type="range" min="0" max="100" value="50" data-i18n-aria="notes.comparisonPosition" aria-label="' + esc(words['comparisonPosition']) + '" /></label>' + caption(block.get('caption')) + '</figure>')
