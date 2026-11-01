# Notes · Local workspace

A private Mac-first editor for this site's Notes. The writing page and live article
preview sit side by side. All editing tools run locally. Visitors receive the same
static website; no editor library is added to `public/`.

## Open it

Double-click **Open Notes.command** in this folder, or run from the website checkout:

```sh
python3 tools/notes-manager/server.py
```

The launcher uses Python 3 and Pillow. If Pillow is missing, it creates an isolated
Python environment in the ignored `.notes-manager/` folder and installs the pinned
Notes requirements. The browser editor is already bundled: Node is needed only to
develop or rebuild it, not for daily writing. Publishing and private synchronization
also need Git and the GitHub CLI, signed in to the account with access to
`TGthms/about-notes`. No GitHub token is placed in the browser or manager files.

The default content checkout is `.private-notes/`. Use `--content PATH` for a
different checkout, `--port NUMBER` for a different local port, or `--no-open` to
print the private launch link without opening a browser. Keep the terminal running;
Control-C stops the manager. Opening the launcher again returns to the running
workspace. The editor binds only to `127.0.0.1`.

## Daily flow

1. Choose a note, or **New note**. Write in the main text area. Select text to format
   it, use keyboard shortcuts, or type `/` in an empty paragraph to find a content
   format. **Add content** offers all 13 reusable formats with short explanations.
2. Writing is recovered automatically in this browser and on disk. After a short
   typing pause it is saved to the local private content file. **Save locally** and
   Command-S save immediately. Missing descriptions and incomplete blocks can be
   saved as drafts; preview and publication checks explain what still needs work.
3. The preview uses the site's actual renderer and styles. It updates after a typing
   pause; image processing is cached. Desktop, Phone, and Watch select preview widths;
   they are layout checks, not emulations of those devices' browser engines.
4. Use **Settings** for categories, fonts, original language, sharing/on-site images,
   homepage featuring, and Birthday behavior. Conditional options appear only when
   relevant. The language selector switches between the original and optional
   translations. Each translation has its own inclusion switch in Settings.
5. **Sync privately** commits local note/upload changes and synchronizes the private
   repository. It never releases a post. If a note changed in both places, review
   the two versions and choose Local, Online, or Keep both. The histories remain
   available. Unrelated repository settings edits must be resolved separately.
6. **Publish…** asks for confirmation, checks the saved content, syncs it privately,
   then sends that exact saved revision to the existing publication workflow.
   Other drafts stay private. Its result is reported only when the workflow has
   finished waiting for both Cloudflare Pages and GitHub Pages. If the run URL is
   unavailable, the editor links to Actions and asks you to verify there.
7. **Withdraw from website** in Settings removes a live article through that same
   workflow while retaining the private original and release history. Saving or
   turning an editing flag off never silently withdraws an article.

You can continue writing while offline. Synchronization and publication need the
internet. Browser recovery cannot replace a backup of your Mac. Local saves,
private Git synchronization, and public publication are separate states.

## Recovery and preservation

- Existing JSON, unknown metadata, translations, immutable article addresses, and
  the original article-specific SAME experiment are retained. Posts need no migration
  to a proprietary editor document format.
- Unedited rich text is saved exactly as loaded. Rich text containing unsupported
  HTML opens in source mode rather than being silently simplified. New visual text
  can be added in a separate Text block. Published HTML remains sanitized by the
  shared renderer.
- Each local save checks the version you opened. A second window or external edit
  cannot be overwritten silently. Conflicting writing remains in recovery and can
  be made into a separate draft.
- **History** shows up to 50 local saved/recovered versions per note, retained outside
  the content repository. Restoring one changes a private draft, not the live article.
- New uploads use unique names. Media is never deleted automatically. Only referenced
  files from explicitly released revisions reach the public website.
- The manager does not require Pages CMS, its API, or its configuration to run. It
  continues using compatible Notes files and the established publication workflows.
  The existing online editor can remain available during the transition without
  becoming a dependency of the local application.

Recovery, backups, preview caches, and workflow status live in ignored
`.notes-manager/`, outside both the private repository and the deployment directory.
The launch cookie is HttpOnly and SameSite=Strict. Requests require the loopback
host, same origin, and a custom mutation header. Drafts and preview assets are
authenticated, uncached, and excluded from indexing. Sandboxed media uses random
per-preview read capabilities scoped to that preview's files, with download and
audio/video range support. Preview scripts are restricted
to hashes of the repository's trusted components, inside a sandboxed iframe.

## Development

The UI uses Tiptap for writing and CodeMirror for code snippets, bundled locally
with esbuild. Code blocks have line numbers, syntax coloring for common languages,
search, and their own undo history. Dependencies
are pinned in `package-lock.json`; no editor CDN or paid service is required.
`schema.json` is the local manager's field catalog. It shares Notes' established file
format, but has no runtime dependency on `.pages.yml` or PyYAML. Backend validation
and article rendering reuse `scripts/notes/authoring.py` and `build.py`.

```sh
cd tools/notes-manager
npm ci
npm run build
npm test
```

From the website checkout, run the privacy, concurrency, upload, release-pinning,
and isolated Git synchronization checks:

```sh
python3 tests/notes_manager_test.py
```

The end-to-end browser check uses a synthetic private repository and disposable
local Git remote. It never opens the real content checkout or dispatches publication:

```sh
cd tools/notes-manager
npm run test:browser
```

This defaults to installed Google Chrome. Set `PYTHON` to a Python with Pillow and
`NOTES_BROWSER_CHANNEL` to a supported installed Playwright channel if needed.
Browser screenshots are written to the system temporary directory.
