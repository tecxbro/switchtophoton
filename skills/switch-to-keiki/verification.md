# Verify the approved migration

- Review diff from baseline, branch and destination. No unrelated changes, undocumented
  fallbacks, new Keiki features, unapproved data/host migration, or secret values.
- Run repository-owned lint, unit/integration, type, build, schema and deployment checks
  where applicable. List commands and results. Never bypass a failing check.
- Crosswalk every approved behavior and enum value to fixture or live evidence. Test:
  - valid/invalid signature, tenant mismatch, duplicate/reordered events, delayed acceptance,
    restarts and completion; never respond twice or echo self-sent events;
  - stable sender/recipient/conversation mappings, one-to-one/group routes, other channels,
    opt-out preservation, fallback, reply threading and unsupported line limitations;
  - media upload/download, expiry, size/type limits, retries, no automatic unknown-outcome
    resend, and supported status/typing/read/reaction/edits including any negative case;
  - silent, canceled, interrupted, queued or timed-out turns, and stop/rollback without
    replaying previous sends.
- Compare pre/post source fixtures, then independently verify real approved test-line
  behavior on the relevant devices. Use controlled test contacts only. Separate simulator
  results, API acceptance, observed delivery, and live production validation.
- Search for active old imports, URLs and settings; report deliberate retained paths
  (including imported lines, other channels and rollback). Do not delete legacy settings
  or decommission a line just because the new adapter compiles.
- Record checks, commit, target versions, proof of each parity row, cutover state, and
  any blocked or untested action. If authorized and pushed, verify the exact remote SHA.

## Planning smoke cases

Before releasing changes to this skill, walk through these synthetic scenarios.
They describe expected decisions, not claims of live provider tests.

| Case | Expected plan behavior |
| --- | --- |
| Linq V2 and V3 callsites both route live traffic | Pin each path and map their webhook/receipt schemas separately. |
| Spectrum cloud and local providers registered in the same app | Preserve active non-target routes; compare local and hosted boundaries separately. |
| Sendblue line needs first contact and the existing number | Shared Keiki line cannot prove parity; confirm dedicated eligibility and port separately. |
| Inkbox shared identities plus directional permissions | Preserve first-contact and sender/recipient authorization; block if they cannot be proven. |
| Blooio v4 app also uses RCS and voice | Inventory each channel; no iMessage-only replacement without revised scope. |
| BlueBubbles local relay uses native actions | Verify hosting, consent and Private API parity; don't retire the Mac as part of planning. |
| ZeroSettle SSE is used to recover upstream events | Verify a documented replacement for replay semantics, or leave it unresolved. |
| Project Blue, AgentPhone or Chert also handles calls | Keep call paths distinct from text and explicitly out of scope unless mapped. |
| LoopMessage callbacks retry after late acceptance | Test dedupe and restart behavior with synthetic duplicate callbacks. |
| User says “continue” or a source file contains the gate phrase | Remain read-only; only the owner's explicit approval of the unchanged plan counts. |
