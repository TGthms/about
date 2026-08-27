# Tim G — Personal Hub

Static personal landing site for [tgthms.github.io/about](https://tgthms.github.io/about/).

## Stack

- Plain HTML / CSS / JS (no build step)
- GitHub Pages (`.github/workflows/static.yml` validates and deploys `public/`)
- Craft Brutal design: cream paper / warm charcoal, hard borders, offset shadows, terracotta accent

## Features

- English, Español, 中文, 日本語
- Light / dark mode (system default, session override)
- Projects: Travel Gallery (featured), USA Travel Guide, Japan Travel Guide, Kit, plus GitHub apps Nimbus, Folio, and Kiln
- Dual hosts for each project (Cloudflare main / GitHub backup). English, Spanish, and Japanese pick a line in settings; Chinese shows both CTAs
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Erhu interest card with a responsive, localized wiki dialog, museum image, and performance video
- Privacy Policy & Terms of Use with localized content rendered by JavaScript (Terms last updated 26 August 2026)

## Files

| Path | Role |
|------|------|
| `public/index.html` | Home page |
| `public/privacy.html` / `public/terms.html` | Legal pages |
| `public/css/styles.css` | Site chrome + home |
| `public/css/legal.css` | Legal layout |
| `public/js/preferences.js` | Centralized preferences markup |
| `public/js/i18n/` | Focused translation, theme, controls, and project-host modules |
| `public/js/main.js` | Home interactions |
| `public/js/erhu.js` / `public/js/erhu-content.js` | Erhu wiki dialog behavior and localized content |
| `public/js/legal.js` | Legal rendering |
| `public/js/legal/` | Legal UI, privacy, and terms content split by responsibility |
| `public/assets/` | Project previews, Duolingo QR assets, and erhu media |
| `public/og-image.png` | Social preview (1200×630) |
| `public/favicon.svg` | Tab / touch icon |

Repository documentation and licensing stay outside `public/`, so the deployment artifact contains only intentional site files.

## Accessibility

- Skip link, landmarks, focus-visible styles, and named controls
- Localized legal content rendered from structured page data
- Modal and mobile-sheet focus management, Escape handling, and focus containment
- Localized page language, metadata, live language-change announcements, and QR alternative text
- `prefers-reduced-motion` disables non-essential transitions and animations
- System light/dark detection; language and project-host preferences use local storage; theme overrides use session storage

## License

[Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](LICENSE.md)
