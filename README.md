# Switch to Keiki

A portable Agent Skill for replacing an existing iMessage integration with Keiki.
The repository remains `tecxbro/switchtophoton`; this edition lives on the `dots` branch.

## Install

```bash
npx skills add https://github.com/tecxbro/switchtophoton/tree/dots --skill switch-to-keiki
```

Or clone the `dots` branch and install or copy `skills/switch-to-keiki` using your agent's
local-skill instructions.

## Use it

Ask your agent to use **switch-to-keiki** and prepare a read-only migration plan for
your repository. It detects the provider and exact SDK/API generation, inventories what
the app actually uses, and compares documented [Keiki](https://onkeiki.com/docs) targets.
It will show the plan and wait for `APPROVE SWITCH TO KEIKI PLAN` before changing your app.

The skill covers Linq, Photon, Sendblue, Inkbox, Blooio, Project Blue, LoopMessage,
AgentPhone, Chert, ZeroSettle and BlueBubbles. Coverage means provider detection and
migration guidance; it does not promise feature parity, automatic number porting or
support for arbitrary outbound sends.

Start at [SKILL.md](skills/switch-to-keiki/SKILL.md), see the [provider index](skills/switch-to-keiki/providers/index.md)
and [target selector](skills/switch-to-keiki/keiki-targets.md). Run the content checks with
`python3 -m unittest discover -s tests -v`. The checks do not need accounts or send messages.

## Evidence and limits

- [iMessage compatibility matrix](skills/switch-to-keiki/imessage-parity.md)
  and [implementation recipes](skills/switch-to-keiki/recipes.md).
- [Open-source benchmark report and runnable fixtures](benchmarks/README.md).
- [iMessage API gaps and documentation requests](benchmarks/keiki-product-gaps.md).

The skill must stop on an active blocker. A credential swap does not preserve
a direct-send API, receipt stream, iPhone feature, or line identity by itself.
