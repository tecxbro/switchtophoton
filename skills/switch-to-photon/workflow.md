# Migration workflow

The workflow has two hard phases: **plan** and **execute**. Do not combine them.

## Phase 1 — Inspect and plan (read-only)

### 1. Establish repository state

Without changing anything:

- identify the repository root, current branch, and default branch;
- inspect `git status`;
- record the starting commit;
- identify package managers, languages, frameworks, test commands, and deployment model;
- preserve unrelated uncommitted changes;
- do not create a branch, edit a file, install a package, reformat code, or change configuration yet.

If inspection cannot be completed safely because the working tree is ambiguous, explain that in the plan.

### 2. Detect the source provider

Search the entire repository, including:

- manifests and lockfiles;
- imports, generated clients, adapters, and wrappers;
- API hosts, paths, headers, environment variables, and secrets schemas;
- inbound webhook, polling, WebSocket, stream, MCP, or adapter handlers;
- outbound send functions;
- attachment upload/download code;
- typing, read receipt, reaction, reply, group, edit, unsend, status, fallback, and line-selection code;
- persisted provider message, chat, conversation, line, participant, and event identifiers;
- retries, idempotency, deduplication, ordering, timeout, shutdown, and error handling;
- tests, fixtures, mocks, deployment files, setup scripts, and documentation.

Read [`providers/index.md`](./providers/index.md), then the matching provider file.

### 3. Determine the version or API generation

Use evidence in this order:

1. **Exact locked SDK version** from a lockfile, generated metadata, or vendored package.
2. **Package family and imported API shape** when a lockfile is absent.
3. **API host, base path, endpoint names, and authentication headers** for raw HTTP integrations.
4. **Request/response and webhook payload shapes**, especially version fields and identifier formats.
5. **Tests and fixtures** that reveal the expected wire format.
6. **Comments or documentation** only as supporting evidence.

Rules:

- If the project uses an SDK, report its exact installed version when available—not only the manifest range.
- If the project calls REST directly, report the API family, such as `Sendblue legacy REST`, `Linq V2`, `Linq V3`, or `Blooio v4`.
- If signals from multiple generations coexist, report `mixed` and identify which paths are active.
- Do not assume the latest provider API merely because the latest documentation exists.
- If historical documentation is unavailable, use the repository's types, fixtures, and tests as the source of truth and state the uncertainty.

Give the detection a confidence level:

- **High:** lockfile/version plus matching code and wire format;
- **Medium:** multiple matching HTTP or payload fingerprints but no exact package version;
- **Low:** provider inferred from names with incomplete runtime evidence.

Low-confidence detection is a planning blocker. Do not edit until resolved or explicitly accepted by the user.

### 4. Confirm current official documentation

Read the source provider's official docs linked from its provider file. Prefer, in order:

1. versioned OpenAPI or SDK reference;
2. official `llms.txt` / `llms-full.txt`;
3. official Markdown documentation pages;
4. official repository and changelog;
5. official HTML documentation.

Then read the current Photon docs and the relevant Photon skill. Use live docs to confirm APIs, but keep the migration aligned to the source version actually found in the repository.

### 5. Inventory used capabilities

A capability counts as used only when active code invokes, receives, persists, tests, or operationally depends on it.

Check at least:

- inbound text;
- outbound text;
- direct and group conversations;
- sender or line selection;
- attachments, media uploads, downloads, and voice notes;
- replies and thread references;
- reactions and tapbacks;
- typing indicators;
- read receipts;
- message effects;
- edits and unsends;
- delivery and failure statuses;
- polling or message history;
- SMS/RCS fallback and service detection;
- contact cards, contacts, opt-out, or compliance behavior;
- webhook authentication, retries, and acknowledgement;
- message/event deduplication and send idempotency;
- stored provider IDs and existing-record compatibility.

Do not map unused provider features.

### 6. Choose the Photon target

Read [`photon-targets.md`](./photon-targets.md). Select the Photon surface that preserves the current language, framework, hosting model, and inbound/outbound architecture with the fewest changes.

### 7. Build and show the migration plan

Use [`plan-template.md`](./plan-template.md). The plan must include:

- source provider and detected generation/version;
- evidence and confidence;
- current architecture;
- capabilities used and intentionally out of scope;
- chosen Photon target and rationale;
- one-to-one behavior mapping;
- files expected to change;
- dependencies and environment variables to replace;
- persisted identifiers and compatibility strategy;
- tests and verification commands;
- manual Photon setup;
- blockers, risks, and anything not equivalent.

Show the plan to the user and stop. End with a direct approval request such as:

> Approve this plan and I will create `switch-to-photon` and execute only this scope.

Do not make migration changes in the same turn as the first plan unless the user had already reviewed and explicitly approved that exact plan.

## Phase 2 — Execute the approved plan

### 8. Create the migration branch

After approval:

- verify the starting commit and working tree have not unexpectedly changed;
- create and switch to `switch-to-photon` before editing;
- if the branch already exists, inspect it and never reset or overwrite it blindly;
- do not push, open a pull request, merge, or modify the default branch unless explicitly requested.

### 9. Replace the provider boundary

Implement only the approved plan:

- keep application handlers and business logic intact;
- introduce or update a thin Photon transport boundary;
- translate Photon events into the application's existing internal message shape;
- preserve application-level conversation and user identifiers where possible;
- translate provider identifiers at the boundary;
- replace initialization and shutdown cleanly;
- replace provider environment names, templates, validation, and setup docs without exposing secrets;
- preserve documented retry, ordering, deduplication, idempotency, timeout, attachment, and error semantics;
- keep compatibility fields when existing records still need them;
- remove the old dependency and dead path only after replacement tests pass.

### 10. Stay within scope

Allowed changes:

- provider dependencies;
- provider initialization and lifecycle;
- inbound/outbound transport adapters;
- provider-specific schemas and identifiers;
- provider-specific environment configuration;
- related tests, fixtures, mocks, setup, and migration documentation.

Do not change:

- prompts or model behavior;
- business rules;
- database vendor;
- unrelated schemas;
- UI or product copy;
- unrelated dependencies;
- hosting architecture unless required by the approved target;
- formatting or naming in untouched modules;
- features unrelated to transport parity.

### 11. Verify and report

Read [`verification.md`](./verification.md). Review every changed file against the approved plan. Any newly discovered required work must be reported as a plan change instead of silently expanding scope.
