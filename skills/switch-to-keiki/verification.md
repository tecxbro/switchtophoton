# Verification

Do not claim completion until the implementation matches the approved plan, preserves every approved capability, and reports every blocked or unverified item.

## 1. Scope and branch verification

Compare every changed file and behavior against the approved plan.

- No unplanned change may remain.
- Changes to Keiki features belong in the diff only when they implement approved behavior.
- No unrelated refactor may remain.
- Any required expansion must use `Switch to Keiki — Plan Revision Required` and receive `APPROVE SWITCH TO KEIKI PLAN` again.

### Execution branch precedence

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-keiki`.

Never override an explicit user-selected branch with the default.

Verify that execution occurred on the approved branch.

Verify that the writable repository and pull-request destination match the approved plan.

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

### Closed value sets

| Exact source behavior or closed value | Keiki product | Exact method, endpoint, or event | Evidence | Live or fixture result | Result |
|---|---|---|---|---|---|

Every actively reachable closed value must have its own row.

A category-level row such as `effects`, `reactions`, or `services` is insufficient.

### Open-ended values

| Open-ended source value type | Conversion rule | Keiki product | Exact method, endpoint, or event | Representative, invalid, and unknown-value results | Evidence | Result |
|---|---|---|---|---|---|---|

Do not claim to enumerate every possible value in an open-ended set.

Verify every approved capability from the caller to the recipient or app boundary. Include applicable inbound and outbound routing, first contact, groups, line selection, attachments, native stickers, replies, reactions, typing, read state, delivery states, retries, idempotency, deduplication, ordering, webhook authentication and acknowledgement, lifecycle, shutdown, fallback channels and persisted-ID compatibility.

Use sanitized events, fake credentials and mocked HTTP to prove handler and request behavior. Use verified public contracts for fixture expectations and keep fixture evidence separate from device results. Report the exact remaining live check when it is outside authorized scope or access is unavailable.

For a scoped offline trial, run baseline checks, then start the built app on loopback. Use a deny-by-default boundary interceptor that permits only loopback and returns fixture responses for the specified provider or model requests. Run the same webhook route, queue or workflow, tool dispatch and completion path a deployed request would reach. Verify sends, failure handling and duplicate prevention from observed outbound requests. A test that mocks the entire route or worker does not exercise its integration.

## 4. Keiki target-version and contract verification

For installable Keiki packages, confirm:

- package name;
- exact planned package version approved in the plan;
- exact lockfile-resolved installed version;
- the installed version matches the approved planned version;
- exported public types used by the migration;
- the actual runtime imports and constructs the selected adapter with fake configuration in an isolated project;
- no migration behavior depends only on undocumented internal implementation.

For hosted Keiki services, confirm:

- service and endpoint;
- authentication contract;
- API or event contract;
- official documentation retrieval date;
- source commit only when source inspection was required and confirmed to represent the hosted service.

Do not require an installed package or lockfile entry for a hosted service that the application accesses over HTTP.

Report any difference between an approved planned package version and the installed lockfile-resolved version as incomplete.

Confirm that no capability assumption came only from an outdated example, README section, or Agent Skill when stronger public evidence was required.

## 5. Behavioral and lifecycle verification

Run lifecycle tests applicable to the selected Keiki surfaces.

### Keiki external harness

Verify the selected mode with fixture or integration evidence:

- Push signs the raw bytes and includes scoped turn credentials. Verify raw body, freshness, agent binding and valid/invalid signatures before parsing. Keep credentials out of logs. Prove valid dispatch acknowledges and duplicate dispatch cannot enqueue a second reply.
- Relay and inbox use documented claim and acknowledgement behavior. Test lease expiry, reclaim, duplicate handling and stale tokens where applicable.
- Test no-send conditions such as held-back, steered, cancelled and expired turns. Corroborate documented semantics before testing the exact mode.
- Exercise arrival batching, source-ID mapping, correct sender attribution, ordering and completion, including an arrival at the completion boundary if the app enables steering.
- Test stable idempotency per logical send, a duplicate success, an ambiguous send failure, a terminal `recipient_reply_required` or consent block, and safe retry or shutdown. Never retry an uncertain send using a fresh key merely because the first request failed.
- Inspect signed consent events and their acknowledgement and deduplication separately when used. For retained reaction and sticker paths, verify the source provider still owns those events and sends. If an approved behavior change removes either feature, verify that stale prompts, tools and callbacks cannot invoke it in the Keiki flow.

### Keiki agent, API, callbacks and retained surfaces

- Verify an agent or line exists using only authorized reads. Confirm the selected runtime, configuration and callback contract with fixtures, and check exact agent/line routing, webhook signature, acknowledgement and duplicates as applicable.
- A notice reaches only an existing conversation for the selected agent. Test targeted notice behavior, no-conversation error and sender-line conditions when in scope. A notice accepted or a turn completed is distinct from device delivery.
- Test documented self-hosted delivery callback states and message correlation when approved. Record any unavailable receipt category or missing line evidence.
- Test applicable startup, reconnect, duplicate listeners and orderly shutdown for the retained provider or an actual connection-based target. Check both regular and failure paths at the boundary selected in the plan.

When the source application uses typing behavior, verify:

- typing begins as expected;
- typing clears after successful responses;
- typing clears after exceptions and early returns.

When the source application uses line or group behavior, verify:

- receiving-line identity is preserved;
- multiple configured numbers or servers are filtered correctly;
- DM and group classification matches the source application;
- participant attribution remains correct.

## 6. Attachment verification

Run only attachment tests applicable to attachment behavior actively used by the source application and supported by the selected target.

Possible checks include:

- outbound local-file upload;
- outbound URL download before upload;
- inbound attachment metadata;
- inbound attachment retrieval;
- pending or unavailable attachment;
- MIME normalization;
- size limits;
- timeout;
- unsupported media;
- partial or failed transfer.

Record which checks apply, why they apply, and their results.

## 7. Service-behavior verification

Before plan approval, confirm that RCS, SMS, and iMessage behavior has sufficient public-contract or implementation evidence, or that an explicit behavior change was approved.

Confirm device-visible behavior on the authorized test line and recipients when the plan includes live verification. The availability of credentials is separate from authorization. Report a fixture-only result as fixture evidence.

When live verification cannot be performed:

- report the exact unverified behavior;
- record why live verification was unavailable;
- mark the live requirement pending. Code-only or simulated verification can be complete for its authorized scope, with live parity still pending.

Do not retain unverified RCS, SMS, iMessage, fallback, or routing claims in prompts or product copy.

## 8. Provider removal

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

Historical migration notes may retain the provider name. Compatibility fields may remain only when they were approved and are still required to read existing records. Track old dependencies that are still active through shared integrations or a partial migration. For a full replacement, require removal of unexpected runtime dependencies. For a split, prove exact ownership and traffic isolation.

## 9. Complete diff review

Review committed, staged and unstaged changes from the recorded starting commit, plus each untracked file that will be included:

```bash
git diff --stat <starting-commit>
git diff <starting-commit>
git status --short
git ls-files --others --exclude-standard
```

For every changed file, answer:

- Was it approved?
- Is it required for parity?
- Did it change product behavior?
- Did it add a new feature?
- Did it expose a secret?
- Did it perform an unrelated refactor?

Remove unnecessary changes.

### Cross-repository verification

When the migration copies or mirrors an application from one repository into another:

1. record the source repository and commit;
2. identify the source scope intentionally copied;
3. compare that copied source scope against the destination scope;
4. allow only approved migration differences;
5. report every unexpected missing, added, or changed file.

Do not require full-tree comparison for an in-place migration or when only selected files were intentionally imported.

Do not use only the destination repository diff as proof that copied source files were preserved.

## 10. Cutover, rollback and completion rules

When in scope, witness authorized activation and one active responder on each line and flow. Compare sender identity, opt-outs, conversation mapping, outstanding callbacks, attachments and queued work. Verify the rollback decision point and restoration path using a rehearsal or authorized cutover. Do not replay a send with an unresolved outcome. Record an owner for manual setup or any validation still pending.



Do not report completion when:

- a required capability is blocked;
- a required source behavior remains unknown, or a bounded version risk is unacknowledged;
- the diff exceeds the approved plan;
- an essential test failed;
- a test could not run and was not reported;
- the old provider remains active unexpectedly;
- an active capability was removed because it was absent from only one documentation source;
- an installable Keiki package lacks an approved planned version;
- the lockfile-resolved installed version does not match the approved planned version;
- a hosted Keiki service lacks a verified public contract or documentation retrieval date;
- an actively reachable closed source value was not verified individually;
- an open-ended source value lacks a verified conversion rule and representative, invalid, and unknown-value tests;
- a mixed Keiki architecture lacks responsibility, event ownership, connection ownership, or lifecycle justification;
- applicable turn acknowledgement, retries, arrivals, deadlines, cancellation, expired credentials or ambiguous sends remain unverified;
- typing cleanup remains unverified when typing behavior is active;
- multi-line or multi-number routing remains unverified when routing behavior is active;
- applicable attachment readiness, retrieval, upload, timeout, MIME, size, unsupported-media, or failure behavior remains unverified;
- RCS, SMS, or iMessage behavior lacks sufficient evidence or an approved behavior change;
- required live service verification in the approved scope remains pending;
- a copied or mirrored external source scope was verified only through the destination repository diff;
- active cutover effects supported by repository evidence were omitted;
- execution occurred on a branch other than the approved user-selected or fallback branch;
- the writable execution destination or pull-request destination was not verified;
- a documentation retrieval failure was represented as documentation absence.

A live test may be pending before approval when public evidence supports the mapping. Report separate code, fixture and live status so a code-only request can finish with the live check still pending.

## 11. Final report

```text
Switch to Keiki — Verification Report

