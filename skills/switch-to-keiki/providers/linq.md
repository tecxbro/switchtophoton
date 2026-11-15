# Linq source reference

Linq V2 and V3 are materially different. Detect every active generation before planning.

## Approved official documentation

- https://docs.linqapp.com/channel/imessage/llms.txt
- https://docs.linqapp.com/channel/imessage/llms-full.txt
- https://docs.linqapp.com/channel/whatsapp/llms.txt (only when the repository uses Linq's WhatsApp Partner API)

Linq publishes per-channel documentation. Use the iMessage channel pair for messaging integrations and the WhatsApp channel pair for `whatsapp.messages.api.linqapp.com` integrations. Follow only relevant official agent-readable references permitted by [`index.md`](./index.md). Do not open ordinary Linq HTML pages. Linq's canonical OpenAPI document (`cdn.linqapp.com/openapi/linq-api-v3.yaml`, linked from its docs) is **not registered** in the index policy — do not treat it as an approved source even though it exists; the WhatsApp channel's "separate OpenAPI contract" is likewise unregistered. When exact enums or webhook fields are missing from the llms.txt pair, reconstruct them from repository wire evidence (handlers, fixtures, signature code) and mark the doc gap in the plan.

## Detection fingerprints

Search for:

- packages/imports such as `@linqapp/sdk`, `linq-python`, Linq Go clients, `chat-adapter-linq` (Vercel Chat SDK adapter — hand-rolled raw REST, no SDK package), or a Linq Chat SDK adapter;
- exact locked SDK versions and generated-client metadata;
- host `api.linqapp.com`;
- V2 base path `/api/partner/v2`;
- V3 base path `/api/partner/v3`;
- V2 header `X-LINQ-INTEGRATION-TOKEN`;
- V3 bearer authentication;
- V2 integer identifiers and older `chat_messages` resources;
- V3 UUID identifiers, `parts`, `trace_id`, `event_id`, `event_type`, attachment IDs, and nested resources;
- webhook-version fields, tests, fixtures, and persisted identifier types — note type names like `LinqMessageEventDataV2` encode a *webhook event-data schema* version inside a V3 API integration; do not misread them as a V2-generation signal;
- WhatsApp Partner API host `whatsapp.messages.api.linqapp.com` and its separate OpenAPI contract;
- environment variables `LINQ_API_KEY` and `LINQ_API_V3_API_KEY`;
- V2 `GET /api/partner/v2/chats/{chat_id}/migrate_to_v3` migration endpoint and V2 `webhook_subscriptions` paths.

## Detect V2, V3, mixed use, and exact SDK version

### Linq V2

Evidence can include `/api/partner/v2`, `X-LINQ-INTEGRATION-TOKEN`, integer chat IDs, V2 `chat_messages` paths, top-level text/attachment fields, synchronous response assumptions, and older webhook shapes.

### Linq V3

Evidence can include `/api/partner/v3`, bearer authentication, a generated V3 client, UUID identifiers, typed `message.parts[]`, `trace_id`, `event_id`, versioned webhook fields, asynchronous lifecycle events, and upload-before-send attachment IDs.

### Mixed V2/V3

Search every active call path. Report each generation and which capabilities use it. A retained V2 contact endpoint does not prove the main messaging flow is V2; a single V3 migration path does not prove the entire integration is V3.

### Exact installed SDK

Read the exact locked package version and determine which API generation its imported shape targets. Never report only a manifest range or assume the newest docs match it.

## Capabilities to inventory

Check active use of:

- direct and group chat creation or lookup;
- text and multipart sends;
- inbound messages and webhook subscriptions;
- synchronous versus asynchronous application state transitions;
- delivery and failure lifecycle;
- `trace_id` logging or correlation;
- `event_id` deduplication;
- send idempotency;
- typing, read state, reactions, replies, edits, deletion, or unsend;
- group participants, metadata, icons, and leave behavior;
- attachment URLs versus presigned upload and `attachment_id` flows;
- voice memos, effects, rich links, or decorations;
- service selection and iMessage/RCS/SMS fallback;
- phone-number or line IDs;
- webhook authentication, acknowledgement, retries, ordering, and rate handling;
- persisted V2 integers, V3 UUIDs, or mixed identifier storage;
- non-messaging Linq features only to identify dependencies that must remain outside migration scope.

For reactions, classify and record separately:

### Closed standard reactions

- love;
- like;
- dislike;
- laugh;
- emphasize;
- question;
- reaction removal when represented by a closed operation or enum.

Map every actively reachable closed reaction value individually.

