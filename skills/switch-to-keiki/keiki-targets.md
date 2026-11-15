# Choosing the Keiki target

Select Keiki only after the source provider, exact source generation, active capabilities, and current architecture are known. The target must preserve the existing implementation with the smallest safe change.

Consult:

- Keiki agent-readable documentation index: https://onkeiki.com/llms.txt
- Keiki full-text index: https://onkeiki.com/llms-full.txt
- Keiki OpenAPI contract: https://onkeiki.com/openapi.json (covers the developer REST API and OpenAI/Anthropic gateway; turn-scoped harness routes are documented in `docs/external-harness.md`)
- Keiki Markdown documentation: https://onkeiki.com/docs/index.md
- Keiki evidence and capability verification: [`keiki-evidence.md`](./keiki-evidence.md)

Keiki reference knowledge in this file was verified against official docs and `openapi.json` on 2026-11-14. Keiki ships frequently — re-verify contracts at plan time; do not treat this file's snapshot as current forever.

Keiki is an agent platform: every messaging surface is attached to an agent, and every inbound channel message spins an agent turn (billing, trace, and prompt-guard included). Every outbound message is delivered inside a turn or through an approved channel action. Do not assume a raw provider-style "send SMS" endpoint exists; prove the exact public contract before planning around it.

## Keiki surfaces

| Surface | What it is | Best preserves |
|---|---|---|
| External harness — push | Keiki receives channel messages and POSTs a signed `keiki.turn` to your `dispatchUrl`; your app runs the model loop and calls the turn-scoped API | Existing webhook-in/custom-loop-backend architecture; your own agent loop and business logic. **Recommended default for messaging-provider migrations** |
| External harness — relay | Same turn contract, queued for a connected relay to forward | Existing relay/gateway topology or runtimes that cannot expose a public URL. **Does not receive `keiki.reaction` events** |
| External harness — inbox | Turns queued for an outside agent to claim by polling (`/harness/inbox/next`) with a harness API key | Polling workers, batch processors, runtimes without inbound HTTP, or plugins with no HTTP server |
| Non-turn dispatch events | `keiki.reaction` pushes (contact tapbacks — never start a turn, signed like cancellations, push mode only); cancellation events | Inbound reaction handling for webhook-style apps |
| Cloud-served agent | `kit.sync()` / `client.sync()` / `client.deploy()` pushes a declarative agent config; Keiki runs the loop | Applications already shaped as an agent definition |
| Self-hosted SDK loop | `kit.serve()` runs the agent loop on your infrastructure while Keiki owns channel ingress and delivery — **it does NOT self-host iMessage; lines stay cloud** | Existing self-hosted worker/server model that wants Keiki channels without writing a harness |
| Developer REST API | `/api/v1/developer/*` — deployments, agents, tools, skills, secrets, Slack apps, trace exporters, MCP sender credentials, proactive `notice` | Provisioning and per-user agent lifecycle (`external_ref` = one user → one agent); server-initiated notices |
| Partner deployments | `POST /api/v1/developer/deployments` keyed by `external_ref`; channels `imessage`, `telegram`, `whatsapp`, `slack`, `agentmail`, `api`, `a2a` | B2B products that deploy one agent per end user |
| Agent API gateway (`api` channel) | OpenAI `/api/v1/openai` and Anthropic `/api/anthropic` compatible completions per agent and `x-conversation-id`; `passthrough` mode | Applications that already call chat-completions-style APIs |
| Keiki event webhooks | Signed `keiki.conversation.opt_status_changed` consent events plus a delivery-inspection ledger | Opt-out/consent handling and delivery auditing layered onto any other surface |
| Identity webhook | Keiki calls your HTTPS endpoint once per new sender per conversation to resolve `{userId, role, scopes}` | Apps that need per-sender authorization on shared agents |
| Keiki MCP server / Code Mode MCP | Organization operations exposed as MCP tools (`onkeiki.com/mcp`, `/mcp/codemode`) — **org ops, not messaging primitives** | MCP-native agent clients only; never a messaging transport |
| Framework adapters | `@onkeiki/flue`, `@onkeiki/eve`, `@onkeiki/ai-sdk`, `@onkeiki/channels` helpers | Apps already built on Flue, Eve, AI SDK 7, or raw HTTP wanting typed helpers |
| A2A | Agent2Agent protocol endpoint per agent (`/a2a/<agentId>/`) — **inbound only** | Inbound calls from other vendors' agents |
| Keiki CLI / Alchemy | `keiki` CLI; `@onkeiki/alchemy` IaC | Deployment tooling, not a runtime boundary |

