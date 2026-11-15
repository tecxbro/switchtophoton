# Blooio source reference

Use this file only after repository evidence indicates Blooio.

## Approved official documentation

- https://blooio.com/llms.txt
- https://blooio.com/llms-full.txt
- https://blooio.com/integrations/api.md
- https://docs.blooio.com/llms.txt
- https://docs.blooio.com/llms-full.txt
- https://docs.blooio.com/openapi.v4.json — the provider's published v4 OpenAPI contract of record (permitted under the index policy's official-OpenAPI exception)
- https://api.blooio.com/v4/openapi.json — the host-served v4 OpenAPI document cited by first-party integrations (e.g. `eve-channel-blooio`); when the two URLs disagree, prefer the host-served contract and record the discrepancy
- Official per-page Markdown under `https://docs.blooio.com/**/*.md`

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary HTML documentation pages are not approved linked sources.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `@blooio/sdk` (official v4 SDK), `eve-channel-blooio`, `n8n-nodes-blooio`, or unofficial `imessage-sdk`/`@imessage-sdk/blooio` adapters;
- API hosts `api.blooio.com` (canonical), `backend.blooio.com`, `mcp.blooio.com`;
- `/v2`, `/v3`, or `/v4` endpoint paths — v2 is the iMessage automation REST generation, v4 (`4.0.0-beta`) is the current multi-channel API covering iMessage, SMS, RCS, WhatsApp, and Apple Messages for Business; v3 was the enterprise tier rolling into v4;
- bearer authentication (`Authorization: Bearer bl_live_…`) and `BLOOIO_API_KEY` environment variables;
- webhook header `x-blooio-signature` with `BLOOIO_WEBHOOK_SECRET` and `Idempotency-Key` send headers;
- webhook events such as `message.received` and SDK calls such as `blooio.chats.sendMessage`;
- **implementer/façade fingerprints** — when the repository *is* a Blooio API server or MCP wrapper rather than a consumer: compiled `operations.json`/`tools.js` generated from the OpenAPI spec, `UPSTREAM_BASE_URL`/`api.blooio.com` proxy routes, `server.json`/`mcp.blooio.com` self-identification, OAuth-authorization-server code delegating to Blooio OAuth, `bl_live_`/`bmcp_` token minting, `blooio://` resource URIs, `x-blooio-proxy` headers;
- `/v3` paths that are only 308 legacy redirects to `/v4` are not a second generation — distinguish real v3 usage from redirect shims.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact locked package version from lockfiles or package metadata. The official `@blooio/sdk` targets v4 and its publish cadence is stale — do not assume it matches the installed integration's generation.
- Distinguish v2 iMessage REST, v3 enterprise, v4 multi-channel, MCP (`mcp.blooio.com`), and unofficial community adapters.
- Report `/v3` paths separately rather than forcing them into v2 or v4 — but `/v3` paths that are only 308 redirects to `/v4` are legacy shims, not a second generation (see fingerprints above).
- If an exact generation cannot be proven, report `Unknown generation` or `Mixed generations` and the appropriate confidence. Low confidence is a planning blocker.

## Capabilities to inventory

Inventory proven use of:

- iMessage, SMS, RCS, WhatsApp, or Apple Messages for Business channel routing;
- explicit sender or channel selection;
- chat, channel, message, participant, and event identifiers;
- idempotency, retries, ordering, deduplication, and delivery state;
- history, status, attachments, multipart content, polls, effects, replies, reactions, and groups;
- contact or capability APIs;
- webhooks, signature verification, acknowledgement, and lifecycle.

Only proven capabilities belong in the plan.

## Migration traps

- A unified multi-channel integration may use Blooio for more than iMessage. Do not replace it with an iMessage-only Keiki target unless the approved plan preserves or explicitly excludes every other active channel.
- Blooio is now an official Apple Messages for Business MSP; current positioning is multi-channel, not iMessage-only.
- Webhook signatures use `x-blooio-signature` keyed by `BLOOIO_WEBHOOK_SECRET`; verify raw bytes.
- Do not claim exact parity from unsupported fingerprints, unofficial adapters, or current assumptions.
