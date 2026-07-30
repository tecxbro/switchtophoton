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

## Migration traps

- V2 and V3 differ in authentication, paths, payloads, webhook schemas, identifiers, and timing.
- Replacing synchronous V2 behavior with asynchronous V3-style behavior can break application state.
- `trace_id` may be operationally required.
- `event_id` may be the webhook deduplication key.
- Integer and UUID identifiers are not interchangeable; existing records may need aliases or boundary translation.
- Attachment flows can require different sequencing.
- Do not delete Linq-only non-messaging functionality unless separately approved.
