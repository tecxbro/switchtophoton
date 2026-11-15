# Provider-boundary extraction

This directory is an extraction of the **ZeroSettle provider boundary** from
`zerosettle-ghl` — a Cloudflare Worker that relays GoHighLevel (GHL) workflow
webhooks into ZeroSettle's iMessage API.

Everything copied verbatim except added `[GHL-BOUNDARY]` marker comments.

## ZeroSettle boundary (the provider side)

| File | Role |
| --- | --- |
| `src/lib.js` | `sendToZeroSettle()` POSTs to `portal.zerosettle.io/api/imessage/send`; `alreadyMessaged()` GETs `/api/imessage/messages` history; `e164()`, `phoneKey()`, `classify`-support helpers. Pure ZeroSettle calls. |
| `src/queue.js` | `LeadQueue` Durable Object: waitlist, drain order, retry logic, and `classify()` which maps ZeroSettle `error.code`s (`new_contact_limit`, `line_busy`, ...) to sent/limit/config/failed/retry. |
| `src/time.js` | `localHour()` timezone helper (used by the waitlist hold window). |
| `src/index.js` | `fetch` handler + `scheduled` cron. **This is the boundary itself**: inbound = GHL webhooks, outbound = ZeroSettle via lib/queue. |
| `wrangler.toml` | Worker config: `LEAD_QUEUE` DO binding, hourly cron, `ZEROSETTLE_LINE_ID` vars. |
| `test/` | Miniflare tests simulating ZeroSettle (send + history) end to end. |

## GoHighLevel boundary (marked `[GHL-BOUNDARY]`)

| Location | What it does |
| --- | --- |
| `src/ghl.js` | **Entire file.** `updateTags()` writes waitlist status tags onto GHL contacts via `services.leadconnectorhq.com`. Needs `GHL_API_KEY`. |
| `src/index.js` | `fetch` handler receives GHL webhook payloads; `x-relay-secret` auth is the GHL→worker contract. |
| `src/lib.js` | `readLead()` / `readTags()` parse the GHL payload shape (`customData`, `contact_id`, `tags`). |
| `src/queue.js` | `import { updateTags }` + all `updateTags()` call sites; `#tier()` reads GHL tags for queue priority (`CREATOR_TAG`). |
| `wrangler.toml` | `CREATOR_TAG`, `TAG_PREFIX` vars; `GHL_API_KEY` secret (optional — waitlist works without it, just no tags). |
| `test/helpers.js` | `ghl()` payload builder, `tagCalls()` helper, `GHL_API_KEY`/`CREATOR_TAG`/`TAG_PREFIX` bindings, non-ZeroSettle outbound stub. |
| `test/*.test.js` | All requests are `ghl()` webhook payloads; `tagCalls()` assertions cover GHL writes. |
| `README.md` | "GoHighLevel setup" section and tag/tier documentation. |

## To keep only the ZeroSettle side

1. Delete `src/ghl.js` and every `updateTags()` call in `src/queue.js`
   (lines calling `updateTags(this.env, ...)`) plus its import.
2. In `src/lib.js`, replace `readLead()`'s GHL-payload parsing with whatever
   inbound shape the new caller uses; keep `sendToZeroSettle`,
   `alreadyMessaged`, `e164`, `phoneKey`, `zeroSettleResponse`.
3. In `src/queue.js`, `#tier()` depends on GHL tags — replace with a fixed
   priority or drop tiers.
4. Drop `GHL_API_KEY`, `CREATOR_TAG`, `TAG_PREFIX` from env/wrangler.toml.
5. `classify()` in `src/queue.js` (ZeroSettle `error.code` → outcome) is the
   core provider-boundary logic and needs no GHL anything.
