# Notes manager · independent online trial

Trial address: **https://notes-manager.tgthms.workers.dev/** (owner-only GitHub sign-in).

This is a separate, unpublished workspace for testing a future migration. The Mac
manager remains the reliable editor for real notes. The trial does not import,
publish, overwrite, or synchronize the author's existing notes.

## What runs where

- Cloudflare Worker: owner authentication, routing, and application delivery.
- SQLite-backed Durable Object: private documents, optimistic revision IDs, the
  latest 50 saved versions, per-browser recovery, recoverable Trash, cover design
  JSON, and uploaded file chunks.
- The author's browser: the existing Tiptap editor, the full cover studio, and a
  dedicated Web Worker running the actual Python article renderer through Pyodide.
- GitHub/public website: unchanged. No GitHub write credential is installed in the
  trial, and publication and GitHub backup are disconnected.

The trial uses no Containers, R2, paid image service, AI API, or Pages CMS. It does
not enable a paid Cloudflare plan.

## Device handoff

There is one shared cloud draft, not a separately writable Mac checkout. After the
phone confirms **Saved in private test workspace**, another device opens that saved
revision. An already-open clean editor refreshes when it regains focus. Returning
to a dirty editor does not discard its writing: stale saves receive a comparison
and can be kept as a separate draft. Browser recovery belongs to the originating
session, so another active tab's recovery does not block a clean handoff.

This is sequential editing, not collaborative character-by-character editing.
Network failures retain browser recovery and show that the cloud save needs
attention; the interface must not claim an unacknowledged save succeeded.

## Preview and resource tradeoffs

The public renderer, sanitizer, templates, CSS, all 13 content formats, and the
one-off SAME component are reused. Python and Pillow run on the author's device,
not within a free Worker's CPU budget. Originals remain private and unchanged.
The browser's native image decoder converts preview copies to sRGB and applies
orientation, because the browser Pillow distribution has no LittleCMS support.

The pinned runtime is about 14.6 MB before transfer compression, downloaded once
per version and eligible for private browser caching. All code is self-hosted;
opening a draft does not load executable code from a third-party CDN. Pyodide
runs in a dedicated Worker so rendering does not block the editing thread.

This approach trades cloud compute for device memory, CPU, and initial startup.
The first local probe initialized the runtime in about 1.1 seconds on this Mac;
phone/Safari and large-image performance still need owner/device testing. Do not
interpret a Chrome desktop test as proof of performance on every phone.

The trial limits uploads to 20 MB per file, total uploaded bytes to 200 MB, and
documents to 1 MB. The SQLite backend deliberately uses chunks below SQLite's
individual value limits. Limits produce an error and retain existing data.
They are trial guardrails, not a promise about the final manager's storage limits.

## Security

The entire hostname requires the approved Cloudflare Access application. The
Worker independently verifies signature, issuer, audience, expiry, and the exact
owner email on every request, including media, runtime assets, and preview frames.
Missing configuration locks the service. Alternate origins are rejected, deployment
preview URLs are disabled, mutations check Origin and a custom header, and draft
responses are private/no-store. No credential belongs in this directory or the
browser bundle. Cloudflare/GitHub login does not grant repository write access.

The article iframe retains an opaque sandbox origin. Its separate restrictive CSP
permits only the repository-controlled inline renderer enhancements; author scripts
are removed by the same Python sanitizer used for publication. The editor itself
does not allow arbitrary inline scripts. Frame handshakes check source window and
an unpredictable per-preview ID.

## Not ready for cutover

Before retiring the Mac app or Pages CMS, finish and verify:

- Complete portable backup/export/import, including local History, recovery, Trash,
  editable cover sources, and the private Git publication records.
- Explicit publication/withdrawal through the existing exact-revision pipeline,
  with retry-safe operations and verified completion on both website hosts.
- Private GitHub backup and conflict handling with online changes.
- More complete metadata parity in the media library, cover discard,
  file range delivery, quotas, Safari/phone performance, and interrupted jobs.
- A separate migration rehearsal with an inventory/hash comparison and restore
  round trip. Real notes remain on the Mac until that is accepted.

## Build and checks

Install the existing manager's development dependencies and Wrangler 4.149.0.
The browser checks use the manager's Playwright package and installed Chrome.

```sh
python3 tools/notes-online/fetch-runtime.py --cache /tmp/notes-runtime
npm --prefix tools/notes-manager run build
python3 tools/notes-online/build.py --runtime /tmp/notes-runtime
node --test tools/notes-online/test/store.test.mjs
node --test tools/notes-online/test/worker.test.mjs
PYTHON=python3 node tools/notes-online/test/browser.mjs
wrangler deploy --config tools/notes-online/wrangler.jsonc --dry-run
```

The built `dist/` and development `.wrangler/` directories are ignored. The build
reads only application code and public renderer inputs. Synthetic tests cover
owner-only access, alternate identities, cross-origin requests, SQLite restart
survival, stale edits, Trash, media bytes, native/browser renderer structure, all
content blocks, private asset loading, and phone↔Mac handoff. No real draft is
published, removed, imported, or exposed by these checks.

Required deployed settings: `MANAGER_ORIGIN`, `ACCESS_TEAM_DOMAIN`,
`ACCESS_AUDIENCE`, and `OWNER_EMAIL`. The latter three are configured in Cloudflare,
not hardcoded with account-specific values in the public repository.

## Deployment record

The owner-approved Access application is **Notes manager**, application ID
`0370731b-7538-4344-bc68-79dd5f6e4418`. It uses the existing Owner only policy,
GitHub as its only selected login provider, and HTTP-only cookies scoped to the
application path. The existing private-preview application was retained.

Live Safari verification confirmed owner sign-in, a separate empty library, a
disposable Scratchpad autosave, reload persistence, and the on-device article
preview. Anonymous editor, API, runtime, preview-frame, studio, and media requests
were redirected to Access. No real notes were imported or publicly published.
