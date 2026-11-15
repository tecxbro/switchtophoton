# Choosing the Keiki target

Select Keiki only after the source provider, exact source generation, active capabilities, and current architecture are known. The target must preserve the existing implementation with the smallest safe change.

Consult:

- Keiki agent-readable documentation index: https://onkeiki.com/llms.txt
- Keiki full-text index: https://onkeiki.com/llms-full.txt
- Keiki OpenAPI contract: https://onkeiki.com/openapi.json (covers the developer REST API and OpenAI/Anthropic gateway; turn-scoped harness routes are documented in `docs/external-harness.md`)
- Keiki Markdown documentation: https://onkeiki.com/docs/index.md
- Keiki evidence and capability verification: [`keiki-evidence.md`](./keiki-evidence.md)

Keiki is an agent platform: every messaging surface is attached to an agent, and every outbound message is delivered inside a turn or through an approved channel action. Do not assume a raw provider-style "send SMS" endpoint exists; prove the exact public contract before planning around it.

## Keiki surfaces

| Surface | What it is | Best preserves |
|---|---|---|
| External harness — push | Keiki receives channel messages and POSTs a signed `keiki.turn` to your `dispatchUrl`; your app runs the model loop and calls the turn-scoped API (`/messages`, `/actions`, `/attachments`, `/typing`, `/stream`, `/complete`) | Existing webhook-in/custom-loop-backend architecture; your own agent loop and business logic. **Recommended default for messaging-provider migrations** |
| External harness — relay | Same turn contract, queued for a connected relay to forward | Existing relay/gateway topology or runtimes that cannot expose a public URL |
| External harness — inbox | Turns queued for an outside agent to claim by polling (`/harness/inbox/next`) with a harness API key | Polling workers, batch processors, or runtimes without inbound HTTP |
| Cloud-served agent | `kit.sync()` / `client.sync()` / `client.deploy()` pushes a declarative agent config; Keiki runs the loop (`flue` harness default, `hermes`, or `external`) | Applications already shaped as an agent definition |
| Self-hosted SDK loop | `kit.serve()` runs the agent loop on your infrastructure while Keiki owns channel ingress and delivery | Existing self-hosted worker/server model that wants Keiki channels without writing a harness |
| Developer REST API | `/api/v1/developer/*` — deployments, agents, tools, skills, secrets, Slack apps, trace exporters, MCP sender credentials, proactive `notice` | Provisioning and per-user agent lifecycle (`external_ref` = one user → one agent); server-initiated notices |
| Partner deployments | `POST /api/v1/developer/deployments` keyed by `external_ref`; channels `imessage`, `telegram`, `whatsapp`, `slack`, `agentmail`, `api`, `a2a` | B2B products that deploy one agent per end user |
| Agent API gateway (`api` channel) | OpenAI `/api/v1/openai` and Anthropic `/api/anthropic` compatible completions per agent and `x-conversation-id`; `passthrough` mode where the caller owns prompt and tools | Applications that already call chat-completions-style APIs |
| Keiki event webhooks | Signed `keiki.conversation.opt_status_changed` consent events plus a delivery-inspection ledger (`/webhook-deliveries`, manual resend) | Opt-out/consent handling and delivery auditing layered onto any other surface |
| Identity webhook | Keiki calls your HTTPS endpoint once per new sender per conversation to resolve `{userId, role, scopes}` | Apps that need per-sender authorization on shared agents |
| Keiki MCP server / Code Mode MCP | Organization operations exposed as MCP tools (`onkeiki.com/mcp`, `/mcp/codemode`) | MCP-native agent clients only |
| Framework adapters | `@onkeiki/flue`, `@onkeiki/eve`, `@onkeiki/ai-sdk` for external-harness runtimes; `@onkeiki/channels` helpers (`verifyKeikiRequest`, `verifyKeikiDispatch`, `signTurnAuth`, `createTurnClient`, `keikiMessagePrompt`, `connectKeikiDispatch`) | Apps already built on Flue, Eve, or AI SDK 7 |
| A2A | Agent2Agent protocol endpoint per agent (`/a2a/<agentId>/`) | Inbound calls from other vendors' agents |
| Keiki CLI / Alchemy | `keiki` CLI for login/config; `@onkeiki/alchemy` IaC resources | Deployment tooling, not a runtime boundary |

The final target may contain one or more surfaces.

Select the architecture that produces the smallest safe migration rather than automatically preferring the fewest surfaces.

## Separate transport decisions

Choose each layer independently while preserving the existing application architecture by default.