The final target may contain one or more surfaces.

Select the architecture that produces the smallest safe change rather than automatically preferring the fewest surfaces.

## Turn lifecycle and payload semantics (external harness)

Every harness dispatch is a **turn** with a deadline (`timeoutMs`, default and max 10 minutes). The contract:

- Keiki POSTs a signed `keiki.turn` (`version: 1`) to `dispatchUrl` with headers `Keiki-Turn-Id`, `Keiki-Turn-Token` (`ht_…` short-lived bearer), and `Keiki-Signature` (HMAC `t=<unix>,v1=<hex>` over `"<unix>.<raw-body>"`) and/or `Keiki-Signature-Ed25519` (platform keys at `https://onkeiki.com/.well-known/keiki-turn-keys.json`). Your app answers any 2xx (adapters use `202`), then works the turn.
- **You must settle the turn** via `POST {turnUrl}/complete` (`{status, consumedArrivals?}`). An unsettled turn dies at its deadline. A source app with no turn concept inherits this obligation — it is required compensation, not a feature.
- **Turn credentials are secrets.** `Keiki-Turn-Token` (`ht_…`) and `kts1.…` credentials are short-lived and scoped to one turn — never log them, never store them in event dumps or error reports.
- `messages[]` can contain **multiple batched inbound messages** (burst grouping). Fan out per message for parity; share the turn context for replies; report consumed arrival sequences at `/complete`.
- Message entries carry raw `text` and annotated `content` (e.g. `[Message; message_id=…]`, `[Voice note: …]`). **Parse `text`, not `content`.** `silent:true` marks platform-generated entries (notices, prompt-guard exclusions) — never feed them to your agent as user messages.
- `midTurnStrategy` ∈ `append` | `interrupt` | `queue` controls whether new inbound during a turn arrives as signed `keiki.turn.arrival` pushes (append) or waits. `/complete` reports `consumedArrivals`; unconsumed batches requeue.
- Held-back turns (steered/Live Test) run without delivering; turn actions return `400 held_back`.
- **Opt-out suppression happens before dispatch** — a contact who texted STOP never reaches your app. Consent state is not send eligibility.
- Non-turn events: `keiki.reaction` (tapbacks, `reaction:{emoji,removed,messageId,on}` — **no sender field documented**; push mode only; relay mode does not receive it) and cancellations arrive at the same `dispatchUrl`, signed, and need only a 2xx — no turn settlement.
- Turn-scoped routes under `{turnUrl}` = `/api/v1/turns/:turnId`: `POST /messages` (`{text, idempotencyKey?, replyToMessageId?, effect?}` → `{messageId}`), `POST /actions` (`react`/`edit`/`delete`/`send_file`/`send_widget`; `send_file` takes `attachmentId` or `path` plus optional `caption`), `POST /attachments?filename=` (raw bytes ≤100MB → `att_…`), `GET /attachments/{id}`, `POST /typing`, `POST /stream`, `POST /lease` (refresh a live claim for long-running turns), `POST /complete`, `GET /return-link`, `GET /arrivals?after=N`.
- Relay mode claims queued turns via `GET /api/v1/harness/turns/next`; inbox mode claims via `GET /harness/inbox/next` with a harness API key.
- Send semantics: same `idempotencyKey` never double-sends (success → duplicate ack; delivery error → `502 {retryable:false}`, retry with same key → `409 previous_attempt_failed` — use a NEW key accepting possible double-send); `409 turn_closed`; `400 unsupported` before send; `429 recipient_reply_required` (`retryable:false` — the recipient must message first; a platform notice does not count).
- Inbound attachment `url` is credential-free for 15 minutes; `GET {turnUrl}/attachments/{id}` is the authenticated fallback.
- Group-chat turns carry addressing metadata, but whether the external harness receives **all** group messages or only Keiki-addressed ones (name/@mention/reply/5-minute window/decisions model — "other messages saved quietly as context") is **unverified** — confirm before planning group parity. Per-message sender *phone handle* in groups is likewise unverified.

