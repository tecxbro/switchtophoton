# BlueBubbles source reference

## Official documentation

Verified on 2026-11-14. Start with the [server documentation index](https://docs.bluebubbles.app/server/llms.txt) and [REST API and webhook guide](https://docs.bluebubbles.app/server/developer-guides/rest-api-and-webhooks.md). Use the [official server repository](https://github.com/BlueBubblesApp/bluebubbles-server), its [releases](https://github.com/BlueBubblesApp/bluebubbles-server/releases), and [event names](https://github.com/BlueBubblesApp/bluebubbles-server/blob/master/packages/server/src/server/events.ts) to corroborate version-specific features.

## Detection

- Look for a user-managed BlueBubbles server URL with `/api/v1` paths, `guid` query authentication or its `password` and `token` aliases, and the `new-message` and `updated-message` events. Confirm the server identity since hostnames and API-compatible wrappers vary.
- Record the deployed server version, platform, network or tunnel, and the status of the optional Private API. REST and webhooks have different minimum server versions, and later routes and private features depend on the active release and configuration.
- Identify incoming webhooks, polling, or Socket.IO clients from the app. Check active calls, health/version responses already present in evidence, fixtures, and deployment configuration.

## Behavior to inventory

- Record direct and group chat GUID handling, message GUIDs and temporary IDs, outbound echoes, attachment access, and history tied to the Apple account. Review any read or delivery updates, typing, reactions, replies, edits, unsends, effects, and participant changes. Identify which active behavior needs the Private API.
- Capture webhook registration ownership, authentication, acknowledgements, retries, deduplication, ordering, and any initialization, reconnect and shutdown behavior. Treat provider message updates as distinct from inbound messages in the behavior map.
- Document dependencies on the local Mac, Apple account, tunnel and network access. Flag any change to sender identity, local history access, hosting, or the trust boundary for cutover.

## Replace a Mac-backed responder

1. Confirm the deployed server version or record `BlueBubbles server generation unknown`. Trace the actual REST, Socket.IO, webhook or direct Mac database inputs the app uses. Capture the active send method and Private API guards. An official webhook example uses `type: "new-message"`, `data.isFromMe`, `data.chats[].guid`, and `POST /api/v1/message/text` with `chatGuid`, `text` and a send `method`. Inspect the deployed version and app fixtures for sparse updates, attachments, and fallback paths. [Official webhook example](https://docs.bluebubbles.app/server/developer-guides/simple-web-server-for-webhooks/python-web-server.md)
2. Keep the responder and its app state on the current host if needed. Select Keiki push for reachable HTTPS, relay for a connected forwarder, or inbox for a polling app. Bind an approved Keiki line and map its `(agentId, conversationId)` to the app conversation. Account for the original number or Apple Account address, group GUIDs, and history in the Messages database before changing the transport. [Relay and inbox](https://onkeiki.com/docs/external-harness#relay-mode)
3. Replace the inbound `new-message` handler with `keiki.turn` v1. Feed `messages[].text` and attachment metadata to existing app logic. In push or relay, verify the raw signature before acknowledging; use only the scoped claim and token for inbox work. Keep `data.guid`, chat GUID and temporary send GUID as source records. For app-side deduplication use verified Keiki turn or message IDs. Filter legacy outbound echoes and `updated-message` status updates at the source rather than feeding them to the new reply loop.
4. Replace `POST /api/v1/message/text` to an existing chat with `POST {turnUrl}/messages` and a stable `idempotencyKey`. The bound turn owns the recipient and line. Record the target `messageId` and call `POST {turnUrl}/complete` after effects settle. Map an active attachment send to upload plus `send_file`, and Private API actions to scoped Keiki IDs and routes with line-specific proof. [Turn-scoped operations](https://onkeiki.com/docs/external-harness#turn-scoped-api)

## Decide what can switch

- A full switch is viable for a responder whose behavior and approved sender identity are supported on a Keiki line. The app can remain local while Keiki owns transport. Direct and group GUIDs are distinct. Keiki group replies on an eligible line use its own conversation ID and addressing rules and need separate acceptance. [Keiki channels](https://onkeiki.com/docs/channels), [Group chats](https://onkeiki.com/docs/cloud-agents#group-chats)
- Keep BlueBubbles for a cohort that still needs its local Apple Account, chat database, Socket.IO or provider events. A Keiki queue forwards work for an agent, with scoped turn arrivals and history. It does not provide evidence of Mac database access, raw account-wide monitoring, chat or participant management, or status continuity. Preserve BlueBubbles for those paths until the mappings are verified.
- Block any required first-contact send on `/notice`. Verify same-identity cutover, separate inbound and outbound typing, read, delivery, edits, unsend and participant operations. A Keiki action operating on an agent's own message does not establish parity for arbitrary Apple Account history. The managed line changes where transport, access and data are controlled. [Notices](https://onkeiki.com/docs/agent-api#notices-from-your-server), [Keiki SDK and callback evidence](../keiki-evidence.md)

## Cutover and acceptance

Record the old Mac, Apple Account, tunnel, webhook registration owner and any cursors or pending sends. Preserve old chat and attachment access while required. Test one new inbound message, an outbound echo, reused GUIDs across event types, unsupported native actions, direct and supported group routes, local server loss, and reconnection of the chosen Keiki receiver. Test on the device for the intended sender and operations. Activate one responder for the selected route and keep old route configuration ready for rollback without replay. Follow [verification](../verification.md).
