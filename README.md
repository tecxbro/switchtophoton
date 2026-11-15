# Switch to Keiki

Switch to Keiki is a portable Agent Skill for coding agents such as Codex, Claude Code, Cursor, OpenCode, and GitHub Copilot.

It helps migrate an existing iMessage or messaging integration from its current provider to the closest Keiki surface without redesigning the application or changing unrelated code.

This repository also contains the original `switch-to-photon` skill, which performs the inverse migration — replacing a messaging provider boundary with the closest Photon product.

## Install

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-keiki
```

For the original Photon migration skill:

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-photon
```

## What the skill does

Switch to Keiki follows a strict migration process:

1. Inspects the repository without making changes.
2. Classifies the repo shape (consumer app, provider library, façade/MCP server, SDK, provisioning tool) and scopes the provider boundary — including multi-provider and multi-channel cases.
3. Detects the existing messaging provider and its exact SDK version, REST API generation, webhook generation, or mixed surfaces.
4. Inventories only the messaging capabilities already used by the application, with a fast-reject check for capabilities that have no Keiki surface.
5. Selects the Keiki surface that most closely preserves the current architecture — external harness (push, relay, or inbox turn dispatch), cloud-served or self-hosted agent, developer REST API and partner deployments, agent API gateway, event webhooks, MCP, or a framework adapter — and flags any Keiki capability that is documented but not currently available (plan-gated, waitlist, early-access, dashboard-only, or add-on).
6. Assigns a plan verdict — executable, executable-with-approved-changes, infeasible-as-specified, or blocked-on-evidence — and produces a complete migration plan with a capability evidence appendix (or a short infeasibility report when no parity path exists).
7. Waits for explicit user approval before editing the repository.
8. Replaces only the approved provider boundary.
9. Verifies feature parity, tests, configuration, and removal of the old provider.

The skill is designed to migrate existing behavior, not introduce new Keiki features or rebuild the application. When the correct answer is "don't migrate" — a core capability has no Keiki surface, or a split-provider architecture is safer — the skill says so explicitly instead of forcing a migration.

Every capability Keiki does not yet support is reported as a Keiki-side gap — the missing surface, the contract shape the source provider offers, and which integrations need it — precise enough to pass to the Keiki team or as an instruction to the Keiki agent itself.

## Approval gate

The skill begins in a read-only planning phase. It may execute the migration only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO KEIKI PLAN
```

Responses such as `continue`, `go ahead`, or `looks good` do not approve execution.

If the required scope changes during implementation, the skill must stop, produce a revised plan, and request approval again.

## What it preserves

Unless the approved plan explicitly says otherwise, the skill preserves:

- Application language and framework
- Hosting and deployment model
- Business logic and prompts
- Internal message and conversation models
- Existing UI and user flows
- Storage and authentication architecture
- Non-iMessage messaging channels
- Features unrelated to the provider migration

## Supported source providers

Tell the skill where you're coming from — name the provider and it confirms the exact SDK version, API generation, and active capabilities from repository evidence, then maps them to Keiki. The registered files below are preferred references, not a closed list: any messaging provider works through generic detection.

The skill includes focused migration guidance for:

- Sendblue
- Linq (V2, V3, mixed, and the WhatsApp Partner API)
- Photon (Spectrum, webhooks, HTTP Proxy, iMessage kits, MCP, and Chat SDK adapters — Stable and Beta generations)
- Inkbox
- Project Blue
- Blooio
- LoopMessage
- AgentPhone
- Chert (Messaging API and FaceTime API)
- ZeroSettle (iMessage API)
- BlueBubbles

Other providers can still be inspected from repository evidence, but the skill must clearly report any uncertainty when official agent-readable documentation is unavailable.

## Keiki target selection

The skill selects the Keiki surface only after detecting the source provider, integration generation, architecture, and active capabilities.

Depending on the existing application, the target may include the external harness (push, relay, or inbox turn dispatch), a cloud-served or self-hosted `@onkeiki/agents` loop, the developer REST API with partner deployments, the agent API gateway (OpenAI/Anthropic-compatible), Keiki event webhooks and the identity webhook, the Keiki MCP server, or the `@onkeiki/flue`, `@onkeiki/eve`, and `@onkeiki/ai-sdk` adapters.

The chosen target should require the smallest safe architectural change while preserving current behavior.

## Example usage

Ask your coding agent:

```text
Use the switch-to-keiki skill to inspect this repository and prepare a migration plan. Do not make any changes.
```

After reviewing the plan, approve execution with:

```text
APPROVE SWITCH TO KEIKI PLAN
```

## Repository structure

```text
switchtophoton/
├── README.md
└── skills/
    ├── switch-to-keiki/
    │   ├── SKILL.md
    │   ├── workflow.md
    │   ├── plan-template.md
    │   ├── keiki-targets.md
    │   ├── keiki-evidence.md
    │   ├── verification.md
    │   └── providers/
    └── switch-to-photon/
        ├── SKILL.md
        ├── workflow.md
        ├── plan-template.md
        ├── photon-targets.md
        ├── photon-evidence.md
        ├── verification.md
        └── providers/
```

`skills/switch-to-keiki/SKILL.md` is the Switch to Keiki entrypoint. The supporting files contain the inspection workflow, migration-plan format, provider references, Keiki target-selection guidance, and verification requirements. `skills/switch-to-photon/` retains the original Photon migration skill.

## Ownership

Switch to Keiki and Switch to Photon are authored and maintained by `tecxbro`.

They are not part of `photon-hq/skills` or the Keiki project and are not represented as officially maintained by either company. Official provider documentation and Agent Skills are used as technical sources when selecting and implementing the appropriate target.
