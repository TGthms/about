# Notes · Local workspace

Your private Mac-first editor: writing beside a live article preview, all 13 content
formats, cover design, local recovery, backups, and explicit publication. Nothing
from the manager is loaded by visitors to the public website.

## Open it

Double-click **Open Notes.command**, or run from the website checkout:

```sh
python3 tools/notes-manager/server.py
```

The manager opens at **https://127.0.0.1:1222** through a private launch link.
Opening the launcher again returns to the running workspace. Keep its terminal
running; Control-C stops the server.

HTTPS uses a locally trusted mkcert certificate. On a new Mac, install mkcert
(`brew install mkcert`), then open **Setup HTTPS.command** once. It explains the
persistent trust change and asks before creating/installing the local authority.
Certificates, server keys, and the public CA certificate stay in ignored
`.notes-manager/tls/`. The authority's private key stays in mkcert's own folder;
it is never copied into this project. The manager binds only to loopback.

Python 3 and Pillow are needed. The launcher creates an isolated Python environment
if Pillow is missing. The editor is bundled, so daily use does not require Node.
Backups and publishing use Git and the GitHub CLI, authenticated for
`TGthms/about-notes`; no account token is sent to the browser.

Use `--content PATH` for another private checkout, `--port NUMBER` for another port,
or `--no-open` to print the launch link. `--http` is available for isolated development
tests; normal daily launches use HTTPS.

## Where your writing lives and what to back up

By default, `.private-notes/` inside the About folder is a separate Git clone of
`TGthms/about-notes`. It contains notes, uploads, editable cover sources, and private
publication records. Autosave writes there. **Back up drafts** synchronizes that
clone with the private GitHub repository; pushing the public About repository does
not include it.

For a full Mac backup, include the entire About folder **with hidden folders**,
especially `.private-notes/` and `.notes-manager/`. The latter holds local History,
recovery, Trash, and HTTPS settings that are not included in GitHub draft backups.
Keep that backup private. For the freshest copy, save and stop the manager before
copying. On a different Mac, set up HTTPS there rather than transferring the local
certificate authority's private key.

## Three clear states

- **Autosaved on this Mac:** typing updates the local draft after a short pause.
  Command-S saves immediately. Browser and disk recovery also preserve writing.
  None of these actions changes the live article.
- **Back up drafts:** synchronizes your drafts, media, and cover designs to the
  private GitHub repository. It checks online changes and presents conflicts for
  review. Nothing is published.
- **Publish…:** checks the current note, backs up the saved revision, and sends that
  exact revision to the publication workflow. Other drafts stay private. The result
  is reported after both Cloudflare Pages and GitHub Pages finish deploying.

The sidebar's **How saving works** control explains these states inside the editor.
The displayed Date is not a publication schedule.

## Comfortable editing

Write in the main text area; choose **Add content**, or type `/` in an empty paragraph,
for text, photographs, galleries, video, audio, tables, asides, expandable sections,
link cards, downloads, quotes, code, and image comparisons. Blocks can be collapsed,
duplicated, dragged, or moved using accessible arrow controls. Explanations in the
chooser are for the author and do not appear automatically in the article.

Right-click writing for undo, redo, cut, copy, paste, selection, and contextual
formatting. Menus support arrow keys, Home/End, Enter, and Escape. Use **Shift +
right-click** when you want the browser's own menu, including spelling suggestions.
Clipboard access remains subject to the browser's permission rules; Command-V is
always available as the native alternative.

Material Symbols are bundled as a small set of SVGs. They do not request an icon
font or contact Google at runtime. Settings use larger switches and connected labels.
Conditional controls appear only when they apply.

The preview uses the actual site renderer, keeps its reading position across edits,
and supports image opening, downloads, language links, and interactive components.
Desktop, Phone, and Watch select widths; they are layout checks rather than device
browser emulation. Empty drafts invite writing without showing a publication error.

## Note actions and Trash

Right-click a note in the sidebar, use its **…** button, or open the active note's
**…** menu:

- **Duplicate as draft** creates a new address, preserves the original, and forks
  cover designs so editing the copy cannot change the original design.
- **Discard local edits** restores the last private backup (or last committed
  version when no remote is configured). It is disabled when there is no backup or
  no local change. It does not restore the public revision or change the website.
  A local recovery copy of discarded writing remains in History. Cover sources are
  restored too; their discarded copies stay in `.notes-manager/discarded-designs/`.
- **Move to Trash** removes a draft from the library while retaining a recoverable
  local copy. Uploaded media is kept, protecting references from other notes.
- For a live note, deletion first withdraws the article. Only verified successful
  completion on both hosts allows the private original to enter Trash. Failed
  withdrawal, newer writing, or a changed cover design keeps the original safe.
- **Trash → Restore draft** restores privately, never republishes, and creates a
  separate draft if the original filename is occupied. Trash is local to this Mac;
  private Git history also retains previously backed-up content.

Local deletion reaches the private Git repository on the next backup. Public copies
already saved by visitors, feed readers, or caches cannot be recalled.

**History** keeps up to 50 local saved/recovered versions per note. Each editing
window has separate recovery. Saves check the opened file version, preventing silent
replacement of another window's changes. Existing article addresses, unknown
metadata, translations, and the one-off SAME experiment are preserved. Unsupported
rich HTML opens in source mode, and unedited HTML is retained exactly.

## Cover Studio and custom images

Settings → Images offers **Design a cover…** and **Design on-site image…**.
These open the integrated copy of your full OG Studio: palettes, backgrounds, logos,
text placement, fonts, canvas sizes, saved designs, import/export, and downloads.
Its original standalone project is unchanged.

The note's title and introduction seed a new design. **Use this cover** exports an
optimized WebP, requires an editable image description, and assigns it to the selected
image setting. Reopening that setting restores its own editable design. Sharing and
on-site designs remain separate. Existing **Choose or upload** controls remain
available for any image you prefer.

Editable design JSON lives in private `media/designs/`; its background/logo images
stay in the private media library. Notes retain design identifiers rather than large
embedded images. **Back up drafts** includes these sources. Only the explicitly
selected raster cover is published; the design files are not exported to the website.
OG Studio's additional named designs and favorite palettes remain browser features,
as in the standalone tool; settings can also be exported/imported.

## Privacy and development

Recovery, Trash, previews, session data, and certificates stay in ignored
`.notes-manager/`, outside the deployment directory. The launch cookie is Secure,
HttpOnly, and SameSite=Strict. Writes require the loopback host, the correct origin,
and a custom header. Private responses are uncached and excluded from indexing.
Sandboxed article media uses scoped random read capabilities. Trusted bundled OG
Studio shares the application origin and has a strict script-hash policy; arbitrary
external tools cannot be framed inside the manager.

Tiptap handles writing, CodeMirror handles code, and backend validation/rendering
reuse the site's Notes modules. The manager has its own field catalog and does not
require Pages CMS or its API. Licensing and source provenance are included under
`vendor/` and in `THIRD_PARTY_NOTICES.md`.

```sh
cd tools/notes-manager
npm ci
npm run build
npm test
npm run test:browser
```

Browser checks use a disposable synthetic repository and local Git remote; they
never publish or change real notes. They default to installed Google Chrome; set
`PYTHON` or `NOTES_BROWSER_CHANNEL` when needed. The Python checks, from the website
checkout, cover private content, concurrency, deletion ordering, verified TLS,
cover-source isolation, and publishing:

```sh
python3 tests/notes_manager_test.py
```
