# Blooio source reference

## Official documentation

- Documentation home: https://docs.blooio.com
- v2 API reference: https://docs.blooio.com/reference/v2
- v4 message fields: https://docs.blooio.com/guides/message-fields-v4
- Quickstart: https://docs.blooio.com/quickstart
- Webhooks: https://docs.blooio.com/webhooks

## Detect the API generation

- v2 commonly uses `https://api.blooio.com/v2/api/chats/{chat}/messages` and chat-addressed resources.
- v4 commonly uses `https://api.blooio.com/v4/messages` and a unified multi-channel message shape.
- v3 existed for enterprise functionality; do not assume v2 or v4 when `/v3` appears.
- Authentication commonly uses a bearer API key with `bl_live_...`-style values; never expose the value.

Check endpoint paths, response schemas, webhook event names, message fields, and any SDK/package lockfile before reporting the generation.

## Inventory and traps

Inventory routing across iMessage/SMS/RCS/WhatsApp, explicit sender/channel selection, `chat_id`, `channel_id`, routing metadata, idempotency keys, message history/status, attachments, parts, polls, effects, replies, reactions, groups, contact/capability APIs, and webhooks.

A unified multi-channel v4 integration may use Blooio for more than iMessage. Do not replace the full provider with an iMessage-only target unless the plan preserves or explicitly excludes other channels.