### Open-ended reactions

For custom emoji or free-form reaction values:

- document the source-to-Keiki conversion rule;
- test representative values;
- test invalid values;
- test unknown values;
- do not claim to enumerate every possible custom emoji.

For effects, record every actively reachable accepted source effect string separately when the effect set is closed or documented.

For service and line behavior, record:

- incoming `service`;
- recipient phone or line;
- bot-number filtering;
- iMessage behavior;
- SMS behavior;
- RCS behavior;
- any prompt or application claim tied to those services.

## Migration traps

- V2 and V3 differ in authentication, paths, payloads, webhook schemas, identifiers, and timing.
- Replacing synchronous V2 behavior with asynchronous V3-style behavior can break application state.
- `trace_id` may be operationally required.
- `event_id` may be the webhook deduplication key.
- Integer and UUID identifiers are not interchangeable; existing records may need aliases or boundary translation.
- Attachment flows can require different sequencing.
- Do not delete Linq-only non-messaging functionality unless separately approved.
- A source capability is not removable merely because one Keiki document, README, example, OpenAPI path, or Agent Skill omits it.
- Unsupported-capability investigation must use the bounded escalation in [`../keiki-evidence.md`](../keiki-evidence.md).
- Linq REST failures may be synchronous while Keiki behavior depends on the selected harness-dispatch, webhook, REST, gateway, SDK, or unified-stream target.
- Linq typing behavior may clear differently from Keiki typing behavior.
- Linq recipient-phone filtering must not be replaced with webhook registration assumptions unless receiving-line identity is proven through the selected Keiki public contract and verification.
- Linq media URLs and Keiki attachment IDs or attachment resources may have different readiness, retrieval, upload, timeout, size, MIME-handling, and failure requirements.
- Linq chat IDs and Keiki conversation IDs are provider-specific and must never be described as the same preserved identifier.
- Linq's WhatsApp Partner API is a separate contract from the iMessage Partner API; detect which channel the repository uses before planning.

### V3 webhook contract (consolidated)

The V3 inbound contract has several variants observed in the wild — fingerprint the repo's actual handlers rather than assuming one:

- **Envelope:** `event_type` + `data` payload wrapper; per-event data schemas may carry their own version markers (e.g. `LinqMessageEventDataV2` inside a V3 integration — a schema version, not an API generation).
- **Signature schemes (more than one in circulation):** `X-Webhook-Signature` HMAC (`sha256=` prefix, signed over `timestamp.body`, ~5-minute tolerance — deprecated but still sent) **and** `whsec_` Standard-Webhooks secrets/headers; some integrations verify both or neither. Record which scheme(s) the code actually checks and whether verification fails open when the secret is unset.
- **Delivery semantics:** ~10-second acknowledgement deadline, at-least-once delivery with retries (~30 min window observed), `?version=` payload pinning on subscription.
- **Dedup keys:** `event_id` on the envelope and/or `message.id` inside `data` — determine which the repo actually dedups on; they are not interchangeable.
- **Event taxonomy varies by surface:** documented events include `reaction.added`/`reaction.removed`, but official first-party plugins have been observed handling `reaction.received` — treat the event-name list as per-registration, not universal.

- Inbound reactions arrive as reaction webhook events (exact names vary — see above) — Keiki delivers tapbacks as `keiki.reaction` non-turn dispatches (push mode only; relay mode does not receive them, and the published schema has no sender field — group attribution may be impossible).
- History fetch (`fetchMessages`), thread/conversation inspection (`fetchThread`/`getChat`), phone-number listing (`listPhoneNumbers`), and mark-read (`POST /v3/chats/{id}/read`) have no confirmed Keiki public equivalents — treat as likely blockers or approved exclusions, not silent drops. **Usage context matters:** a probe-only CLI call (`listPhoneNumbers` run once at setup) is a different criticality than a per-message `mark-read` on the inbound path — classify before listing as a blocker.
- Process-local storage can still create a user-visible cutover requiring conversation reset, invalid onboarding links, credential loss, user-to-line reassignment, or re-onboarding when repository evidence shows those behaviors exist.
- A hosted Keiki agent loop must not be selected for an existing Linq REST or webhook application solely because it supports a required capability. The plan must prove that it creates a smaller and safer migration than preserving REST, HTTP webhook, or Keiki harness-dispatch boundaries.
- RCS, SMS, iMessage, fallback, and routing claims must be supported by the selected Keiki surface’s public contract or approved as behavior changes. Live verification blocks completion when the required credentials, lines, devices, and recipients are available.
