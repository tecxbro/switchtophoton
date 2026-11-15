# Switch to Keiki

Switch to Keiki is a portable Agent Skill for migrating an existing iMessage integration to [Keiki](https://onkeiki.com/docs). It works with coding agents such as Codex, Claude Code, Cursor, OpenCode, and GitHub Copilot.

It detects the source provider and API generation, inventories the behavior your app relies on, and builds an evidence-backed migration plan. Keiki manages iMessage as a channel for agents. The plan explains which flows fit a hosted Keiki agent or an external harness, which need changes, and which are blocked by gaps in the public contract.

## Install

From the application repository you want to migrate, run:

```bash
npx skills add https://github.com/tecxbro/switchtophoton/tree/codex/skills/switch-to-keiki --skill switch-to-keiki
```

## Use

Ask your coding agent:

```text
Use switch-to-keiki to inspect this repository and prepare an iMessage migration plan.
```

The skill starts with read-only inspection. It identifies the affected code, source and target contracts, line and conversation cutover, and verification steps. Review the plan and, when ready to authorize the changes it describes, reply:

```text
APPROVE SWITCH TO KEIKI PLAN
```

The agent then changes the approved integration boundary and verifies existing behavior against the plan. Required capabilities without a verified mapping stay visible as blockers. A plan may propose keeping part of the source integration or changing a specific product behavior for you to review.

## Source providers

| Provider | Migration reference |
|---|---|
| Linq | [Source detection and migration notes](skills/switch-to-keiki/providers/linq.md) |
| Photon | [Source detection and migration notes](skills/switch-to-keiki/providers/photon.md) |
| Sendblue | [Source detection and migration notes](skills/switch-to-keiki/providers/sendblue.md) |
| Inkbox | [Source detection and migration notes](skills/switch-to-keiki/providers/inkbox.md) |
| Blooio | [Source detection and migration notes](skills/switch-to-keiki/providers/blooio.md) |
| Project Blue | [Source detection and migration notes](skills/switch-to-keiki/providers/project-blue.md) |
| LoopMessage | [Source detection and migration notes](skills/switch-to-keiki/providers/loopmessage.md) |
| AgentPhone | [Source detection and migration notes](skills/switch-to-keiki/providers/agentphone.md) |
| Chert | [Source detection and migration notes](skills/switch-to-keiki/providers/chert.md) |
| ZeroSettle / Phonetwin | [Source detection and migration notes](skills/switch-to-keiki/providers/zerosettle.md) |
| BlueBubbles | [Source detection and migration notes](skills/switch-to-keiki/providers/bluebubbles.md) |

The [skill entrypoint](skills/switch-to-keiki/SKILL.md) routes to the workflow, plan template, provider references, Keiki target evidence, and verification checklist.

Authored and maintained by [tecxbro](https://github.com/tecxbro).
