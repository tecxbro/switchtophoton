# Switch to Photon

[![skills.sh](https://skills.sh/b/tecxbro/switchtophoton)](https://skills.sh/tecxbro/switchtophoton)

Switch to Photon is a portable Agent Skill for existing coding agents such as Codex, Claude Code, Cursor, OpenCode, and GitHub Copilot. It is not a coding agent, SDK, CLI, MCP server, website, or hosted migration product.

The skill inspects an existing messaging integration, identifies the source provider and its exact SDK or API generation, prepares a behavior-preserving migration plan, waits for explicit approval, replaces only the provider boundary, and verifies the completed migration against the approved plan.

## Install

```bash
npx skills add tecxbro/switchtophoton --skill switch-to-photon
```

The Skills CLI discovers the skill at `skills/switch-to-photon/SKILL.md`. No npm package is published by this repository.

Requirements:

- Node.js and npm so `npx` is available.
- A supported coding agent.
- Access to the application repository being migrated.

## Repository layout

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

The portable skill entrypoint is `skills/switch-to-photon/SKILL.md`. The supporting workflow, provider references, target-selection guidance, plan template, and verification rules are stored beside it so they are installed together.

## Publish and discover on skills.sh

There is no manual submission form for the directory used by `npx skills` and skills.sh. Public skills are hosted in GitHub repositories and become eligible for indexing after the Skills CLI discovers and installs them.

### Verify CLI discovery

List the skills detected in this repository:

```bash
npx skills add tecxbro/switchtophoton --list
```

The output should include:

```text
switch-to-photon
```

Test a clean Codex installation:

```bash
npx skills add tecxbro/switchtophoton \
  --skill switch-to-photon \
  --agent codex \
  --yes
```

Test Cursor and Claude Code:

```bash
npx skills add tecxbro/switchtophoton \
  --skill switch-to-photon \
  --agent cursor \
  --agent claude-code \
  --yes
```

### Trigger skills.sh indexing

Run a normal local installation with anonymous CLI telemetry enabled:

```bash
npx skills add tecxbro/switchtophoton \
  --skill switch-to-photon \
  --global \
  --yes
```

Do not set either of these variables for the indexing installation:

```bash
DISABLE_TELEMETRY=1
DO_NOT_TRACK=1
```

CI installations do not count toward directory telemetry because telemetry is disabled in CI. Indexing may not be immediate.

The expected skill page is:

```text
https://skills.sh/tecxbro/switchtophoton/switch-to-photon
```

### Confirm search discovery

```bash
npx skills find switch-to-photon
npx skills find photon migration
```

The skill metadata intentionally includes search terms such as Photon, iMessage, messaging-provider migration, Sendblue, Linq, Spectrum, SMS API, and messaging SDK.

Directory documentation:

- https://www.skills.sh/docs
- https://www.skills.sh/docs/faq
- https://www.skills.sh/docs/api
- https://github.com/vercel-labs/skills

## Safety model

Switch to Photon uses two mandatory phases:

1. **Inspect and plan.** The agent performs read-only repository inspection, detects the provider and exact generation, inventories only capabilities proven to be active, selects the closest Photon product, and shows a complete migration plan.
2. **Execute the approved plan.** The agent may begin only when the user's latest message explicitly contains:

```text
APPROVE SWITCH TO PHOTON PLAN
```

Responses such as “continue,” “go ahead,” or “looks good” do not approve execution.

During execution, the agent creates or uses the `switch-to-photon` branch, changes only the approved provider boundary, and stops for a revised plan if new scope is required.

## Migration principles

- Detect the source provider before choosing Photon.
- Detect the exact locked SDK version, REST generation, webhook generation, mixed generation, or report it as unknown.
- Treat low-confidence detection as a planning blocker unless the user explicitly accepts the stated risk.
- Migrate only behavior already used by active code, tests, storage, or deployment configuration.
- Preserve the application's language, hosting model, internal message shape, business logic, prompts, UI, and non-iMessage channels unless the approved plan says otherwise.
- Use only approved agent-readable provider documentation linked by the skill.
- Select the Photon product that requires the smallest safe architectural change.
- Verify repository checks, capability parity, old-provider removal, and the complete diff.
- Never print, copy, or commit real secrets.

## Supported source-provider references

Focused references are included for Sendblue, Linq, BlueBubbles, Blooio, LoopMessage, and Texting Blue. Providers without verified official agent-readable documentation are handled from repository evidence and must be reported with the appropriate uncertainty.

## Ownership

This Agent Skill is authored and maintained by `tecxbro`. It is not part of `photon-hq/skills` and is not represented as officially maintained by Photon. Photon’s official Agent Skills and agent-readable documentation are used only as technical sources for the selected Photon target.
