#!/usr/bin/env python3
"""Report the released article only after both public deployments complete."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request


def checks_ready(checks):
    required = {'Cloudflare Pages', 'Deploy to GitHub Pages'}
    latest = {}
    for check in sorted(checks, key=lambda c: c.get('id', 0)):
        if check.get('name') in required: latest[check['name']] = check
    for name, check in latest.items():
        if check.get('status') == 'completed' and check.get('conclusion') not in ('success', 'skipped', 'neutral'):
            raise ValueError(name + ' did not finish successfully. The export is saved; check the deployment run.')
    return all(latest.get(name, {}).get('conclusion') == 'success' for name in required)


def article_url(private, payload):
    path = payload.get('context', {}).get('path')
    if not path: return 'https://timgong.me/notes.html'
    spec = importlib.util.spec_from_file_location('notes_release_report', Path(__file__).with_name('releases.py'))
    release = importlib.util.module_from_spec(spec); spec.loader.exec_module(release)
    release.note_path(path)
    entry = release.load(private)['entries'].get(path)
    if not entry: return 'https://timgong.me/notes.html'
    note = release.read_note(private, entry['revision'], path)
    slug = release.slug(note, path)
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug): raise ValueError('Invalid article address.')
    return 'https://timgong.me/notes/' + slug + '.html'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', type=Path, required=True)
    parser.add_argument('--revision', required=True)
    parser.add_argument('--timeout', type=int, default=900)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}', args.revision): raise SystemExit('Invalid exported revision.')
    start = time.monotonic()
    while time.monotonic() - start < args.timeout:
        request = urllib.request.Request('https://api.github.com/repos/TGthms/about/commits/' + args.revision + '/check-runs?per_page=100',
                                         headers={'Accept':'application/vnd.github+json','User-Agent':'Notes publisher'})
        try:
            with urllib.request.urlopen(request, timeout=30) as response: checks = json.load(response)['check_runs']
            if checks_ready(checks): break
        except (urllib.error.URLError, TimeoutError): pass
        time.sleep(12)
    else: raise SystemExit('The note was exported, but deployment is still pending. Open the public repository Actions page before retrying.')
    payload = json.loads(os.environ.get('RELEASE_PAYLOAD') or '{}')
    withdrawn = payload.get('action', {}).get('name') == 'withdraw-note'
    if payload.get('context', {}).get('path'):
        index = json.loads((args.content / '.published.json').read_text())
        withdrawn = withdrawn or index['entries'].get(payload['context']['path'], {}).get('withdrawn', False)
    url = article_url(args.content.resolve(), payload)
    title = 'The note was withdrawn' if withdrawn else 'The website is updated'
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('## ' + title + '\n\nBoth Cloudflare Pages and GitHub Pages finished deploying.\n\n')
        if not withdrawn: summary.write('[Open the published note](' + url + ')\n\n')
        summary.write('[All notes](https://timgong.me/notes.html)\n\nSaved drafts remain private until explicitly published.\n')
    print(title + '.')


if __name__ == '__main__':
    try: main()
    except ValueError as error: raise SystemExit(str(error))
