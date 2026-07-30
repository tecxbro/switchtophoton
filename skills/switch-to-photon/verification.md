# Verification

Do not claim completion until the implementation matches the approved plan, preserves every approved capability, and reports every blocked or unverified item.

## 1. Scope verification

Compare every changed file and behavior against the approved plan.

- No unplanned change may remain.
- No new Photon feature may remain.
- No unrelated refactor may remain.
- Any required expansion must use `Switch to Photon — Plan Revision Required` and receive `APPROVE SWITCH TO PHOTON PLAN` again.

## 2. Repository checks

Run the repository's own available commands, including as applicable:

- unit tests;
- integration tests;
- typecheck;
- lint;
- production build;
- schema validation;
- generated-client validation;
- deployment configuration validation.

Discover commands from repository configuration. Do not invent commands, delete tests, weaken assertions, or bypass failures to obtain a passing result.

## 3. Capability parity

Produce:

| Capability used before | Photon implementation | Evidence | Result |
|---|---|---|---|

Verify every capability approved in the plan, including applicable inbound and outbound routing, groups, line selection, attachments, replies, reactions, typing, read state, delivery states, retries, idempotency, deduplication, ordering, webhook authentication and acknowledgement, lifecycle, shutdown, fallback channels, and persisted-ID compatibility.

When credentials are unavailable, use existing mocks or approved fixtures and report the exact live smoke test that remains. Never fabricate a successful live test.

## 4. Provider removal

Search active runtime code and configuration for:

- old imports;
- old packages;
- old API hosts;
- old endpoints;
- old authentication headers;
- old environment variables;
- old webhook routes;
- old initialization;
- old shutdown behavior;
- old generated clients;
- old provider deployment services.

Historical migration notes may retain the provider name. Compatibility fields may remain only when they were approved and are still required to read existing records. Active runtime code must not unexpectedly depend on the old provider after a full replacement.

## 5. Complete diff review

Review from the recorded starting commit:

```bash
git diff --stat <starting-commit>...HEAD
git diff <starting-commit>...HEAD
```

For every changed file, answer:

- Was it approved?
- Is it required for parity?
- Did it change product behavior?
- Did it add a new feature?
- Did it expose a secret?
- Did it perform an unrelated refactor?

Remove unnecessary changes.

## 6. Completion rules

Do not claim completion when:

- a required capability is blocked;
- provider detection remains low-confidence without explicit risk acceptance;
- the diff exceeds the approved plan;
- an essential test failed;
- a test could not run and was not reported;
- live verification is required but unavailable;
- the old provider remains active unexpectedly.

## 7. Final report

```text
Switch to Photon — Verification Report

Branch: switch-to-photon
Starting commit: <sha>
Detected source: <provider, exact SDK/API generation, integration style, confidence>
Photon target: <product and reason>

Approved capabilities migrated:
- <capability>

Intentionally excluded:
- <unused capability or no additional features added>

Capability parity:
| Capability used before | Photon implementation | Evidence | Result |
|---|---|---|---|

Repository checks:
- <command/check and result>

Provider removal:
- <search and result>

Complete diff review:
- <approved-file and behavior result>

Manual setup:
- <credential/dashboard step without secret values>

Compatibility retained:
- <old IDs/fields or none>

Blocked or unverified:
- <exact item or none>

Completion status:
- <complete | incomplete because ...>
```
