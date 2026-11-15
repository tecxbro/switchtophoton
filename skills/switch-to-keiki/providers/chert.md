# Chert source reference

Official documentation: [Chert](https://docs.trychert.com/introduction).

## Detect and pin

Detect Chert API callsites, exact endpoint versions and bearer or HMAC configuration. Check separately for Salesforce, HubSpot, Slack operators or FaceTime settings.

## Inventory and migration risks

Inventory tenant-scoped chats, pinned lines, history and delivery/retry events. Standalone API replacement does not preserve CRM-triggered campaigns, review or reply logging without a separate verified mapping.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Separate /api/v1/send from chat APIs, subscribed vs polling/SSE and CRM-owned triggers. Use [API index](https://docs.trychert.com/llms.txt) for exact paths and preview-line eligibility. Inventory tenant line pin, receipt/replay, mark-read, UTF-16 formatting, native voice/location, group admin and CRM state. Keep Salesforce/HubSpot/Slack approval and FaceTime/LiveKit independent. Test replay, duplicate output, Unicode ranges and unchanged CRM state.
