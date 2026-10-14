# Tim G — Personal Hub

Static personal landing site for [timgong.me](https://timgong.me/) (GitHub Pages project `TGthms/about`; `tgthms.github.io/about/` redirects to the custom domain).

## Stack

- Plain HTML / CSS / JS 
- GitHub Pages (`.github/workflows/static.yml` validates and deploys `public/`)
- Personal editorial design: soft white / charcoal, serif headings, open layouts, and restrained slate links

## Features

- English, Español, 简体中文, 繁體中文, 日本語, 한국어
- Light / dark mode (system default, session override)
- Projects: duskline, Kit, Travel Gallery, USA Travel Guide, and Japan Travel Guide, with Folio, Nimbus, and Kiln available in an archived-project shelf
- Dual hosts for each project (Cloudflare main / GitHub backup). Every language uses the selected host preference
- Compact introduction and section navigation with a current-section indicator and measured sticky-header offsets; all home content is readable immediately
- Six equally sized project previews; the whole Personal Hub card opens an introduction and curated version history
- Brief hover/press/dialog animations that respect reduced motion, with small animated interest doodles
- Birthday balloons on every home-page visit on December 21 (visitor's local date), with reduced-motion support; preview with `?birthday=preview`
- A first-to-five Pong match against a local computer opponent, with three challenge levels, point and match celebrations, touch/mouse/keyboard controls, pause on blur, and local best-rally records
- Email copy action with localized success/failure announcements
- Psalm 23 reading card with localized editions, classic typography, and visible scripture credits
- Intentional native iOS tick haptics are preserved
- Full-height photographic hero with a decode-aware entrance, smooth theme scrims, and a gently contracting header
- Erhu photo and video preload on proximity or intent; fast-start MP4 retains picture/audio quality and native streaming, with localized buffering percentages
- Public Sans is self-hosted with its OFL license; CJK display fonts load only for the selected language, including Korean
- GitHub link card: hover (or keyboard focus) opens a contribution calendar for TGthms (profile and calendar data load on that first interaction)
- Raster photos load one-by-one after the page is ready, so the browser tab spinner is not held open by below-fold images
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Erhu interest card with a responsive, localized wiki dialog, museum image, and performance video
- Privacy Policy & Terms of Use with localized content rendered by JavaScript (Privacy last updated 13 October 2026; Terms last updated 26 August 2026)

## Files

| Path | Role |
|------|------|
| `public/index.html` | Home page |
| `public/privacy.html` / `public/terms.html` | Legal pages |
| `public/css/styles.css` | Shared chrome, components, and dialogs |
| `public/css/home.css` | Home-page editorial layout and responsive styles |
| `public/css/legal.css` | Legal layout |
| `public/js/preferences.js` | Centralized preferences markup |
| `public/js/i18n/` | Focused translation, theme, controls, and project-host modules |
| `public/js/main.js` | Home interactions |
| `public/js/birthday.js` / `public/js/vendor/balloons.js` | Date-gated birthday celebration and locally hosted balloon effect |
| `public/js/rally-engine.js` / `public/js/rally.js` | Local Pong opponent, match physics, and accessible game dialog |
| `public/js/contact.js` | Email copying with honest, localized feedback |
| `public/js/home-navigation.js` | Section indicator and responsive anchor offsets |
| `public/js/about.js` | Localized about paragraphs and Psalm reader trigger |
| `public/js/site-history.js` / `public/js/site-history-content.js` | Personal Hub introduction and curated milestone history |
| `public/js/psalm.js` / `public/js/psalm-content.js` | Attributed, localized Psalm 23 reader |
| `public/js/github-card.js` | GitHub contribution calendar popover |
| `public/js/image-loader.js` | Sequential raster loading (`data-src`) and sliding “Loading...” label |
| `public/apple-touch-icon.png` | iOS home-screen icon (180×180) |
| `public/sitemap.xml` | Search-engine sitemap |
| `public/robots.txt` | Crawler allow list + sitemap pointer |
| `public/js/archived-projects.js` | Archived project shelf dialog behavior and focus management |
| `public/js/erhu.js` / `public/js/erhu-content.js` | Erhu wiki dialog, intent preloading, buffering progress, and localized content |
| `public/js/hero-image.js` | Decode-aware hero photo entrance |
| `public/assets/fonts/` | Public Sans and its SIL Open Font License |
| `public/js/legal.js` | Legal rendering |
| `public/js/legal/` | Legal UI, privacy, and terms content split by responsibility |
| `public/assets/` | Project previews, Duolingo QR assets, and erhu media |
| `public/og-image.png` / `public/og-image.svg` | Social preview graphics (original SVG artwork; the PNG is referenced by page metadata) |
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

- Code (`public/` HTML/CSS/JS, excluding assets and attributed Scripture text): [MIT License](LICENSE)
- Scripture excerpts: [edition-specific sources and credits](SCRIPTURE_CREDITS.md)
- Public Sans: SIL Open Font License in `public/assets/fonts/`
- Balloon effect: [balloons-js](https://github.com/arturbien/balloons-js), MIT © 2024 Artur Bień; license retained in `public/js/vendor/balloons.js`
- Photos, video, and other media (`public/assets/`, `public/og-image.png`, `public/og-image.svg`, `public/favicon.svg`): [CC BY-NC-ND 4.0](LICENSE-CONTENT.md)

## Local checks

Run `node --test tests/*.test.cjs` and `python3 tests/html-integrity.py` for image-error/timeout recovery, clipboard language-switch races, section navigation, preferences keyboard focus/return, match physics and opponent behavior, clipboard failures, and complete Korean translation/placeholder coverage. The deployment workflow runs these alongside JavaScript syntax and HTML integrity checks.

To document a future substantial upgrade, append a milestone to `public/js/site-history-content.js`, keep previous version numbers stable, and update `currentVersion`. Add the implementation commit SHA after the commit exists. Scripture source/credit details are maintained in `SCRIPTURE_CREDITS.md`.
