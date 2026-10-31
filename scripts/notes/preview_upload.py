#!/usr/bin/env python3
"""Upload generated previews using GitHub's short-lived workflow identity."""
import argparse
import base64
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request


def bundle(directory):
    files, entries = {}, []
    types = {'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm'}
    for path in sorted(directory.glob('*.html')):
        html = path.read_text()
        def replace(match):
            mime, encoded = match[1], match[2]
            raw = base64.b64decode(encoded, validate=True)
            name = hashlib.sha256(raw).hexdigest() + '.' + types[mime]
            files[name] = (raw, mime)
            return name
        html = re.sub(r'data:(image/webp|video/mp4|video/webm);base64,([A-Za-z0-9+/=]+)', replace, html)
        class Language(HTMLParser):
            language = 'en'
            def handle_starttag(self, tag, attrs):
                if tag == 'html': self.language = dict(attrs).get('lang', 'en')
        parser = Language(); parser.feed(html)
        entries.append({'name': path.name, 'language': parser.language})
        files[path.name] = (html.encode(), 'text/html; charset=utf-8')
    if not entries: raise ValueError('Build the saved preview before uploading it.')
    files['index.json'] = (json.dumps({'files': entries}).encode(), 'application/json')
    return files


def upload(directory, origin, preview_id, token):
    if not re.fullmatch(r'https://[a-z0-9.-]+', origin): raise ValueError('Use the configured HTTPS preview origin.')
    if not re.fullmatch(r'\d{1,20}-\d{1,4}', preview_id): raise ValueError('Use the current workflow run identity.')
    # Never send private bytes until the service confirms authentication is configured.
    with urllib.request.urlopen(origin + '/health', timeout=20) as response:
        if json.load(response).get('ready') is not True: raise ValueError('Private preview sign-in has not been configured.')
    for name, (data, mime) in bundle(directory).items():
        request = urllib.request.Request(origin + '/upload/' + preview_id + '/' + name, data=data, method='PUT',
                                         headers={'Authorization': 'Bearer ' + token, 'Content-Type': mime})
        with urllib.request.urlopen(request, timeout=120) as response:
            if response.status != 201: raise ValueError('The preview service could not save a file.')
    return origin + '/preview/' + preview_id + '/'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    args = parser.parse_args()
    origin = os.environ.get('NOTES_PREVIEW_ORIGIN', '').rstrip('/')
    if not origin:
        print('Browser preview is not configured; use the private download.'); return
    try:
        request_url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=' + urllib.parse.quote(origin, safe='')
        request = urllib.request.Request(request_url, headers={'Authorization':'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
        with urllib.request.urlopen(request, timeout=20) as response: token = json.load(response)['value']
        url = upload(args.directory, origin, os.environ['GITHUB_RUN_ID'] + '-' + os.environ['GITHUB_RUN_ATTEMPT'], token)
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('## Open your private preview\n\n[View saved note](' + url + ')\n\nSign in with your authorized email. This preview expires after three days.\n\n')
        print('Private browser preview is ready.')
    except (ValueError, KeyError, OSError, urllib.error.URLError, json.JSONDecodeError):
        # No token, request body, or confidential article text is ever logged.
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('## Browser preview unavailable\n\nYour draft remains private. Use the download below; the saved preview was built successfully.\n\n')
        print('Browser preview unavailable; the private download remains available.')


if __name__ == '__main__': main()
