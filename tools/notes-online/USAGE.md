# Cloudflare usage assessment

November 2, 2026. These are planning measurements, not account billing telemetry.

## What actually costs resources

The Mac manager's writing and article previews run on the Mac. They do not consume
Cloudflare Worker CPU. Publishing still uses GitHub Actions and the public hosts.
The earlier $5/month figure was the minimum Workers Paid plan for Containers, not
an estimate that this small personal workspace would generate a $5 usage bill.

The expensive existing operations are image decoding/color conversion, four WebP
sizes, social-image generation, full HTML previews, and complete Git/ZIP backups.
The text editor, formatting, and cover studio already run in the browser.

The read-only inventory found approximately 6.3 MB of uploads, across ten media
files, and approximately 26 KB of note JSON. Preview outputs for the audit were
written only to a disposable temporary directory.

| Native Mac preview measurement | CPU time |
| --- | ---: |
| First render of the three current notes | 342–1,993 ms |
| Subsequent renders with image cache | 22–69 ms |

These are native Mac process measurements, not Workers benchmarks. They show why
moving the existing rendering pipeline unchanged is not a sound free-Worker plan;
they do not prove that a redesigned JavaScript API would exceed its budget.

## Free-tier dimensions

| Service | Relevant published limit/allowance | Trial choice |
| --- | --- | --- |
| Workers | 100,000 requests/day; 10 ms CPU per ordinary HTTP request; 128 MB per isolate | Lightweight authenticated API and delivery |
| SQLite Durable Objects | 100,000 requests/day; 100,000 rows written/day; 1 GB per object on Free | Transactional drafts and bounded trial uploads |
| Workers KV | 1,000 writes/day, one write/second to the same key | Not used for autosave |
| R2 Standard | 10 GB-month storage; one million Class A and ten million Class B operations/month included | Not provisioned for this trial |
| Containers | Requires Workers Paid, minimum $5/month plus applicable usage | Not used |

Durable Objects have their own compute/storage limits; the ordinary Worker's 10 ms
HTTP limit must not be presented as a blanket limit for every Durable Object
operation. R2's included allowance is not a universal account spending cap. Other
applications in the account can share quotas, so normal usage must be monitored
after deployment rather than inferred solely from this manager's estimates.

## Why on-device preview helps

The trial makes no server-side preview job or preview-poll requests. It sends private
saves/recovery to SQLite, then the browser renders the real article locally. A
changed preview needs a small authenticated frame response, but does not encode
images or execute Python in Cloudflare. Cached private media is reused while typing.
The runtime is fetched once per version rather than once per note or keystroke.

As a deliberately busy model, one isolated edit every three seconds for two hours
is 2,400 updates. At one recovery, one save, one library refresh, and one preview
frame response per update, that is about 9,600 Worker requests plus initial loading
and uploads. This is a model, not observed traffic or a guarantee: debounce behavior,
errors, retries, other account apps, media choices, and multiple devices change it.
SQLite row writes also include indexes, history pruning, and recovery updates.

The current collection fits well within storage limits. High-resolution images,
long videos, retained history, and repeated whole-workspace backups are what could
grow storage and device memory. Keeping the Mac version during the trial avoids
making daily editing depend on an unmeasured free-plan implementation.

## Official references

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/)
- [Pyodide packages](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)