## Proactive and out-of-turn outbound

- **There is no raw "send a message" REST endpoint.** Proactive verbatim sends have exactly three documented paths:
  1. **A turn** — outbound messages exist only inside an active turn (`{turnUrl}/messages`). Turns originate from inbound channel messages, notices, or steer/Live-Test dispatches; you cannot open a turn for an arbitrary recipient.
  2. **`POST /api/v1/developer/agents/:agentId/notice`** — `{text, phone?, line?}`. For a **hosted Keiki agent**, `text` is "written for the agent, never delivered verbatim" and `phone` must identify an **existing conversation** (404 otherwise; a notice cannot open a conversation with a new identity). For an **external-harness agent**, the notice becomes a `silent:true` turn dispatched to *your* app — your loop can then send the verbatim text via that turn's `/messages`. This notice→silent-turn→`/messages` roundtrip is the only documented verbatim proactive path and requires an existing conversation.
  3. **Agent API gateway completions** — model-mediated, `channel:"api"`, not iMessage delivery.
- `429 recipient_reply_required` blocks cold first-contact sends on shared-number lines; iMessage is inbound-locked by nature — a contact who never texted cannot be reached verbatim. **Out-of-scope check:** apps whose core flow is cold outbound messaging (OTP, outreach, reminders to never-contacted numbers) have no parity surface — flag as a plan-level blocker, not a per-capability one.
- Alerts (`defineAlert`) are agent-mediated scheduled/triggered broadcasts for hosted agents — not verbatim sends.

## Separate transport decisions

Choose each layer independently while preserving the existing application architecture by default.

| Application layer | Keiki options |
|---|---|
| Inbound channel events | External harness push/relay/inbox dispatch; `keiki.reaction`/cancellation non-turn events; Keiki event webhooks for consent/delivery events; SDK `handleInbound` for programmatic injection; agent API gateway for programmatic conversations |
| Inbound provisioning | Developer REST API deployments; MCP `deploy_agent` |
| Outbound text and actions | Turn-scoped `/messages` and `/actions` (react, edit, delete, send_file, send_widget); channel-native delivery by Keiki; `notice`→silent-turn for external-harness proactive sends |
| Outbound programmatic chat | Agent API gateway completions (streaming or passthrough) |
| Attachment send | `POST {turnUrl}/attachments` upload then `send_file` action — **one attachment per action**; grouped multi-media sends become N actions (verify bubble grouping) |
| Attachment retrieval | Turn payload `attachments[].url` (15-minute signed URL) or `GET {turnUrl}/attachments/{id}` |
| Reactions, effects, edits, unsend | `/actions` native channel actions; `effect` on `/messages`; inbound tapbacks via `keiki.reaction` (no sender field documented) |
| Typing | `POST {turnUrl}/typing` where the channel supports it |
| Agent definition | `@onkeiki/agents` config synced via `kit.sync()`/`client.sync()`/`client.deploy()` |
| Per-user agents | Partner deployments keyed by `external_ref` |
| Org operations | Developer REST API or Keiki MCP |
| Non-TypeScript runtimes | All `@onkeiki/*` packages are TypeScript. Python/Go/Rust/etc. use raw REST + a pinned crypto dependency for signature verification: `whsec_` HMAC-SHA256 is stdlib-friendly everywhere (`hmac`/`hashlib` in Python, `crypto` in Go); Ed25519 platform verification needs PyNaCl/`cryptography`/equivalent — record the exact planned version. Turn settlement (`/complete`), inbox polling, and turn-scoped sends are plain HTTPS+JSON and port directly |

The final target may contain one or more surfaces.

## Channel and line model

