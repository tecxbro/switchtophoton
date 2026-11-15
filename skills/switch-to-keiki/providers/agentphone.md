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
