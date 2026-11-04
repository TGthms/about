# Noto language fonts

Noto Sans and Noto Serif SC, TC, JP, and KR are served locally. The original
Google Fonts Unicode ranges, variable weights 400–700, and `font-display: swap`
are retained. A browser downloads only subsets needed for the displayed text;
the entire library is not downloaded for a visit. Lightweight mode continues
to use system fonts.

`manifest.json` records the official source URLs, retrieval date, file sizes,
and SHA-256 hashes. The eight accompanying OFL files apply to their respective
families. Font bytes are unmodified. Google Fonts is not contacted by visitors.

To refresh deliberately, run `python3 scripts/vendor-language-fonts.py`, inspect
the manifest and licenses, then run the font-integrity and browser checks.
Vendoring is a maintainer task, not part of the site's ordinary build or visits.
