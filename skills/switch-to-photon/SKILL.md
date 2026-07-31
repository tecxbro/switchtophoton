---
name: switch-to-photon
description: >
  Switch to Photon by inspecting and planning a parity-only replacement of an existing iMessage, SMS API,
  messaging SDK, or messaging provider integration. Use for Switch to Photon, migrate to Photon, replace Sendblue,
  replace Linq, BlueBubbles migration, Blooio migration, LoopMessage migration, Texting Blue migration,
  iMessage-provider migration, messaging-provider replacement, messaging SDK migration, SMS API migration,
  provider parity migration, Photon Spectrum migration, Photon Webhook migration, Photon HTTP Proxy migration,
  Advanced iMessage Kit migration, self-hosted iMessage Kit migration, Photon MCP migration, or Vercel Chat SDK
  chat-adapter-imessage migration. Detect the exact source SDK version, REST API generation, webhook generation,
  mixed generation, active capabilities, and architecture before selecting Photon. Remain read-only until a complete
  plan is shown and the user's latest message explicitly contains the exact approval phrase. Execute only approved
  behavior, stop for scope changes, protect secrets, and verify the final implementation against the approved plan.
license: MIT
metadata:
  author: tecxbro
---

# Switch to Photon

Replace an existing messaging-provider boundary with the closest Photon product without redesigning the application.

## Core migration contract

These rules are mandatory:

1. Inspect before editing.
2. Plan before execution.
3. Show the complete plan to the user.
4. Stop after showing the plan.
5. Execute only after the user's latest message explicitly contains `APPROVE SWITCH TO PHOTON PLAN`.
6. Migrate only capabilities already used by active code, tests, storage, or deployment configuration.
7. Do not introduce new Photon features.
8. Do not refactor unrelated application code.
9. Detect the exact source SDK version or API generation.
10. Do not assume the application uses the latest source-provider API.
11. Select the Photon product that most closely preserves the existing architecture.
12. For installable Photon packages, record the exact planned package version.

    For hosted Photon services, record:

    - hosted service name;
    - public endpoint or product;
    - official documentation source;
    - documentation retrieval date;
    - official source repository commit when inspected;
    - publicly exposed API or event contract.

    Do not invent a hosted-service version when Photon does not publish one.
13. Do not treat absence from one documentation page, example, Agent Skill, or README as proof that Photon lacks a capability.
14. Before declaring a Photon capability unsupported:

    1. inspect the selected target’s public types or API contract;
    2. inspect the relevant official documentation and Agent Skill;
    3. inspect official implementation or tests only when the public evidence is incomplete or conflicting;
    4. record when implementation source or official tests are unavailable.

    The absence of official tests must not make planning impossible.
15. When official Photon sources conflict during initial planning, mark the capability unresolved in the initial plan and block execution.

    Request a revised plan only when the conflict is discovered after an earlier plan was approved.

    Prefer the publicly supported API contract over undocumented internal implementation. Do not automatically select either the most capable or least capable interpretation.
16. Classify active source values as either closed or open-ended.

    For closed value sets, map every actively reachable value individually.

    For open-ended values, document the conversion rule and test representative values, invalid values, and unknown values.

    Do not claim to enumerate every possible value in an open-ended set.
17. Select inbound transport, outbound transport, attachment transport, and real-time lifecycle separately before choosing the final Photon architecture.
18. Select one or more Photon surfaces based on the smallest safe complete architecture.

    A mixed target is justified when it better preserves the source application’s existing inbound, outbound, attachment, hosting, or lifecycle boundaries.

    The plan must document:

    - the responsibility of each Photon surface;
    - why the combination is safer or smaller than the alternatives;
    - shared identifiers and credentials;
    - event and connection ownership;
    - duplicate-event prevention;
    - retry and shutdown behavior.
