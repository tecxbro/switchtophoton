# Migration workflow

The workflow has two hard phases. Do not combine them.

## Mandatory decision order

```text
Inspect repository
→ detect source provider
→ detect exact source version or API generation
→ identify active source capabilities
→ classify active values as closed or open-ended
→ map actively reachable closed values individually
→ document conversion rules for open-ended values
→ read the matching source-provider reference
→ identify source transport and behavior semantics
→ inspect current official Photon evidence
→ identify the exact planned version for each installable Photon package
→ identify the public contract and retrieval date for each hosted Photon service
→ select inbound Photon transport
→ select outbound Photon transport
→ select attachment transport
→ select applicable lifecycle and error model
→ compare architecture preservation and migration risk
→ prove each capability mapping
→ identify writable execution destination and branch
→ build migration plan and capability evidence appendix
→ request approval
→ execute
→ verify installed versions against approved planned versions
→ verify against source and approved plan
```

Do not begin by choosing Photon APIs.

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

If repository state is ambiguous, report it as a blocker rather than altering it.

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
  - unavailable.
- Execution branch:
  - <branch>
- Pull-request destination:
  - <repository and base branch or none>

Do not request execution approval until a writable execution destination has been identified.

Execution branch precedence:

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-photon`.

Never override an explicit user-selected branch with the default.

## 2. Detect the source provider

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

Read [`providers/index.md`](./providers/index.md), then only the matching provider file.

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
- `Mixed generations`
- `Unknown generation`

Examples include `Sendblue TypeScript SDK 3.2.1`, `Sendblue raw REST using /api/send-message`, `Linq V2`, `Linq V3`, `Mixed Linq V2/V3`, `Blooio v4`, or `BlueBubbles server generation unknown`.

Report confidence:

- **High:** exact version or generation plus matching runtime and wire-format evidence.
- **Medium:** multiple matching runtime fingerprints but no exact package or server version.
- **Low:** incomplete or conflicting evidence.

Low-confidence detection blocks automatic execution. The plan must state the risk. Phase 2 remains blocked unless the user both uses the exact approval phrase and explicitly accepts that stated risk.

Source-provider confidence applies only to source detection. It does not establish confidence in Photon capability mappings.

Assign a separate confidence level to every Photon capability row in the capability evidence appendix.

Never assume current documentation matches the repository's installed generation.

## 4. Read approved source-provider documentation

Follow the policy in [`providers/index.md`](./providers/index.md). Use only official `llms.txt`, official `llms-full.txt`, or official Markdown files ending in `.md` that are linked by this skill.

When no approved source is registered, rely on repository evidence, report the absence, and treat unresolved version uncertainty as a planning blocker.

## 5. Inventory active capabilities

A capability is in scope only when active code, tests, stored data, or deployment configuration proves the application uses or operationally depends on it.

Inspect inbound and outbound text, direct and group messaging, line selection, attachments, replies, reactions, typing, read state, effects, edits, unsends, delivery states, history or polling, SMS/RCS fallback, webhook authentication and acknowledgement, retries, idempotency, deduplication, ordering, lifecycle, and persisted provider identifiers.

List unused source-provider and Photon features as intentionally excluded. Do not map or add them.

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

## 6. Verify Photon evidence and select the target

Read [`photon-evidence.md`](./photon-evidence.md) before selecting a Photon product.

For installable Photon packages, record the exact planned package version and exported public API used by the migration.

For hosted Photon services, record the service, endpoint, public API or event contract, official documentation source, and retrieval date. Do not invent a hosted-service version when none is published.

Architecture preservation remains the default.

A capability supported by Spectrum or Advanced iMessage Kit does not by itself justify replacing an existing REST or HTTP-webhook boundary.

Prefer the Photon architecture that produces the smallest safe migration.

Do not prefer one Photon surface merely because it has broad capability coverage.

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

1. inbound HTTP, Socket.IO, WebSocket, SDK, or unified-stream transport;
2. outbound messaging transport;
3. attachment retrieval and sending;
4. reactions and effects;
5. chat and group operations;
6. line and recipient routing;
7. applicable connection or request lifecycle;
8. errors, retries, delivery failures, duplicate events, and reconnect behavior.

Do not force Spectrum into a REST or webhook application solely because Spectrum supports the required capabilities.

Select Spectrum only when the source already uses a unified message-stream abstraction, or when the plan proves that adopting Spectrum creates a smaller and safer migration than preserving the existing REST and webhook boundaries.

Any transport change must identify:

- why the existing Photon REST, Socket.IO, or webhook surface is insufficient;
- every application module affected;
- the lifecycle introduced by the new transport;
- the additional verification required;
- why the change is safer than preserving the current architecture.

A mixed target may be preferred when it preserves the source application’s existing inbound, outbound, attachment, hosting, or lifecycle boundaries with fewer application changes.

When selecting a mixed target, prove:

- the responsibility of each Photon surface;
- why the combination is safer or smaller than the alternatives;
- how identifiers are shared;
- how credentials are configured;
- which component owns events, connections, lifecycle, and shutdown;
- how duplicate events, connections, or listeners are prevented;
- how retries and ambiguous results are handled.

Do not reject Photon HTTP Proxy, Photon HTTP Proxy Socket.IO events, Spectrum, Advanced iMessage Kit, Photon Webhook, or another Photon surface using unsupported assumptions.

Cite exact public methods, endpoints, event contracts, or limitations.

## 7. Prove target capability parity

Before writing the plan:

- inspect the selected target’s public types or hosted API contract;
- inspect the relevant official documentation and Photon Agent Skill;
- inspect implementation or official tests only when public evidence is incomplete or conflicting;
- record when implementation source or official tests are unavailable;
- compare synchronous and asynchronous error behavior applicable to the selected surfaces;
- compare attachment behavior actively used by the source application;
- compare typing lifecycle when typing behavior exists;
- compare service and line identity;
- compare group participant semantics;
- compare source and Photon identifiers;
- map every actively reachable closed reaction, effect, service, status, and operation value;
- document conversion rules for open-ended values.

Do not perform an unbounded search across every Photon repository.

When one official source omits a capability but another public official source supports it, do not remove the source capability.

When public evidence and implementation disagree, use the publicly supported contract as the execution boundary.

Implementation-only behavior must remain unverified unless it is publicly exported and supported.

If exact parity remains uncertain during initial planning, mark the capability unresolved in the initial plan and block execution.

Request a revised plan only when the conflict or uncertainty is discovered after an earlier plan was approved.

## 8. Build and show the plan

Use [`plan-template.md`](./plan-template.md) exactly.

Produce two sections:

### Migration plan

A reviewable summary containing:

- source detection;
- architecture;
- selected Photon target or target combination;
- important behavior mappings;
- behavior changes;
- files expected to change;
- blockers;
- cutover impact;
- verification strategy;
- execution access, branch, and pull-request destination.

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

Approval applies to both sections, but the main migration plan must remain concise enough for meaningful review.

Show the complete plan and end the response with:

```text
To approve this exact migration plan, reply:

