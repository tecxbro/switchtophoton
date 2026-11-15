# Chert source reference

Use this file only after repository evidence indicates Chert.

Chert operates two separate APIs with different hosts, credentials, and contracts. Detect which one the repository uses before planning.

## Approved official documentation

- https://docs.trychert.com/llms.txt
- https://docs.trychert.com/llms-full.txt
- Per-page official Markdown under `https://docs.trychert.com/*.md` (Mintlify convention)

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Do not open ordinary Chert HTML documentation as a substitute. No OpenAPI document is published; the API is documented as prose pages.

## Detection fingerprints

### Messaging API (iMessage)

- packages or imports such as `@trychert/sdk` — including its subpath imports `@trychert/sdk/imessage` and `@trychert/sdk/facetime` (there is no standalone `@trychert/facetime` package) — `chert-sdk` (PyPI), Rust `chert-sdk`, Go `chert`, or the `chert`/`chert-sdk` binaries;
- host `console.trychert.com` with `/api/v1` paths (`/send`, `/chats`, `/messages`, `/attachments`, `/voice-notes`, `/locations`, `/phone-numbers`, `/webhook-subscriptions`, `/events`, `/dev-inbox`, `/whoami`);
- authentication via `Authorization: Bearer <signing_secret>` or `x-chert-signature: v1,<unix_seconds>,<hmac_hex>` HMAC headers;
- `x-chert-tenant` tenant header for multi-tenant or signature-authenticated calls;
- environment variables `CHERT_SIGNING_SECRET`, `CHERT_API_KEY`, `TENANT_SLUG`/`TENANT`;
- webhook headers `X-Webhook-Event`, `X-Webhook-Event-Id`, `X-Webhook-Timestamp`, `X-Webhook-Subscription-Id`, `X-Webhook-Signature`, `x-chert-signature`;
- payload fields `phone_line_id`, `voice_note_id`, `chat_id`, `message_id`, `parts[]`, `event_id` (`chert:msg:…`), `webhook_version`, `partner_id`, `crm_deep_link`, `lead_id`, `convo_id`, `external_id`.

### FaceTime API

- host `facetime.trychert.com` with `/api/v1/calls` and `/api/v1/lines` paths;
- `Authorization: Bearer ftk_…` project keys, `X-Chert-Project-Id` header, `Idempotency-Key` header;
- environment variables `CHERT_FACETIME_TOKEN`, `CHERT_PROJECT_ID`;
- webhook events `call.incoming`, `call.started`, `call.ended`, `call.failed`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact locked package version from lockfiles or package metadata. SDKs are thin typed wrappers over the same `/api/v1` REST contract; report the exact installed version and whether the integration uses SDK or raw REST.
- The Messaging API has a single `/api/v1` generation with date-stamped `webhook_version` values on event envelopes; the FaceTime API is a separate contract — never mix their credentials or endpoints.
- Distinguish Messaging API, FaceTime API, packaged integrations (Salesforce managed package, HubSpot app, Slack apps), CLI-managed lines, and mixed use.
- Do not infer the installed generation from current documentation; SDK and docs versions move quickly.

## Capabilities to inventory

Check active use of:

- 1:1 and group sends, group creation (2–31 recipients), follow-up sends, message history (`GET /chats/{id}/messages`), and first-message constraints;
- voice notes (2-step stage-then-send, line-locked), locations, media attachments (presigned `attachment_id` upload), and rich links;
- reactions (`love`, `like`, `dislike`, `laugh`, `emphasize`, `question`), message edits (15-minute window), mark-read, and typing;
- group participant add/remove and line-pinned group operations;
- webhook subscriptions, event replay, SSE `/events/stream`, and `/dev-inbox` store-only mode;
- sender-line selection via `phone_line_id`, per-line `capabilities[]` gating, and `GET /phone-numbers`;
- delivery status lookup, error codes, rate limits (`retry_after`), and idempotency-key saved-result semantics;
- FaceTime calls only when active code proves use — it is a separate product boundary.

Only proven capabilities belong in the plan.

## Migration traps

- Two APIs, two auth schemes: Messaging `signing_secret` bearer/HMAC is unrelated to FaceTime `ftk_` keys and `X-Chert-Project-Id`.
- `/chats/{id}/*` routes take `chat_id`; `/messages/{id}/*` routes take `message_id`; legacy `convo_id` must not be used in chat routes.
- The `/locations` `chat_id` field is an internal delivery chat id, not the public chat UUID.
- HMAC signs raw body bytes; GET requests sign `ts.` with a trailing dot; the 5-minute replay window applies; signature auth takes precedence over bearer.
- Webhook delivery secrets are per-subscription and differ from the API signing secret; documentation contains a signature-input inconsistency that must be verified against a live delivery.
- `/send` uses a different flat error envelope than all other routes and carries no `trace_id`.
- Idempotency is saved-result semantics, not deduplication; `4103 delivery_unknown` must never be auto-retried.
- Voice notes are line-locked and exclusive; group operations and several features are gated per line — check `capabilities[]` before assuming support.
- Inbound media arrives as `in_` attachment IDs fetched through authenticated content routes; there is no voice-memo transcript.
- Effects are whitelisted per line; unknown effects return the allowed list.
- SSE streaming has no auto-reconnect; the application owns cursor recovery.
- CRM-coupled fields (`lead_id`, `external_id`, `crm_deep_link`) tie sends to Chert's lead model.
- Current Chert features not used by the repository are out of scope.
