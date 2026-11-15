# Linq source reference

## Official documentation

Reviewed 2026-11-14. Start with the [LLM index](https://docs.linqapp.com/llms.txt) or the [full iMessage documentation](https://docs.linqapp.com/channel/imessage/llms-full.txt). Match the application's generation using the [iMessage guides](https://docs.linqapp.com/channel/imessage/), [V2 reference](https://docs.linqapp.com/channel/imessage/v2/), [V2-to-V3 comparison](https://docs.linqapp.com/channel/imessage/guides/resources/migration-v2-to-v3/), and [V3 webhook guide](https://docs.linqapp.com/channel/imessage/guides/webhooks/).

## Detection

- Look for `api.linqapp.com`, the locked SDK version and imported client, and any active Vercel Chat SDK adapter. V3 SDK examples include `@linqapp/sdk`, `linq-python`, and `github.com/linq-team/linq-go`. [Client SDKs](https://docs.linqapp.com/channel/imessage/getting-started/sdks/)
- V2 signals include `/api/partner/v2`, `X-LINQ-INTEGRATION-TOKEN`, integer chat IDs, flat `chat_messages` routes, top-level `text` and `attachments`, and synchronous response assumptions. V3 signals include `/api/partner/v3`, bearer authentication, UUID chat IDs, nested chat message routes, typed `message.parts`, attachment IDs, and asynchronous delivery events. [V2-to-V3 comparison](https://docs.linqapp.com/channel/imessage/guides/resources/migration-v2-to-v3/)
- Determine the REST and webhook generations independently from active entry points, subscriptions, persisted identifiers, and fixtures. Record mixed use per endpoint or event. In V3, legacy `X-Webhook-*` headers can coexist with Standard Webhooks headers. [V3 webhook guide](https://docs.linqapp.com/channel/imessage/guides/webhooks/)

## Behavior to inventory

- Record active direct and group chat creation, participant lookup, sender line selection, recipient filtering, and automatic or explicit iMessage, RCS, and SMS selection. Include handling of phone and Apple Account email identifiers where used.
- Trace synchronous application state transitions, queued or asynchronous statuses, failure handling, `trace_id` correlation, send idempotency, and webhook acknowledgment, signature verification, retries, and deduplication using `event_id` where applicable.
- Follow attachment URLs or presigned upload sequencing, `attachment_id` usage, MIME and size restrictions, readiness, and retrieval. Inventory reply threads, read state, typing, group lifecycle, edit and unsend, voice memos, links, and other content only where the application uses them.
- Check add and remove semantics for each reachable standard reaction (love, like, dislike, laugh, emphasize, question), representative custom emoji, and each active effect. Record open-ended conversion rules and invalid values. Preserve the distinction between deleting a provider record and retracting a delivered message.
- Track persisted V2 and V3 IDs, chat history, line assignments, and active onboarding or session state through cutover. Linq's own migration endpoint maps its V2 IDs to its V3 IDs. Treat each Linq identifier as provider-specific when evaluating Keiki continuity. Inventory other Linq dependencies such as contacts or payments before retiring shared credentials or configuration.
