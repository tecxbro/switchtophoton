# Project Blue source reference

## Official documentation

Reviewed 2026-11-14. Start with the [documentation](https://docs.tryprojectblue.com/), [LLM index](https://docs.tryprojectblue.com/llms.txt), and [OpenAPI](https://docs.tryprojectblue.com/openapi.json). Check the [send message contract](https://docs.tryprojectblue.com/docs/send-message) and [webhook contract](https://docs.tryprojectblue.com/docs/webhooks) for lifecycle and integration details.

## Detection

- Look for `api.tryprojectblue.com`, bearer authentication, `/send-api-message`, `/send-group-message`, `/get-lines`, and `/get-messages-api`. Check `phone`, `message`, `lineId`, `mediaAttachmentUrl`, `audioAttachmentUrl`, and `idempotencyKey` in active sends. The public OpenAPI reports version `1.0.0`. Record the application's exact paths and generated client revision if present. [Send message contract](https://docs.tryprojectblue.com/docs/send-message), [OpenAPI](https://docs.tryprojectblue.com/openapi.json)
- Look for `message.inbound` and `message.outbound`, `direction`, `messageId`, `guid`, and `linePhoneNumber`. Identify dashboard, Zapier, or HubSpot webhook configuration because their payloads and controls differ. Identify MCP usage through `/api/mcp` and voice-specific `@tryprojectblue/dialer` separately. [Webhook contract](https://docs.tryprojectblue.com/docs/webhooks), [LLM index](https://docs.tryprojectblue.com/llms.txt)

## Behavior to inventory

- Trace automatic iMessage-to-SMS fallback, explicit `lineId` versus load balancing, group addresses versus phone numbers, media and voice memos, and effects, typing, or tapbacks where active. Check for automatic CRM contact creation and line, contact-card, workflow, or FaceTime dependencies.
- Record the difference between queued, done, and recipient delivery. In the documented send contract, repeating the same recipient and text within an hour can return a deduplicated result if the application did not choose a distinct idempotency key. Determine which repeated sends are intentional. [Send message contract](https://docs.tryprojectblue.com/docs/send-message)
- Dashboard webhooks attempt delivery once, with no retry or replay. Identify polling reconciliation through `/get-messages-api`, any response or disablement monitoring, and the message handle used for message lookup. Check `groupId`, `destination`, `sender`, and `participants` in fixtures before mapping group and 1:1 flows. [Webhook contract](https://docs.tryprojectblue.com/docs/webhooks), [LLM index](https://docs.tryprojectblue.com/llms.txt)
