# Chert source reference

Use this file only after repository evidence indicates Chert.

Chert operates **three distinct API surfaces plus a CLI/agent-bridge model**, with different hosts, credentials, and contracts. Detect which surfaces the repository uses before planning — real integrations commonly mix them, and the same `ftk_` project key can authenticate both the Shared and FaceTime hosts.

## Approved official documentation

- https://docs.trychert.com/llms.txt
- https://docs.trychert.com/llms-full.txt
- Per-page official Markdown under `https://docs.trychert.com/*.md` (Mintlify convention)
- `chert`/`chert-sdk` CLI `context` output and `chert-sdk` skill docs when the CLI surface is in use

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Do not open ordinary Chert HTML documentation as a substitute. No OpenAPI document is published; the API is documented as prose pages. The `app.trychert.com` Shared API and the `chert dev` LiveKit bridge are **undocumented or thinly documented** — repository wire evidence is the contract of record for them; mark doc gaps in the plan.

## Detection fingerprints

### Messaging API (iMessage) — `console.trychert.com`

- packages or imports such as `@trychert/sdk` — including its subpath imports `@trychert/sdk/imessage` and `@trychert/sdk/facetime` — `chert-sdk` (PyPI `chert-sdk`, import namespace `trychert`), Rust `chert-sdk`, Go `chert`, or the `chert`/`chert-sdk` binaries;
- host `console.trychert.com` with `/api/v1` paths (`/send`, `/chats`, `/messages`, `/attachments`, `/voice-notes`, `/locations`, `/phone-numbers`, `/webhook-subscriptions`, `/events`, `/events/stream` (SSE), `/dev-inbox`, `/whoami`);
- authentication via `Authorization: Bearer <signing_secret>` or `x-chert-signature: v1,<unix_seconds>,<hmac_hex>` HMAC headers;
- `x-chert-tenant` tenant header for multi-tenant or signature-authenticated calls;
- environment variables `CHERT_SIGNING_SECRET`, `CHERT_MSG_TOKEN`, `CHERT_FROM`, `CHERT_WEBHOOK_SECRET`, `CHERT_TENANT`, `TENANT_SLUG`/`TENANT` (`CHERT_API_KEY` appears in the wild on this surface too — do not assume it means the Shared API);
- webhook headers `X-Webhook-Event`, `X-Webhook-Event-Id`, `X-Webhook-Timestamp`, `X-Webhook-Subscription-Id`, `X-Webhook-Signature`, `x-chert-signature`;
- payload fields `phone_line_id`, `voice_note_id`, `chat_id`, `message_id`, `parts[]` (typed parts incl. `rich_link`), `event_id` (`chert:msg:…`), `id` (dual dedup keys — determine which the repo uses), `webhook_version`, `partner_id`, `crm_deep_link`, `lead_id`, `convo_id`, `external_id`;
- **webhook envelope nesting**: events arrive as `data.message` / `data.chat` / `data.reaction` objects with `direction`, `sender_handle.handle`, `chat.is_group`, and typed `parts[]` — inventory the nested shapes, not just top-level fields;
- SSE `/events/stream?since=` contract: `event: close` frames, `reconnect_with_since` cursor semantics, ~60-second server-side close requiring client reconnect, and `event_id`-based dedupe when SSE and webhook run concurrently.

### Shared / trial project API — `app.trychert.com`

A distinct surface used by trial/shared-line integrations; **largely undocumented** — treat repo wire evidence as authoritative:

- host `app.trychert.com` with `/api/v1/shared-messages` and `/api/v1/lines` paths;
- authentication `Authorization: Bearer ftk_…` project key + `X-Chert-Project-Id` header + `Idempotency-Key` on writes — **the same `ftk_` credential family as the FaceTime API**;
- environment variables `CHERT_API_KEY`, `CHERT_PROJECT_ID`, `CHERT_LINE_ID` (also `CHERT_API_BASE`, `CHERT_FACETIME_API` overrides in the wild);
- inbound is typically **polling** (`GET /shared-messages`, newest-N) rather than webhooks — no messaging tenant or webhook secret is required on this surface;
- response rows carry `id`, `line_id`, `direction`, `state`, `masked_recipient`, `created_at`, `text` — `masked_recipient` means recipient identity is partially masked; record that as an identifier-fidelity constraint.

### FaceTime API — `facetime.trychert.com`

- host `facetime.trychert.com` with `/api/v1/calls` and `/api/v1/lines` paths;
- `Authorization: Bearer ftk_…` project keys, `X-Chert-Project-Id` header, `Idempotency-Key` header;
- call lifecycle: `POST /calls` create, `GET /calls/{id}`, `GET /calls/{id}/events` (poll for `bridge_ready`/`call.ended`/`call.failed`), `POST /calls/{id}/end`;
- `mode:"customer_managed"` payload fields: `livekit_url`, `participant_token`, `remote_participant_identity`, `line_id`, `destination_type`;
- environment variables `CHERT_FACETIME_TOKEN`, `CHERT_PROJECT_ID`, `CHERT_API_KEY`, `CHERT_LINE_ID`, `CHERT_DESTINATION_PHONE`, `CHERT_AGENT_NAME`;
- webhook events `call.incoming`, `call.started`, `call.ended`, `call.failed`;
- **`facetime://` deep links and line-address configuration** count as FaceTime surface usage even when no `/calls` API call exists — a stored `facetime://` link or assigned line number is provider-bound state that breaks on line churn;
- standalone package `@trychert/facetime` exists in beta (`0.1.0-beta.x`) alongside the `@trychert/sdk/facetime` subpath — do not claim it does not exist.

