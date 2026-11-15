# AgentPhone source reference

## Official documentation

Verified on 2026-11-14. Start with the [documentation index](https://agentphone.ai/llms.txt), [iMessage setup](https://agentphone.ai/docs/imessage.md), [OpenAPI specification](https://agentphone.ai/openapi.json), [messages](https://agentphone.ai/docs/documentation/guides/messages.md), and [webhooks](https://agentphone.ai/docs/documentation/guides/webhooks.md).

## Detection

- Look for the `agentphone` TypeScript or Python SDK, `AGENTPHONE_API_KEY`, the bearer-authenticated `api.agentphone.ai/v1` host, and `POST /v1/messages` with `number_id`, `to_number`, and `body`. Record the installed SDK version and actual REST contracts independently.
- Confirm iMessage through a line provisioned as `type: "imessage"`, iMessage-specific calls or configuration, or `channel: "imessage"` in `agent.message`. The event envelope and messaging API also serve other channels.
- Distinguish account-level and agent-level webhook routing, the line's inbound/outbound mode, and allocated line IDs from asynchronous provisioning request IDs.

## Behavior to inventory

- Preserve the sender selection from `data.numberId`. Route direct messages by `data.from` and group conversations by `data.group.groupId` as used in the app.
- Track acceptance, history and actual delivered channel, new-recipient and consecutive-send limits, fallback, and text-first restrictions. Include active media, reactions, effects, contact sharing, and group operations.
- Capture `agent.message` and other active event types, HMAC over the timestamp and raw body, `X-Webhook-ID` deduplication, acknowledgements and retries, and any use of `conversationState`. A text webhook handler can acknowledge the event and submit a reply through `POST /v1/messages`. Inspect voice handlers separately since their HTTP response may supply a live turn.

## Replace a reply-only iMessage integration

1. Trace the `agent.message` branch for `channel: "imessage"` as well as any fallback service that the handler accepts. Identify whether a per-agent webhook overrides the project endpoint. Read the allocated `numberId` from active routing evidence and record `imessageType`. A `202` provisioning `requestId` and an allocated number `id` serve different purposes.
2. Bind each active AgentPhone sender to a Keiki line and agent. Map `data.numberId` and `data.to` to the verified line binding, and `data.from` and `data.conversationId` to the app conversation through `(agentId, conversationId)`. Prove multi-line attribution before migrating it. Keep `data.group.groupId` and the sending member distinct when group routing is in scope.
3. Convert inbound `data.message` and media to signed `keiki.turn` v1 `messages[].text` and `messages[].attachments`. Store old `data.messageId` separately from new turn message IDs. Preserve active `conversationState` fields in the app using the new identity mapping. Compare any `recentHistory` evidence with the bounded turn history before using it to replace app state. Acknowledge the verified dispatch after durable acceptance, handling batches, retries and any required arrivals through the turn lifecycle.
4. Replace `POST /v1/messages` with `POST {turnUrl}/messages` for text, using the active turn bearer and a stable `idempotencyKey`. The turn owns the recipient and sending line. Record the Keiki `messageId` and call `POST {turnUrl}/complete` after effects settle. For rich actions, map each active effect, attachment and group reply to an evidenced scoped operation. Use Keiki's built-in action for supported Tapbacks. List unsupported sticker or reaction behavior for removal. [Turn request](https://onkeiki.com/docs/external-harness#turn-request), [Turn-scoped operations](https://onkeiki.com/docs/external-harness#turn-scoped-api)

## Decide what can switch

- A full switch is plausible for a reply-only iMessage handler once the recipient, line, fallback behavior and stored state are proven. Map native Tapback sends to Keiki. Replace any active `agent.reaction` consumer only after proving the corresponding Keiki notification and required downstream behavior. List any unmapped trigger for approval to remove it. Verify the emitting line and availability of an equivalent to `agent.contact_shared` before moving its consumer. [Source webhooks](https://agentphone.ai/docs/documentation/guides/webhooks.md), [Current migration scope](../imessage-capabilities.md#current-migration-scope)
- Inventory other channels, voice webhooks and history reconciliation as dependencies of provider retirement. Verify the separate Keiki phone-call contract if used, including response content and timeout. Map or obtain approval to remove active delivery-status and `deliveredChannel` consumers. Keep historical IDs as read-only data when necessary. [Source messages](https://agentphone.ai/docs/documentation/guides/messages.md), [Keiki channels](https://onkeiki.com/docs/channels)
- An AgentPhone outbound iMessage line can initiate new contacts. `/notice` only reaches an existing Keiki conversation and respects line eligibility. Require an evidenced first-send operation for that behavior. List group creation, roster operations and storage behavior individually as mapped, approved for removal or blocking. The Keiki group reply feature requires an eligible line and uses different addressing rules. [Source iMessage setup](https://agentphone.ai/docs/imessage.md), [Notices](https://onkeiki.com/docs/agent-api#notices-from-your-server), [Keiki groups](https://onkeiki.com/docs/cloud-agents#group-chats)

## Cutover and acceptance

Stage only a verified line or cohort and keep its receipt and conversation mappings. Exercise a text burst and duplicate, an exact app-rule match, wrong line or agent, inbound-only first-contact rejection, pre-reply restriction, and iMessage versus fallback delivery. Verify any approved replacement of voice and other channel behavior. Disable the AgentPhone responder before activation and remove its client and callback. Restore the prior deployment on rollback without replaying sends. Follow [verification](../verification.md).
