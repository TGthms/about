#!/usr/bin/env bash
# Run only inside the private repository's disposable GitHub Actions checkout.
set -euo pipefail
if [[ "${GITHUB_ACTIONS:-}" != "true" || "${GITHUB_REPOSITORY:-}" != "TGthms/about-notes" ]]; then
  echo 'This publisher runs only in the private Notes workflow.' >&2
  exit 1
fi
git config user.name 'Notes publisher'
git config user.email 'notes-publisher@users.noreply.github.com'
for attempt in 1 2 3; do
  git fetch origin main
  git reset --hard origin/main
  python scripts/notes/build.py --content ../content
  python tests/html-integrity.py
  python tests/notes_test.py
  git diff --check
  git add public/index.html public/notes.html public/subscribe.html public/notes public/assets/notes public/feed.xml public/sitemap.xml public/notes-expiry.json
  if git diff --cached --quiet; then
    git push --dry-run origin HEAD:main
    exit 0
  fi
  git commit -m 'Publish notes'
  if git push origin HEAD:main; then exit 0; fi
done
echo 'The website changed during publishing. Your private post is saved; run Publish notes again.' >&2
exit 1
