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