| Application layer | Keiki options |
|---|---|
| Inbound channel events | External harness push/relay/inbox dispatch; Keiki event webhooks for consent/delivery events; SDK `handleInbound` for programmatic injection; agent API gateway for programmatic conversations |
| Inbound provisioning | Developer REST API deployments; MCP `deploy_agent` |
| Outbound text and actions | Turn-scoped `/messages` and `/actions` (react, edit, delete, send_file, send_widget); channel-native delivery by Keiki; proactive `notice` for agent-mediated outbound |
| Outbound programmatic chat | Agent API gateway completions (streaming or passthrough) |
| Attachment send | Turn-scoped `/attachments` upload then `send_file` action; channel limits still apply |
| Attachment retrieval | Turn payload `attachments[].url` (15-minute signed URL) or `GET {turnUrl}/attachments/{id}` |
| Reactions, effects, edits, unsend | `/actions` native channel actions where the channel supports them; `effect` on `/messages` |
| Typing | `POST {turnUrl}/typing` where the channel supports it |
| Agent definition | `@onkeiki/agents` config synced via `kit.sync()`/`client.sync()`/`client.deploy()` |
| Per-user agents | Partner deployments keyed by `external_ref` |
| Org operations | Developer REST API or Keiki MCP |

## Channel and line model

- Deployment channel `type` values: `imessage`, `telegram`, `whatsapp`, `slack`, `agentmail`, `api`, `a2a`. SMS is **not** a deployment channel — SMS lines are bought and attached on the dashboard Channels page. Teams, phone calls, Apple Messages for Business, RCS, and shared iMessage numbers are dashboard-managed and absent from the deployment spec.
- iMessage line kinds: Instant, Standard, On-request, Imported, Shared number. Capability matrices differ per kind (edit/delete/files/voice/polls/app cards).
- Underlying iMessage line providers include `photon`, `blooio`, and `linq`. Group chats work only on dedicated `photon`/`blooio` lines with `features.groupChats` enabled; `linq` lines return `group_chats_unsupported`; shared-pool lines ignore groups.
- `lines` (1–10) is a minimum count: raising buys missing lines, lowering releases none. Replies always use the line the person texted; conversations without a line need an explicit `line` for proactive sends (`sender_line_required`).
- Rate limits: 7,000 sent messages per active line per UTC day pooled across lines, and 50 new conversations per line per day (`daily_line_volume_reached`); replies are unaffected. `429 recipient_reply_required` means the recipient must message first.
- `conversationId` format varies by channel (E.164 contact for iMessage/SMS DMs, channel-scoped IDs for Slack/WhatsApp, caller-chosen `x-conversation-id` for the API channel). Verify the exact grammar for the active channel before planning identifier mapping.

## Known parity gaps to respect

- There is **no generic inbound "message received" webhook** — inbound reaches your app only through harness dispatch (push/relay/inbox), the agent itself, or the API gateway. A source integration built on passive webhook consumption maps to external-harness push.
- There is **no public delivery-status or read-receipt event API**; delivery is tracked internally and inspectable through the delivery ledger, not pushed as message events.
- Group-chat support is restricted to dedicated `photon`/`blooio` iMessage lines with the feature enabled.
- Proactive verbatim sends do not have a raw REST endpoint; use a turn (`/messages`), the API gateway, or the agent-mediated `notice` endpoint.
- Imported iMessage lines carry no provider-verified sender evidence, so identity webhooks and scoped tools do not run on them.

## Availability and entitlement check

Keiki documents several surfaces that are not generally available or deployable today. Verify availability for the target organization before selecting any surface, and flag gated capabilities in the plan instead of assuming access.

| Surface or capability | Availability constraint | Evidence |
|---|---|---|
| Everything except a bought iMessage line | Requires an active paid plan; `plan_required` on connect | `docs/channels.md`, `docs/pricing.md` |
| API gateway (`api` channel, OpenAI/Anthropic-compatible) | Plan-gated: `402 plan_required`; `503 billing_unavailable` when billing cannot confirm | `docs/agent-api.md` |
| A2A channel | Plan-gated: `402 plan_required` | `docs/a2a.md` |
| `channels` OAuth scope / agent-channels API | Requires plan; separate OAuth issuer | MCP docs |
| iMessage lines | Per-line monthly billing by plan tier; deployment `lines` may return `needs_payment` + `checkoutUrl`; On-request lines not charged at request time | `docs/partner-deployments.md`, `docs/pricing.md` |
| SMS | Not a deployment channel — lines are bought and attached on the dashboard Channels page | `docs/setup.md` |
| Teams, phone calls, Apple Messages for Business, RCS, shared iMessage number | Dashboard-managed; absent from the partner-deployment channel spec | `docs/channels.md`, `docs/partner-deployments.md` |
| RCS, Apple Messages for Business | Early access / request-access only | `docs/channels.md` |
| `send_widget` / Keiki Vault iMessage apps | Dedicated Keiki-bought line + Dynamic UI add-on + 1:1 chat only; not groups, held-back, steered, or detached turns | `docs/imessage-apps.md` |
| Group chats | Dedicated `photon`/`blooio` line + `features.groupChats` enabled; `linq` lines unsupported; shared pool ignores groups | `docs/channels.md` |
| Sandbox organizations | MCP works without a plan but turns are capped (cheap model, fewer steps, no MCP tools) | MCP docs |
| Organization signup | Waitlist-gated (`/api/webapp/auth/waitlist`); AgentID signup path skips waitlist | auth docs |
| Imported iMessage lines | Identity webhooks and scoped tools do not run; turns run without a principal | identity docs |
| Delivery status / read receipts | Tracked internally and inspectable via the delivery ledger; no public event API | `docs/webhooks.md` |

