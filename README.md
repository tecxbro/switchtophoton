# Switch to Photon

A portable Agent Skill that helps existing coding agents migrate an iMessage or messaging integration to Photon without changing the product's behavior.

## Install

Install the skill directly from this repository:

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-photon
```

You can also point directly to the skill folder:

```bash
npx skills add https://github.com/tecxbro/switchtophoton/tree/main/skills/switch-to-photon
```

No npm package publishing or additional repository configuration is required. The Skills CLI reads the public GitHub repository and automatically discovers `skills/switch-to-photon/SKILL.md`.

Requirements:

- Node.js and npm, so `npx` is available.
- A supported coding agent such as Codex, Claude Code, Cursor, OpenCode, or GitHub Copilot.
- Internet access to download the Skills CLI and this repository.

To preview the detected skill without installing it:

```bash
npx skills add tecxbro/switchtophoton --list
```

To install it globally for a specific coding agent:

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-photon -g -a codex
npx skills add tecxbro/switchtophoton --skill switch-to-photon -g -a claude-code
npx skills add tecxbro/switchtophoton --skill switch-to-photon -g -a cursor
```

Without `-g`, the CLI installs the skill into the current project. Without `-a`, it detects installed coding agents or asks which agent should receive the skill.

## How it works

1. Inspects the repository without changing anything.
2. Detects the current provider and exact SDK or API generation.
3. Reads the matching provider reference and current official documentation.
4. Inventories only the messaging capabilities the product actually uses.
5. Selects the closest Photon equivalent.
6. Shows a detailed migration plan and waits for approval.
7. After approval, creates or uses a `switch-to-photon` branch.
8. Executes only the approved migration scope.
9. Verifies behavior parity, removal of the old provider, and the complete diff.

## Supported source providers

The skill includes detailed migration references for:

- Sendblue
- Linq
- BlueBubbles
- Blooio
- LoopMessage
- Texting Blue

It can also use a generic documentation-driven workflow for other messaging providers.