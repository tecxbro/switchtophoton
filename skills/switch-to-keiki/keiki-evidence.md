# Keiki evidence and capability verification

Use this file after source-provider detection and before selecting the final Keiki target.

## 1. Exact target identity

For every installable Keiki package considered, record:

- product name;
- package name;
- exact planned package version;
- exported public types and methods used by the migration;
- versioned public API documentation when available;
- official agent-facing documentation or skill revision, when published;
- source repository and commit only when implementation inspection is required;
- official test path and commit when tests exist and are relevant.

Do not plan against an unpinned package range such as `^1.2.0`.

During verification, record the exact installed version resolved by the lockfile and confirm that it matches the approved planned version.

For every hosted Keiki service considered, record:

- hosted service name;
- public endpoint or product;
- public authentication, API, event, and operational contract;
- official documentation source;
- documentation retrieval date;
- official agent-facing documentation or skill revision, when published;
- official source repository and commit only when inspected and confirmed to represent the hosted service.

Do not invent a hosted-service version when Keiki does not publish one.

A repository package version is not automatically the version of the hosted deployment.

## 2. Evidence order

Use the hierarchy appropriate to the target.

### Installable Keiki SDK or adapter

1. Exact planned package version and exported public type declarations.
2. Versioned public API documentation for that package.
3. Official agent-facing Keiki documentation (`llms.txt`, `llms-full.txt`, `/setup.md`) or Agent Skill, when published.
4. Public implementation backing the exported API.
5. Official tests of the public API, when they exist.
6. Official examples and README content.

### Hosted Keiki service

1. Public hosted-service API, event, authentication, and operational contract — including the official OpenAPI document at `https://onkeiki.com/openapi.json`.
2. Official hosted-service documentation (`https://onkeiki.com/docs/*.md`).
3. Official Keiki `llms.txt` / `llms-full.txt` indexes.
4. Official agent-facing Keiki documentation or Agent Skill relevant to the service, when published.
5. Official source repository and commit, when confirmed to represent the hosted service.
6. Internal package types or implementation only as supporting evidence.

Do not treat internal implementation as a supported public capability unless it is publicly exported or documented.

A missing capability in a lower-ranked source does not override capability evidence in a higher-ranked public source.

When official sources disagree, use the publicly supported API or hosted-service contract as the execution boundary.

Implementation-only capabilities must remain unverified unless they are publicly exported and supported for the selected target.

## 3. Unsupported-capability rule

Do not declare a capability unsupported based on one missing example, README section, agent-facing guide, documentation page, or OpenAPI path.

Use this escalation:

### Level 1

Inspect:

- public package types or hosted API contract;
- the official OpenAPI document;
- relevant official documentation;
- relevant agent-facing Keiki documentation or Agent Skill, when published.

### Level 2

Only when Level 1 is incomplete or conflicting, inspect:

- official implementation;
- official tests when they exist;
- official product repository.

Record when implementation source or official tests are unavailable.

The absence of official tests must not make planning impossible.

### Level 3

When the capability remains unresolved:

- compare alternative Keiki surfaces;
- mark the capability unresolved;
- block execution.

Do not perform an unbounded search across every Keiki repository.

When evidence is incomplete or conflicting during initial planning, use:

```text
Keiki capability status: unresolved

Conflicting or incomplete evidence:
- <source>
- <source>

Public execution boundary:
- <supported public contract or unknown>

Required action:
- inspect the selected target’s public types or hosted-service contract;
- inspect implementation or tests only when public evidence remains incomplete;
- compare another Keiki surface if it may preserve parity;
- block execution until the initial plan is resolved.
```

When a conflict is discovered after an earlier plan was approved, require a revised plan.

Do not automatically select either the most capable or least capable interpretation.

## 4. Value classification and capability evidence

Classify active values as either closed or open-ended.

### Closed value sets

Map every actively reachable value individually.

Examples:

- standard reactions;
- documented effects;
- service enums;
- delivery states;
- group-operation enums.

Use one row for every actively reachable closed value:

| Exact source behavior or closed value | Keiki surface | Exact method or endpoint | Exact Keiki input or value | Output and error semantics | Evidence | Confidence |
| ------------------------------------ | ------------- | ------------------------ | ------------------------- | -------------------------- | -------- | ---------- |

### Open-ended values

Document the conversion rule and test representative values, invalid values, and unknown values.

Examples:

- arbitrary custom emoji;
- free-form Keiki reaction strings;
- MIME types;
- custom payloads;
- user-provided identifiers.

Use:

