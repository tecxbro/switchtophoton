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
12. Do not expose, copy, print, or commit real secrets.
13. Verify the completed implementation against the approved plan.
14. Do not claim completion while required behavior is blocked or unverified.

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
| Post-migration proof and completion rules | [`verification.md`](./verification.md) |

## Two hard phases

### PHASE 1 — INSPECT AND PLAN

Read [`workflow.md`](./workflow.md), inspect without changing repository state, produce the exact plan from [`plan-template.md`](./plan-template.md), show it, and stop.

### PHASE 2 — EXECUTE THE APPROVED PLAN

Enter Phase 2 only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO PHOTON PLAN
```

“Looks good,” “continue,” “go ahead,” or similar wording is not approval. After approval, create or use `switch-to-photon`, execute only the approved scope, and verify with [`verification.md`](./verification.md). Any scope expansion requires a revised plan and the exact approval phrase again.

## Photon sources

After source detection and target selection, load the corresponding official Photon Agent Skill and consult Photon's agent-readable documentation:

- https://docs.photon.codes/docs/llms.txt
- https://github.com/photon-hq/skills

Do not copy broad Photon documentation into this skill. Use only the Photon skill relevant to the selected target.
