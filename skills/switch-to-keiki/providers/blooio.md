# Blooio source reference

Use this file only after repository evidence indicates Blooio.

## Approved official documentation

- https://blooio.com/llms.txt
- https://blooio.com/llms-full.txt
- https://blooio.com/integrations/api.md
- https://docs.blooio.com/llms.txt
- https://docs.blooio.com/llms-full.txt
- Official per-page Markdown under `https://docs.blooio.com/**/*.md`

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary HTML documentation pages and the `api.blooio.com` OpenAPI `.json` file are not approved linked sources.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `@blooio/sdk` (official v4 SDK), `eve-channel-blooio`, `n8n-nodes-blooio`, or unofficial `imessage-sdk`/`@imessage-sdk/blooio` adapters;
- API hosts `api.blooio.com` (canonical), `backend.blooio.com`, `mcp.blooio.com`;
- `/v2`, `/v3`, or `/v4` endpoint paths — v2 is the iMessage automation REST generation, v4 (`4.0.0-beta`) is the current multi-channel API covering iMessage, SMS, RCS, WhatsApp, and Apple Messages for Business; v3 was the enterprise tier rolling into v4;
- bearer authentication (`Authorization: Bearer bl_live_…`) and `BLOOIO_API_KEY` environment variables;
- webhook header `x-blooio-signature` with `BLOOIO_WEBHOOK_SECRET` and `Idempotency-Key` send headers;
- webhook events such as `message.received` and SDK calls such as `blooio.chats.sendMessage`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact locked package version from lockfiles or package metadata. The official `@blooio/sdk` targets v4 and its publish cadence is stale — do not assume it matches the installed integration's generation.
- Distinguish v2 iMessage REST, v3 enterprise, v4 multi-channel, MCP (`mcp.blooio.com`), and unofficial community adapters.
- Report `/v3` paths separately rather than forcing them into v2 or v4.
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
