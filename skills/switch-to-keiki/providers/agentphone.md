# AgentPhone source reference

Official documentation: [AgentPhone](https://agentphone.ai/docs/imessage).

## Detect and pin

Look for `api.agentphone.ai`, the `/v1/numbers` endpoint, and iMessage routes/line config. Trace `type: imessage` and `imessageType` values when present.

## Inventory and migration risks

Distinguish inbound vs outbound line eligibility, an allocated line vs an accepted provisioning request, and attached-agent webhook routing. Record the active sender and preserve any SMS/voice path. Never provision a paid line in the planning phase.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Track purchase acceptance vs sender ready, inbound vs outbound line eligibility, agent attachment, forwarding/reply scopes, per-recipient pauses and callback status. Distinguish pinned direct message route from provisioning and SMS/voice. Test accepted-not-ready, wrong line type, simultaneous line config, and non-target services unaffected.

The [official Chat SDK adapter](https://github.com/AgentPhone-AI/chat-sdk-adapter)
is a distinct source contract. Find `agent.message`, `agent.call_ended` and
`agent.reaction` dispatch separately. In v0.1.0, the adapter can dispatch a
finished-call transcript as a Chat message as well as route inbound texts.
Exclude only the actual iMessage branch. Preserve thread line/recipient scope;
check add vs remove as separate paths (v0.1.0 throws for removal).
