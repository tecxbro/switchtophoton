# ZeroSettle source reference

## Official documentation

Verified on 2026-11-14. Start with the [Phonetwin documentation](https://phonetw.in/docs) or the [complete Markdown API reference](https://phonetw.in/docs.md).

## Detection

- Look for ZeroSettle or Phonetwin configuration, documented origins such as `portal.zerosettle.io`, bearer auth, and `/api/imessage/line`, `/api/imessage/send`, or `/api/imessage/messages`. Record the actual origin, route contracts, API wrapper version if present, and line configuration.
- Confirm `X-ZeroSettle-Signature`, `message.received` with nested `message` and numeric `message.id`, a `PUT /api/imessage/webhook` registration, or the `/api/imessage/stream-token` and SSE flow. Verify active transports from the integration.
- Distinguish direct API or webhook ownership, MCP usage, and a line managed by the vendor's hosted AI agent. Inspect which system is responsible for responding and storing conversation state.

## Behavior to inventory

- Capture how replies select the original `line_id`, use handles or group chat IDs, and persist source message IDs. Include new-contact limits, pending-reply and attachment restrictions, SMS fallback and its opt-out notice, STOP enforcement, and explicit delivery receipt lookup where used.
- Separate handset acceptance (`message.sent`) from recipient delivery. Inventory webhook HMAC over the timestamp and raw body, deduplication by event type and message ID for message events, out-of-order delivery, cursor-based polling, SSE reconnect, and opt-in events with separate payloads.
- Inspect active photo, audio and reusable or staged media handling, authenticated downloads, native group operations, reactions, inline replies and typing. Record CRM, sign-in, or hosted agent behavior when tied to the source line.
