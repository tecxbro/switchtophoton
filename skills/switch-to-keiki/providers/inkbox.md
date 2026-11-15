# Inkbox source reference

## Official documentation

Reviewed 2026-11-14. Start with the [LLM index](https://inkbox.ai/docs/llms.txt), [iMessage guide](https://inkbox.ai/docs/capabilities/imessage), [iMessage API Markdown](https://inkbox.ai/docs/api/imessage.md), [send and thread reference](https://inkbox.ai/docs/api/imessage/messages.md), and [iMessage webhook Markdown](https://inkbox.ai/docs/api/imessage/webhooks.md). Consult the [official SDK source](https://github.com/inkbox-ai/inkbox) at the matching release where needed.

## Detection

- Look for `inkbox.ai/api/v1/imessage`, `X-API-Key`, `INKBOX_API_KEY`, and active calls such as `sendIMessage`, `send_imessage`, or `imessages.send`. Record the locked version of `@inkbox/sdk`, `inkbox` (Python or Rust), or `@inkbox/cli`. Look for `inkbox_imessage_send` in MCP tool usage. [Setup and SDKs](https://inkbox.ai/docs/get-started/quickstart.md), [API keys](https://inkbox.ai/docs/api-keys.md), [iMessage guide](https://inkbox.ai/docs/capabilities/imessage.md)
- Confirm whether the active identity uses the standard shared router, an organization-owned shared pool, or a dedicated line. Check identity scope, `imessage_enabled`, `agent_identity_id`, `conversation_id`, and subscriptions such as `imessage.received`. Identify separate phone text and mail features on the same identity. [iMessage API](https://inkbox.ai/docs/api/imessage.md), [iMessage webhooks](https://inkbox.ai/docs/api/imessage/webhooks.md)

## Behavior to inventory

- Trace router onboarding, recipient connection or assignment expiry, first-reply limits, identity rules and opt-outs, line ownership, and 1:1 or group initiation. Standard shared service receives first. Dedicated lines can initiate eligible conversations and can receive non-phone iMessage sender addresses in 1:1 threads that are receive-only. [iMessage guide](https://inkbox.ai/docs/capabilities/imessage.md)
- Preserve the distinction between `conversation_id`, message ID, and a native reply's `thread_id`. Check active `reply_to_message_id` and `plain_reply_fallback` behavior, dedicated-line groups and asynchronous group creation, and typing, read receipts, effects, tapbacks, and media flows. [Send and thread reference](https://inkbox.ai/docs/api/imessage/messages.md)
- Record the queued acceptance response separately from final delivery. Inspect `Idempotency-Key` and `Prefer: idempotency-replay` usage, polling for failures outside webhook coverage, per-identity signature verification, optional subscription authentication, and stable event `id` across retries and replays. [Send reference](https://inkbox.ai/docs/api/imessage/messages.md), [webhook guide](https://inkbox.ai/docs/webhooks.md)
