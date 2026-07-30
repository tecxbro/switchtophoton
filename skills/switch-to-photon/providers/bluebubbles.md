# BlueBubbles source reference

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

BlueBubbles is self-hosted and depends on a local Mac server. Managed Photon infrastructure is a trust, hosting, networking, authentication, operational, and data-access change even when the API boundary looks similar.

The plan must identify whether the closest target is Self-hosted iMessage Kit or a managed Photon product, explain the architecture change, preserve local operation when possible, and obtain approval before changing hosting. Do not promise parity for a Private API-only feature until the selected Photon target is verified.
