# Online Notes manager: migration design

Status: design, not a deployed service. Updated November 2, 2026.

## Decisions

- The online manager must work while the Mac is off.
- Sign in through GitHub using Cloudflare Access, restricted to the owner.
- Prioritize Cloudflare's free plan. Do not enable a paid plan automatically.
- Preserve the current editing experience, including cover design and live preview.
- The online manager can become the sole editor after parity and recovery checks.
  Retain a complete downloadable backup before retiring either older editor.

## Proposed architecture

Use the existing bundled browser editor behind an authenticated Worker. Store note
revisions, metadata, Trash, and pending operations in a SQLite-backed Durable Object.
Store immutable uploads and cover design files in a private R2 bucket. Keep the
private GitHub repository as an independent backup and the input to the existing
publication pipeline. The public website remains static.

Do not expose the current localhost server through a tunnel: that would still
depend on the Mac. Do not copy it directly into a Python Worker: the current server
depends on a persistent filesystem, Git subprocesses, locks, and a Python image
pipeline. A Worker's temporary filesystem is not durable storage.

Containers could reuse more Python, but require the Workers Paid plan and still
need durable storage. They are not the preferred route under the free-plan choice.

### Authentication and private assets

- Validate Access JWT signature, issuer, audience, expiry, and the exact authorized
  owner on every API and media request. A successful GitHub login alone is not an
  authorization policy. Reject requests if authentication configuration is absent.
- Apply authentication to the entire manager hostname, including asset and preview
  routes. Check alternate workers.dev and deployment preview routes for bypasses.
- Keep the R2 bucket private; no public r2.dev endpoint. Serve draft assets only
  through authenticated routes. Preview URLs are not public sharing capabilities.
- Use secure sessions, same-origin mutation checks, CSP, and no-store responses.
  Never place GitHub credentials in the browser, preview HTML, logs, or backups.
- Use a narrowly scoped GitHub App installation for repository backup and workflow
  dispatch. Keep authentication for signing in separate from repository permissions.

### Saving and conflicts

- Acknowledged autosaves must survive Worker restarts and device changes.
- Save revisions transactionally with expected revision IDs. If another device has
  saved a newer revision, show both versions and offer a recoverable new draft.
  Never silently overwrite one device's writing with another's.
- Upload blobs first, then commit their references. Do not acknowledge uploads or
  cover export until durable storage succeeds. Cleanup must consider all retained
  revisions and Trash, not just the current document.
- Preserve unknown metadata, all translations, unsupported source HTML, reusable
  blocks, the one-off SAME study, aliases, release pins, and Birthday clocks.
- Keep browser recovery for interrupted connections. Show distinct states for
  browser recovery, cloud autosave, GitHub backup, and public deployment.
- Coordinate backup, publication, restore, and withdrawal with durable job IDs and
  retry-safe steps. A lost HTTP response must not publish twice or restart clocks.

### Preview and publishing

The free-plan backend needs an adapted preview renderer. This is the main parity
risk: it cannot quietly become an approximation with missing blocks or typography.
Reuse public templates, CSS, scripts, sanitization rules, and field conventions;
compare output against the existing Python renderer using real and synthetic posts.
Keep previews isolated from the manager and all draft media authenticated.

Immediate previews should not wait for a GitHub Actions run after every keystroke.
The existing Python build remains the final publication validation boundary.
Publishing still exports exactly the selected saved revision and referenced media,
then verifies Cloudflare Pages and GitHub Pages. Other drafts remain private.

Birthday labels use the viewer's local time. Author previews format the label but
do not delete the draft being reviewed when its public availability has ended.

### Backup and retirement

- Import from a complete local backup into a separate cloud test workspace first.
- Inventory counts and hashes for notes, revisions, media, designs, Trash, and
  publication records before and after import. A Git clone alone is insufficient:
  the current local History, recovery, and Trash live outside the private repo.
- Provide an export that can be restored without the hosted service. Keep the
  existing ZIP importer available during migration; version any new backup format.
- Test a full export/import round trip and restoration into a separate workspace.
  Preserve the choice to restore in place only after an automatic safety backup.
- Choose one authoritative online workspace at cutover. Keep the Mac workspace as
  an archived backup rather than two independently writable sources of truth.
- Retire Pages CMS access and the local launcher only after owner acceptance.
  Do not delete the private GitHub repository or remove its publication workflows.

## Acceptance checks before becoming the sole editor

1. Owner can sign in on phone and desktop; other identities and unauthenticated
   API, preview, and media requests fail closed.
2. Two devices editing the same note cannot lose each other's changes.
3. Autosaves, uploads, Trash, History, and covers survive a cold restart.
4. All 13 content blocks, translations, fonts, code, comparison images, the SAME
   study, and dark/light previews match the public rendering behavior.
5. Save and backup never publish. Repeated publish/withdraw requests are safe.
   Both deployment outcomes remain visible after closing and reopening the editor.
6. Complete backup restoration recovers local-only history and assets as well as
   Git-backed drafts. An interrupted import leaves the active workspace intact.
7. Upload, storage, CPU, and operation limits are measured against the free tiers.
   Reaching a limit produces an actionable message and retains unsaved recovery;
   no paid upgrade or usage-cost promise is implicit in this design.

## Documentation consulted

- [Access with GitHub](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/)
- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Python Worker filesystem](https://developers.cloudflare.com/workers/languages/python/stdlib/)
- [Durable Objects pricing and free-plan support](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [R2 public access defaults](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Container pricing](https://developers.cloudflare.com/containers/platform/pricing/)
