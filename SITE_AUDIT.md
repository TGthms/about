# Personal hub refinement and audit

Reviewed 12 October 2026. Scope: homepage, preferences, dialogs, legal pages,
asset loading, translations, links, and responsive light/dark presentation.

## Design changes

- Kept the serif typography, personal copy, signature dot, project identities,
  and travel-guide photograph. Light mode uses soft white and graphite with a
  restrained slate accent; dark mode uses matching charcoal/slate surfaces.
- Aligned the desktop introduction with the header. The three Explore links
  sit below the introduction, leaving the pelican clear.
- Kept all three Explore links the same resting color.
- Reduced the header contraction to 24px in width and 8px in height at
  1440px, with a slower 520ms easing. Measured expanded size: 1280px × 79px;
  compact size: 1256px × 71px.
- Crossfade stable light/dark scrims and image filters. The photo entrance runs
  after decode, with a timeout fallback and reduced-motion support.
- Added a narrow, masked blur/fade at the photo-to-About boundary. It softens
  scenery below the text and falls back to a gradient fade when blur is unsupported.
- Constrained mobile Explore links to leave the pelican clear.
- Matched legal-page controls and surfaces to the homepage.

## Bugs fixed

| Finding | Resolution |
| --- | --- |
| Dark desktop controls inherited the mobile sheet's rectangular shadow | Scoped dark sheet styling to mobile |
| Mobile close control crowded the navigation after being moved to body | Reserved its 44px slot in the header |
| Dialog focus return could scroll the underlying page, or return to body in Safari | Return explicitly to the opener with `preventScroll` |
| Reopened Erhu/archive dialogs could retain a stale scroll position | Reset their panels on open |
| Mobile spring velocity used px/ms with an integration step in seconds | Convert velocity to px/s |
| Legal anchors counted the sticky header twice | Use measured header height plus a single small margin |
| Traditional Chinese missed the shared Chinese typography rules | Share the rules and load Noto TC for Traditional Chinese |
| Video source failures could leave an unhelpful player | Show localized failure copy; reopening retries the source |
| Existing navigation tests did not model the newer header class toggle | Repair the fixture and add scroll-lock/hysteresis coverage |

## Asset loading

- Hero: high-priority, asynchronous decode; entrance waits for decode with
  bounded fallbacks. Its source photo and crop remain the travel guide's.
- Project images and QR codes: retain viewport-aware sequential fetching,
  hidden/theme filtering, decode handling, and queue recovery after failures.
  Project previews are already approximately 12–112 KB each; no additional
  lossy recompression was necessary.
- Video: preserve intentional preload, triggered by proximity to the Erhu
  button, hover, or focus. Proximity loading waits for page load and an idle
  opportunity. Speculative loading skips data-saving and 2G connections;
  explicit opening still loads the player.
- Video: use a native fast-start MP4 with metadata at byte 28, rather than
  after roughly 19 MB of media. The compressed audio/video payload's SHA-256
  matches the original MOV exactly; this was a container remux, not an encode.
  The original recording remains available in the source tree.
- Video: use real buffered-duration percentages and a labeled progress bar
  while loading. Unknown duration gets an indeterminate loading label;
  sufficiently buffered or playing video clears the loading UI. No whole-file
  fetch-to-Blob step is introduced; native streaming/range requests remain.
- Fonts: Public Sans is hosted locally with its SIL Open Font License.
  Chinese/Japanese stylesheets load only when their language is selected,
  avoiding the original render-blocking CSS import on English visits.
- GitHub calendar: retains first-interaction fetching, session caching,
  network/body timeouts, honest error states, and reduced-motion handling.
- Updated cache-version URLs for changed shared scripts and styles.

## Verification

- 25 Node regression tests pass, covering image queue failure/timeout recovery,
  stale clipboard callbacks, navigation/focus, preferences keyboard behavior,
  GitHub calendar failures, header hysteresis, and video loading/progress/errors.
