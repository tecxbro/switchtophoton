# Switch to Photon skill

A portable Agent Skill for migrating an existing iMessage or messaging provider to Photon without changing the product's behavior.

## Install

Once included in `photon-hq/skills`:

```bash
npx skills add photon-hq/skills --skill switch-to-photon
```

## Core behavior

1. Inspect the repository read-only.
2. Detect the source provider and exact SDK/API generation.
3. Read the focused provider file and current official docs.
4. Select the closest Photon surface.
5. Show a detailed migration plan and wait for approval.
6. After approval, create `switch-to-photon` and execute only the approved scope.
7. Verify parity, source-provider removal, and the complete diff.

The skill contains detailed source references for Sendblue and Linq, plus focused support for BlueBubbles, Blooio, LoopMessage, and Texting Blue.