19. Evaluate parity by externally visible behavior, not only by whether the source application calls an identically named method.
20. Inspect and report cutover effects on sessions, conversations, process-local or cached state, credentials, onboarding links, user-to-line assignments, stored identifiers, and users when active repository evidence shows those behaviors exist, even when no persistent database migration is required.
21. When a migration copies or mirrors an application from one repository into another, verify the copied source scope directly against the recorded source repository commit in addition to reviewing the destination repository diff.
22. Do not expose, copy, print, or commit real secrets.
23. Verify the completed implementation against the approved plan.
24. Do not claim completion while required behavior is blocked or unverified.

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

Do not select Photon APIs before source-provider detection is complete.

## When to consult

| Stage or provider | Read |
|---|---|
| Read-only inspection, approval gate, execution, or scope revision | [`workflow.md`](./workflow.md) |
| Required user-facing migration plan | [`plan-template.md`](./plan-template.md) |
| Provider routing and agent-readable documentation policy | [`providers/index.md`](./providers/index.md) |
| Sendblue | [`providers/sendblue.md`](./providers/sendblue.md) |
| Linq V2, V3, or mixed V2/V3 | [`providers/linq.md`](./providers/linq.md) |
| BlueBubbles | [`providers/bluebubbles.md`](./providers/bluebubbles.md) |
| Blooio | [`providers/blooio.md`](./providers/blooio.md) |
| LoopMessage | [`providers/loopmessage.md`](./providers/loopmessage.md) |
| Texting Blue | [`providers/texting-blue.md`](./providers/texting-blue.md) |
| Photon architecture selection and official Photon skill routing | [`photon-targets.md`](./photon-targets.md) |
| Photon capability evidence, planned-version pinning, hosted-service contracts, conflicting documentation, and unsupported-capability decisions | [`photon-evidence.md`](./photon-evidence.md) |
| Post-migration proof and completion rules | [`verification.md`](./verification.md) |

## Two hard phases

### PHASE 1 — INSPECT AND PLAN

Read [`workflow.md`](./workflow.md), inspect without changing repository state, produce the exact plan from [`plan-template.md`](./plan-template.md), show it, and stop.

### PHASE 2 — EXECUTE THE APPROVED PLAN

Enter Phase 2 only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO PHOTON PLAN
```

“Looks good,” “continue,” “go ahead,” or similar wording is not approval. After approval, use the approved execution branch, execute only the approved scope, and verify with [`verification.md`](./verification.md). Any scope expansion requires a revised plan and the exact approval phrase again.

## Execution branch precedence

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-photon`.

Never override an explicit user-selected branch with the default.

## Photon sources

After source detection, read [`photon-evidence.md`](./photon-evidence.md).

For every installable Photon target, record:

- exact package name;
- exact planned package version;
- exported public types and methods used by the migration;
- versioned public API documentation when available;
- official Agent Skill revision;
- implementation source and source commit only when public evidence is incomplete or conflicting;
- official tests when available and relevant.

During verification, record the exact installed version resolved by the lockfile and confirm that it matches the approved planned version.

For every hosted Photon target, record:

- hosted service name;
- public endpoint or product;
- public authentication, API, event, and operational contract;
- official documentation source;
- documentation retrieval date;
- official Agent Skill revision;
- official source repository commit only when source inspection is required and the repository is confirmed to represent the hosted service.

Do not invent a hosted-service version when Photon does not publish one. Repository package versions are not automatically the version of the hosted deployment.

Permitted official Photon evidence includes:

- https://docs.photon.codes/docs/llms.txt
- https://github.com/photon-hq/skills
- exported public Photon package type declarations;
- versioned public API documentation;
- official hosted-service API and event contracts;
- official Photon implementation source when escalation is required;
- official Photon tests when they exist;
- official Photon Markdown documentation;
- official Photon product repositories.

Do not declare a capability unsupported from one missing example, README section, Agent Skill, or incomplete documentation page.

When official Photon sources disagree, use the publicly supported contract as the execution boundary.

Implementation-only capabilities must be marked unverified unless they are publicly exported and supported for the selected package or hosted product.

Do not plan against undocumented internal behavior merely because it exists in source code.
