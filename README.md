# Tim G — Personal Hub

Static personal landing site for [tgthms.github.io/about](https://tgthms.github.io/about/).

## Stack

- Plain HTML / CSS / JS (no build step)
- GitHub Pages (`static.yml` deploys the repo root)
- Craft Brutal design: cream paper / warm charcoal, hard borders, offset shadows, terracotta accent

## Features

- English, Español, 中文, 日本語
- Light / dark mode (system default, session override)
- Projects: Travel Gallery (featured), USA Travel Guide, Japan Travel Guide, Kit, plus GitHub apps Nimbus, Folio, and Kiln
- Dual hosts for each project (Cloudflare main / GitHub backup). English, Spanish, and Japanese pick a line in settings; Chinese shows both CTAs
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Privacy Policy & Terms of Use (last updated 22 July 2026)

## Files

| Path | Role |
|------|------|
| `index.html` | Home |
| `privacy.html` / `terms.html` | Legal |
| `css/styles.css` | Site chrome + home |
| `css/legal.css` | Legal layout |
| `js/i18n.js` | Translations, language, theme, mobile prefs, project hosts |
| `js/main.js` | Home interactions |
| `js/legal.js` + `js/legal-content.js` | Legal rendering |
| `assets/` | Duolingo QR (dark + light) |
| `og-image.png` | Social preview (1200×630) |
| `favicon.svg` | Tab / touch icon |

## Accessibility

- Skip link, landmarks, focus styles
- `prefers-reduced-motion` disables motion
- System light/dark and language detection with local storage for language only

## License

- [CC BY-NC 4.0](LICENSE.md).
