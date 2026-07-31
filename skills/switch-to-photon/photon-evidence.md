# Photon evidence and capability verification

Use this file after source-provider detection and before selecting the final Photon target.

## 1. Exact target identity

For every installable Photon package considered, record:

- product name;
- package name;
- exact planned package version;
- exported public types and methods used by the migration;
- versioned public API documentation when available;
- official Agent Skill path and commit;
- source repository and commit only when implementation inspection is required;
- official test path and commit when tests exist and are relevant.

Do not plan against an unpinned package range such as `^8.1.0`.

During verification, record the exact installed version resolved by the lockfile and confirm that it matches the approved planned version.

For every hosted Photon service considered, record:

- hosted service name;
- public endpoint or product;
- public authentication, API, event, and operational contract;
- official documentation source;
- documentation retrieval date;
- official Agent Skill path and commit;
- official source repository and commit only when inspected and confirmed to represent the hosted service.

Do not invent a hosted-service version when Photon does not publish one.

A repository package version is not automatically the version of the hosted deployment.

## 2. Evidence order

Use the hierarchy appropriate to the target.

### Installable Photon SDK

1. Exact planned package version and exported public type declarations.
2. Versioned public API documentation for that package.
3. Official Photon Agent Skill relevant to the target.
4. Public implementation backing the exported API.
5. Official tests of the public API, when they exist.
6. Official examples and README content.

### Hosted Photon service

1. Public hosted-service API, event, authentication, and operational contract.
2. Official hosted-service documentation.
3. Official Photon Agent Skill relevant to the service.
4. Official source repository and commit, when confirmed to represent the hosted service.
5. Internal package types or implementation only as supporting evidence.

Do not treat internal implementation as a supported public capability unless it is publicly exported or documented.

A missing capability in a lower-ranked source does not override capability evidence in a higher-ranked public source.

When official sources disagree, use the publicly supported API or hosted-service contract as the execution boundary.

Implementation-only capabilities must remain unverified unless they are publicly exported and supported for the selected target.

## 3. Unsupported-capability rule

Do not declare a capability unsupported based on one missing example, README section, Agent Skill, or documentation page.

Use this escalation:

### Level 1

Inspect:

- public package types or hosted API contract;
- relevant official documentation;
- relevant Photon Agent Skill.

### Level 2

Only when Level 1 is incomplete or conflicting, inspect:

- official implementation;
- official tests when they exist;
- official product repository.

Record when implementation source or official tests are unavailable.

The absence of official tests must not make planning impossible.

### Level 3

When the capability remains unresolved:

- compare alternative Photon targets;
- mark the capability unresolved;
- block execution.

Do not perform an unbounded search across every Photon repository.

When evidence is incomplete or conflicting during initial planning, use:

```text
Photon capability status: unresolved

Conflicting or incomplete evidence:
- <source>
- <source>

Public execution boundary:
- <supported public contract or unknown>

Required action:
- inspect the selected target’s public types or hosted-service contract;
- inspect implementation or tests only when public evidence remains incomplete;
- compare another Photon surface if it may preserve parity;
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

| Exact source behavior or closed value | Photon product | Exact method or endpoint | Exact Photon input or value | Output and error semantics | Evidence | Confidence |
| ------------------------------------- | -------------- | ------------------------ | --------------------------- | -------------------------- | -------- | ---------- |

### Open-ended values

Document the conversion rule and test representative values, invalid values, and unknown values.

Examples:

- arbitrary custom emoji;
- free-form Photon reaction strings;
- MIME types;
- custom payloads;
- user-provided identifiers.

Use:

| Open-ended source value type | Conversion rule | Photon product | Exact method or endpoint | Representative tests | Invalid or unknown behavior | Evidence | Confidence |
| ---------------------------- | --------------- | -------------- | ------------------------ | -------------------- | --------------------------- | -------- | ---------- |

Do not claim to enumerate every possible value in an open-ended set.

## 5. Architecture selection

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

A mixed Photon architecture may be preferred when it preserves existing REST, webhook, Socket.IO, or adapter boundaries with fewer application changes.

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

- why the existing Photon REST, Socket.IO, or webhook surface is insufficient;
- every application module affected;
- the lifecycle introduced by the new transport;
- the additional verification required;
- why the change is safer than preserving the current architecture.

Do not force Spectrum into a REST or webhook application solely because Spectrum supports the required capabilities.

Select Spectrum only when the source already uses a unified message-stream abstraction, or when the plan proves that adopting Spectrum creates a smaller and safer migration than preserving the existing REST and webhook boundaries.

When more than one Photon surface is selected, include:

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
- handling asynchronous send failures when an SDK or real-time target reports failures asynchronously;
- preserving line filtering through verified webhook metadata, Socket.IO event data, or recipient metadata.

Evaluate user-visible and operational behavior, not method-name similarity.

Lifecycle requirements must match the selected target.

For an SDK or Socket.IO/WebSocket target, consider:

- startup readiness;
- disconnect;
- reconnect;
- send during disconnect;
- duplicate listeners;
- clean shutdown.

For Photon Webhook, consider:

- signature verification;
- timestamp validation;
- acknowledgement;
- duplicate delivery;
- retry behavior;
- malformed events.

For Photon HTTP Proxy REST, consider:

- authentication failure;
- synchronous request failure;
- timeout;
- rate or server failure;
- ambiguous send result;
- idempotency or retry behavior when supported.

Do not require SDK connection behavior when the application uses only hosted REST and HTTP webhooks.

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

- an exact public Photon method, endpoint, or event contract;
- exact accepted values for a closed value set;
- a conversion rule for an open-ended value set;
- exact identifier requirements;
- applicable error and lifecycle semantics;
- sufficient bounded evidence;
- an approved behavior change.

A plan is also blocked when:

- an installable Photon dependency lacks an exact planned version;
- a hosted Photon service lacks an identified public contract and documentation retrieval date;
- a transport change lacks an architecture-preservation comparison;
- Spectrum is selected for a REST or webhook application without proving lower total migration risk;
- a mixed target lacks responsibility and lifecycle ownership;
- repository write access or a writable execution destination remains unresolved;
- documentation retrieval failure is represented as proof that documentation does not exist.

Do not remove a capability to make the plan executable.
