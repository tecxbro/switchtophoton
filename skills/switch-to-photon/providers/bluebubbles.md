# BlueBubbles source reference

## Official documentation

- REST API and webhooks: https://docs.bluebubbles.app/server/developer-guides/rest-api-and-webhooks
- Webhook server example: https://docs.bluebubbles.app/server/developer-guides/simple-web-server-for-webhooks
- Documentation home: https://docs.bluebubbles.app/landing-page

## Detection and version cues

Look for a user-managed BlueBubbles server URL, `/api/v1` paths, query authentication such as `guid`, `password`, or `token`, BlueBubbles webhook event names, server setup documentation, and local Mac/network dependencies.

BlueBubbles REST support requires an older minimum server generation than webhooks; exact endpoint availability can still vary by installed server version. Determine the server version from configuration, health/about endpoints, deployment files, or user documentation when available.

## Inventory and traps

Inventory sending, attachments, chats/groups, read/delivery updates, typing, message errors, participant changes, Private API-only features, and webhook subscriptions.

Preserve the self-hosted trust boundary in the plan. Moving from a local Mac server to managed Photon infrastructure is an architectural change even when API calls look similar. Explicitly list local-server removal, networking, authentication, and data-access differences.