- All JavaScript files pass syntax checks.
- HTML IDs, local references, anchor targets, and external-link rel attributes
  pass integrity checks; `git diff --check` passes.
- All 91 interface translation keys are present in all five language packs.
- Browser-checked English, Spanish, Simplified Chinese, Traditional Chinese,
  and Japanese switching; no empty translation labels or horizontal overflow.
- Browser-checked 320, 390, 768, 1024, 1440, and 1920px viewport widths.
- Reviewed homepage, preferences, Erhu, archived projects, QR viewer, and legal
  pages. Verified inert cleanup, focus return, and unchanged captured scroll
  positions after closing the language menu and mobile preferences.
- Dark desktop control container computes to `box-shadow: none`.
- Body, muted, secondary, and accent text on solid surfaces exceed 4.5:1 in
  both palettes. This is not an automated contrast certification over photos.
- All 17 public project, backup, archived-project, social, and community URLs
  returned HTTP 200 after redirects.
- No console warnings or errors appeared in the checked browser flows.
- MP4 metadata layout and identical compressed media payload were verified.

## Verification limits

Browser QA used the macOS in-app browser with viewport overrides. Physical iOS
Taptic feedback, mobile Safari toolbar behavior, and other browser engines were
not exercised on devices. The intentional native iOS haptic code was preserved.
Reduced-motion branches and failure cases are covered by source review and the
relevant regression tests; no Lighthouse score or throttled-network benchmark
is claimed. Public-link responses reflect the audit time.


## v15 follow-up: projects and reading cards

- All six project cards use equal widths, equal heights, and the same 16:10
  preview area. Verified equal heights at 320, 390, 768, and 1440px widths.
- Personal Hub is first. Its entire surface is a semantic popup button,
  with “You’re here” status and an “About this site” cue, without an outbound
  project link. Keyboard focus follows the same full-card pattern as other
  projects.
- Its local popup includes an introduction and 15 numbered milestones curated
  from the repository history and this update. All 15 implementation commit
  references were verified locally; v15 links to 48efc73. There is no explanatory
  subtitle above the timeline. These are stable milestone labels, not a claim
  that every label was an original Git tag.
- About's building/photography/erhu phrases are plain text. Psalm 23 opens a
  reading card with all six verses, classic serif type, edition/source credits,
  and a Bible.com link to the corresponding language/edition's Psalm 23.
- English uses NIV 2011 with the copyright notice and NIV attribution after
  the passage. Japanese uses the licensed JCB (2016), preserving its combined
  verses 2–3. Other sources and the reasoning for their use are documented in
  SCRIPTURE_CREDITS.md. The English footer uses the user's exact KJV wording
  with “hath”; Chinese Union Version spacing before 神 is retained from its source.
- Both new popups were browser-checked in all five languages. Mobile padding
  was corrected to prevent a small horizontal overflow in the history card.
  Wrapped keyboard focus scrolls within long cards, and closing restores the
  captured page position and opener.
- All five chapter destination URLs returned HTTP 200 after redirects.
- Hero arrows point down. The Bay Area line has balanced wrapping and a
  localized wash for contrast. The photo transition reaches solid page color
  before the clip edge; a 2px overlap removes a WebKit compositing hairline.
  At a 1440×900 viewport, the desktop fade is 54px high, revealing more pelican.
- Captured light-mode pixels across the seam match the page background
  (RGB 250/250/250) at left, center, and right sample points. Dark-mode
  boundary samples also match on both sides.
- Changed scripts/styles have new cache keys, including the translation file,
  so existing visitors receive the corrected footer wording.

### Existing deployment maintenance

The previous production deployment passed validation and Pages publication.
GitHub emitted upstream-action Node.js 20 deprecation annotations while running
those actions under Node.js 24. The pinned action versions can be refreshed as
upstream releases become available; these annotations did not fail deployment.
