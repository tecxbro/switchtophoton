# Migration workflow

The workflow has two hard phases. Do not combine them.

## Mandatory decision order

```text
Inspect repository
→ detect source provider
→ detect exact source version or API generation
→ identify active source capabilities
→ read the matching source-provider reference
→ select the closest Photon target
→ build parity plan
→ request approval
→ execute
→ verify
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

Never assume current documentation matches the repository's installed generation.

## 4. Read approved source-provider documentation

Follow the policy in [`providers/index.md`](./providers/index.md). Use only official `llms.txt`, official `llms-full.txt`, or official Markdown files ending in `.md` that are linked by this skill.

When no approved source is registered, rely on repository evidence, report the absence, and treat unresolved version uncertainty as a planning blocker.

## 5. Inventory active capabilities

A capability is in scope only when active code, tests, stored data, or deployment configuration proves the application uses or operationally depends on it.

Inspect inbound and outbound text, direct and group messaging, line selection, attachments, replies, reactions, typing, read state, effects, edits, unsends, delivery states, history or polling, SMS/RCS fallback, webhook authentication and acknowledgement, retries, idempotency, deduplication, ordering, lifecycle, and persisted provider identifiers.

List unused source-provider and Photon features as intentionally excluded. Do not map or add them.

## 6. Select the closest Photon target

Read [`photon-targets.md`](./photon-targets.md). Preserve the language, hosting model, inbound and outbound transport shape, and internal application message shape with the smallest safe change.

After selecting the target, load only the corresponding official Photon Agent Skill and confirm the required Photon APIs from official agent-readable sources.

## 7. Build and show the plan

Use [`plan-template.md`](./plan-template.md) exactly. Show the complete plan and end the response with:

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

## 8. Reconfirm state and isolate work

- Reconfirm the starting commit and working tree.
- Preserve unrelated user changes.
- Create or use `switch-to-photon`.
- If the branch exists, inspect it; do not reset or overwrite it blindly.
- Do not modify or merge the default branch unless the user separately requests that Git action.

## 9. Execute parity-only replacement

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
- never expose real secrets.

Prohibited changes:

- new Photon capabilities;
- unrelated refactors or broad cleanup;
- database-vendor changes;
- unrelated schema or dependency changes;
- silent hosting changes;
- removal of non-iMessage channels outside approved scope.

## 10. Enforce scope changes

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

## 11. Verify

Read [`verification.md`](./verification.md). Compare the implementation to the approved plan, run available repository checks, prove each approved capability, search for active source-provider remnants, and review the complete diff before reporting status.
