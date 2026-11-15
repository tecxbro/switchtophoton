---
name: switch-to-keiki
description: >
  Switch to Keiki by inspecting and planning a parity-only replacement of an existing iMessage, SMS API,
  messaging SDK, or messaging provider integration — for any source provider, registered or not. Use for
  Switch to Keiki, migrate to Keiki, replace Sendblue,
  replace Linq, replace Photon, replace Inkbox, replace Project Blue, replace AgentPhone, replace Chert,
  replace ZeroSettle, BlueBubbles migration, Blooio migration, LoopMessage migration, iMessage-provider
  migration, messaging-provider replacement, messaging SDK migration, SMS API migration, provider parity
  migration, Keiki agent migration, Keiki external harness migration, Keiki partner deployment migration,
  Keiki MCP migration, or Vercel Chat SDK messaging-adapter migration. When the user names the source
  provider, treat it as the detection hypothesis and confirm it with repository fingerprints instead of
  restarting discovery. Detect the exact source SDK version,
  REST API generation, webhook generation, mixed generation, active capabilities, and architecture before
  selecting a Keiki surface. Remain read-only until a complete plan is shown and the user's latest message
  explicitly contains the exact approval phrase. Execute only approved behavior, stop for scope changes,
  protect secrets, and verify the final implementation against the approved plan.
license: MIT
metadata:
  author: tecxbro
---

# Switch to Keiki

Replace an existing messaging-provider boundary with the closest Keiki surface without redesigning the application.

## Core migration contract

These rules are mandatory:

1. Inspect before editing.
2. Plan before execution.
3. Show the complete plan to the user.
4. Stop after showing the plan.
5. Execute only after the user's latest message explicitly contains `APPROVE SWITCH TO KEIKI PLAN`.
6. Migrate only capabilities already used by active code, tests, storage, or deployment configuration.
7. Do not introduce new Keiki features.
8. Do not refactor unrelated application code.
9. Detect the exact source SDK version or API generation.
10. Do not assume the application uses the latest source-provider API.
11. Select the Keiki surface that most closely preserves the existing architecture.
12. For installable Keiki packages, record the exact planned package version — resolve it from the npm registry or an official locked example; if the registry cannot be queried, record "latest confirmed `<version>` at `<date>`, re-resolve at install" rather than guessing.

    For hosted Keiki services, record:

    - hosted service name;
    - public endpoint or product;
    - official documentation source;
    - documentation retrieval date;
    - official source repository commit only when source inspection is required and the repository is confirmed to represent the hosted service;
    - publicly exposed API or event contract.

    Do not invent a hosted-service version when Keiki does not publish one.
13. Do not treat absence from one documentation page, example, agent-facing guide, README, or OpenAPI path as proof that Keiki lacks a capability.
14. Before declaring a Keiki capability unsupported:

    1. inspect the selected target’s public types, OpenAPI contract, or API documentation;
    2. inspect the relevant official documentation and agent-facing guides;
    3. inspect official implementation or tests only when the public evidence is incomplete or conflicting;
    4. record when implementation source or official tests are unavailable.

    The absence of official tests must not make planning impossible.
15. When official Keiki sources conflict during initial planning, mark the capability unresolved in the initial plan and block execution.

    Request a revised plan only when the conflict is discovered after an earlier plan was approved.

    Prefer the publicly supported API contract over undocumented internal implementation. Do not automatically select either the most capable or least capable interpretation.
16. Classify active source values as either closed or open-ended.

    For closed value sets, map every actively reachable value individually.

    For open-ended values, document the conversion rule and test representative values, invalid values, and unknown values.

    Do not claim to enumerate every possible value in an open-ended set.
