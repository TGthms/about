# Private Notes previews

This small Worker serves saved Notes previews separately from the public website. HTML and media require a verified Cloudflare Access JWT for the owner. There is no account code or additional dependency on the public site.

The private `preview.yml` workflow uploads with a short-lived GitHub Actions OIDC token, not a stored deployment credential. The Worker checks the exact repository, workflow, main branch, event, run ID, and attempt. Uploaded files expire from KV after three days. The downloadable private artifact remains available if browser preview fails.

## Initial configuration

1. Create a KV namespace and set the `PREVIEWS` binding in `wrangler.jsonc`.
2. Deploy the Worker. With empty Access settings, all upload/read requests return 503 and no private bytes can be uploaded.
3. Create a self-hosted Cloudflare Access application for `notes-preview.tgthms.workers.dev/preview`. Allow only the owner's email. The `/upload` endpoint remains outside this application and requires the GitHub workflow identity instead.
4. Set `ACCESS_TEAM_DOMAIN` to the team's `*.cloudflareaccess.com` hostname, `ACCESS_AUDIENCE` to the application's audience tag, and `OWNER_EMAIL` to the authorized owner. Keep personal values in a temporary deployment config or Worker secrets, outside this public repository. Deploy with those settings.
5. Verify that `/preview/` redirects to Access and rejects unauthenticated reads, including media. `/health` reports only whether the Worker settings are present. Then set the **private** repository variable `NOTES_PREVIEW_ORIGIN=https://notes-preview.tgthms.workers.dev`.

Do not upload drafts to public Pages preview URLs or enable a bypass policy for `/preview`. The Worker independently validates Access signatures and the owner's email even if an outer policy is accidentally changed. It also checks expiration itself; deleting a preview from KV is not the only expiration control.

The checked-in config intentionally omits personal identity settings. Initial deployment fails closed until they are configured. `keep_vars: true` preserves those existing private settings on subsequent deployments, so the ordinary checked-in deployment command does not remove the sign-in configuration.

## Verification

`node --test tests/notes-preview.test.cjs` checks owner-only access, JWT verification, upload scope, expiry, Traditional Chinese filenames, script hashes, audio/video ranges, and authenticated download attachments.

`python scripts/notes/preview_upload.py --directory PATH` runs only in the private preview workflow with GitHub-provided OIDC environment variables. It checks `/health` before transmitting preview bytes. Images, short videos, audio, and attached documents are extracted into deduplicated files for private browser previews; downloaded HTML previews remain self-contained and unchanged. PDF, ZIP, TXT, CSV, and JSON files are served as attachments. The same owner authentication, workflow identity, file-size limit, and expiry apply to every format.