Record each selected surface's availability status in the plan: `available`, `plan-gated`, `entitlement-gated`, `early-access`, `dashboard-only`, `add-on-required`, or `unavailable` — with the evidence. A capability that exists in documentation but fails this check is flagged as documented-but-unavailable, never silently planned or silently dropped.

## Selection rules

1. Prefer the smallest architectural change.
2. Preserve the current programming language.
3. Preserve the hosting model when possible.
4. Preserve the inbound and outbound transport shape.
5. Do not introduce MCP into an ordinary backend.
6. Do not force a hosted Keiki agent loop into a REST or webhook application solely because it supports the required capabilities. Select a hosted loop only when the source already uses an agent or unified message-stream abstraction, or when the plan proves that adopting one creates a smaller and safer migration than preserving the existing boundaries.
7. Do not move a managed provider to self-hosted infrastructure or vice versa without identifying the architecture change.
8. Do not remove non-iMessage channels unless they are explicitly included in the approved scope.
9. Select based on capabilities proven to be active, not either provider's maximum feature list.
10. Load the corresponding official Keiki documentation page after selecting the target.
11. Select one or more Keiki surfaces based on the smallest safe complete architecture. A mixed target may be preferred when it preserves existing inbound, outbound, attachment, hosting, adapter, or lifecycle boundaries with fewer application changes.
12. For installable Keiki packages, record the exact planned package version. During verification, confirm that the exact lockfile-resolved installed version matches the approved planned version.
13. For hosted Keiki services, record the service, endpoint, public API or event contract, documentation source, and retrieval date. Do not invent a hosted-service version when none is published.
14. Inspect exact public methods, endpoints, event contracts, types, closed values, open-value rules, and applicable error behavior before assigning confidence.
15. Never remove an active capability to fit the initially selected target. Reconsider the Keiki architecture first.
16. Do not claim that one target makes identifiers, attachments, or routing less direct without exact public API evidence.
17. Compare source failure behavior with the synchronous, asynchronous, webhook, harness-dispatch, gateway, or REST behavior applicable to the selected Keiki surfaces.
18. Verify recipient-line identity and multi-number routing before claiming line parity. Keiki assigns the sending line from the line the person texted; you never name an outgoing number on iMessage replies.
19. Architecture preservation remains the default. A capability supported by a hosted Keiki agent does not by itself justify replacing an existing REST or HTTP-webhook boundary.
20. Any transport change must identify:

    - why the existing Keiki REST, webhook, harness, gateway, or SDK surface is insufficient;
    - every application module affected;
    - the lifecycle introduced by the new transport;
    - the additional verification required;
    - why the change is safer than preserving the current architecture.
21. Prefer the Keiki architecture that produces the smallest safe migration.
22. Verify every selected Keiki surface is available for the target organization's plan, region, and entitlements before planning. Never plan against a documented-but-unavailable surface without flagging it, and never silently substitute a different surface for a gated one — surface the gate and let the plan record the approved workaround.

    Compare:

    - application files changed;
    - transport changes;
    - hosting changes;
    - runtime and dependency changes;
    - lifecycle complexity;
    - credential complexity;
    - verification difficulty;
    - operational behavior.

    Do not prefer one Keiki surface merely because it has broad capability coverage.

## Mixed target decision record

When more than one Keiki surface is selected, the plan must include:

| Responsibility or capability | Required Keiki surface | Why the combination is safer or smaller | Why another selected surface is insufficient for this boundary | Shared identifier or credential | Event or connection owner | Lifecycle owner |
|---|---|---|---|---|---|---|

The plan must also define:

- duplicate-event and duplicate-listener prevention;
- retry behavior;
- ambiguous-result handling;
- disconnect and reconnect behavior when applicable;
- webhook acknowledgement and retry behavior when applicable;
- shutdown behavior.

Mixed targets are blocked until every applicable responsibility and lifecycle row is complete.

## Target-specific routing

| Target | Preserve |
|---|---|
| External harness push | Existing public-HTTPS webhook receiver and custom agent loop |
| External harness relay | Existing relay, tunnel, or gateway topology |
| External harness inbox | Existing polling worker or batch consumer |
| Cloud-served or self-hosted agent | Existing agent definition, unified message-stream abstraction, or server loop |
| Developer REST API / partner deployments | Existing per-user provisioning and `external_ref`-style identity mapping |
| Agent API gateway | Existing chat-completions-style caller or programmatic conversation boundary |
| Keiki event webhooks / identity webhook | Existing operational event consumption and per-sender authorization |
| Keiki MCP / Code Mode MCP | Existing MCP-native tool boundary only |
| Framework adapters (`@onkeiki/flue`, `@onkeiki/eve`, `@onkeiki/ai-sdk`) | Existing Flue, Eve, or AI SDK 7 application structure |
| A2A | Existing agent-to-agent caller boundary |

After selection, confirm identifiers, authentication, event delivery, attachments, retries, idempotency, lifecycle, closed and open values, error semantics, credential names, package versions, and hosted-service contracts from the matching official Keiki evidence. Do not invent APIs or copy broad Keiki documentation into this repository.
