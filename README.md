# Tim G — Personal Hub

Static personal landing site for [tgthms.github.io/about](https://tgthms.github.io/about/).

## Stack

- Plain HTML / CSS / JS (no build step)
- GitHub Pages (`static.yml` deploys the repo root)
- Craft Brutal design: cream paper / warm charcoal, hard borders, offset shadows, terracotta accent

## Features

- English, Español, 中文, 日本語
- Light / dark from OS preference (optional session toggle)
- Featured projects: USA Travel Guide, Japan Travel Guide, Kit
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Privacy Policy & Terms of Use

## Files

| Path | Role |
|------|------|
| `index.html` | Home |
| `privacy.html` / `terms.html` | Legal |
| `css/styles.css` | Site chrome + home |
| `css/legal.css` | Legal layout |
| `js/i18n.js` | Translations, language, theme, mobile prefs |
| `js/main.js` | Home interactions |
| `js/legal.js` + `js/legal-content.js` | Legal rendering |
| `assets/` | Duolingo QR (dark + light) |

## Accessibility

- Skip link, landmarks, focus styles
- `prefers-reduced-motion` disables motion
- System light/dark and language detection with local storage for language only