- Deployment channel `type` values: `imessage`, `telegram`, `whatsapp`, `slack`, `agentmail`, `api`, `a2a`. SMS is **not** a deployment channel — SMS lines are bought and attached on the dashboard Channels page. Teams, phone calls, Apple Messages for Business, RCS, and shared iMessage numbers are dashboard-managed and absent from the deployment spec.
- iMessage line kinds: Instant, Standard, On-request, Imported, Shared number. Capability matrices differ per kind (edit/delete/files/voice/polls/app cards).
- **Imported lines**: existing Linq, Photon, or Blooio provider accounts can be imported into Keiki — but imported lines carry no provider-verified sender evidence, so identity webhooks and scoped tools do not run and turns run without a principal.
- Underlying iMessage line providers include `photon`, `blooio`, and `linq`. Group chats work only on dedicated `photon`/`blooio` lines with `features.groupChats` enabled; `linq` lines return `group_chats_unsupported`; shared-pool lines ignore groups.
- `lines` (1–10) is a minimum count: raising buys missing lines, lowering releases none. Replies always use the line the person texted; proactive sends to conversations without a line need an explicit `line` (`sender_line_required`).
- Rate limits: 7,000 sent messages per active line per UTC day pooled across lines, and 50 new conversations per line per day (`daily_line_volume_reached`); replies are unaffected. `429 recipient_reply_required` means the recipient must message first.
- `conversationId` format varies by channel (E.164 contact for iMessage/SMS DMs, channel-scoped IDs for Slack/WhatsApp, caller-chosen `x-conversation-id` for the API channel). Verify the exact grammar for the active channel before planning identifier mapping.
- **Provisioning model shift**: source integrations built on per-user OAuth/device flows and shared-line pools map to org API keys + per-deployment paid lines. There is no sender registry or shared-pool routing; Keiki shared numbers use a join-code UX (`K-XXXXXX`), a different onboarding flow. Channel credential replacement is detach-then-attach (brief downtime), not staged prepare/activate.
- **Sender identity is product-visible**: recipients see the Keiki line's number, not the source provider's. Stored chat GUIDs/IDs are invalidated; threads do not continue; per-line billing starts.

## Known parity gaps — verified non-surfaces

These were checked against official docs and `openapi.json`. Do not re-derive per migration; cite this list, then re-verify at plan time. **This list doubles as the Keiki-side gap backlog**: every entry is a candidate upstream feature request. When a migration hits one, the plan must state the missing surface, the contract shape the source provider offers, and which integrations need it — written precisely enough for the user to pass to the Keiki team or as an instruction to the Keiki agent itself.

- **No generic inbound "message received" webhook** — inbound reaches your app only through harness dispatch, the agent itself, or the API gateway.
- **No public delivery-status or read-receipt event API** — delivery is tracked internally and inspectable through the delivery ledger, not pushed as message events.
- **No raw verbatim send endpoint** — see "Proactive and out-of-turn outbound" above.
- **No conversation-history fetch, conversation-inspection, or lines-list API** for external apps — turns carry bounded per-conversation history only.
- **No mark-read / read-receipt send or read API** (WhatsApp read receipts are a channel capability, not an API surface).
- **No contacts/address-book API** — only the per-sender identity webhook for auth/scopes.
- **No mailbox, transcript, or call-history browsing API** — bounded per-turn history only.
- **No raw-media or BYO voice API** — Keiki phone calls are hosted agent voice turns on Keiki numbers; telephony stacks built on provider call APIs/WebSockets cannot map.
- **A2A is inbound-only** — no outbound agent-call client surface.
- **Keiki MCP exposes org operations, not messaging primitives** — MCP↔MCP is protocol parity, not tool-domain parity; using it would invert the app's role (server→client).
- **Group-chat addressing/filtering for external harness is unverified** — see turn semantics above.
- **`keiki.reaction` has no documented sender field** — per-user reaction attribution in groups may be impossible; verify before planning group reaction parity.
- **Multi-attachment sends are one `attachmentId` per `send_file` action** — sources that deliver grouped media in one message will produce separate sends unless verified otherwise.
- **Echo/`is_from_me` messages are unmappable** — turns are inbound-only; your own outbound never arrives as an event.
- **Inbound message edits**: `/actions edit`/`delete` are outbound actions; whether inbound edits/unsends re-dispatch to the harness is undocumented — mark unresolved and verify before planning edit-parity.
- **Membership and chat lifecycle events**: only `keiki.reaction` and cancellations are documented non-turn dispatches — participant add/remove, chat-created, and similar events have no confirmed inbound surface; mark unresolved.
- **Rich content**: link previews and iMessage app cards have no confirmed parity — `send_widget`/Keiki Vault apps require a dedicated line + Dynamic UI add-on + 1:1 chats only; plain link-preview behavior is undocumented.
- **No tunnel/ingress product** — external harness requires a public HTTPS `dispatchUrl`; runtimes behind NAT need relay mode, inbox mode, or their own tunnel.

