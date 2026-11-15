# Linq source reference

Official documentation: [Linq](https://docs.linqapp.com/channel/imessage/).

Linq V2 and V3 are materially different. Detect every active generation before planning.

## Approved official documentation

- https://docs.linqapp.com/channel/imessage/llms.txt
- https://docs.linqapp.com/channel/imessage/llms-full.txt

Start with these agent-readable sources. Follow official artifacts under the [source evidence policy](index.md) when an exact generation is missing.

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

- Do not drop a capability based on absence from one page. Use [Keiki evidence](../keiki-evidence.md).
- Compare asynchronous acceptance vs synchronous errors, recipient-phone filtering, retries,
  typing clear behavior and media readiness/expiry. Linq chat IDs are provider scoped.
- Verify iMessage, RCS, SMS and fallback separately. A Keiki line backed by Linq may have
  different capabilities than a dedicated line backed by another provider.

## Implementation checkpoints

Model-exposed contact, decoration and group tools are reachable when registered. Route exact services, exact iMessage effect and decoration enums, bot-number filtering, existing profile keys and action order. Test one source event vs multiple entries in a Keiki turn, reaction-only exit, first-thread setup, silence, nonfatal read/share vs fatal send, and effects combined with targeted reply or media.