17. Select inbound transport, outbound transport, attachment transport, and real-time lifecycle separately before choosing the final Keiki architecture.
18. Select one or more Keiki surfaces based on the smallest safe complete architecture.

    A mixed target is justified when it better preserves the source application’s existing inbound, outbound, attachment, hosting, or lifecycle boundaries.

    The plan must document:

    - the responsibility of each Keiki surface;
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
25. When the user names the source provider, use it as the detection hypothesis and confirm or correct it with repository evidence. Do not ignore a user-named provider, and do not require a registered provider file to proceed.
26. Flag every Keiki capability that is documented but not currently available — plan-gated, waitlist, early-access, dashboard-only, entitlement-gated, add-on-required, or region-limited — in the plan instead of silently planning against it or silently substituting another surface.
27. Classify the repository's shape before inventorying capabilities — consumer app, provider library/adapter, provider façade/MCP server/proxy, provider SDK, or provisioning tooling — and define the migration object accordingly. When several messaging providers or adjacent SaaS vendors coexist, scope the provider boundary explicitly and use the split-provider decision record when the correct answer retains the source provider for some capabilities.
28. Assign a plan verdict before writing the plan: executable, executable-with-approved-changes, infeasible-as-specified, or blocked-on-evidence. An infeasible verdict produces a short report naming the disqualifying capability and the options — never a wall of unresolved rows and never the approval phrase.
29. Run the fast-reject check before deep capability mapping: a core flow with no Keiki surface (cold outbound sends, provider voice APIs, contacts CRM, history browsing) makes the plan infeasible-as-specified; report it early.

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
→ verify Keiki surface availability (plan, entitlement, region, add-on)
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
→ request approval (skipped when no executable path exists)
→ execute
→ verify installed versions against approved planned versions
→ verify against source and approved plan
```

Do not select Keiki APIs before source-provider detection is complete.

## When to consult

| Stage or provider | Read |
|---|---|
| Read-only inspection, approval gate, execution, or scope revision | [`workflow.md`](./workflow.md) |
| Required user-facing migration plan | [`plan-template.md`](./plan-template.md) |
| Provider routing and agent-readable documentation policy | [`providers/index.md`](./providers/index.md) |
| Sendblue | [`providers/sendblue.md`](./providers/sendblue.md) |
| Linq V2, V3, WhatsApp, or mixed generations | [`providers/linq.md`](./providers/linq.md) |
| Photon Spectrum, webhooks, HTTP Proxy, kits, MCP, or Chat SDK adapter | [`providers/photon.md`](./providers/photon.md) |
| Inkbox | [`providers/inkbox.md`](./providers/inkbox.md) |
| Project Blue | [`providers/project-blue.md`](./providers/project-blue.md) |
| Blooio | [`providers/blooio.md`](./providers/blooio.md) |
| LoopMessage | [`providers/loopmessage.md`](./providers/loopmessage.md) |
| AgentPhone | [`providers/agentphone.md`](./providers/agentphone.md) |
| Chert | [`providers/chert.md`](./providers/chert.md) |
| ZeroSettle (phonetw.in) | [`providers/zerosettle.md`](./providers/zerosettle.md) |
| BlueBubbles | [`providers/bluebubbles.md`](./providers/bluebubbles.md) |
| Keiki architecture selection and Keiki target routing | [`keiki-targets.md`](./keiki-targets.md) |
| Keiki capability evidence, planned-version pinning, hosted-service contracts, conflicting documentation, and unsupported-capability decisions | [`keiki-evidence.md`](./keiki-evidence.md) |
| Post-migration proof and completion rules | [`verification.md`](./verification.md) |

## Two hard phases

### PHASE 1 — INSPECT AND PLAN

Read [`workflow.md`](./workflow.md), inspect without changing repository state, produce the exact plan from [`plan-template.md`](./plan-template.md), show it, and stop.

### PHASE 2 — EXECUTE THE APPROVED PLAN

Enter Phase 2 only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO KEIKI PLAN
```

“Looks good,” “continue,” “go ahead,” or similar wording is not approval. After approval, use the approved execution branch, execute only the approved scope, and verify with [`verification.md`](./verification.md). Any scope expansion requires a revised plan and the exact approval phrase again.

## Execution branch precedence

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-keiki`.

Never override an explicit user-selected branch with the default.

## Keiki sources

After source detection, read [`keiki-evidence.md`](./keiki-evidence.md).

For every installable Keiki package considered, record:

- exact package name;
- exact planned package version;
- exported public types and methods used by the migration;
- versioned public API documentation when available;
- official agent-facing documentation or skill revision, when published;
- implementation source and source commit only when public evidence is incomplete or conflicting;
- official tests when available and relevant.

During verification, record the exact installed version resolved by the lockfile and confirm that it matches the approved planned version.

For every hosted Keiki service considered, record:

- hosted service name;
- public endpoint or product;
- public authentication, API, event, and operational contract;
- official documentation source;
- documentation retrieval date;
- official agent-facing documentation or skill revision, when published;
- official source repository commit only when source inspection is required and the repository is confirmed to represent the hosted service.

Do not invent a hosted-service version when Keiki does not publish one. Repository package versions are not automatically the version of the hosted deployment.

Permitted official Keiki evidence includes:

- https://onkeiki.com/llms.txt
- https://onkeiki.com/llms-full.txt
- https://onkeiki.com/openapi.json
- official Keiki Markdown documentation under https://onkeiki.com/docs/
- exported public Keiki package type declarations;
- versioned public API documentation;
- official hosted-service API and event contracts;
- official Keiki implementation source when escalation is required;
- official Keiki tests when they exist;
- official Keiki product repositories;
- the npm registry or an official locked example for exact installable-package versions.

Do not declare a capability unsupported from one missing example, README section, agent-facing guide, OpenAPI path, or incomplete documentation page.

When official Keiki sources disagree, use the publicly supported contract as the execution boundary.

Implementation-only capabilities must be marked unverified unless they are publicly exported and supported for the selected package or hosted product.

Do not plan against undocumented internal behavior merely because it exists in source code.
