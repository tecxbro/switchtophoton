# Choose the Keiki boundary

Start at [Keiki docs](https://onkeiki.com/docs) and [channel matrix](https://onkeiki.com/docs/channels.md).
Match the existing behavior, not the name of the old provider API.

| Existing architecture | Candidate | What to prove |
| --- | --- | --- |
| App owns the agent loop and receives HTTP events | [External push harness](https://onkeiki.com/docs/external-harness.md) | Signed asynchronous turns, durable acceptance (202), dedupe, per-turn replies/actions and completion. A turn is not a raw event feed. |
| Existing runtime cannot accept inbound pushes | [External relay or inbox](https://onkeiki.com/docs/external-harness.md#relay-mode) | Connectivity, worker lifetime, claims/leases, ordering and behavior while offline. Do not silently add a long-running process to serverless hosting. |
| Existing app uses AI SDK, Eve or Flue | [AI SDK](https://onkeiki.com/docs/ai-sdk.md), [Eve](https://onkeiki.com/docs/eve.md), or [Flue](https://onkeiki.com/docs/flue.md) adapter | Compatible version, hosting/runtime support, exact event/arrival semantics and app-owned state. Pin exact resolved versions. |
| App already hosts its own loop and an AgentKit handler is a compatible boundary | [Self-hosted AgentKit](https://onkeiki.com/docs/sdk.md) | Confirm `kit.serve()` contract, serving runtime, persistence and channel routing. Do not substitute this for external harness without comparing both. |
| Existing behavior can be expressed as managed agent config, with approved ownership change | [Keiki-hosted AgentKit](https://onkeiki.com/docs/cloud-agents.md) | `kit.sync()` registers configuration. Prove tool, auth, memory, prompt and lifecycle parity; moving the loop to Keiki changes ownership. |
| App is a raw messaging sender or independent event consumer | Verify the exact requested public contract, or mark unresolved | Turn-scoped replies/notice runs, model APIs, consent webhooks and MCP are not presumptive replacements for arbitrary recipient sends, message history, delivery events, or bulk operations. |

## iMessage transport selection

- Compare dedicated, imported, and shared lines. Shared lines require recipient join
  and cannot replace arbitrary first contact. Normal iMessage and Apple Messages for
  Business are separate surfaces.
- Record the actual line type, backing provider, org and agent. Check channel
  limits and plan eligibility, group support, attachments, effects, replies, reactions,
  edit/delete, and Android/SMS/RCS separately. An SMS fallback route is not proof of
  feature parity for standalone SMS or RCS. Check [channels](https://onkeiki.com/docs/channels.md)
  for current restrictions.
- Importing an existing provider account can keep a dependency on that provider. A new
  Keiki number, an imported line, and a port are three different choices. Never assume
  portability, history continuity, routing, or permission to cancel the old line.
- Document what happens to active sessions, join links, provider-scoped message IDs,
  existing groups, routing keys, opt-outs and inbound handlers, with migration and rollback.
