# Sendblue source reference

Use this file only after repository evidence indicates Sendblue.

## Approved official documentation

- https://docs.sendblue.com/llms.txt

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Do not open ordinary Sendblue HTML documentation as a substitute.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `sendblue`, `chat-adapter-sendblue`, `sendblue-api-mcp`, or `@sendblue/cli`;
- Sendblue API hosts found in active code or configuration;
- authentication headers such as `sb-api-key-id`, `sb-api-secret-key`, or signing-secret headers;
- webhook verification model: Sendblue webhooks use a **static shared-secret header** — but the secret can arrive three ways: a configured `sb-signing-secret` value, a per-webhook `secret`/`globalSecret` field returned by `POST /api/v2/account/webhooks` registration, or a *derived* secret computed as `HMAC-SHA256(apiSecret, context)` — and some integrations **fail open when the secret env var is unset**. Fingerprint which of these the code actually implements;
- environment-variable names containing `SENDBLUE`;
- endpoint patterns including `/api/send-message`, `/api/send-group-message`, `/api/send-carousel`, `/api/create-group`, `/api/evaluate-service`, `/api/account/webhooks`, `/api/send-typing-indicator`, `/api/mark-read`, `/api/upload-file`, `/api/v2/messages`, `/api/v2/messages/{id}`, `/api/v2/contacts`, status, webhook, typing, reaction, and read paths;
- polling-integration fingerprints: `GET /api/v2/messages` with `is_outbound=false`, `created_at_gte`, `order_by=createdAt`, `limit` query params (sandbox accounts may lack webhook support entirely — a poll loop is then the inbound transport, a distinct architecture from webhook ingress);
- older resource patterns such as `/accounts/messages`;
- webhook fields such as `message_handle`, `from_number`, `to_number`, `number`, `sendblue_number`, `media_url`, `media_urls` (plural — both shapes appear in the wild), `is_outbound`, `service`, `group_id`, `participants`, `send_style`, `status_callback`, `was_downgraded`, `seat_id`;
- environment-variable names containing `SENDBLUE`, including `SENDBLUE_API_KEY`, `SENDBLUE_API_SECRET`, `SENDBLUE_FROM_NUMBER`, `SENDBLUE_WEBHOOK_SECRET`, `SENDBLUE_STATUS_CALLBACK_URL`, and Stainless-style `SENDBLUE_API_API_KEY`/`SENDBLUE_API_API_SECRET`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- Read the exact installed SDK version from lockfiles, generated metadata, or vendored package files.
- Confirm imported classes and methods against the approved agent-readable source when available.
- For raw REST, report the exact active host, base path, endpoints, headers, and wire fields.
- Distinguish an official SDK, current raw REST, legacy raw REST, Chat SDK adapter, CLI/MCP boundary, or mixed integration.
- Do not label all `/api/*` sends as legacy merely because retrieval or newer features use `/api/v2/*`.
- Do not infer the installed generation from current documentation.
- If historical behavior cannot be matched to an approved source, use repository fixtures and tests and report uncertainty.

## Capabilities to inventory

Check active use of:

- direct and group sends;
- message identifiers and durable use of `message_handle`;
- inbound message and status webhooks — webhook types include `receive`, `outbound`, `typing_indicator`, `call_log`, and contact/opt-out events; delivery status values span `QUEUED`, `SENT`, `DELIVERED`, `ERROR`, plus service-specific states — enumerate every status the app actually consumes;
- `/api/send-group-message` accepts `group_id` for existing groups vs a `numbers` array for new groups — distinguish which the app uses;
- webhook acknowledgement, signing, retries, and deduplication;
- attachments, media URLs, captions, size limits, download timing, and voice-note handling;
- delivery and failure statuses;
- line selection and sticky `from_number` behavior;
- replies and reply identifiers;
- reactions and part indices;
- typing indicators and read receipts;
- group IDs, participants, group changes, and correlation;
- message effects;
- SMS/RCS fallback, `service`, and downgrade behavior;
- history or polling;
- idempotency, application retries, ordering, queues, and rate handling;
- contacts, opt-out state, contact cards, line provisioning, calling, or FaceTime only when active code proves use;
- **agent-channel contract** — when the repo uses `chat-adapter-sendblue` + the `sendblue` npm SDK (locked `3.x`): adapter version, `sb-signing-secret` webhook verification, `is_outbound` echo acks, account-level `/api/account/webhooks` registration with stale-URL cleanup, `recipient_not_verified` shared-line semantics, `SENDBLUE_API_BASE_URL` override;
- **provisioning/CLI lifecycle** — `@sendblue/cli` commands (`lines`, `show-keys`, `webhooks list`), boot-time webhook auto-registration, `SENDBLUE_FROM_NUMBER` env sync, and line provisioning flows are cutover surfaces, not just config;
- **platform-catalog entries** — when Sendblue appears as a catalog/block entry (Pipedream component, Sim block, connector executor), the declared action/source surface is the capability set: prop schemas, `$emit`/dedupe semantics, platform-injected auth (`$auth` api_key/api_secret rather than env vars), and published-artifact consequences.

Only proven capabilities belong in the plan.

## Migration traps

- **Fast-reject hints:** verbatim cold-outbound sends (`POST /api/send-message` to arbitrary numbers — lead speed-to-text, broadcasts, reminders to never-contacted phones), contacts/opt-out CRM (`/api/v2/contacts*` — Keiki has no contacts API and opt-out is inbound-driven), message-status polling (`GET /api/v2/messages`), and `evaluate-service` capability checks all lack confirmed Keiki surfaces — check these before deep mapping.
- **Closed sets to pre-register:** `send_style` has ~13 documented values; `service` covers iMessage/SMS/RCS per message; status enums span `QUEUED`/`SENT`/`DELIVERED`/`ERROR` plus service-specific states — enumerate the values the repo actually consumes, not the full provider list.
- A stored `message_handle` may be an application dependency, not a disposable transport field.
- Repeated webhook delivery requires existing deduplication and acknowledgement behavior to remain intact.
- Status callbacks and account webhooks may overlap; avoid double-processing.
- Sender-line consistency may be product behavior.
- SMS/RCS fallback must not disappear silently.
- Group messaging may depend on `group_id` as the stable correlator.
- Attachment URL lifetime and limits may differ from Keiki.
- Provider-record deletion is not necessarily iMessage unsend.
- Current Sendblue features not used by the repository are out of scope.
