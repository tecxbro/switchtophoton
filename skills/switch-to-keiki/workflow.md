# Migration workflow

The workflow has two hard phases. Do not combine them.

## Mandatory decision order

```text
Inspect repository
→ establish repository state and repo shape (consumer app / provider library /
  façade-MCP-proxy / SDK / provisioning tool)
→ scope provider boundary (single provider, multi-provider, adjacent vendors)
→ detect source provider
→ detect exact source version or API generation (per surface when mixed)
→ fast-reject check for disqualifying capabilities
→ identify active source capabilities
→ classify active values as closed or open-ended
→ map actively reachable closed values individually
→ document conversion rules for open-ended values
→ read the matching source-provider reference
→ identify source transport and behavior semantics
→ inspect current official Keiki evidence
→ verify Keiki surface availability (plan, entitlement, add-on)
→ identify the exact planned version for each installable Keiki package
→ identify the public contract and retrieval date for each hosted Keiki service
→ select inbound Keiki transport
→ select outbound Keiki transport
→ select attachment transport
→ select applicable lifecycle and error model
→ compare architecture preservation and migration risk
→ prove each capability mapping
→ decide plan verdict (executable / executable-with-approved-changes /
  infeasible-as-specified / blocked-on-evidence)
→ identify writable execution destination and branch
→ build migration plan and capability evidence appendix
→ request approval (skipped for infeasible verdicts)
→ execute
→ verify installed versions against approved planned versions
→ verify against source and approved plan
```

Do not begin by choosing Keiki APIs.

# PHASE 1 — INSPECT AND PLAN

Phase 1 is read-only.

During Phase 1, do not:

- edit, create, delete, rename, or reformat files;
- create or switch branches;
- install, remove, or update dependencies;
- change configuration or environment files;
- modify Git refs;
- run destructive commands;
- push commits;
- open pull requests;
- make any repository change.

## 1. Establish repository state

Record:

- repository root;
- default branch;
- current branch;
- starting commit;
- clean or dirty working-tree state;
- unrelated changes that must be preserved;
- languages, frameworks, package managers, deployment model, and available verification commands.

If repository state is ambiguous, report it as a blocker rather than altering it. When the repository has no `.git` metadata or cannot produce a commit SHA (read-only snapshot, exported archive), record `unknown/not a git repository` for branch and commit fields — this is a reportable state, not a fabrication target.

### Execution access

Record:

- Repository permissions:
  - read;
  - create branch;
  - push;
  - open pull request.
- Writable repository:
  - original repository;
  - existing fork;
  - new fork required;
  - unavailable;
  - unknown/unverified — Phase-1 read-only inspection cannot always prove push/PR permissions; record `unknown/unverified` rather than guessing, and note that Phase 2 must reconfirm before writing.
- Execution branch:
  - <branch>
- Pull-request destination:
  - <repository and base branch or none>

Do not request execution approval until a writable execution destination has been identified.

