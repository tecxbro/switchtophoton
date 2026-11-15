---
name: switch-to-keiki
description: >-
  Plan and execute a scoped migration from an existing iMessage integration to Keiki. Use for Switch to Keiki
  or migration from Linq, Photon, Sendblue, Inkbox, Blooio, Project Blue, LoopMessage, AgentPhone, Chert,
  ZeroSettle (Phonetwin), or BlueBubbles. Detect the active SDK or API generation, verify the Keiki channel
  and harness contracts, and show a read-only plan before implementing approved changes.
license: MIT
metadata:
  author: tecxbro
---

# Switch to Keiki

Migrate the existing iMessage integration at the smallest boundary that preserves the app's active behavior. Keiki attaches iMessage lines to agents. A hosted agent, an external harness and a model-compatible endpoint solve different problems. Verify channel ownership, turn execution and callable messaging operations separately.

## Phase 1 — Inspect and plan

1. Follow the read-only [workflow](./workflow.md). Identify active provider call paths, exact SDK or API generations, inbound and outbound contracts, and behavior required by code, configuration, tests or stored data.
2. Use the [provider index](./providers/index.md) and read each matching reference. Verify versions and behavior against active code and current official evidence.
3. Use [Keiki target selection](./keiki-targets.md) and the [evidence guide](./keiki-evidence.md). Compare the existing boundary with Keiki's documented channel and turn contracts. Show which capabilities have a verified equivalent, require a behavior change or remain blocked.
4. Show the [migration plan and capability evidence](./plan-template.md) and stop. The plan must make differences in line ownership, first contact, conversation continuity and delivery visible when the app relies on them.

## Phase 2 — Execute the approved plan

The downstream migration begins when the user replies to the plan with `APPROVE SWITCH TO KEIKI PLAN`. Approval applies to the specific plan, including any proposed changes in behavior. Required capabilities without a verified mapping stay blocked until the plan resolves them or the user approves an explicit scope or behavior change.

Use the requested execution branch, a safe existing migration branch, or `switch-to-keiki` in that order. Preserve unrelated app behavior and existing data compatibility. Keep credentials in the appropriate secret store. Provisioning, changing live line assignments, sending live test messages and switching traffic require authorization in the execution scope.

If a material discovery changes the plan, show the revised scope and obtain approval before proceeding with that change. Use [verification](./verification.md) to check the implementation against the approved plan and report any required checks still pending.