| Open-ended source value type | Conversion rule | Keiki surface | Exact method or endpoint | Representative tests | Invalid or unknown behavior | Evidence | Confidence |
| ---------------------------- | --------------- | ------------- | ------------------------ | -------------------- | --------------------------- | -------- | ---------- |

Do not claim to enumerate every possible value in an open-ended set.

## 5. Architecture selection

Architecture preservation remains the default.

A capability supported by a hosted Keiki agent does not by itself justify replacing an existing REST or HTTP-webhook boundary.

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

A mixed Keiki architecture may be preferred when it preserves existing REST, webhook, harness-dispatch, gateway, or adapter boundaries with fewer application changes.

Evaluate separately:

- inbound events;
- outbound sends;
- attachments;
- reactions;
- effects;
- chat lookup;
- group operations;
- line selection;
- lifecycle;
- errors and delivery status.

Any transport change must identify:

- why the existing Keiki REST, webhook, harness, gateway, or SDK surface is insufficient;
- every application module affected;
- the lifecycle introduced by the new transport;
- the additional verification required;
- why the change is safer than preserving the current architecture.

Do not force a hosted Keiki agent loop into a REST or webhook application solely because it supports the required capabilities.

Select a cloud-served or self-hosted Keiki agent only when the source already uses an agent or unified message-stream abstraction, or when the plan proves that adopting one creates a smaller and safer migration than preserving the existing REST and webhook boundaries.

When more than one Keiki surface is selected, include:

- the responsibility of each surface;
- the capability or architecture boundary served by each surface;
- why the combination is safer or smaller than alternatives;
- credential sharing;
- identifier compatibility;
- event and connection ownership;
- duplicate-event or duplicate-listener risks;
- lifecycle ownership;
- shutdown behavior;
- retry behavior;
- verification for the combined architecture.

## 6. Behavioral parity

A target-side call can be required even when the source has no identically named call.

Examples:

- explicitly stopping typing when the source provider clears typing automatically;
- waiting for an attachment transfer before downloading when the selected target requires it;
- handling asynchronous send failures when an SDK, harness, or gateway target reports failures asynchronously;
- settling a Keiki turn (`/complete`) when the source provider has no turn concept;
- preserving line filtering through verified webhook metadata, turn payload line identity, or conversation metadata.

Evaluate user-visible and operational behavior, not method-name similarity.

Lifecycle requirements must match the selected target.

For an external harness target, consider:

- dispatch readiness and acknowledgement;
- signature verification (HMAC and/or Ed25519);
- turn completion and failure settlement;
- mid-turn arrivals and consumed-arrival reporting;
- turn credential expiry;
- dispatch endpoint outage;
- relay and inbox claim semantics;
- duplicate dispatches;
- clean shutdown.

For Keiki event webhooks, consider:

- signature verification;
- timestamp validation;
- acknowledgement;
- duplicate delivery;
- retry behavior;
- malformed events.

For the developer REST API or agent API gateway, consider:

- authentication and scope failure;
- synchronous request failure;
- timeout;
- rate or server failure;
- ambiguous send result;
- idempotency or retry behavior when supported.

For a self-hosted SDK loop, consider:

- startup readiness;
- disconnect;
- reconnect;
- send during disconnect;
- duplicate listeners;
- clean shutdown.

Do not require turn or dispatch behavior when the application uses only hosted REST and HTTP webhooks.

## 7. Attachment evidence

Run only attachment checks applicable to attachment behavior actively used by the source application and supported by the selected target.

Possible checks include:

- outbound local-file upload;
- outbound URL download before upload;
- inbound attachment metadata;
- inbound attachment retrieval;
- pending or unavailable attachment;
- MIME normalization;
- size limits;
- timeout;
- unsupported media;
- partial or failed transfer.

The plan must identify which checks apply and why.

## 8. Required blockers

A plan is blocked when any active capability lacks one of:

- an exact public Keiki method, endpoint, event contract, or OpenAPI operation;
- exact accepted values for a closed value set;
- a conversion rule for an open-ended value set;
- exact identifier requirements;
- applicable error and lifecycle semantics;
- sufficient bounded evidence;
- an approved behavior change.

A plan is also blocked when:

- an installable Keiki dependency lacks an exact planned version;
- a hosted Keiki service lacks an identified public contract and documentation retrieval date;
- a transport change lacks an architecture-preservation comparison;
- a hosted Keiki agent loop is selected for a REST or webhook application without proving lower total migration risk;
- a mixed target lacks responsibility and lifecycle ownership;
- repository write access or a writable execution destination remains unresolved;
- documentation retrieval failure is represented as proof that documentation does not exist.

Do not remove a capability to make the plan executable.
