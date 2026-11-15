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

## Replace a direct reply handler

1. Confirm the responding system. On a line managed by ZeroSettle's agent, the supported migration starts from the hosted prompts, tools, triggers and state. On an application-managed line, trace `message.received` and confirm any SSE or polling copies are deduplicated. Save the last processed `after_id` per active polling scope plus the source event filters.
2. Bind the Keiki agent to a verified line. Map `message.handle` to the app contact through `(agentId, conversationId)` and `message.line_id` to the line binding. For legacy or single-line payloads without `line_id`, use the verified source configuration to resolve the line. Preserve source `chat_id` independently for groups. The original could route by inbound line and use automatic sender selection in other cases. Verify which behavior the app needs.
3. Replace `message.text` with signed `keiki.turn` v1 `messages[].text` for genuine inbound items. Move media from the source `message.kind` and media fields to `messages[].attachments` and the scoped download route. Keep numeric `message.id` and provider GUIDs in the old namespace. Use Keiki message IDs for new native actions and stable deduplication keys for app side effects. Keep `message.sent`, `message.failed`, typing, reaction, and opt-out events out of the text handler. Evaluate Keiki's separate consent events if the app consumes them. Map any required reaction notifications separately from automatic replies, and list unmapped triggers for removal. [Turn contract](https://onkeiki.com/docs/external-harness#turn-request), [Keiki events](https://onkeiki.com/docs/webhooks)
4. Replace reply calls to `POST /api/imessage/send` with `POST {turnUrl}/messages` and a stable `idempotencyKey`, then call `POST {turnUrl}/complete` after recording the outcome. For `reply_to`, use a scoped target message ID and test the exact reply behavior on the approved line. Use the Keiki built-in for supported Tapbacks. List unsupported sticker behavior for removal. [Current migration scope](../imessage-capabilities.md#current-migration-scope) `message.sent` reported handset handoff at the source. Verify each downstream status and receipt mapping separately from accepted target replies. [Turn operations](https://onkeiki.com/docs/external-harness#turn-scoped-api)

## Decide what can switch

- A full switch fits an inbound 1:1 reply loop after proving line identity, text and media, opt-out and any fallback behavior. A hosted-agent move has separate proof obligations for prompt and tool behavior, durable state, and trigger timing.
- Resolve cursor catch-up, SSE consumers, receipt lookups, opt-outs, source triggers and CRM or sign-in dependencies before removing ZeroSettle. List each unmapped behavior for approval to remove it. `GET /api/imessage/messages/delivery` can distinguish `delivered`, `failed` and `delivered_as_junk`. Map required states explicitly against evidence for the target line and runtime. Keiki's bounded history and leased turn queue serve a different lifecycle. [Source reference](https://phonetw.in/docs.md), [Keiki inbox](https://onkeiki.com/docs/external-harness#inbox-mode)
- Source first-contact sends and broadcasts have no equivalent on the targeted notice route, which requires an existing conversation. Omitting `phone` changes notice scope to recent Keiki conversations. Verify source group create, rename, membership changes and leave separately from Keiki group replies. Preserve the source's first eligible SMS opt-out notice where it is an active requirement unless the new behavior is approved. [Notices](https://onkeiki.com/docs/agent-api#notices-from-your-server), [Keiki groups](https://onkeiki.com/docs/cloud-agents#group-chats)

## Cutover and acceptance

Reconcile old cursor and delivery state before cutover. Disable the source callbacks, polling, SSE and outbox jobs before activating the Keiki route. Verify STOP suppression for known opt-outs, because new Keiki consent subscriptions do not backfill historical changes. Assign one responder per line and cohort. Test the same contact using two lines, duplicate webhook and poll delivery, text and attachment gating before a reply, iMessage and fallback, and opted-out recipients. Test last-known versus new-contact sends and status reconciliation where active. On rollback restore the saved source cursor, line and suppression routes without resending completed items. Follow [verification](../verification.md).
