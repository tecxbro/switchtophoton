# Verification

The migration is complete only when it matches the approved plan, preserves behavior, and leaves the repository healthy.

## 1. Confirm scope against the approved plan

Before testing, compare the actual changed files and behaviors to the approved plan.

- No unplanned feature or refactor may remain.
- Any necessary scope expansion requires a revised plan and user approval.
- Do not use newly discovered work as permission to silently broaden the migration.

## 2. Run the repository's own checks

Discover commands from the repository rather than inventing them. Run applicable existing commands such as:

- unit and integration tests;
- typecheck;
- lint;
- production build;
- provider-specific tests;
- generated-client or schema checks;
- deployment/config validation.

Do not weaken or delete failing tests to make the migration pass.

## 3. Verify every used capability

Build a result table:

| Capability used before | Photon path implemented | Test/evidence | Result |
|---|---|---|---|

When applicable, verify:

- inbound Photon events reach the same application handler;
- application responses reach the Photon outbound path;
- sender, line, user, chat, and conversation routing remain correct;
- message/event deduplication still prevents repeated processing;
- send idempotency and retries do not duplicate messages;
- attachments preserve accepted types, limits, ordering, captions, and failure behavior;
- replies, reactions, effects, typing, read state, groups, edits, or unsends retain the used semantics;
- lifecycle statuses and failure handling preserve application state transitions;
- webhook signatures/authentication, acknowledgements, and retries remain enforced;
- initialization, reconnect, and graceful shutdown work;
- SMS/RCS or other channels remain supported when they were in approved scope;
- existing persisted identifiers remain readable or have a documented compatibility path.

When live Photon credentials are unavailable, use mocks or fixtures and identify the remaining live smoke test. Never fabricate a successful live test.

## 4. Verify source-provider removal

Search active code and configuration for:

- old imports and packages;
- API hosts and endpoint paths;
- authentication headers;
- required environment variables;
- webhook routes and subscriptions;
- provider initialization and shutdown;
- active mocks, fixtures, or generated clients;
- provider-only deployment services.

Historical changelogs and migration notes may mention the provider. Active runtime code must not depend on it after a complete replacement.

Exceptions must be explicit, such as:

- compatibility fields retained for existing records;
- a non-messaging source-provider feature excluded from the approved migration;
- a blocked capability still temporarily routed through the old provider.

## 5. Review the complete diff

Review from the recorded starting commit:

```bash
git diff --stat <starting-commit>...HEAD
git diff <starting-commit>...HEAD
```

For every changed file, answer:

- Was this listed in or required by the approved plan?
- Is it required for provider parity?
- Did it change product behavior?
- Did it add a feature the old integration did not use?
- Did it expose a secret?
- Did it perform an unrelated refactor?

Remove unnecessary changes before finishing.

## 6. Final response

Use this format:

```text
Switch to Photon

Branch: switch-to-photon
Starting commit: <sha>
Detected: <provider, exact SDK/API generation, integration style, confidence>
Photon target: <surface and one-sentence reason>

Migrated:
- <only approved capabilities that existed before>

Intentionally not added:
- <unused Photon capabilities, or "No additional features added">

Verification:
- <tests/typecheck/lint/build and results>
- <capability parity results>
- <source-provider removal check>
- <diff review>

Manual setup:
- <credential/dashboard/line/webhook steps without secret values>

Compatibility retained:
- <old IDs/fields or "None">

Unverified or blocked:
- <exact remaining item, or "None">
```

Do not say the migration is complete when a used capability is blocked, the actual diff exceeds the approved plan, or an essential check could not run.
