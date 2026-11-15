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

## Replace a direct reply handler

1. Identify the active ingress. A modern fixture should show `event_type: "message.received"`, `event_id`, `api_version`, `webhook_version` and nested `data`. For `lead_reply` or consumers of legacy aliases, capture the actual fields and side effects before migrating. Inventory webhook, SSE and replay consumers independently.
2. Keep the tenant account and app conversation keys. Map source `partner_id` to the Keiki `agentId` binding, and `data.chat.owner_handle.handle` to its verified sending line. Map `data.chat.id` to the app conversation through the Keiki `conversationId`. Preserve `data.message.sender_handle.handle` separately from group identity and verify the target identity when it affects authorization. An app provisioning one agent per tenant can evaluate partner deployments keyed by its existing tenant ID in `external_ref`. [Partner deployments](https://onkeiki.com/docs/partner-deployments)
3. Replace source text part values with applicable signed `keiki.turn` v1 `messages[].text`. Map source attachment `attachment_id` and authenticated content download to Keiki `messages[].attachments` plus turn-scoped retrieval. Change event deduplication from Chert `event_id` to a Keiki turn or message identity appropriate to the effect. Keep old message IDs readable and select Keiki `messages[].messageId` for new native actions. Preserve part order and validate any consumed `rich_link` or native voice-note treatment separately.
4. Replace reply sends from `POST /api/v1/send` or `POST /api/v1/chats/{id}/messages` with the active turn's `POST {turnUrl}/messages`, a stable `idempotencyKey` and `POST {turnUrl}/complete`. The turn provides the conversation and line. Map supported native reactions to the Keiki action. List sticker operations and unsupported triggers for removal. [Current migration scope](../imessage-capabilities.md#current-migration-scope) When source logic reads or branches on a send result, preserve acceptance, failure and unknown outcome distinctly. [External harness](https://onkeiki.com/docs/external-harness#turn-scoped-api)

## Decide what can switch

- A full switch fits a tenant-scoped direct reply workflow with verified line and identity routing. Qualify incoming group replies on a dedicated Photon or Blooio line with Group chats enabled. Test the targeting and quiet-context rules. Chert group creation and line-enabled location or text formatting need their own Keiki contract evidence. [Chert API overview](https://docs.trychert.com/api/overview.md), [Keiki groups](https://onkeiki.com/docs/cloud-agents#group-chats)
- Inventory `GET /api/v1/events`, SSE, manual replay, tenant-wide history and CRM consumers. Map them independently or list their approved removal. An active Chert dependency blocks retirement. A Keiki inbox claim retrieves agent turns, while Chert event replay re-fires a stored provider event. FaceTime/LiveKit, Salesforce and HubSpot each have their own integration boundary. [Chert events](https://docs.trychert.com/api/events.md), [FaceTime](https://docs.trychert.com/facetime/introduction.md)
- Block first-contact sends through `/notice`, which requires an existing conversation. Confirm any same-line import, durable delivery callback and group creation independently. Keiki's separate consent event and conditional self-hosted receipt route do not establish Chert event-stream parity. [Notices](https://onkeiki.com/docs/agent-api#notices-from-your-server), [Evidence guide](../keiki-evidence.md)

## Cutover and acceptance

Record the last processed Chert event cursor where present, preserve event and chat IDs, and drain queued or retrying sends. Run one responder per tenant and line. Test bad signatures, duplicate or replayed old events, two tenants with the same contact, text and media within one message, in-flight arrivals, and status correlation where active. Exercise approved replacement CRM or recovery behaviors, verify the old paths are removed, and rehearse rollback to the prior deployment without replaying replies. Follow [verification](../verification.md).
