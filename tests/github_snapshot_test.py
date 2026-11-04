import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('snapshot', Path(__file__).resolve().parents[1]/'scripts/github_snapshot.py')
snapshot = importlib.util.module_from_spec(spec); spec.loader.exec_module(snapshot)

def fixture(count='3', level='2', tooltip=True, total='3'):
    return ('<h2 id="js-contribution-activity-description">'+total+'\n contributions\n in 2026</h2>'
            '<td id="day-1" data-date="2026-01-01" data-level="'+level+'"></td>' +
            ('<tool-tip for="day-1">'+count+' contributions on January 1st.</tool-tip>' if tooltip else ''))

class SnapshotTests(unittest.TestCase):
    def parse(self, source):
        parser=snapshot.Calendar();parser.feed(source);return parser.result(dt.date(2026,1,1))
    def test_multiline_heading_matches_daily_counts(self):
        total, days=self.parse(fixture());self.assertEqual(total,3);self.assertEqual(days[dt.date(2026,1,1)]['count'],3)
    def test_zero_is_preserved(self):
        total, days=self.parse(fixture(count='No',level='0',total='0'));self.assertEqual(total,0)
    def test_partial_changed_or_inconsistent_upstream_preserves_previous_snapshot(self):
        for text in [fixture(tooltip=False),fixture(level='8'),fixture(total='4'),fixture().replace('2026-01-01','2026-01-02'),fixture().replace('3 contributions','unexpected text')]:
            with self.subTest(text=text),self.assertRaises(ValueError):self.parse(text)

if __name__ == '__main__': unittest.main()
