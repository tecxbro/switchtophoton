# Switch to Keiki

Switch to Keiki is a portable Agent Skill for moving an existing **iMessage integration** to [Keiki](https://onkeiki.com/docs). It works with coding agents such as Codex, Claude Code, Cursor, OpenCode, and GitHub Copilot.

The skill traces the active provider integration in your app, proposes a supported Keiki path, and implements the approved scope. For example, Keiki can deliver signed turns to an existing inbound text agent. The app can keep its logic and send text replies through the turn API.

Native iMessage reactions and stickers are unavailable for this migration. If the app relies on either, a full switch is blocked. The plan can retain an independently routed workflow on the existing provider, or propose a clearly labeled change for you to approve. An emoji reply and an image attachment are changes to what the recipient sees.

## Install

From the app repository you want to migrate, run:

```bash
npx skills add https://github.com/tecxbro/switchtophoton/tree/codex/skills/switch-to-keiki --skill switch-to-keiki
```

## Run

1. Ask your coding agent to use the skill in the app repo. For example:

   ```text
   Use switch-to-keiki to inspect this repo and plan a migration of its existing iMessage integration.
   Preserve the app's tools, prompts, state, hosting and user-visible behavior.
   ```

2. Review the detected provider generations, target line and runtime, capability evidence, changed behavior, blockers, cutover and verification plan. This phase is read-only. An executable plan includes the approval prompt below. A blocked plan explains what proof or scope decision is needed.

   ```text
   APPROVE SWITCH TO KEIKI PLAN
   ```

3. After approval, the agent makes the changes on the agreed branch and records each capability's result. Fixture verification can use fake credentials and locally captured requests. Live parity requires the chosen line and authorized device checks for the behaviors that depend on them.

## Choose the migration scope

- **Full switch** when every active behavior has a supported mapping for the selected Keiki line and runtime.
- **Partial switch** when an independently operable part can move and the retained provider flow has a clear owner, without two systems sending the same reply.
- **Blocked switch** when a required behavior, contact identity or line handoff remains unproven. See the [iMessage capability matrix](skills/switch-to-keiki/imessage-capabilities.md) for native operations and contract gaps.

## Source playbooks

| Provider | Reference |
|---|---|
| Linq | [Detect, map and verify](skills/switch-to-keiki/providers/linq.md) |
| Photon | [Detect, map and verify](skills/switch-to-keiki/providers/photon.md) |
| Sendblue | [Detect, map and verify](skills/switch-to-keiki/providers/sendblue.md) |
| Inkbox | [Detect, map and verify](skills/switch-to-keiki/providers/inkbox.md) |
| Blooio | [Detect, map and verify](skills/switch-to-keiki/providers/blooio.md) |
| Project Blue | [Detect, map and verify](skills/switch-to-keiki/providers/project-blue.md) |
| LoopMessage | [Detect, map and verify](skills/switch-to-keiki/providers/loopmessage.md) |
| AgentPhone | [Detect, map and verify](skills/switch-to-keiki/providers/agentphone.md) |
| Chert | [Detect, map and verify](skills/switch-to-keiki/providers/chert.md) |
| ZeroSettle / Phonetwin | [Detect, map and verify](skills/switch-to-keiki/providers/zerosettle.md) |
| BlueBubbles | [Detect, map and verify](skills/switch-to-keiki/providers/bluebubbles.md) |

Read the [skill entrypoint](skills/switch-to-keiki/SKILL.md), [target selector](skills/switch-to-keiki/keiki-targets.md), [plan template](skills/switch-to-keiki/plan-template.md) and [verification protocol](skills/switch-to-keiki/verification.md) for the detailed migration process.

The [verification record](verification/README.md) lists the baseline audit, pinned upstream projects, and what the isolated evaluations proved.

Authored and maintained by [tecxbro](https://github.com/tecxbro).
