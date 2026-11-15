# BlueBubbles source reference

Official documentation: [BlueBubbles](https://github.com/BlueBubblesApp/bluebubbles-server).

Use this file only after repository evidence indicates a BlueBubbles server integration.

## Approved official documentation

- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/developer-guides/rest-api-and-webhooks.md
- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/SUMMARY.md

Prefer the official source and versioned docs under the [source evidence policy](index.md). Determine whether the active server is a fork and whether the official contract matches it.

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

## Implementation checkpoints

Distinguish bot, UI/history consumer, private relay and app-owned sender using the REST/socket boundary. Private local behavior is not implied by Keiki turn support. Test Mac reconnect/history catch-up, self-echo, structured chat and message GUID mapping, attachment readability and any private native action.

The [official server](https://github.com/BlueBubblesApp/bluebubbles-server)
is not the deployer's consuming bot. Pin both producer and consumer when a fork
or SDK is involved. Inspect server REST, Socket.IO, local chat database and
Private API separately; they share GUIDs but have different availability and
privacy dependencies. Never run a Mac relay or access local Messages history
just to classify the API.