Execution branch precedence:

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-keiki`.

Never override an explicit user-selected branch with the default.

## 2. Detect the source provider

If the user named the source provider, treat that name as the detection hypothesis: confirm or correct it with the fingerprints below instead of restarting discovery from zero. A named provider without a registered reference file is not a blocker — proceed with generic detection and mark confidence accordingly.

Search the complete repository, including:

- lockfiles and package manifests;
- imports, generated clients, vendored SDKs, wrappers, and adapters;
- HTTP hosts, base paths, endpoint paths, and authentication headers;
- environment-variable schemas and deployment configuration;
- webhook routes and stream or WebSocket consumers;
- outbound send calls and attachment handlers;
- provider message IDs, conversation IDs, participant IDs, line IDs, and event IDs;
- retry, idempotency, deduplication, ordering, timeout, shutdown, and error handling;
- tests, fixtures, mocks, and setup documentation.

A provider name or comment alone is not sufficient. Confirm active runtime or test evidence.

### Repo shape — define the migration object first

Before inventorying capabilities, classify what the repository *is* relative to the provider:

- **Consumer application** — an app that calls the provider for messaging (the common case). The provider integration may be optional or env-gated (feature-flagged channel, sandbox-only demo path); a gated integration still counts — state explicitly whether it is in or out of migration scope rather than letting detection silently include or exclude it.
- **Provider library/adapter** — a published package implementing the provider boundary (e.g. a Chat SDK adapter). The migration object is the package's public API surface: decide whether to rewrite in place, produce a renamed package, or migrate its in-repo consumers; preserve exported names/types or record the breaking-change decision.
- **Provider façade / MCP server / proxy** — a server exposing the provider's API as tools or pass-through routes, first- or third-party. The migration object is the *public wire contract* (paths, fields, error codes, token formats, tool surface, JSON-RPC semantics, auth/token formats issued or verified). Keiki MCP exposes org operations, not messaging primitives — MCP↔MCP is a role inversion, not parity.
- **Provider SDK (first- or third-party)** — the library itself. Migrate only what has real consumers (in-repo or published downstream); example apps are documentation of intent, not the application. If no consumers exist in-repo, surface that as a scope question. A standalone *published* wrapper SDK whose entire surface is the provider contract usually resolves to infeasible-as-specified or do-not-migrate — migrating it deletes the product it exists to provide.
- **Provisioning/ops tooling** — wizards, CLIs, or dashboards that create provider resources rather than send messages.
- **Passive sink / webhook recorder / test harness** — stores or forwards provider events without calling the provider API (webhook-ingress-only). The migration object is the event record/forwarding contract; disposition is per *event type*, not per channel.
- **Provider's own plugin fork** — an extended fork of the provider's official plugin/adapter. State whether the fork's customizations are inside or outside migration scope explicitly.
- **Provider's own product** — the repository *is* the provider's own server, SDK, MCP server, or plugin published by the provider (e.g. the provider's official server repo, its own MCP package, its own agent plugin). The public wire contract is the product. Migrating it to Keiki inverts the repository's purpose — the correct verdict is normally **infeasible-as-specified / do-not-migrate**; only proceed if the user redefines the migration object (e.g. "add a Keiki export," "document the delta").
- **Provider-authored host-platform plugin/template** — an official first-party plugin, channel adapter, or deployment template published by the provider for an agent host platform (Hermes, Claude Code, Eve, etc.). Consumers are external host installs, not in-repo code; the migration object is the plugin's public interface plus its wire contract. Before planning a boundary rewrite, check the **substrate/adapter-retirement path** (see §6): when the host platform has a Keiki adapter or the source provider is itself a Keiki line provider, replacing the plugin with the target's own adapter on a Keiki line may be the smallest safe migration.
- **Deployment template / wrapper-image** — a template, wrapper, or repo whose provider boundary lives inside a pinned upstream container image, remote service, or generated artifact rather than in repo source. Repo evidence alone cannot inventory capabilities: report `blocked-on-evidence` and name the exact artifact to inspect (image tag/digest, upstream repo+commit, deployed service) before planning.

If the repo shape is ambiguous or unprecedented, state the interpretation explicitly in the plan or ask the user before planning — do not guess silently.

### Multi-provider and adjacent-vendor scoping

A repository may contain several messaging providers or several SaaS vendors:

- Only integrations that **send or receive messages** are provider candidates. Adjacent vendors (CRMs, analytics, ticketing systems, webhook sources) are out of scope unless they carry messaging — do not mistake their hosts or env vars for the provider.
- When several providers are active (primary/secondary adapters, feature-flagged transports, aggregator SDKs), the plan must state which boundary/boundaries are being replaced and the disposition of the rest — see the split-provider decision record in `keiki-targets.md`.
- **Transitive-dependency caution**: aggregator and provider SDKs routinely drag *other* registered providers into lockfiles. A package appearing in a lockfile is not proof of use — require an import, call, host, header, env var, or payload fingerprint in application code.
- **Fingerprint precedence**: when evidence disagrees, wire-format evidence (actual HTTP calls, headers, payloads, webhook schemas) outranks package names, docs claims, and comments. Conflicting wire evidence is reported as a conflict — never silently resolved.
- **Confidence rubric**: fingerprints limited to configuration-only evidence (env-var names, provider name in docs/README, dedicated route paths) with zero wire-format or behavioral evidence cap at **Medium** — they can confirm intent but not the integration contract. When the provider boundary lives inside an opaque pinned image, remote service, or generated artifact with no in-repo wire evidence, cap at **Low** and treat the repo as `blocked-on-evidence` until the artifact is inspected.
- **Self-detection caution**: when the repository *is* the provider's own codebase (its server, SDK, docs, or website), consumer-shaped fingerprints will match its own source. Check authorship/ownership before classifying — a provider fingerprint inside the provider's own repo indicates repo shape "provider's own product," not a consumer integration.
- **Version-source spread**: when manifest ranges, multiple lockfiles, or CI pins disagree (or a lockfile is stale), record every observed version and which source is authoritative — do not pick one silently.
- **Private source-API reliance**: flag any use of undocumented/private provider SDK internals (e.g. `sdk._private.method`); it lowers detection confidence and may break on provider upgrades.

Read [`providers/index.md`](./providers/index.md), then only the matching provider file. When no file matches — including a user-named provider that is not registered — derive fingerprints, generation signals, and capability inventory from repository evidence alone, consult official agent-readable documentation discovered for that provider when it satisfies the index policy, and report the missing reference file as a plan note rather than a silent gap.

## 3. Detect exact SDK or API generation

Use evidence in this order:

1. Exact locked SDK version.
2. Generated package metadata or vendored SDK version.
3. Package name and imported API shape.
4. API hostname and base path.
5. Authentication headers.
6. Request and response fields.
7. Webhook payload shape.
8. Tests and fixtures.
9. Comments and internal documentation only as supporting evidence.

Report exactly one or more of:

- `Exact SDK version`
- `Known REST API generation`
- `Known webhook generation`
- `Raw REST, unversioned` — direct HTTPS/JSON calls against an unversioned surface
- `Raw REST against known generation` — direct HTTPS/JSON calls with no SDK where base path, auth scheme, or payload shape identifies the generation (e.g. `/api/partner/v3` + bearer = Linq V3 raw REST)
- `Raw REST, mixed endpoint generations` — direct HTTPS calls spanning more than one endpoint generation of the same provider (e.g. `/api/send-message` alongside `/api/v2/*`); report each endpoint family's generation separately
- `Webhook-ingress-only` — the app receives provider webhooks but never calls the provider API (generation may be unknowable; confidence scales with blast radius)
- `Generation-irrelevant` — no generation-bound code exists (pure webhook sink, config-only)
- `Mixed generations` — genuinely different API generations in use (not merely mixed surfaces)
- `Mixed surfaces` — one generation spanning several distinct APIs (e.g. REST + dashboard management API + OAuth device flow); report each surface separately
- `Unknown generation`

Examples include `Sendblue TypeScript SDK 3.2.1`, `Sendblue raw REST using /api/send-message`, `Linq V2`, `Linq V3`, `Mixed Linq V2/V3`, `Blooio v4`, `Photon spectrum-ts <version>`, `Photon HTTP Proxy REST`, `BlueBubbles server generation unknown`, `raw REST, unversioned`, or `webhook-ingress-only`.

For multi-surface sources, record a per-surface breakdown — one collapsed label loses detection fidelity.

Report confidence:

- **High:** exact version or generation plus matching runtime and wire-format evidence.
- **Medium:** multiple matching runtime fingerprints but no exact package or server version.
- **Low:** incomplete or conflicting evidence.

Low-confidence detection blocks automatic execution. The plan must state the risk. Phase 2 remains blocked unless the user both uses the exact approval phrase and explicitly accepts that stated risk.

Source-provider confidence applies only to source detection. It does not establish confidence in Keiki capability mappings.

Assign a separate confidence level to every Keiki capability row in the capability evidence appendix.

Never assume current documentation matches the repository's installed generation.

## 4. Read approved source-provider documentation

Follow the policy in [`providers/index.md`](./providers/index.md). Use official `llms.txt`, official `llms-full.txt`, official Markdown files ending in `.md` linked by this skill, or an official OpenAPI document published by the provider when the index registers one.

When no approved source is registered, rely on repository evidence, report the absence, and treat unresolved version uncertainty as a planning blocker.

**Degraded-evidence mode**: when the environment has search but no document fetch, search-result excerpts from official domains may satisfy Level-1 evidence only when they quote the official document verbatim; otherwise mark retrieval `retrieved but insufficient` and prefer repository wire evidence. Do not fabricate retrieval.

## 5. Inventory active capabilities

A capability is in scope only when it is reachable production behavior: active code paths, deployment configuration, stored data, or operational dependence prove the application uses it. Tests, fixtures, and mocks corroborate a capability but do not by themselves make it active; example apps, docs, and dead-but-implemented adapter methods are evidence *about* the code, not active capabilities — list them as intentionally excluded unless the user says otherwise. When the repository *is* the provider SDK/library/server (see "Repo shape"), its published surface — exports, routes, tools — is the capability set unless the user narrows it.

Inspect inbound and outbound text, direct and group messaging, line selection, attachments, replies, reactions, typing, read state, effects, edits, unsends, delivery states, history or polling, SMS/RCS fallback, webhook authentication and acknowledgement, retries, idempotency, deduplication, ordering, lifecycle, quota/rate-limit semantics (per-day caps, new-contact limits, reset windows — these often drive entire subsystems), and persisted provider identifiers.

For façade/MCP-server/proxy repo shapes, the capability surface additionally includes the wire contract itself: protocol semantics (JSON-RPC methods, batching, notification handling, error envelopes), auth/token formats the server issues or verifies, pass-through proxy routes, and non-message domains (calls, contacts, registration, tickets) — inventory them as capabilities, not just messaging flows.

List unused source-provider and Keiki features as intentionally excluded. Do not map or add them.

Classify every active enum, union, option list, status, named behavior, or free-form value as either closed or open-ended.

### Closed value sets

Inventory every actively reachable value individually.

Required closed-value inventories include, when present:

- standard reactions;
- documented message effects;
- service enums such as iMessage, SMS, and RCS;
- delivery and failure states;
- group-chat operations;
- line or sender-selection modes.

Do not replace an exact closed list with labels such as “effects,” “standard reactions,” or “fallback support.”

### Open-ended values

Document the conversion rule rather than attempting to enumerate every possible value.

Open-ended inventories may include:

- arbitrary custom emoji;
- free-form reaction strings;
- MIME types;
- custom payloads;
- user-provided identifiers.

Record representative values, invalid values, and unknown-value behavior.

## 6. Verify Keiki evidence and select the target

Read [`keiki-evidence.md`](./keiki-evidence.md) before selecting a Keiki surface.

For installable Keiki packages, record the exact planned package version and exported public API used by the migration.

For hosted Keiki services, record the service, endpoint, public API or event contract, official documentation source, and retrieval date. Do not invent a hosted-service version when none is published.

For every candidate Keiki surface, verify current availability before selecting it: active-plan requirement, waitlist or invite gating, early-access status, dashboard-only management, entitlement or add-on requirements, and region limits. Keiki documents several surfaces that are not generally deployable today — record each selected surface's availability status and flag documented-but-unavailable capabilities in the plan rather than assuming access or silently substituting another surface. See [`keiki-targets.md`](./keiki-targets.md) for the known availability constraints.

Architecture preservation remains the default.

A capability supported by a hosted Keiki agent does not by itself justify replacing an existing REST or HTTP-webhook boundary with a different transport.

Prefer the Keiki architecture that produces the smallest safe migration.

Do not prefer one Keiki surface merely because it has broad capability coverage.

Compare:

- application files changed;
- transport changes;
- hosting changes;
- runtime and dependency changes;
- lifecycle complexity;
- credential complexity;
- verification difficulty;
- operational behavior.

Make separate decisions for:

1. inbound HTTP webhook, harness push/relay/inbox dispatch, SDK stream, gateway, or MCP transport;
2. outbound messaging transport;
3. attachment retrieval and sending;
4. reactions and effects;
5. chat and group operations;
6. line and recipient routing;
7. applicable connection, turn, or request lifecycle;
8. errors, retries, delivery failures, duplicate events, and reconnect behavior.

Do not force a hosted Keiki agent loop into an application that only needs a messaging transport boundary.

Select a cloud-served or self-hosted Keiki agent only when the source already uses an agent or unified message-stream abstraction, or when the plan proves that adopting one creates a smaller and safer migration than preserving the existing REST and webhook boundaries.

Any transport change must identify:

- why the existing Keiki REST, webhook, harness, gateway, or SDK surface is insufficient;
- every application module affected;
- the lifecycle introduced by the new transport;
- the additional verification required;
- why the change is safer than preserving the current architecture.

A mixed target may be preferred when it preserves the source application’s existing inbound, outbound, attachment, hosting, or lifecycle boundaries with fewer application changes.

When the source provider is multi-channel (mail + SMS + iMessage + voice + contacts + tunnels), produce a **channel disposition** before target selection: which channels migrate to Keiki, which stay on the source provider, which are descoped with user approval, and which are blocked. Keiki covers iMessage/SMS/RCS/WhatsApp/Telegram/Slack/agentmail/API/A2A — it has no contacts CRM, no raw voice/media API, no mailbox browsing, and no outbound A2A client. A legitimate outcome is a **split-provider architecture** (Keiki for messaging, source retained for the rest) — record it with the split-provider decision record in `keiki-targets.md`.

**Turn-lifecycle design is mandatory for harness targets.** Every Keiki turn has a ≤10-minute deadline and must be settled via `POST {turnUrl}/complete`. The plan must name: the turn-context owner (how outbound calls learn the active `turnUrl`/token), when `/complete` fires relative to application work, behavior for sends with no live turn, settlement on failure paths, `midTurnStrategy` choice, multi-message turn fan-out, and serverless/async continuation (`waitUntil`/`after()` vs. turn deadline). Turns are *not* the source provider's request/response model — this is the central architectural delta of every webhook→harness migration.

**Agent-platform cost check.** Keiki is an agent platform, not a dumb pipe: every inbound message spins an agent turn (model billing, trace, prompt-guard, memory). For apps that only need a transport boundary (passive notification sinks, fire-and-forget alerts, polling loops), state the per-turn cost implication explicitly in the plan — including the semantic delta between a polling transport (e.g. a 4-second message poll) and per-message agent turns, which is a parity risk, not just a cost note.

**Substrate / adapter-retirement check.** Before committing to a boundary rewrite, check whether the source provider is itself an importable Keiki line provider or whether the agent host platform has an official Keiki adapter (e.g. `@onkeiki/*` packages — Blooio, Photon, and Linq lines are Keiki substrates; `@onkeiki/eve` and similar adapters exist for agent hosts). When true, "replace the provider plugin with the target's own adapter on a Keiki line" is often the smallest safe migration — evaluate it alongside the harness-push rewrite and record why it was or wasn't chosen. Verify the adapter package exists, its exact planned version, and its availability gates before selecting it.

**Credential hygiene.** Turn credentials (`Keiki-Turn-Token` `ht_…`, `kts1.…`) are short-lived secrets — the plan must require they are never logged, stored in event dumps, or included in error reports, especially for event-recording receivers that persist headers verbatim.

When selecting a mixed target, prove:

- the responsibility of each Keiki surface;
- why the combination is safer or smaller than the alternatives;
- how identifiers are shared;
- how credentials are configured;
- which component owns events, connections, lifecycle, and shutdown;
- how duplicate events, connections, or listeners are prevented;
- how retries and ambiguous results are handled;
- which provider-side ingress must be retired or repointed — dashboard-managed webhook destinations, registered callbacks, polling loops, or socket subscriptions — and how double-delivery is prevented during cutover (a provider webhook left active alongside Keiki dispatch produces duplicate handling).

Do not reject the Keiki developer REST API, external harness, agent API gateway, event webhooks, MCP server, or SDK surfaces using unsupported assumptions.

Cite exact public methods, endpoints, event contracts, or limitations.

## 7. Prove target capability parity

Before writing the plan:

- inspect the selected target’s public types, OpenAPI operations, or hosted API contract;
- inspect the relevant official documentation and agent-facing Keiki guides;
- inspect implementation or official tests only when public evidence is incomplete or conflicting;
- record when implementation source or official tests are unavailable;
- compare synchronous and asynchronous error behavior applicable to the selected surfaces;
- compare attachment behavior actively used by the source application;
- compare typing lifecycle when typing behavior exists;
- compare service and line identity;
- compare group participant semantics;
- compare source and Keiki identifiers;
- map every actively reachable closed reaction, effect, service, status, and operation value;
- document conversion rules for open-ended values;
- confirm every selected Keiki surface is actually available for the target organization — plan, entitlement, region, add-on, and waitlist gates included — and flag documented-but-unavailable capabilities explicitly.

Do not perform an unbounded search across every Keiki repository.

When one official source omits a capability but another public official source supports it, do not remove the source capability.

When public evidence and implementation disagree, use the publicly supported contract as the execution boundary.

Implementation-only behavior must remain unverified unless it is publicly exported and supported.

If exact parity remains uncertain during initial planning, mark the capability unresolved in the initial plan and block execution.

Request a revised plan only when the conflict or uncertainty is discovered after an earlier plan was approved.

## 8. Decide the plan verdict

Before writing the plan, assign one verdict:

- **Executable** — every active capability maps to a verified available Keiki surface; proceed to the approval gate.
- **Executable with approved changes** — parity achievable only with explicit user-approved behavior changes (documented exclusions, split-provider retention, descoped channels); the approval gate covers these.
- **Infeasible as specified** — a core capability has no Keiki surface and no approved workaround exists (e.g. verbatim cold outbound sends, provider voice APIs). "Core" means reachable in the product's primary flow — a capability that is reachable only through secondary, admin, dev-only, or optional/demo paths is an **approved exclusion candidate**, not an infeasible trigger; classify criticality before fast-rejecting. Do **not** fill the full template with hundreds of unresolved rows and do **not** request the approval phrase — instead produce a short infeasibility report naming: the disqualifying capability/capabilities, what Keiki would need to support it, and the options (approved exclusions, partial migration with named losses, redesign, abort, or **do not migrate** — when the repo exists to observe/test the source provider, *is* the provider's own product, or is a published wrapper whose surface is the provider contract itself, migration inverts its purpose; say so plainly). Execution is impossible regardless of approval.
- **Blocked on evidence/access** — detection confidence is Low, docs are unreachable, or no writable destination exists; state exactly what must be resolved.

### Keiki-side gap reporting

Every capability that cannot be mapped is also a **Keiki product gap**. For each one, the plan must state what Keiki would need to add — precise enough to act on: the missing surface (endpoint, event, or parameter), the contract shape the source provider offers, and which source integrations need it. The user can pass these items directly to the Keiki team or as instructions to the Keiki agent itself — treat them as upstream feature requests, not just migration blockers. The verified non-surface list in `keiki-targets.md` is the standing backlog; cite it rather than re-deriving, and add any newly discovered gaps to the report.

## 9. Build and show the plan

Use [`plan-template.md`](./plan-template.md). The verdict from §8 decides the output:

- **Executable / Executable with approved changes** — produce the two sections below.
- **Infeasible as specified** — produce the short infeasibility report described in §8 instead of the full template; do not end with the approval phrase.
- **Blocked on evidence/access** — produce the plan with blockers filled and state what must be resolved; the approval phrase is omitted when no executable path exists.

### Migration plan

A reviewable summary containing:

- source detection;
- repo shape and provider-boundary scope;
- architecture;
- selected Keiki target or target combination;
- channel disposition (multi-channel providers);
- important behavior mappings;
- behavior changes;
- files expected to change;
- blockers;
- cutover impact;
- verification strategy;
- execution access, branch, and pull-request destination;
- plan verdict.

### Capability evidence appendix

A detailed appendix containing:

- closed enum mappings;
- open-value conversion rules;
- exact methods and endpoints;
- evidence sources;
- lifecycle matrix;
- attachment behavior;
- routing behavior;
- confidence per capability.

Approval applies to both sections, but the main migration plan must remain concise enough for meaningful review. For small integrations, mark inapplicable template sections `N/A` explicitly rather than padding them; proportionality is expected, not optional.

Show the complete plan and end the response with:

```text
To approve this exact migration plan, reply:

APPROVE SWITCH TO KEIKI PLAN
```

Then stop. Do not make migration changes in the same response.

## Native plan-mode recommendation

Use the coding product's native Plan, Ask, or read-only mode when available. The portable Phase 1 protocol remains mandatory whether or not a native mode exists. Do not claim this skill can programmatically enable a product-specific mode, and do not invent unsupported product commands.

# PHASE 2 — EXECUTE THE APPROVED PLAN

Enter Phase 2 only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO KEIKI PLAN
```

A vague response such as “looks good,” “continue,” or “go ahead” does not satisfy the gate.

## 10. Reconfirm state and isolate work

- Reconfirm the starting commit and working tree.
- Preserve unrelated user changes.
- Use the user-requested branch, otherwise reuse an existing safe dedicated migration branch, otherwise create or use `switch-to-keiki`.
- If the branch exists, inspect it; do not reset or overwrite it blindly.
- Do not modify or merge the default branch unless the user separately requests that Git action.
- Verify that the writable repository and pull-request destination still match the approved plan.

## 11. Execute parity-only replacement

Implement only the approved plan.

Allowed changes:

- source-provider dependencies and lifecycle;
- inbound and outbound provider adapters;
- provider-specific schemas and identifiers;
- provider-specific configuration;
- related tests, fixtures, setup documentation, and credential-name templates.

Required approach:

- translate Keiki events, turns, and gateway responses into the application's existing internal shape;
- preserve prompts, LLM behavior, business logic, UI, and product copy;
- preserve language and hosting model unless the approved target explicitly changes them;
- preserve retry, ordering, deduplication, idempotency, attachment, status, and error semantics;
- retain compatibility fields or aliases needed for existing stored records;
- never expose real secrets;
- preserve every approved actively reachable closed source value individually;
- implement approved conversion rules for open-ended values;
- preserve user-visible behavior even when Keiki requires additional target-side calls;
- implement required typing cleanup when typing behavior is active;
- handle synchronous or asynchronous send failures according to the selected Keiki surfaces;
- handle applicable connection, turn, dispatch, webhook-retry, request-timeout, and shutdown behavior;
- handle only the attachment readiness, retrieval, upload, MIME, size, timeout, unsupported-media, and transfer-failure cases applicable to active source behavior;
- preserve or explicitly replace receiving-line filtering using verified event, conversation, or line identity;
- settle every harness turn via `POST {turnUrl}/complete` — an unsettled turn dies at its deadline; fan out multi-message `messages[]` turns per message while sharing turn context, honor `midTurnStrategy`/`keiki.turn.arrival` semantics, and never feed `silent:true` platform entries to the agent as user messages;
- map the source webhook deduplication key (`event_id`, `webhook_id`, `message.id`, provider event ID — whichever the source actually uses) onto Keiki turn/arrival dedup semantics explicitly; at-least-once source delivery plus Keiki turn fan-out can multiply duplicates if the dedup domain is not preserved;
- handle `keiki.reaction` and cancellation dispatches as non-turn events (2xx ack, no settlement);
- never log, persist, or include `Keiki-Turn-Token`/`ht_…`/`kts1.…` credentials in event dumps, error reports, or stored payloads — redact authorization headers before storage;
- avoid retaining unverified RCS, SMS, iMessage, capability, or product claims in prompts or product copy.

Prohibited changes:

- new Keiki capabilities;
- unrelated refactors or broad cleanup;
- database-vendor changes;
- unrelated schema or dependency changes;
- silent hosting changes;
- removal of non-iMessage channels outside approved scope.

## 12. Enforce scope changes

When necessary work is discovered outside the approved plan, stop and produce:

```text
Switch to Keiki — Plan Revision Required
```

Explain:

- the new requirement;
- why it is necessary;
- files that must be added to scope;
- whether product behavior changes;
- updated risks;
- updated verification.

Do not continue until the user's latest message again contains `APPROVE SWITCH TO KEIKI PLAN`. Original approval is not unlimited permission.

## 13. Verify

Read [`verification.md`](./verification.md). Compare the implementation to the approved plan, run available repository checks, prove each approved capability, verify exact installed versions against approved planned versions, search for active source-provider remnants, and review the complete diff before reporting status.
