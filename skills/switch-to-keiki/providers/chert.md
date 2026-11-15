# Chert source reference

## Official documentation

Verified on 2026-11-14. Start with the [documentation index](https://docs.trychert.com/llms.txt), [introduction](https://docs.trychert.com/introduction), [API overview](https://docs.trychert.com/api/overview.md), [authentication](https://docs.trychert.com/api/authentication.md), [reply events](https://docs.trychert.com/api/receiving-replies.md), and [event transports](https://docs.trychert.com/api/events.md).

## Detection

- Look for `console.trychert.com/api/v1`, `CHERT_SIGNING_SECRET`, `x-chert-tenant`, and `x-chert-signature`. The API supports bearer or HMAC request auth. Capture the tenant selection and sender line alongside the route.
- Identify which send paths are active. `POST /api/v1/send` uses a simple send contract with its own error shape. `/api/v1/chats` and `/api/v1/chats/{id}/messages` carry chat IDs and structured message parts. Record each shape even where the paths share a version prefix.
- Distinguish `message.received` with nested `data` from legacy `lead_reply` summary notifications and legacy field aliases. Identify direct HTTP, SDK or CLI, Salesforce, HubSpot, or Slack integration evidence separately and record installed versions where available.

## Behavior to inventory

- Keep tenant scope, phone-line pinning, chat IDs, message IDs, and event IDs distinct. Inventory direct and group addressing, text parts with `value`, authenticated attachment downloads, staged uploads, voice notes, and line-enabled features where active.
- Capture webhook subscription filters, per-subscription signature secrets and header formats, deduplication by `event_id`, retries and manual replay. Check any SSE or polling recovery and CRM reply routing separately.
- Inspect any distinction between acceptance and final status, flat versus enveloped errors, and retryability. Account for active Voice or FaceTime flows as their own capabilities.
