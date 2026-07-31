# Switch to Photon

Switch to Photon is a portable Agent Skill for coding agents such as Codex, Claude Code, Cursor, OpenCode, and GitHub Copilot.

It helps migrate an existing iMessage or messaging integration from its current provider to the closest Photon product without redesigning the application or changing unrelated code.

## Install

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-photon
```

## What the skill does

Switch to Photon follows a strict migration process:

1. Inspects the repository without making changes.
2. Detects the existing messaging provider.
3. Identifies the exact SDK version, REST API generation, webhook generation, or mixed integration in use.
4. Inventories only the messaging capabilities already used by the application.
5. Selects the Photon product that most closely preserves the current architecture.
6. Produces a complete migration plan.
7. Waits for explicit user approval before editing the repository.
8. Replaces only the approved provider boundary.
9. Verifies feature parity, tests, configuration, and removal of the old provider.

The skill is designed to migrate existing behavior, not introduce new Photon features or rebuild the application.

## Approval gate

The skill begins in a read-only planning phase. It may execute the migration only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO PHOTON PLAN
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

The skill includes focused migration guidance for:

- Sendblue
- Linq
- BlueBubbles
- Blooio
- LoopMessage
- Texting Blue

Other providers can still be inspected from repository evidence, but the skill must clearly report any uncertainty when official agent-readable documentation is unavailable.

## Photon target selection

The skill selects the Photon product only after detecting the source provider, integration generation, architecture, and active capabilities.

Depending on the existing application, the target may include Photon Spectrum, Photon Webhooks, Photon HTTP Proxy, Advanced iMessage Kit, self-hosted iMessage Kit, Photon MCP, or the Vercel Chat SDK iMessage adapter.

The chosen target should require the smallest safe architectural change while preserving current behavior.

## Example usage

Ask your coding agent:

```text
Use the switch-to-photon skill to inspect this repository and prepare a migration plan. Do not make any changes.
```

After reviewing the plan, approve execution with:

```text
APPROVE SWITCH TO PHOTON PLAN
```

## Repository structure

```text
switchtophoton/
├── README.md
└── skills/
    └── switch-to-photon/
        ├── SKILL.md
        ├── workflow.md
        ├── plan-template.md
        ├── photon-targets.md
        ├── verification.md
        └── providers/
```

`skills/switch-to-photon/SKILL.md` is the skill entrypoint. The supporting files contain the inspection workflow, migration-plan format, provider references, Photon target-selection guidance, and verification requirements.

## Ownership

Switch to Photon is authored and maintained by `tecxbro`.

It is not part of `photon-hq/skills` and is not represented as officially maintained by Photon. Photon’s official Agent Skills and agent-readable documentation are used as technical sources when selecting and implementing the appropriate Photon target.
