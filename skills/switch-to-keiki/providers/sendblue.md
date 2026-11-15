# Sendblue source reference

## Official documentation

Reviewed 2026-11-14. Start with the [LLM index](https://docs.sendblue.com/llms.txt), then consult the matching [documentation](https://docs.sendblue.com/), [API v2 reference](https://docs.sendblue.com/api-v2), [receive payloads](https://docs.sendblue.com/getting-started/receiving-messages), and [webhook guide](https://docs.sendblue.com/getting-started/webhooks).

## Detection

- Look for `api.sendblue.com` or `api.sendblue.co`, `sb-api-key-id`, `sb-api-secret-key`, and `SENDBLUE_*` configuration names. Find the exact locked version of the `sendblue` Node.js or Python package, or confirm the active `chat-adapter-sendblue`, `@sendblue/cli`, MCP, or raw REST integration. [LLM index](https://docs.sendblue.com/llms.txt), [Send API reference](https://docs.sendblue.com/api/resources/messages/methods/send), [client packages](https://docs.sendblue.com/getting-started/client-packages)
- Identify each active API surface. Current messaging uses `/api/send-message` and `/api/send-group-message`. Retrieval uses `/api/v2/messages`, and account webhook subscriptions use `/api/account/webhooks`. Older calls may use paths such as `/accounts/messages`. Distinguish endpoint generation from line generation because some features require V2 lines. [API v2 reference](https://docs.sendblue.com/api-v2)
- Corroborate callbacks and persisted identifiers using fields such as `message_handle`, `from_number`, `to_number`, `sendblue_number`, `is_outbound`, `service`, `was_downgraded`, `group_id`, and `reply_to`. Capture any mixed webhook or REST behavior from the application's fixtures and configuration. [Receive payloads](https://docs.sendblue.com/getting-started/receiving-messages)

## Behavior to inventory

- Record sender selection and line continuity, shared-line recipient verification, dedicated-line plan behavior, group IDs and participant changes, iMessage/SMS/RCS routing, and fallback rules. Preserve replyable Apple Account email addresses where the application handles them.
- Trace inbound and outbound webhooks and per-send `status_callback` deliveries, including overlap, signature checks, response timing, duplicates, retry handling, and delivery state transitions. Identify stored `message_handle` values that connect sends, callbacks, reactions, inline replies, history, or reconciliation.
- Inventory media URLs and their expiration, uploads, size limits, voice memos, effects, rich media, app-card sessions, typing, read receipts, tapbacks, and other rich features when used. Distinguish application deletion of a provider record from iMessage unsend. Check active opt-out state, contact rules, line provisioning, calling, and other Sendblue dependencies that share the same configuration.
