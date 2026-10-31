#!/usr/bin/env python3
"""Refresh local JavaScript and CSS cache keys before validation and deployment."""
import argparse
import hashlib
from pathlib import Path
import re

RESOURCE = re.compile(r'''((?:src|href|data-balloons-src|data-number-flow-src|data-fireworks-src)\s*=\s*)(["'])((?:/|(?:\.\./)*)(?:js|css)/[\w/.-]+)(?:\?v=[a-f0-9]+)?\2''')

def refresh(public):
    public = public.resolve()
    changed = 0
    for page in sorted(public.rglob('*.html')):
        before = page.read_text()
        def replace(match):
            reference = match[3]
            path = (public / reference.lstrip('/') if reference.startswith('/') else page.parent / reference).resolve()
            if path.suffix not in {'.js', '.mjs', '.css'}: return match[0]
            if not path.is_relative_to(public) or not path.is_file():
                raise ValueError('Missing or invalid local resource: ' + reference)
            digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            return match[1] + match[2] + reference + '?v=' + digest + match[2]
        after = RESOURCE.sub(replace, before)
        if before != after:
            page.write_text(after)
            changed += 1
    return changed

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public', type=Path, default=Path('public'))
    args = parser.parse_args()
    print('Updated resource versions in ' + str(refresh(args.public)) + ' pages.')
