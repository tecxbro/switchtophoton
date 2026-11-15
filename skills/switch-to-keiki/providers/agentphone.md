# AgentPhone source reference

Official documentation: [AgentPhone](https://agentphone.ai/docs/imessage).

## Detect and pin

Look for `api.agentphone.ai`, the `/v1/numbers` endpoint, and iMessage routes/line config. Trace `type: imessage` and `imessageType` values when present.

## Inventory and migration risks

Distinguish inbound vs outbound line eligibility, an allocated line vs an accepted provisioning request, and attached-agent webhook routing. Record the active sender and preserve any SMS/voice path. Never provision a paid line in the planning phase.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.
