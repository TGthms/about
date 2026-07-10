# Tim G — Personal Hub

A single-page personal landing site: clean, multi-language, light/dark auto theme. Built for GitHub Pages.

## Preview locally

Open `index.html` in a browser, or serve the folder:

```bash
# Python
python3 -m http.server 8080

# Node (if you have npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Deploy on GitHub Pages

1. Create a repo (e.g. `personal-site` or use your `username.github.io` repo).
2. Push this folder’s contents to the default branch.
3. In **Settings → Pages**, set source to **Deploy from a branch**, branch `main` (or `master`), folder `/ (root)`.
4. Site will be at `https://<username>.github.io/<repo>/` (or the root of `username.github.io`).

All asset paths are relative, so project Pages and user Pages both work.

## Customize

| What | Where |
|------|--------|
| Copy / translations | `js/i18n.js` — `TRANSLATIONS` object |
| Email | `index.html` → footer mailto link |
| Extra links | Placeholder cards in the Work section; replace with real `<a class="link-card">` |
| Colors / spacing | `css/styles.css` → `:root` tokens |
| Meta / OG | `index.html` `<head>` + `og-image.svg` |

Preferences (persisted in `localStorage`):

| Key | Values | Default |
|-----|--------|---------|
| `timg-lang` | `en` / `es` / `zh` / `ja` | Browser language |
| `timg-theme` | `light` / `dark` | System `prefers-color-scheme` |
| `timg-motion` | `reduce` / `full` | System `prefers-reduced-motion` |

Use the top-right controls to switch language, theme, and reduced motion.

## Structure

```
personal-site/
├── index.html
├── favicon.svg
├── og-image.svg
├── css/styles.css
├── js/i18n.js
├── js/main.js
└── README.md
```

## Accessibility

- Semantic landmarks and heading hierarchy
- Skip link, keyboard focus styles
- `prefers-reduced-motion` disables motion
- Sufficient contrast in light and dark themes
