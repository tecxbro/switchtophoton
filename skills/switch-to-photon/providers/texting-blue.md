# Texting Blue source reference

Use this file only after repository evidence indicates Texting Blue.

## Approved official documentation

- https://github.com/textingblue/imessage-api/blob/main/README.md

Use only this official Markdown README. Do not use ordinary documentation pages or the GitHub repository root.

## Detection and generation evidence

Look for combinations of:

- exact locked package or vendored-client metadata;
- `api.texting.blue/v1` in active code or configuration;
- `/v1/messages/send`, webhook, or number-management paths;
- bearer or API-key authentication shape;
- environment names containing `TEXTING_BLUE`;
- webhook events such as `message.received`;
- request, response, status, and message-ID fields in tests or fixtures;
- physical iPhone, shortcut, number-provisioning, or connectivity setup in deployment documentation.

Report the exact installed SDK version when present. For raw HTTP, report the known REST and webhook generation from paths and payloads. Do not assume the README's current behavior matches older repository code.

## Capabilities to inventory

Inventory active use of:

- outbound text and media;
- inbound webhooks;
- delivery and failure status;
- message identifiers and persisted compatibility;
- number or sender selection;
- webhook verification, acknowledgement, retries, deduplication, and ordering;
- rate limits, application retries, timeout, and error handling;
- physical iPhone, shortcut, provisioning, or always-connected operational dependencies.

## Migration traps

Hardware or shortcut removal is an architecture and operations change, not a trivial dependency replacement. The plan must identify it, choose the closest Photon hosting model, and obtain approval. Preserve stored message identifiers or provide an approved compatibility boundary.
