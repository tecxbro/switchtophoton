# BlueBubbles source reference

Use this file only after repository evidence indicates a BlueBubbles server integration.

**Self-detection guard:** this file assumes a *consumer* of a BlueBubbles server. When the repository IS the provider's own codebase (`BlueBubblesApp/bluebubbles-server`, `@bluebubbles/server`, its REST/Socket.IO/webhook route sources), consumer fingerprints (`/api/v1`, server auth, webhook event names) match the provider's own source — classify repo shape as "provider's own product" and verdict infeasible-as-specified/do-not-migrate; the wire contract documented below is then reference material for Keiki-side gap reporting, not a migration target.

## Approved official documentation

- https://docs.bluebubbles.app/server/llms.txt
- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/developer-guides/rest-api-and-webhooks.md
- https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/SUMMARY.md

Use only official agent-readable sources permitted by [`index.md`](./index.md). Do not use GitBook or ordinary HTML documentation links.

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

BlueBubbles is self-hosted and depends on a local Mac server. Managed Keiki infrastructure is a trust, hosting, networking, authentication, operational, and data-access change even when the API boundary looks similar. **Keiki has no self-hosted iMessage transport** — `kit.serve()` self-hosts only the agent loop while channels/lines stay cloud, so "preserve local operation" is not achievable for the channel itself; state that plainly.

The concrete unavoidable changes the plan must enumerate:

- **Sender identity**: recipients see the Keiki-provisioned line's number, not the user's Apple ID/iMessage — threads do not continue and stored `chat_guid`s/`message_guid`s are invalidated;
- **Recurring cost**: Keiki iMessage lines are billed monthly per line; BlueBubbles is a one-time self-hosted setup;
- **Network reachability**: a LAN-local webhook receiver (`webhook_local_only`-style options) must become publicly reachable for Keiki `dispatchUrl`, or use relay/inbox mode — a security-relevant change;
- **Feature-axis loss**: `private_api` vs `apple-script` method selection, server-version feature guards, and `detected_imessage` identity have no Keiki analogs;
- **Auth model**: password-in-query server auth → Keiki API key + dispatch signing secret;
- **Echo messages**: `is_from_me`/`include_from_me` delivery of the account's own messages is unmappable — Keiki turns are inbound-only;
- **Webhook provisioning**: provider-side subscription CRUD (`/api/v1/webhook` create/delete on setup/teardown) becomes declarative agent `harness_config.dispatchUrl` — identify who owns cleanup;
- **Automation contracts**: integration-specific public surfaces (e.g. Home Assistant service names, trigger payload fields, config-entry identity) are product-visible — preserve or explicitly version them.

The plan must identify whether the closest target is a Keiki hosted surface (external harness, cloud-served agent, self-hosted SDK loop, developer REST API, or agent API gateway), explain the architecture change, and obtain approval before changing hosting. Do not promise parity for a Private API-only feature until the selected Keiki surface is verified.
