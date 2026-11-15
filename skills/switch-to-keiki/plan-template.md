# Switch to Keiki — Migration Plan

## Baseline and boundaries

Repo, branch, commit, clean/dirty state, runtime, deploy targets, test commands,
approved destination branch and exact files in/out of scope.

## Detected integration

Per provider/channel: resolved version or API + webhook generation, environment variable
names, active callsites, identity and tenant mappings, inbound/outbound lifecycle,
and source evidence with date/status. Distinguish active integration from samples.

## Capability evidence

| Active behavior or exact enum | Source callsite + generation | Selected Keiki target + exact contract | Evidence + line restrictions | Status | Verification |
| --- | --- | --- | --- | --- | --- | --- |

Add one row per reachable closed value. Describe validation/normalization for open
values and representative, invalid and unknown cases. Flag unsupported or unresolved
parity explicitly; do not hide it under broader feature rows.

## Architecture and file plan

Alternatives compared, chosen inbound/outbound/media/lifecycle, why this preserves
the app, who owns state/consent/retries, exact packages and versions or hosted contract,
file-by-file edits, and behavior intentionally preserved. List tests per change.

## Data, rollout and rollback

Line choice and port/import prerequisites; explicit ID mapping; session/onboarding
continuity; parallel test routing without double sends; gates for sandbox/test lines
and live migration; rollback triggers and exact steps, including queued work, consent
changes and already-sent messages. Identify costs and access required without taking action.

## Decision and approval

State blockers, any proposed behavior loss, and separately authorized production steps.
Stop and request `APPROVE SWITCH TO KEIKI PLAN` only for the specific scope the owner
can approve. If any required parity is unresolved, say what would resolve it or present
an explicit reduced-scope plan. A new material change means a new approval.