Branch: <approved branch>
Starting commit: <sha>
Detected source: <provider, exact SDK/API generation, integration style, confidence>
Keiki target:
- inbound: <product>
- outbound: <product>
- attachments: <product>
- lifecycle owner: <product or application module>
- installable package versions: <package>@<approved planned version> → <lockfile-resolved installed version>
- hosted service contracts: <service, endpoint, contract, retrieval date>

Approved capabilities migrated:
- <capability>

Intentionally excluded:
- <unused capability or no additional features added>

Closed-value parity:
| Exact source behavior or closed value | Keiki product | Exact method, endpoint, or event | Evidence | Live or fixture result | Result |
|---|---|---|---|---|---|

Open-value parity:
| Open-ended source value type | Conversion rule | Keiki product | Exact method, endpoint, or event | Representative, invalid, and unknown-value results | Evidence | Result |
|---|---|---|---|---|---|---|

Repository checks:
- <command/check and result>

Lifecycle and behavior:
- <surface-specific checks and results>

Attachment verification:
- <applicable checks and results>

Routing and service behavior:
- <line, group, RCS, SMS, and iMessage results or exact exclusions>

Provider removal:
- <search and result>

Complete diff review:
- <approved-file and behavior result>

Cross-repository verification:
- <source repository, commit, compared scope, and result or not applicable>

Manual setup:
- <credential/dashboard step without secret values>

Compatibility retained:
- <old IDs/fields or none>

Cutover impact:
- <sessions, conversations, cached state, credentials, onboarding links, line assignments, identifiers, re-onboarding, restart impact, or none>

Blocked or unverified:
- <exact item or none>

Completion status:
- code: <complete | incomplete and why>
- fixture verification: <passed | failed | pending and why>
- live parity: <verified for the specified scope | pending and exact requirement>
```
