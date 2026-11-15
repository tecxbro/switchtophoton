# Inkbox source reference

Use this file only after repository evidence indicates Inkbox.

## Approved official documentation

- https://inkbox.ai/llms.txt
- https://inkbox.ai/docs/llms.txt
- https://inkbox.ai/docs/all.md
- Official per-page Markdown under `https://inkbox.ai/docs/**/*.md`
- https://github.com/inkbox-ai/inkbox (official SDK monorepo and changelog)

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary HTML doc pages, `console.inkbox.ai`, registry pages, and unofficial mirrors such as `inkboxs.co` are not approved sources.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `@inkbox/sdk`, `@inkbox/cli`, `inkbox` (PyPI), `inkbox` (Cargo), `Inkbox`, `verifyWebhook`, `verify_webhook`, or the `inkbox` CLI;
- API hosts `inkbox.ai` (`/api/v1/*`, `/mcp*`) and tunnel hosts `*.inkboxwire.com`;
- `X-API-Key` authentication with `ApiKey_…` keys and `INKBOX_API_KEY` environment variables;
- endpoint families `/api/v1/imessage/*`, `/api/v1/phone/*`, `/api/v1/mail/*`, `/api/v1/whatsapp/*`, `/api/v1/webhooks/subscriptions`, `/api/v1/identities`, `/api/v1/compliance`;
- `Idempotency-Key` and `Prefer: idempotency-replay` headers;
- webhook headers `X-Inkbox-Signature`, `X-Inkbox-Timestamp`, `X-Inkbox-Request-Id` and per-identity `whsec_…` signing keys;
- payload fields `agent_identity_id`, `conversation_id`, `assignment_id`, `remote_number`, `send_style`, `was_downgraded`, `group_creation_status`, `imessage_connection_expired`, event IDs `evt_…`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact locked package version from lockfiles or package metadata. SDK versions move in lockstep across npm, PyPI, and crates.io; iMessage itself debuted at SDK 0.4.7 and several fields are version-gated.
- There is no v1/v2 API split — everything is `/api/v1/*`. What varies is SDK minor version (feature gates) and API-key scope (admin, identity-scoped, or unclaimed agent-signup).
- Distinguish SDK, raw REST, CLI, MCP client configuration, tunnels, and packaged plugin boundaries.
- Do not infer the installed generation from current documentation; fields such as `reply_to_message_id`, `include_groups`, and directional contact rules do not exist in older SDKs.

## Capabilities to inventory

Check active use of:

- iMessage sends (`to` XOR `conversation_id`, `reply_to_message_id` with `plain_reply_fallback`, `send_style` effects, `media_urls`), message and thread history, media upload (`POST /media` ≤10 MiB), conversations, mark-read, and typing (1:1 only);
- shared router triage number, org-owned shared pool `connect`, dedicated line claim/attach (`imessage_number_id`), and assignments;
- groups (dedicated-line only, async creation, `include_groups` listing), participants, and detach/reassign semantics;
- reactions — outbound tapbacks plus `eyes`, `part_index` targeting, replace-on-resend, `DELETE /reactions/{id}` removal; inbound custom emoji arrive receive-only;
- SMS/MMS texts, voice calls, WhatsApp, email, Slack, A2A, vault, tunnels, contacts, hosted agents, and 10DLC compliance only when active code proves use;
- webhook subscriptions (`agent_identity_id` selector, `event_types`, `auth_token`), signature verification, `evt_…` deduplication, replay, and the 60-subscription cap;
- silent SMS/RCS downgrade (`service`, `was_downgraded`) and `check-messaging-capability`;
- delivery lifecycle webhooks (`imessage.sent/delivered/delivery_failed`, `text.*`, `message.*`, `whatsapp.*`) and per-recipient status fields.

Only proven capabilities belong in the plan.

## Migration traps

- No cold outreach on the shared service: sends require an active connection or dedicated line; structured error codes (`imessage_no_assignment`, `imessage_awaiting_inbound`, `imessage_assignment_inactive`, `imessage_connection_expired`) gate outbound.
- The router/triage number is dynamic and must be resolved at runtime.
- `to` and `conversation_id` are mutually exclusive; group `to` lists are 2–8 E.164; `conversation_id` is the canonical group key.
- Group creation is asynchronous (`group_creation_status`) and lists hide groups unless `include_groups=true`.
- iMessage traffic can silently downgrade to SMS/RCS; `was_downgraded` and `service` must be preserved or explicitly changed.
- Tapback semantics are specific: one live reaction per sender per message part, removals emit no webhook event, custom emoji are inbound-only.
- `POST /mark-read` sends a real iMessage read receipt as a side effect.
- Non-phone `remote_number` senders are receive-only; outbound actions return `422 recipient_not_e164`.
- `Idempotency-Key` replays the queued response, not delivery status; stable keys are required for cross-call deduplication.
- Webhook signing keys do not exist until the first subscription; `whsec_…`/`signing_key` is shown once; signatures cover `request_id.timestamp.body` — verify raw bytes.
- Webhook delivery is at-least-once and out-of-order; dedupe on the envelope `id`.
- The shared phone policy (`imessage_filter_mode` alias of `phone_filter_mode`) spans iMessage, SMS, calls, and WhatsApp; writes are admin-only.
- API-key scope changes behavior: `agent_identity_id` is ignored for identity-scoped keys and unclaimed signup keys are rejected by capability checks.
- Shared connections expire on inactivity; detaching preserves history but blocks sends; there is no customer-facing line-release endpoint.
- One webhook subscription can span `imessage.*`, `text.*`, `message.*`, `whatsapp.*`, `a2a.*`, and `slack.*` families — removing only the iMessage subscription can silently drop other channels.
- MCP is a first-class surface (`inkbox.ai/mcp*`); detect MCP client configuration, not just REST/SDK usage.
- **Channel disposition is mandatory for Inkbox.** It multiplexes email, SMS/MMS, iMessage, voice calls, WhatsApp, A2A, contacts, tunnels, and hosted agents behind one boundary. Produce a per-channel disposition before target selection: Keiki has no contacts CRM, no mailbox/transcript browsing, no raw voice/media API (Keiki calls are hosted agent voice turns), and A2A is inbound-only — a legitimate outcome is a split-provider plan retaining Inkbox for voice/A2A/contacts while messaging moves to Keiki.
- **Turn-window mismatch:** Inkbox supports unbounded agent loops and proactive sends; Keiki turns cap at ~10 minutes and outbound is turn-scoped. Long-running turns need mid-turn continuation or re-dispatch design.
- Current Inkbox features not used by the repository are out of scope.