APPROVE SWITCH TO PHOTON PLAN
```

Then stop. Do not make migration changes in the same response.

## Native plan-mode recommendation

Use the coding product's native Plan, Ask, or read-only mode when available. The portable Phase 1 protocol remains mandatory whether or not a native mode exists. Do not claim this skill can programmatically enable a product-specific mode, and do not invent unsupported product commands.

# PHASE 2 — EXECUTE THE APPROVED PLAN

Enter Phase 2 only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO PHOTON PLAN
```

A vague response such as “looks good,” “continue,” or “go ahead” does not satisfy the gate.

## 9. Reconfirm state and isolate work

- Reconfirm the starting commit and working tree.
- Preserve unrelated user changes.
- Use the user-requested branch, otherwise reuse an existing safe dedicated migration branch, otherwise create or use `switch-to-photon`.
- If the branch exists, inspect it; do not reset or overwrite it blindly.
- Do not modify or merge the default branch unless the user separately requests that Git action.
- Verify that the writable repository and pull-request destination still match the approved plan.

## 10. Execute parity-only replacement

Implement only the approved plan.

Allowed changes:

- source-provider dependencies and lifecycle;
- inbound and outbound provider adapters;
- provider-specific schemas and identifiers;
- provider-specific configuration;
- related tests, fixtures, setup documentation, and credential-name templates.

Required approach:

- translate Photon events into the application's existing internal shape;
- preserve prompts, LLM behavior, business logic, UI, and product copy;
- preserve language and hosting model unless the approved target explicitly changes them;
- preserve retry, ordering, deduplication, idempotency, attachment, status, and error semantics;
- retain compatibility fields or aliases needed for existing stored records;
- never expose real secrets;
- preserve every approved actively reachable closed source value individually;
- implement approved conversion rules for open-ended values;
- preserve user-visible behavior even when Photon requires additional target-side calls;
- implement required typing cleanup when typing behavior is active;
- handle synchronous or asynchronous send failures according to the selected Photon surfaces;
- handle applicable connection, disconnect, reconnect, duplicate-listener, webhook-retry, request-timeout, and shutdown behavior;
- handle only the attachment readiness, retrieval, upload, MIME, size, timeout, unsupported-media, and transfer-failure cases applicable to active source behavior;
- preserve or explicitly replace receiving-line filtering using verified event or recipient identity;
- avoid retaining unverified RCS, SMS, iMessage, capability, or product claims in prompts or product copy.

Prohibited changes:

- new Photon capabilities;
- unrelated refactors or broad cleanup;
- database-vendor changes;
- unrelated schema or dependency changes;
- silent hosting changes;
- removal of non-iMessage channels outside approved scope.

## 11. Enforce scope changes

When necessary work is discovered outside the approved plan, stop and produce:

```text
Switch to Photon — Plan Revision Required
```

Explain:

- the new requirement;
- why it is necessary;
- files that must be added to scope;
- whether product behavior changes;
- updated risks;
- updated verification.

Do not continue until the user's latest message again contains `APPROVE SWITCH TO PHOTON PLAN`. Original approval is not unlimited permission.

## 12. Verify

Read [`verification.md`](./verification.md). Compare the implementation to the approved plan, run available repository checks, prove each approved capability, verify exact installed versions against approved planned versions, search for active source-provider remnants, and review the complete diff before reporting status.