### `chert` CLI + LiveKit agent bridge (agent-side surface)

A fourth integration model observed across multiple repos: the `chert`/`chert-sdk` CLI plus a LiveKit agent the developer runs:

- `chert dev --agent` / `chert dev` connector: writes a per-agent link file under `~/.chert/rooms/<agent>.json`, long-polls `/v1/next`, reports `joined`/`failed`;
- LiveKit room contract: `chert-bridge-<id>` participant identity, `facetime-remote-*` tracks, `chert_bridge_ready` room metadata, ~10-second greeting rule, one-unmuted-audio-track rule;
- `chert context` emits an AGENTS.md block consumed by coding agents; `chert new` scaffolds agent projects;
- environment/marker fingerprints: `CHERT_HOME`, `chert-bridge-`, `chert_bridge_ready`, `facetime-remote-`, `chert dev`, `chert-sdk context`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact locked package version from lockfiles or package metadata. SDKs are thin typed wrappers over the same `/api/v1` REST contract; report the exact installed version and whether the integration uses SDK or raw REST.
- Report **per surface**: Messaging API (`console.trychert.com`), Shared/trial API (`app.trychert.com`), FaceTime REST (`facetime.trychert.com`), and CLI/LiveKit bridge are different contracts — a repo may mix several. The `ftk_` project key authenticates both Shared and FaceTime hosts; Messaging uses signing-secret bearer/HMAC — do not assume credential separation that does not exist.
- Distinguish Messaging API, Shared API, FaceTime REST, CLI/LiveKit bridge, packaged integrations (Salesforce managed package, HubSpot app, Slack apps), CLI-managed lines, and mixed use.
- Do not infer the installed generation from current documentation; SDK and docs versions move quickly. The Shared API and CLI bridge are thinly documented — prefer wire evidence over doc absence.

## Capabilities to inventory

Check active use of:

- 1:1 and group sends, group creation (2–31 recipients), follow-up sends, message history (`GET /chats/{id}/messages`), and first-message constraints;
- voice notes (2-step stage-then-send, line-locked), locations, media attachments (presigned `attachment_id` upload), and rich links;
- reactions (`love`, `like`, `dislike`, `laugh`, `emphasize`, `question`), message edits (15-minute window), mark-read, and typing;
- group participant add/remove and line-pinned group operations;
- webhook subscriptions, event replay, SSE `/events/stream`, and `/dev-inbox` store-only mode;
- sender-line selection via `phone_line_id`, per-line `capabilities[]` gating, and `GET /phone-numbers`;
- delivery status lookup, error codes, rate limits (`retry_after`), and idempotency-key saved-result semantics;
- FaceTime calls only when active code proves use — it is a separate product boundary. Three FaceTime integration models exist: REST `/calls` API, `facetime://` deep links / line-address config (provider-bound state, no API calls), and the `chert dev` CLI + LiveKit agent bridge — inventory whichever the repo actually uses, including call-status polling (`/calls/{id}/events`) and BYO LiveKit room contracts.
- Shared-API polling consumers (`GET /shared-messages` on a timer) map to per-message Keiki agent turns, not raw message polling — state the semantic/cost delta (`keiki-targets.md` non-surfaces). `masked_recipient` rows mean recipient identity is partially masked — flag identifier-fidelity loss.
- `facetime://` deep links and assigned line numbers are provider-bound: line churn or re-verification breaks stored links with no migration path — record as a cutover blocker or approved loss.

Only proven capabilities belong in the plan.

## Migration traps

- Auth is not cleanly split: `ftk_` project keys serve both the Shared (`app.trychert.com`) and FaceTime (`facetime.trychert.com`) hosts with `X-Chert-Project-Id`; Messaging (`console.trychert.com`) uses signing-secret bearer/HMAC — but `CHERT_API_KEY` appears on multiple surfaces in the wild, so fingerprint the host+headers, not the env name alone.
- `/chats/{id}/*` routes take `chat_id`; `/messages/{id}/*` routes take `message_id`; legacy `convo_id` must not be used in chat routes.
- The `/locations` `chat_id` field is an internal delivery chat id, not the public chat UUID.
- HMAC signs raw body bytes; GET requests sign `ts.` with a trailing dot; the 5-minute replay window applies; signature auth takes precedence over bearer.
- Webhook delivery secrets are per-subscription and differ from the API signing secret; documentation contains a signature-input inconsistency that must be verified against a live delivery.
- `/send` uses a different flat error envelope than all other routes and carries no `trace_id`.
- Idempotency is saved-result semantics, not deduplication; `4103 delivery_unknown` must never be auto-retried.
- Voice notes are line-locked and exclusive; group operations and several features are gated per line — check `capabilities[]` before assuming support.
- Inbound media arrives as `in_` attachment IDs fetched through authenticated content routes; there is no voice-memo transcript.
- Effects are whitelisted per line; unknown effects return the allowed list.
- SSE streaming has no auto-reconnect; the application owns cursor recovery (`reconnect_with_since`, ~60s server close, `event: close` frames). When SSE and webhook run concurrently, dedupe on `event_id`/`id` — the repo must own that dedupe domain.
- The Shared API is undocumented: `/shared-messages` response fields are guessed by consumers (`direction`, `state`, `masked_recipient`, `items`) — treat the repo's parsing code as the contract and mark doc evidence `retrieved but insufficient`.
- CRM-coupled fields (`lead_id`, `external_id`, `crm_deep_link`) tie sends to Chert's lead model.
- Current Chert features not used by the repository are out of scope.
