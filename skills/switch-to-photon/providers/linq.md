# Linq source reference

Linq V2 and V3 are materially different. Detect every active generation before planning.

## Approved official documentation

- https://docs.linqapp.com/llms.txt
- https://docs.linqapp.com/llms-full.txt

Use only these sources and relevant official agent-readable references permitted by [`index.md`](./index.md). Do not open ordinary Linq HTML pages or OpenAPI YAML files.

## Detection fingerprints

Search for:

- packages/imports such as `@linqapp/sdk`, `linq-python`, Linq Go clients, or a Linq Chat SDK adapter;
- exact locked SDK versions and generated-client metadata;
- host `api.linqapp.com`;
- V2 base path `/api/partner/v2`;
- V3 base path `/api/partner/v3`;
- V2 header `X-LINQ-INTEGRATION-TOKEN`;
- V3 bearer authentication;
- V2 integer identifiers and older `chat_messages` resources;
- V3 UUID identifiers, `parts`, `trace_id`, `event_id`, `event_type`, attachment IDs, and nested resources;
- webhook-version fields, tests, fixtures, and persisted identifier types.

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

- document the source-to-Photon conversion rule;
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
- A source capability is not removable merely because one Photon document, README, example, or Agent Skill omits it.
- Unsupported-capability investigation must use the bounded escalation in [`../photon-evidence.md`](../photon-evidence.md).
- Linq REST failures may be synchronous while Photon behavior depends on the selected REST, webhook, Socket.IO, WebSocket, SDK, or unified-stream target.
- Linq typing behavior may clear differently from Photon typing behavior.
- Linq recipient-phone filtering must not be replaced with webhook registration assumptions unless receiving-line identity is proven through the selected Photon public contract and verification.
- Linq media URLs and Photon attachment IDs or attachment resources may have different readiness, retrieval, upload, timeout, size, MIME-handling, and failure requirements.
- Linq chat IDs and Photon chat GUIDs are provider-specific and must never be described as the same preserved identifier.
- Process-local storage can still create a user-visible cutover requiring conversation reset, invalid onboarding links, credential loss, user-to-line reassignment, or re-onboarding when repository evidence shows those behaviors exist.
- Spectrum must not be selected for an existing Linq REST or webhook application solely because it supports a required capability. The plan must prove that Spectrum creates a smaller and safer migration than preserving REST, HTTP webhook, or Photon HTTP Proxy Socket.IO boundaries.
- RCS, SMS, iMessage, fallback, and routing claims must be supported by the selected Photon product’s public contract or approved as behavior changes. Live verification blocks completion when the required credentials, lines, devices, and recipients are available.
