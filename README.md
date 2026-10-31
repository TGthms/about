# Tim G — Personal Hub

Static personal landing site for [timgong.me](https://timgong.me/) (GitHub Pages project `TGthms/about`; `tgthms.github.io/about/` redirects to the custom domain).

## Stack

- Plain HTML / CSS / JS 
- GitHub Pages (`.github/workflows/static.yml` validates and deploys `public/`)
- Personal editorial design: soft white / charcoal, serif headings, open layouts, and restrained slate links

## Features

- English, Español, 简体中文, 繁體中文, 日本語, 한국어
- Light / dark mode (system default, session override)
- Projects: Travel Gallery, Signal Lab, Kit, duskline, and Personal Hub, with USA Travel Guide, Japan Travel Guide, Folio, Nimbus, and Kiln in the archived-project shelf
- Dual hosts for each project (Cloudflare main / GitHub backup). Every language uses the selected host preference
- Compact introduction and section navigation with a current-section indicator and measured sticky-header offsets; all home content is readable immediately
- Four project previews, led by Travel Gallery and Signal Lab; a quieter Personal Hub row opens the site introduction and curated version history
- Brief hover/press/dialog animations that respect reduced motion, with small animated interest doodles
- Birthday balloons on every home-page visit on December 21 (visitor's local date), with reduced-motion support; preview with `?birthday=preview`
- Seasonal hero greetings for Christmas, Good Friday, Easter, Palm Sunday, U.S. Thanksgiving, and New Year, in all six languages and the visitor's local date
- December 31 countdown from 23:50 with NumberFlow digits, a larger in-page timer from 60 to 11 seconds and a full-screen final ten seconds, and a crossfade into the New Year photograph at midnight; 30 seconds of midnight fireworks and a five-second welcome on each later January 1 visit respect motion preferences and tab visibility
- A first-to-five Pong match against a local computer opponent, with three challenge levels, point and match celebrations, touch/mouse/keyboard controls, pause on blur, and local best-rally records
- Email copy action with localized success/failure announcements
- Psalm 23 reading card with localized editions, classic typography, and visible scripture credits
- Intentional native iOS tick haptics are preserved
- Full-height photographic hero with a decode-aware entrance, smooth theme scrims, and a gently contracting header
- Two erhu actions open separate performance and instrument dialogs, with a link between them. Erhu photo and video preload on proximity or intent; fast-start MP4 retains picture/audio quality and native streaming, with localized buffering percentages
- Public Sans and the archived USA card’s Fraunces weight are self-hosted with its OFL license; CJK display fonts load only for the selected language, including Korean
- GitHub link card: hover (or keyboard focus) opens a contribution calendar for TGthms (profile and calendar data load on that first interaction)
- Raster photos load one-by-one after the page is ready, so the browser tab spinner is not held open by below-fold images
- GitHub, Instagram (WeChat ID when language is Chinese), Duolingo QR with enlarge modal
- Erhu interest card with separate responsive, localized instrument and performance dialogs
- Privacy Policy & Terms of Use with localized content rendered by JavaScript (Privacy last updated 14 October 2026; Terms last updated 26 August 2026)

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
| `public/js/season-calendar.js` / `public/js/seasons.js` / `public/js/season-content.js` | Local annual calendar, seasonal hero, countdown, and localized greetings |
| `public/css/seasons.css` / `public/assets/seasonal/` | Seasonal hero treatments and supplied holiday images |
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

## Notes and private publishing

The public site has a featured Notes carousel beneath About, a Notes shortcut in the hero, static reading pages, category archives, and an RSS feed at `feed.xml`. No publishing application or account code loads for visitors. The interface supports all six site languages; post translations are optional and have their own URLs and sharing metadata. Authors may enter custom categories; the four starter categories have translated interface labels. Longer notes receive a section contents list and every reading page has an explicit return to the homepage Notes entrance.

The carousel uses all active posts marked **Feature beneath About**, with the latest post as its fallback. It advances every eight seconds with a CSS progress indicator, continues on hover and pauses for keyboard focus, and provides arrows, dots, and touch swiping. It suspends offscreen, in hidden pages, and behind dialogs; reduced-motion and lightweight browsing remain manual. Without JavaScript, the cards use native horizontal scrolling.

Drafts and original media belong in the separate **private** `TGthms/about-notes` repository. Its Pages CMS configuration and workflow templates are maintained in `scripts/notes/private-repository/`; those files contain configuration only. Never place draft content, original uploads, or credentials in this public repository. `.private-notes/` is ignored for the local bootstrap checkout.

`scripts/notes/build.py --content /path/to/private/content` exports only published notes and published translations. It sanitizes rich text, validates media paths, strips photograph metadata, creates responsive WebP images and JPEG share cards, copies referenced short videos, and updates the homepage entrance, archive, feed, and sitemap. It processes media during publication; visitors use native responsive images and video controls. Narrow screens receive an explicit small image source.

The private repository's publication workflow uses a dedicated write-enabled deploy key for this public repository. It rebuilds against the latest website revision and retries if the public branch changes during a publish. Drafts, unused media, private configuration, and unpublished translations are never exported. Previously published files may remain in public Git history after unpublishing.

The editor's **Build private preview** action produces a self-contained HTML artifact in the private repository. Download it and open it in a browser; no local server is necessary. Preview artifacts expire after three days. Their contents remain confidential only while the downloaded files themselves are kept private.

Notes can include a fixed `same-study` content block: a silent SAME header, byte-order, and burst-comparison experiment in English or Simplified Chinese. Its small stylesheet and script load only on articles containing that block. Without scripting it presents a readable field guide. Private previews embed this trusted local component; author-supplied scripts remain blocked.

Build checks: `python3 tests/notes_test.py` (requires `scripts/notes/requirements.txt`) and the existing interaction/HTML checks. Use `python3 scripts/notes/build.py --empty` only to initialize an empty archive; it removes previously generated Notes output. Normal development should preserve published Notes pages and update stylesheet/script query hashes recursively across `public/`.

The supplied RSS icon is Google's Material Symbols icon, distributed under Apache 2.0; its license is in `LICENSES/material-symbols.txt`.

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
- Public Sans and Fraunces: SIL Open Font Licenses in `public/assets/fonts/`
- Balloon effect: [balloons-js](https://github.com/arturbien/balloons-js), MIT © 2024 Artur Bień; license retained in `public/js/vendor/balloons.js`
- New Year fireworks: [fireworks-js](https://github.com/crashmax-dev/fireworks-js) 2.10.8, MIT © 2021–2023 Vitalij Ryndin; license retained in `public/js/vendor/fireworks.js`
- Countdown digits: [NumberFlow](https://github.com/barvian/number-flow) 0.6.2, MIT © 2024 Maxwell Barvian; license retained in `public/js/vendor/number-flow.mjs`. Bundled with esbuild 0.25.12; the two `esm-env` browser checks are resolved to `true` for the browser-only entry. No build tool is required to serve the site.
- Photos, video, and other media (`public/assets/`, `public/og-image.png`, `public/og-image.svg`, `public/favicon.svg`): [CC BY-NC-ND 4.0](LICENSE-CONTENT.md)

## Local checks

Run `node --test tests/*.test.cjs` and `python3 tests/html-integrity.py` for image-error/timeout recovery, clipboard language-switch races, section navigation, preferences keyboard focus/return, match physics and opponent behavior, clipboard failures, and complete Korean translation/placeholder coverage. The deployment workflow runs these alongside JavaScript syntax and HTML integrity checks.

Season previews use `?occasion=christmas`, `good-friday`, `easter`, `palm-sunday`, `thanksgiving`, or `new-year`. `?occasion=countdown` runs a 75-second preview (15 seconds compact, 50 seconds in-page, then ten seconds full-screen); `?occasion=final-minute` starts at 60 seconds; `?occasion=final-seconds` starts at the immersive ten-second stage. Both continue into the midnight photo and 30-second celebration. `?occasion=fireworks` starts the midnight celebration immediately; `?occasion=new-year` previews the five-second arrival welcome. Reload to replay. Previews never change stored preferences or the system clock.

Good Friday, Easter, and Palm Sunday follow the Western Gregorian calendar. All six holiday photos use individual responsive framing. Good Friday, Easter, Palm Sunday, and Thanksgiving display attributed verse text with their references. Seasonal photos and copy revert at the next local midnight, including on an already-open page. The ordinary page has one timer to the next date boundary; it fetches no seasonal text, images, or animation libraries. The countdown uses the wall clock, updates once a second while visible, and catches up after a background tab resumes. Visitors who watch the countdown receive fireworks until midnight plus 30 seconds. New arrivals anywhere on January 1 receive five seconds, once per visit, including a restored back/forward-cache visit. Effects stop when hidden and do not replay on ordinary focus. The final ten seconds use a native modal dialog, defers to an already-open site dialog, traps focus, and releases scroll/focus resources on exit. Escape returns to the compact timer without suppressing the midnight celebration. There are no visible return or fireworks-close buttons. Finishing the countdown preserves the visitor’s scroll position and does not focus the site heading. The hero keeps its short introduction; the student/location biography lives in About. Dark mode is the temporary default throughout the countdown and celebration; visitors can override it with the theme control, and their manual choice stays active through every stage. Without a manual change, the saved preference returns afterward. The New Year image is decoded during the final minute and crossfaded at midnight; the old decoded photograph is released afterward.

To document a future substantial upgrade, append a milestone to `public/js/site-history-content.js`, keep previous version numbers stable, and update `currentVersion`. Add the implementation commit SHA after the commit exists. Scripture source/credit details are maintained in `SCRIPTURE_CREDITS.md`.

The full-size hero remains available alongside responsive landscape and portrait variants. The preload and displayed image use the same source set. Explicit dialog images have a reserved loading lane, so a stalled project preview cannot hold them up. Original performance masters live in `media-masters/`, outside the deployed `public/` artifact; the MP4 continues to use native streaming and the existing preload behavior.

Pong uses a seeded random source for varied serves, bounded opponent reactions, and reproducible physics checks. Longer rallies gradually increase aiming uncertainty. Contact feedback respects reduced motion, and a completed match reports its longest rally. Short landscape screens place the court alongside the controls. Reading, archive, and QR dialogs use fixed headers and independent scrolling content; a small header blur is available when supported, and dialog exits retain focus and scroll containment until finished.

The custom-domain host injects Cloudflare’s Web Analytics / RUM beacon. The privacy policy discloses its performance and usage reporting, with a link to Cloudflare’s documentation, in all six languages.

The curated timeline ends at v16; its summary includes seasonal celebrations. The instrument dialog pairs a museum photograph with a single prose column on desktop and stacks them on phones. The performance dialog contains the player, its attribution, and a link to the instrument. Both bottom Close controls share the same delegated close handling as their header controls.

The Photography interest jumps to the first project, Travel Gallery. Opening
that project uses the selected main or backup host. Its project preview shares the travel guide's photo
catalog, with one photo visible, a four-second cadence, a soft crossfade and zoom,
and a Public Sans location label. Selecting the project opens the currently
displayed photo. A two-pixel interval line follows the bottom of the location
label and freezes with the slideshow; resuming preserves the remaining time.
Project cards stay still on hover and retain their press feedback. Local WebPs are bounded to 1200 pixels per edge and requested
one at a time, only while the preview is visible. Rotation continues on pointer hover and pauses for keyboard focus on a control, a site dialog, a hidden page, or the explicit pause control.
Reduced motion, data-saving connections, and lightweight browsers keep a still
frame; the Watch copy is bounded to 480 pixels. Failed incoming photos preserve
the current image, caption, and destination. The recording notice uses a native
disclosure beneath the video in all six languages.

### Gallery Manager sync

The Travel Guide's local Gallery Manager automatically updates this project's
shuffle after adding, editing, removing, or rebuilding gallery photos. Photos
stay local under `public/assets/gallery/`; visitors do not depend on the Travel
Guide host. Existing photos are adopted without recompression. New or replaced
photos receive a 1200-pixel WebP at quality 85, and the still-frame preview has a
480-pixel Watch variant. Video covers are excluded from this shuffle.

By default the manager finds the sibling `about` folder. Start it with
`--about-root /path/to/about` or set `ABOUT_SITE_ROOT` for a different location;
`--no-about-sync` disables syncing for a session. The manager shows sync status
and a **Sync now** retry button. To catch up without opening the manager:

```sh
python3 tools/gallery_manager.py --sync-about
```

Run that command from the Travel Guide project. Syncing never commits, pushes,
or publishes either project. Review and publish each repository separately.
If About is unavailable or an image conflicts with a local edit, Gallery saves
still succeed and the manager reports the sync issue. Retry after resolving it.

`scripts/gallery_sync.py` plans and validates the update before writing, refreshes
HTML resource versions, and rolls back write failures. Its tracked
`scripts/gallery-sync-state.json` records source hashes and generated-file
ownership; keep it with the image changes. Unchanged photos are not re-encoded,
and removal only deletes owned, unmodified files. An empty gallery uses the
project preview; removing the still-frame photo selects another live photograph.
Run the isolated regression checks with `python3 tests/gallery_sync_test.py`.

### Constrained browsers

`js/runtime.js` selects a lightweight rendering path before any image preload
when the browser identifies as a Watch, its shorter physical screen edge is at
most 320 CSS pixels, or its initial viewport is at most 320 CSS pixels. The choice
stays fixed for the visit to avoid reloading media during rotation or resizing.

This path uses system fonts, static opaque surfaces, serial viewport-only image
loading, and photos bounded to 480 pixels per edge under `assets/compact/`.
It skips haptic shadow overlays, the contribution popover, and decorative
balloons/fireworks/number animation. Holiday greetings and the plain countdown
remain. Erhu video waits for Play, has a direct media link, and releases its
buffer on closing or changing dialogs. Pong retains its controls and physics,
uses a 300×160 backing canvas at up to 30 fps, and releases that canvas on close.
Regular phone and desktop visits retain the full rendering and preload behavior.

When replacing a source photo, regenerate its matching compact WebP using EXIF
orientation, a maximum 480×480 bounding box, and WebP quality 82. Compact photos
must never be added to normal image source sets: this path selects them before
requests begin. `?lite=1` explicitly selects this path if a browser reports an
unexpected screen size or user agent. Test a fresh navigation after setting a small viewport; resizing
an already-open desktop page intentionally keeps its original runtime policy.

### Asset cache versions

After editing JavaScript or CSS, run `python3 scripts/version-assets.py` to refresh local resource references. GitHub Actions performs this automatically before validation and again in the deployment checkout, so small text edits in the language data can deploy without manually editing hashes. Missing assets and invalid references still fail validation.
