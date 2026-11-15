# LoopMessage source reference

## Official documentation

Verified on 2026-11-14. Start with the [documentation index](https://loopmessage.com/llms.txt), then read [sending](https://loopmessage.com/apidocs/send-message), [credentials](https://loopmessage.com/apidocs/credentials), [webhooks](https://loopmessage.com/apidocs/conversation-api-webhooks), and the [generation changes](https://loopmessage.com/helpdesk/whats-new-in-the-next-generation-api/).

## Detection

- Distinguish the legacy `server.loopmessage.com/api/v1` fingerprint from the documented `a.loopmessage.com/api/v1` host. Both use a v1 path. The legacy documentation entry redirected to the current docs during verification, so use deployed configuration, code, and fixtures for legacy details.
- On the current API, look for `POST /api/v1/message/send/`, the raw organization API key in `Authorization`, `contact` or `group`, and a `sender` ID. Inspect older `sender_name` use and its actual value type. The vendor describes a switch from email aliases to IDs and changes to error codes.
- Corroborate with event names such as `message_inbound`, `message_delivered`, and `message_failed`, plus `message_id`, `webhook_id`, and recorded sender fields. Establish the active generation for sends and callbacks independently.

## Behavior to inventory

- Preserve phone and iMessage email normalization, inbound-first eligibility, opt-in links and forms, submission metadata, sender pools, and the distinction between dedicated and shared senders where used.
- Separate queue acceptance from delivery. Identify status polling, callback authorization as configured in the dashboard, acknowledgement, deduplication by `webhook_id`, and retry and ordering assumptions.
- Track explicit channel selection or fallback, public HTTPS attachment URLs, group replies, inline replies, tapback removal, typing/read side effects, and the provider IDs on which these operations depend. Inventory CRM callbacks and any historical records or contacts that must carry over at cutover.

## Replace an inbound-first iMessage responder

1. Trace `message_inbound` from the receiver through the app's contact lookup and handler to `POST /api/v1/message/send/`. Record whether replies specify `sender` or inherit sender routing. Capture one sanitized direct event and send result for the active generation. Record `Unknown generation` when the host, auth and fixtures cannot distinguish the contract and block affected mappings.
2. Bind a Keiki agent to a verified dedicated line. Use a shared line only if the app can adopt the join-code flow and the user approves the onboarding change. For a 1:1 `contact`, key the existing handler through a verified mapping from `(agentId, conversationId)` to the app contact. Preserve Apple email handles where active and verify Keiki exposes the needed identity. Bind `sender` or legacy `sender_name` to the configured line or verified channel metadata. Check this before replacing pool routing.
3. Validate and durably accept signed `keiki.turn` v1 dispatches. Feed each applicable `messages[].text` to the handler in place of source `text`, using Keiki `messages[].messageId` for message identity where present. Handle attachments through `messages[].attachments`. Keep delivery status events separate from the turn. Trace the app's identifier for each active source event during baseline analysis. An app may use `message_id` for inbound text and `webhook_id` for reaction events, so one deduplication key across both can drop reactions. Handle batched messages, arrivals and silent entries according to the app's reply policy.
4. Replace `{contact, sender, text}` sends from the handler with bearer-authenticated `POST {turnUrl}/messages` using a stable `idempotencyKey`; use the returned Keiki `messageId` for new sends. For native inline replies, `reply_to_id` becomes `replyToMessageId` using a Keiki turn message ID. For outbound media, upload bytes with the filename and MIME type and use the scoped attachment ID with `send_file`. Complete with `POST {turnUrl}/complete` after effects settle. A bare HTTP acknowledgement of the turn does not send the reply. [Turn contract](https://onkeiki.com/docs/external-harness#turn-request), [Turn-scoped operations](https://onkeiki.com/docs/external-harness#turn-scoped-api)

## Decide what can switch

- A full switch fits a turn-based 1:1 reply flow when sender, enrollment, contact identity and device behavior are verified. Targeted notices can trigger deterministic sends to existing conversations. A source `group.id` requires a verified Keiki group conversation on a dedicated Photon or Blooio line and the Group chats feature. Compare addressing rules with the app's current group responder. [Notices](https://onkeiki.com/docs/agent-api#notices-from-your-server), [Keiki groups](https://onkeiki.com/docs/cloud-agents#group-chats)
- Inventory sender-name pools, opt-in metadata, campaigns, other channels and delivery reconciliation. Verify equivalents or obtain approval for named losses before retiring LoopMessage. `message_delivered` and `message_failed` are source callbacks, and an accepted Keiki reply is insufficient proof of equivalent statuses. Evaluate the conditional SDK callback in the [evidence guide](../keiki-evidence.md) when the app stores those statuses.
- Keep first-contact sends blocked on the notice route. Dedicated LoopMessage senders can initiate under their own rules. Require an evidenced Keiki first-send operation before moving that behavior. Treat same-number import, Apple email continuity, explicit channel overrides, source read and typing coupling, rich text, and all active effect or tapback values as separate proof obligations.
- Trace each background job and reaction callback to any model run or send it triggers. Use Keiki for native Tapbacks when supported. A reaction-triggered workflow that has no proven Keiki equivalent must have its removal approved before the switch. Verify a supported send context for each background job. Check provider-supplied voice transcripts separately from attachment bytes. [Current migration scope](../imessage-capabilities.md#current-migration-scope)

## Cutover and acceptance

Keep existing enrollment bindings and source `message_id` records readable. Compare consent and join links before rerouting a cohort, under the cutover plan. Reconcile in-flight statuses before decommissioning the old callback and client. Test valid and invalid callbacks, duplicate deliveries, a burst, inbound-first restrictions, sender selection across configured lines, and the exact text or attachment visible on a device. For groups, test an addressed message, a quiet message and a threaded response. Roll back by restoring the cohort's route and sender with one responder, without replaying queued replies. Follow [verification](../verification.md).
