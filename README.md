# Tim G — Personal Hub

Static personal landing site for [timgong.me](https://timgong.me/) (GitHub Pages project `TGthms/about`; `tgthms.github.io/about/` redirects to the custom domain).

## Stack

- Plain HTML / CSS / JS 
- GitHub Pages (`.github/workflows/static.yml` validates and deploys `public/`)
- Craft Brutal design: cream paper / warm charcoal, hard borders, offset shadows, terracotta accent

## Features

- English, Español, 中文, 日本語
- Light / dark mode (system default, session override)
- Projects: Kit, Travel Gallery (featured), USA Travel Guide, Japan Travel Guide, and duskline, with Folio, Nimbus, and Kiln available in an archived-project shelf
- Dual hosts for each project (Cloudflare main / GitHub backup). English, Spanish, and Japanese pick a line in settings; Chinese shows both CTAs
- Hero name glows in letter by letter; about copy sharpens from blur as it scrolls into view
- GitHub link card: hover (or keyboard focus) opens a contribution calendar for TGthms (profile and calendar data load on that first interaction)
- Raster photos load one-by-one after the page is ready, so the browser tab spinner is not held open by below-fold images
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Erhu interest card with a responsive, localized wiki dialog, museum image, and performance video
- Privacy Policy & Terms of Use with localized content rendered by JavaScript (Privacy last updated 1 September 2026; Terms last updated 26 August 2026)

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
| `public/js/blur-scroll-reveal.js` | Scroll-linked about-text blur reveal |
| `public/js/github-card.js` | GitHub contribution calendar popover |
| `public/js/image-loader.js` | Sequential raster loading (`data-src`) and sliding “Loading...” label |
| `public/apple-touch-icon.png` | iOS home-screen icon (180×180) |
| `public/sitemap.xml` | Search-engine sitemap |
| `public/js/archived-projects.js` | Archived project shelf dialog behavior and focus management |
| `public/js/erhu.js` / `public/js/erhu-content.js` | Erhu wiki dialog behavior and localized content |
| `public/js/legal.js` | Legal rendering |
| `public/js/legal/` | Legal UI, privacy, and terms content split by responsibility |
| `public/assets/` | Project previews, Duolingo QR assets, and erhu media |
| `public/og-image.png` | Social preview (1200×630) |
| `public/favicon.svg` | Tab icon |

Repository documentation and licensing stay outside `public/`, so the deployment artifact contains only intentional site files.

## Accessibility

- Skip link, landmarks, focus-visible styles, and named controls
- Localized legal content rendered from structured page data
- Modal and mobile-sheet focus management, Escape handling, and focus containment
- Localized page language, metadata, live language-change announcements, and QR alternative text
- `prefers-reduced-motion` disables non-essential transitions and animations
- System light/dark detection; language and project-host preferences use local storage; theme overrides use session storage

## License

- Code (`public/` HTML/CSS/JS, excluding `public/assets/`): [MIT License](LICENSE)
- Photos, video, and other media (`public/assets/`, `public/og-image.png`, `public/favicon.svg`): [CC BY-NC-ND 4.0](LICENSE-CONTENT.md)