## Availability and entitlement check

Keiki documents several surfaces that are not generally available or deployable today. Verify availability for the target organization before selecting any surface, and flag gated capabilities in the plan instead of assuming access. **Org-level verification needs credentials Phase 1 does not have — doc-level gating is the ceiling; defer org confirmation to execution.**

| Surface or capability | Availability constraint | Evidence |
|---|---|---|
| Everything except a bought iMessage line | Requires an active paid plan; `plan_required` on connect; `503 billing_unavailable` transient | `docs/channels.md`, `docs/pricing.md` |
| API gateway (`api` channel) | Plan-gated: `402 plan_required` | `docs/agent-api.md` |
| A2A channel | Plan-gated: `402 plan_required` | `docs/a2a.md` |
| `channels` OAuth scope / agent-channels API | Requires plan; separate OAuth issuer | MCP docs |
| iMessage lines | Per-line monthly billing by plan tier; deployment `lines` may return `needs_payment` + `checkoutUrl`; On-request lines not charged at request time | `docs/partner-deployments.md`, `docs/pricing.md` |
| SMS | Not a deployment channel — lines are bought and attached on the dashboard Channels page | `docs/setup.md` |
| Teams, phone calls, Apple Messages for Business, RCS, shared iMessage number | Dashboard-managed; absent from the partner-deployment channel spec | `docs/channels.md`, `docs/partner-deployments.md` |
| RCS, Apple Messages for Business | Early access / request-access only | `docs/channels.md` |
| `send_widget` / Keiki Vault iMessage apps | Dedicated Keiki-bought line + Dynamic UI add-on + 1:1 chat only | `docs/imessage-apps.md` |
| Group chats | Dedicated `photon`/`blooio` line + `features.groupChats`; `linq` lines unsupported; shared pool ignores groups | `docs/channels.md` |
| Sandbox organizations | MCP works without a plan but turns are capped | MCP docs |
| Organization signup | **Docs conflict**: `setup.md` says invite-only while `publishing.md` says self-serve open by default (`INVITE_ONLY_SIGNUPS` gate) and pricing is staged — record the conflict, do not pick silently | `docs/setup.md`, `docs/publishing.md`, `pricing.md` |
| Imported iMessage lines | Identity webhooks and scoped tools do not run; turns run without a principal | identity docs |
| Delivery status / read receipts | Internal ledger only; no public event API | `docs/webhooks.md` |

Record each selected surface's availability status in the plan: `available`, `plan-gated`, `entitlement-gated`, `early-access`, `dashboard-only`, `add-on-required`, or `unavailable` — with the evidence and retrieval date. A capability that exists in documentation but fails this check is flagged as documented-but-unavailable, never silently planned or silently dropped.

## Agent-platform cost check

Keiki is not a dumb pipe. Every inbound channel message becomes an agent turn (model billing, trace, prompt-guard, memory). For apps that only need a transport boundary — passive notification sinks, fire-and-forget alerts, home-automation triggers — evaluate whether paying the agent-turn cost is acceptable, and state it in the plan. There is no "transport-only" Keiki mode; the smallest safe migration may still be external harness push with a trivial loop, but say so explicitly.

## Selection rules

