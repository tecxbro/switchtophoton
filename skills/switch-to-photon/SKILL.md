---
name: switch-to-photon
description: >
  Migrate an existing iMessage or messaging integration from Sendblue, Linq, BlueBubbles, Blooio, LoopMessage,
  Texting Blue, or another provider to Photon while preserving the product's current behavior. Use when the user
  asks to switch, migrate, replace, or move an existing messaging provider to Photon. First inspect the repository
  read-only, detect the source provider, SDK/API generation, integration architecture, and capabilities actually
  used, then present a concrete migration plan and wait for explicit approval before editing. After approval,
  create or use a `switch-to-photon` branch, choose the closest official Photon surface, replace only the existing
  provider behavior, run the repository's verification commands, review the complete diff, and report manual
  credential or dashboard steps. Do not add new messaging features, redesign the product, or perform unrelated
  refactors.
  Keywords: switch to photon, migrate to photon, replace sendblue, replace linq, sendblue migration, linq migration,
  bluebubbles migration, blooio migration, loopmessage migration, texting blue migration, imessage provider migration,
  photon spectrum, photon imessage, messaging transport migration, parity migration, provider replacement.
license: MIT
metadata:
  author: photon-hq
  version: '1.1.0'
---

# Switch to Photon

Switch an existing messaging integration to Photon without changing what the product does.

## Migration contract

These rules are non-negotiable:

1. **Plan before edits.** Inspect read-only, show the migration plan to the user, and wait for explicit approval before changing files, dependencies, Git refs, or configuration.
2. **Parity only.** Migrate only capabilities the repository currently uses.
3. **No product redesign.** Preserve prompts, business logic, workflows, data ownership, UI, and user-visible behavior.
4. **No speculative features.** Do not add Photon capabilities unless the existing integration already uses equivalent behavior.
5. **Smallest safe diff.** Replace the provider boundary instead of rewriting application code.
6. **Safe Git isolation.** After approval, create or use `switch-to-photon`. Never modify or merge the default branch directly.
7. **Source code is the truth.** Determine usage from call sites, handlers, schemas, tests, lockfiles, and configuration—not from a provider's feature list.
8. **Version-aware migration.** Detect the installed SDK version or REST/webhook generation before selecting documentation or mappings.
9. **Current official documentation.** Use official `llms.txt`, Markdown docs, OpenAPI files, SDK references, and Photon Agent Skills.
10. **No silent guesses.** If a used capability has no confirmed Photon equivalent, identify the blocker in the plan and do not delete the old behavior.
11. **No secret exposure.** Never print, copy, commit, or rewrite real credential values.
12. **Prove the migration.** Do not claim completion until verification has run or the exact unverified items are reported.

## How this skill is organized

Read only the files needed for the detected migration:

| File | When to consult |
|---|---|
| [`workflow.md`](./workflow.md) | Read-only inspection, version detection, mandatory plan gate, branch creation, and execution. |
| [`plan-template.md`](./plan-template.md) | Exact plan that must be shown before any migration edit. |
| [`providers/index.md`](./providers/index.md) | Detect the source provider and route to its focused reference. |
| [`providers/sendblue.md`](./providers/sendblue.md) | Sendblue SDK, REST, webhook, Chat SDK adapter, and legacy/current API patterns. |
| [`providers/linq.md`](./providers/linq.md) | Linq V2, V3, SDK, webhook, identifier, and asynchronous-delivery differences. |
| [`providers/bluebubbles.md`](./providers/bluebubbles.md) | BlueBubbles self-hosted REST and webhook integrations. |
| [`providers/blooio.md`](./providers/blooio.md) | Blooio v2/v3/v4 API detection and migration concerns. |
| [`providers/loopmessage.md`](./providers/loopmessage.md) | LoopMessage legacy v1 and next-generation API detection. |
| [`providers/texting-blue.md`](./providers/texting-blue.md) | Texting Blue v1 REST and webhook integrations. |
| [`photon-targets.md`](./photon-targets.md) | Choose the Photon surface that most closely matches the current architecture. |
| [`verification.md`](./verification.md) | Parity checks, old-provider removal, complete diff review, and final report. |

## Required workflow

1. Read [`workflow.md`](./workflow.md).
2. Inspect the repository without making changes.
3. Detect the provider, exact SDK/API generation, integration style, and capabilities actually used.
4. Read [`providers/index.md`](./providers/index.md), then the matching provider reference and current official docs.
5. Read [`photon-targets.md`](./photon-targets.md) and select the closest Photon surface.
6. Produce the plan in [`plan-template.md`](./plan-template.md), show it to the user, and **stop**.
7. Continue only after explicit approval.
8. Create or switch to `switch-to-photon`, then implement the approved plan with the smallest safe diff.
9. Read [`verification.md`](./verification.md), run the checks, and review every changed file.
10. Report what changed, what was intentionally not added, what passed, and which manual setup remains.

## Official Photon references

Start from the live Photon documentation index:

- https://docs.photon.codes/docs/llms.txt
- https://github.com/photon-hq/skills

Use the matching Photon Agent Skill when relevant:

```bash
npx skills add photon-hq/skills --skill spectrum
npx skills add photon-hq/skills --skill imessage
npx skills add photon-hq/skills --skill chat-adapter-imessage
npx skills add photon-hq/skills --skill photon-cli
```

Install or consult only the skill relevant to the selected target. Do not introduce several Photon products when one preserves the existing architecture.
