# Linq source reference

Linq V2 and V3 are materially different. Detect the generation before planning any replacement.

## Official documentation

- LLM index: https://docs.linqapp.com/llms.txt
- Complete LLM documentation: https://docs.linqapp.com/llms-full.txt
- Canonical V3 OpenAPI: https://cdn.linqapp.com/openapi/linq-api-v3.yaml
- V3 docs: https://docs.linqapp.com
- V3 SDKs: https://docs.linqapp.com/getting-started/sdks
- V2 legacy docs: https://docs.linqapp.com/v2
- V2 API reference: https://docs.linqapp.com/v2/api
- V2 → V3 breaking-change guide: https://docs.linqapp.com/guides/resources/migration-v2-to-v3
- Webhooks: https://docs.linqapp.com/guides/webhooks

Use the OpenAPI file for exact V3 endpoint and schema questions. Use V2 docs when repository evidence shows V2.

## Detection fingerprints

Look for:

- packages/imports: `@linqapp/sdk`, `linq-python`, `github.com/linq-team/linq-go`, `@linqapp/chat-sdk-adapter`;
- host: `api.linqapp.com`;
- V2 base path: `/api/partner/v2`;
- V3 base path: `/api/partner/v3`;
- V2 auth: `X-LINQ-INTEGRATION-TOKEN`;
- V3 auth: `Authorization: Bearer ...`;
- environment names such as `LINQ_API_KEY`, `LINQ_API_V3_API_KEY`, integration token, webhook secret, or phone-number IDs;
- V2 integer chat IDs and `chat_messages` resources;
- V3 UUID chat IDs, `parts`, `trace_id`, `event_id`, `event_type`, attachment IDs, and nested chat/message resources.

## Determine the version

### Linq V2

Strong signals:

- `/api/partner/v2`;
- `X-LINQ-INTEGRATION-TOKEN`;
- integer chat IDs;
- paths such as `/v2/chats/{id}/chat_messages` or `/v2/chat_messages`;
- top-level `text` and `attachments` fields;
- older webhook payloads using `event` and older nested resource shapes.

### Linq V3

Strong signals:

- `/api/partner/v3`;
- bearer authentication;
- official SDK class `LinqAPIV3`;
- UUID chat IDs;
- `message.parts[]` with typed text/media/link parts;
- `trace_id` response correlation;
- versioned webhooks using `event_type` and `event_id`;
- asynchronous lifecycle events such as `message.sent`, `message.delivered`, and `message.failed`;
- presigned attachment upload and `attachment_id` references.

### Mixed V2/V3

Linq permits V2 and V3 to coexist. Search all active call sites. A V3 migration endpoint or retained V2 contacts path does not by itself mean the main messaging flow is V2. Report each active path separately.

### Exact SDK version

When an SDK is used, read the exact locked package version and confirm whether its generated API targets V2 or V3. Do not use only the package name.

## Capabilities to inventory

Check active use of:

- creating or finding direct/group chats;
- sending text and multi-part content;
- inbound messages and webhook subscriptions;
- delivery/failure lifecycle and asynchronous state transitions;
- `trace_id` observability;
- `event_id` webhook deduplication;
- send idempotency keys;
- typing and read state;
- reactions, replies, edits, and deletion/unsend semantics;
- group participants, metadata, icons, and leaving groups;
- attachments and presigned uploads;
- voice memos, effects, rich links, decorations, and iMessage app content;
- service selection or iMessage/RCS/SMS fallback;
- capability checks;
- contact cards, contacts, location, payments, or other non-message APIs;
- phone-number/line IDs, reputation, rate limits, retries, and error codes;
- webhook signatures and retry behavior;
- persisted V2 integer chat IDs or V3 UUIDs.

## Migration traps

- V2 and V3 have different authentication, paths, body shapes, webhook schemas, and identifiers.
- V3 is asynchronous. Do not replace a flow that waits for synchronous V2 success without preserving application state transitions.
- `trace_id` may be used for support, logging, or event correlation and should not disappear accidentally.
- `event_id` is the deduplication key for V3 webhook events; preserve at-least-once handling.
- V2 chat IDs and V3 chat IDs are not interchangeable. Existing records may require a compatibility mapping.
- V3 attachments can require upload-before-send, unlike URL-based V2 code.
- Linq's V2 contacts functionality may remain in a repository even when messaging is V3. Do not delete non-messaging provider use without including it in the plan.
- Service selection and fallback are product behavior when explicitly used.
- Do not migrate Linq-only features such as payments or Agentcard unless the user explicitly includes them; report them as separate non-transport dependencies.
