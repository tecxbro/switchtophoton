# Blooio source reference

## Official documentation

Reviewed 2026-11-14. Start with the [documentation](https://docs.blooio.com/), [v4 LLM index](https://docs.blooio.com/llms.txt), and [v4 OpenAPI](https://docs.blooio.com/openapi.json). Compare active legacy usage against the [v2/v4 reference](https://docs.blooio.com/reference), [v2-to-v4 comparison](https://docs.blooio.com/migrating-to-v4), and [versioned webhook guide](https://docs.blooio.com/webhooks).

## Detection

- Look for `api.blooio.com`, bearer authentication, `BLOOIO_*` configuration names, and exact locked package or generated-client metadata. v2 uses `/v2/api/chats/{chatId}/messages` with a URL-encoded chat address. v4 uses `/v4/messages` with `to` and optional sender selection via `from`. Document v3 enterprise routes separately when found and use matching repository evidence for behavior absent from the current public reference. [Documentation](https://docs.blooio.com/), [v2-to-v4 comparison](https://docs.blooio.com/migrating-to-v4)
- Detect the webhook contract independently. v2 subscription deliveries use a flat body with fields such as `event`, `message_id`, and `chat_id`. v4 uses an event envelope with `id`, `type`, `data`, and a subscription payload version in `api_version` and `X-Blooio-Version`. Confirm the running subscription version and any mixed handlers from fixtures or configuration. [Versioned webhook guide](https://docs.blooio.com/webhooks)

## Behavior to inventory

- Identify channel-specific or priority-based routing, sender channels and line eligibility, chat and contact identities, group participation, history pagination, and fallback. Inventory any active SMS, RCS, WhatsApp, or Apple Messages for Business alongside ordinary iMessage. [v4 OpenAPI](https://docs.blooio.com/openapi.json)
- Track request idempotency, webhook signature verification via `X-Blooio-Signature`, acknowledgment, retries, replays, and lifecycle state. The v4 envelope `id` identifies the event across retries and replays. `X-Blooio-Delivery` identifies a delivery, which changes on replay. Check subscription payload versions for field and error-code changes. [Versioned webhook guide](https://docs.blooio.com/webhooks)
- Record active attachments, reactions, replies, polls, typing, read receipts, contact operations, and line provisioning. Identify how the application correlates chat, channel, message, participant, and event IDs across persisted state.
