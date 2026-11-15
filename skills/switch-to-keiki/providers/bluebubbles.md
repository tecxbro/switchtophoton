# BlueBubbles source reference

Official documentation: [BlueBubbles](https://github.com/BlueBubblesApp/bluebubbles-server).

Use this file only after repository evidence indicates a BlueBubbles server integration.

## Approved official documentation

- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/developer-guides/rest-api-and-webhooks.md
- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/SUMMARY.md

Use only official Markdown files permitted by [`index.md`](./index.md). Do not use GitBook or ordinary HTML documentation links.

## Detection and server-generation evidence

Look for:

- a user-managed BlueBubbles server URL;
- `/api/v1` paths;
- server authentication fields or query parameters;
- BlueBubbles-specific webhook event names and payloads;
- local Mac, network, tunnel, or server deployment dependencies;
- server health/about/version responses, configuration, deployment files, or setup documentation;
- Private API enablement and feature guards.

Report the installed server generation when exact evidence exists. Otherwise report `BlueBubbles server generation unknown` with confidence and blocker status. Endpoint availability may vary by server generation and Private API configuration.

## Capabilities to inventory

Inventory only active behavior, including:

- sends and inbound events;
- direct and group chats;
- attachments and downloads;
- message GUIDs and chat identifiers;
- read or delivery updates;
- typing;
- reactions, replies, edits, unsends, or effects;
- participant changes;
- webhook authentication, acknowledgement, retries, deduplication, and ordering;
- Private API-only behavior;
- initialization, reconnect, server availability, and shutdown assumptions.

## Architecture and migration traps

Moving off a Mac relay changes hosting, trust, data access and local availability.
Prove that the selected Keiki contract covers any Private API behavior. Keep local
fallback/rollback separate and do not remove the Mac relay before approved cutover.
