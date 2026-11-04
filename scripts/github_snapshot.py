#!/usr/bin/env python3
"""Refresh first-party public GitHub card data; never reads private repositories."""
import argparse
import datetime as dt
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
USERNAME = 'TGthms'


class Calendar(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cells, self.counts = {}, {}
        self.capture, self.text, self.heading = None, [], ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'td' and 'data-date' in a:
            self.cells[a['id']] = (dt.date.fromisoformat(a['data-date']), int(a['data-level']))
        if tag == 'tool-tip' and a.get('for') in self.cells:
            self.capture, self.text = ('tooltip', a['for']), []
        elif tag == 'h2' and a.get('id') == 'js-contribution-activity-description':
            self.capture, self.text = ('heading', None), []

    def handle_data(self, value):
        if self.capture: self.text.append(value)

    def handle_endtag(self, tag):
        if not self.capture: return
        kind, key = self.capture
        if (kind == 'tooltip' and tag == 'tool-tip') or (kind == 'heading' and tag == 'h2'):
            text = ' '.join(self.text).strip()
            if kind == 'heading': self.heading = text
            else:
                match = re.match(r'(?:(No)|([\d,]+)) contributions? on ', text)
                if not match: raise ValueError('GitHub contribution tooltip format changed.')
                self.counts[key] = 0 if match[1] else int(match[2].replace(',', ''))
            self.capture = None

    def result(self, today):
        match = re.search(r'([\d,]+)\s+contributions?\s+in\s+(\d{4})', self.heading)
        if not match or int(match[2]) != today.year:
            raise ValueError('GitHub contribution year heading is missing or changed.')
        days = {}
        for key, (date, level) in self.cells.items():
            if date > today: continue
            if key not in self.counts or not 0 <= level <= 4 or date in days:
                raise ValueError('Incomplete or invalid GitHub calendar; keeping the previous snapshot.')
            days[date] = {'date':date.isoformat(), 'count':self.counts[key], 'level':level}
        expected = {dt.date(today.year, 1, 1) + dt.timedelta(days=i) for i in range(today.timetuple().tm_yday)}
        if set(days) != expected:
            raise ValueError('GitHub calendar does not cover the complete year to date.')
        total = int(match[1].replace(',', ''))
        if sum(day['count'] for day in days.values()) != total:
            raise ValueError('GitHub total and daily contribution counts disagree.')
        return total, days


def fetch(url):
    result = subprocess.run(['curl','--fail','--silent','--show-error','--retry','2',
                             '--max-time','30','--location','--proto','=https',
                             '--proto-redir','=https','-H','Accept-Language: en',url],
                            check=True, capture_output=True)
    if len(result.stdout) > 3 * 1024 * 1024: raise ValueError('Unexpectedly large public response.')
    return result.stdout


def refresh(output):
    from PIL import Image
    now = dt.datetime.now(dt.timezone.utc); today = now.date()
    source = fetch(f'https://github.com/users/{USERNAME}/contributions?from={today.year}-01-01&to={today.isoformat()}')
    parser = Calendar(); parser.feed(source.decode()); total, days = parser.result(today)
    # Early January still shows the preceding days of the 119-day calendar.
    if today.timetuple().tm_yday < 119:
        previous = dt.date(today.year - 1, 12, 31)
        parser = Calendar(); parser.feed(fetch(f'https://github.com/users/{USERNAME}/contributions?from={previous.year}-01-01&to={previous}').decode())
        _, older = parser.result(previous); days.update(older)
    avatar = Image.open(BytesIO(fetch(f'https://github.com/{USERNAME}.png?size=96')))
    if avatar.width * avatar.height > 1_000_000: raise ValueError('Unexpectedly large GitHub avatar.')
    avatar = avatar.convert('RGB'); avatar.thumbnail((96, 96))
    image = BytesIO(); avatar.save(image, 'WEBP', quality=85, method=6)
    first = today - dt.timedelta(days=118)
    payload = {'name':'Tim G', 'avatarUrl':'assets/github/avatar.webp', 'year':today.year,
               'total':total, 'updatedAt':now.isoformat().replace('+00:00','Z'),
               'days':[days[d] for d in sorted(days) if first <= d <= today]}
    if len(payload['days']) != 119: raise ValueError('Incomplete 119-day public calendar.')
    output.mkdir(parents=True, exist_ok=True)
    # Fetch and validate both resources before replacing either checked-in file.
    with tempfile.TemporaryDirectory(dir=output) as temp:
        temp = Path(temp)
        (temp/'avatar.webp').write_bytes(image.getvalue())
        (temp/'contributions.json').write_text(json.dumps(payload, separators=(',', ':'))+'\n')
        (temp/'avatar.webp').replace(output/'avatar.webp')
        (temp/'contributions.json').replace(output/'contributions.json')
    print(f'Updated public GitHub snapshot: {total} contributions in {today.year}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT/'public/assets/github')
    args = parser.parse_args()
    refresh(args.output)
