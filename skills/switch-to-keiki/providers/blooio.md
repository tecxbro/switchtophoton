# Blooio source reference

Official documentation: [Blooio](https://docs.blooio.com/).

No approved official agent-readable documentation source is currently registered for this provider.

Do not add or open ordinary Blooio documentation links. Rely on inspected repository evidence and report the documentation gap.

## Detection and API-generation evidence

Use only evidence present in the repository, including:

- exact locked package or generated-client metadata;
- Blooio API hosts and active base paths;
- `/v2`, `/v3`, or `/v4` endpoint paths;
- authentication-header shape and `BLOOIO` environment-variable names;
- request, response, and webhook payload fields;
- tests, fixtures, mocks, and deployment configuration.

Existing repository fingerprints may indicate chat-addressed v2 paths or a unified v4 message path. Do not assume those fingerprints apply without matching active code. A `/v3` path must be reported separately rather than forced into v2 or v4.

If an exact generation cannot be proven, report `Unknown generation` or `Mixed generations` and the appropriate confidence. Low confidence is a planning blocker.

## Capabilities to inventory

Inventory proven use of:

- iMessage, SMS, RCS, WhatsApp, or other channel routing;
- explicit sender or channel selection;
- chat, channel, message, participant, and event identifiers;
- idempotency, retries, ordering, deduplication, and delivery state;
- history, status, attachments, multipart content, polls, effects, replies, reactions, and groups;
- contact or capability APIs;
- webhooks, authentication, acknowledgement, and lifecycle.

## Migration traps

A unified multi-channel integration may use Blooio for more than iMessage. Do not replace it with an iMessage-only Keiki target unless the approved plan preserves or explicitly excludes every other active channel. Do not claim exact parity from unsupported fingerprints or current assumptions.

Current docs distinguish v2 and v4; pin each active callsite and webhook schema independently.

## Implementation checkpoints

Pin source path/event discriminator for v2 and v4 separately and map status/IDs and send acceptance to actual caller. Preserve independent RCS/SMS/WhatsApp/Apple Messages for Business where active. Keiki dedicated group reply is not group administration. Verify ambiguous send, line vs participant identity, restart/replay and SMS fallback separately.

For Blooio's public v2 agent example, trace get-chat/member hydration, mark-read,
group rename and group icon; group reply is not a substitute. Its typing stop
helper is exported but not called. Per-message group classification can ignore,
react, or answer, so preserve media exceptions and invocation cardinality.