1. Prefer the smallest architectural change.
2. Preserve the current programming language. When no `@onkeiki/*` package exists for the source language, target the hosted REST/HTTP contracts directly with pinned dependencies — do not force a TypeScript dependency into a non-TypeScript component.
3. Preserve the hosting model when possible. `kit.serve()` self-hosts the agent loop only — iMessage lines remain cloud; do not claim self-hosted channel preservation.
4. Preserve the inbound and outbound transport shape.
5. Do not introduce MCP into an ordinary backend, and never treat Keiki MCP as a messaging transport — it exposes org operations, not send/receive primitives.
6. Do not force a hosted Keiki agent loop into a REST or webhook application solely because it supports the required capabilities. Select a hosted loop only when the source already uses an agent or unified message-stream abstraction, or when the plan proves that adopting one creates a smaller and safer migration than preserving the existing boundaries.
7. Do not move a managed provider to self-hosted infrastructure or vice versa without identifying the architecture change — and note Keiki offers no self-hosted iMessage transport at all.
8. Do not remove non-provider channels (CRM, analytics, other SaaS integrations) or non-selected provider channels unless they are explicitly included in the approved scope. Only message send/receive integrations are provider candidates.
9. Select based on capabilities proven to be active, not either provider's maximum feature list.
10. Load the corresponding official Keiki documentation page after selecting the target.
11. Select one or more Keiki surfaces based on the smallest safe complete architecture. A mixed target may be preferred when it preserves existing inbound, outbound, attachment, hosting, adapter, or lifecycle boundaries with fewer application changes.
12. For installable Keiki packages, record the exact planned package version — resolve it from the npm registry or an official locked example; if the registry cannot be queried, record "latest confirmed `<version>` at `<date>`, re-resolve at install" rather than guessing.
13. For hosted Keiki services, record the service, endpoint, public API or event contract, documentation source, and retrieval date. Do not invent a hosted-service version when none is published.
14. Inspect exact public methods, endpoints, event contracts, types, closed values, open-value rules, and applicable error behavior before assigning confidence.
15. Never remove an active capability to fit the initially selected target. Reconsider the Keiki architecture first — but when zero surfaces achieve parity, the correct output is an infeasible/rescope verdict, not an endless search.
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
22. Verify every selected Keiki surface is available for the target organization's plan, region, and entitlements before planning. Never plan against a documented-but-unavailable surface without flagging it, and never silently substitute a different surface for a gated one — surface the gate and let the plan record the approved workaround.
23. **Fast-reject check**: before deep per-capability mapping, test whether any *disqualifying* capability exists — a core flow with no Keiki surface (cold outbound sends, provider voice APIs, contacts CRM, history browsing). One disqualifying capability makes the plan infeasible-as-specified; report it early instead of mapping everything else first.
24. **Turn-lifecycle design is mandatory for harness targets**: the plan must name the turn-context owner, when `/complete` fires relative to application work, behavior for sends with no live turn, settlement on failure paths, and serverless/async continuation (e.g. `waitUntil`/`after()` vs the ≤10-minute turn deadline).

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

## Split-provider decision record

When the correct answer keeps the source provider for some capabilities (partial migration), the plan must include:

| Capability or channel | Disposition | Target | Reason |
|---|---|---|---|

Allowed dispositions: `migrate-to-keiki`, `retain-on-source`, `descope-approved`, `blocked`. A split-provider plan must also define shared webhook demux (multiple signature schemes can coexist in one receiver — name the port/path routing rule), per-provider dedup domains, cross-provider identifier bridging, and which provider owns which credential. When retained capabilities dominate the migrated ones, state explicitly that the result is effectively "keep the source provider + add Keiki," not a migration. Retaining the source provider is a legitimate approved outcome — do not force a Keiki mapping that does not exist.

## Target-specific routing

| Target | Preserve |
|---|---|
| External harness push | Existing public-HTTPS webhook receiver and custom agent loop |
| External harness relay | Existing relay, tunnel, or gateway topology |
| External harness inbox | Existing polling worker, batch consumer, or serverless plugin with no HTTP endpoint |
| Cloud-served or self-hosted agent | Existing agent definition, unified message-stream abstraction, or server loop |
| Developer REST API / partner deployments | Existing per-user provisioning and `external_ref`-style identity mapping |
| Agent API gateway | Existing chat-completions-style caller or programmatic conversation boundary |
| Keiki event webhooks / identity webhook | Existing operational event consumption and per-sender authorization |
| Keiki MCP / Code Mode MCP | Existing MCP-native *client* boundary only — never a messaging transport |
| Framework adapters (`@onkeiki/flue`, `@onkeiki/eve`, `@onkeiki/ai-sdk`, `@onkeiki/channels`) | Existing Flue, Eve, AI SDK 7, or raw-HTTP application structure |
| A2A | Existing inbound agent-call boundary |

After selection, confirm identifiers, authentication, event delivery, attachments, retries, idempotency, lifecycle, closed and open values, error semantics, credential names, package versions, and hosted-service contracts from the matching official Keiki evidence. Do not invent APIs or copy broad Keiki documentation into this repository.
