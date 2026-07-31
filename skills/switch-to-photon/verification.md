# Verification

Do not claim completion until the implementation matches the approved plan, preserves every approved capability, and reports every blocked or unverified item.

## 1. Scope and branch verification

Compare every changed file and behavior against the approved plan.

- No unplanned change may remain.
- No new Photon feature may remain.
- No unrelated refactor may remain.
- Any required expansion must use `Switch to Photon — Plan Revision Required` and receive `APPROVE SWITCH TO PHOTON PLAN` again.

### Execution branch precedence

1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to `switch-to-photon`.

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

| Exact source behavior or closed value | Photon product | Exact method, endpoint, or event | Evidence | Live or fixture result | Result |
|---|---|---|---|---|---|

Every actively reachable closed value must have its own row.

A category-level row such as `effects`, `reactions`, or `services` is insufficient.

### Open-ended values

| Open-ended source value type | Conversion rule | Photon product | Exact method, endpoint, or event | Representative, invalid, and unknown-value results | Evidence | Result |
|---|---|---|---|---|---|---|

Do not claim to enumerate every possible value in an open-ended set.

Verify every capability approved in the plan, including applicable inbound and outbound routing, groups, line selection, attachments, replies, reactions, typing, read state, delivery states, retries, idempotency, deduplication, ordering, webhook authentication and acknowledgement, lifecycle, shutdown, fallback channels, and persisted-ID compatibility.

When credentials are unavailable, use existing mocks or approved fixtures and report the exact live smoke test that remains. Never fabricate a successful live test.

## 4. Photon target-version and contract verification

For installable Photon packages, confirm:

- package name;
- exact planned package version approved in the plan;
- exact lockfile-resolved installed version;
- the installed version matches the approved planned version;
- exported public types used by the migration;
- no migration behavior depends only on undocumented internal implementation.

For hosted Photon services, confirm:

- service and endpoint;
- authentication contract;
- API or event contract;
- official documentation retrieval date;
- source commit only when source inspection was required and confirmed to represent the hosted service.

Do not require an installed package or lockfile entry for a hosted service that the application accesses over HTTP.

Report any difference between an approved planned package version and the installed lockfile-resolved version as incomplete.

Confirm that no capability assumption came only from an outdated example, README section, or Agent Skill when stronger public evidence was required.

## 5. Behavioral and lifecycle verification

Run lifecycle tests applicable to the selected Photon surfaces.

### SDK or Socket.IO/WebSocket target

Verify:

- startup readiness;
- disconnect;
- reconnect;
- send during disconnect;
- duplicate listeners;
- clean shutdown;
- asynchronous send failures when the target reports them.

### Photon Webhook

Verify:

- signature verification;
- timestamp validation;
- acknowledgement;
- duplicate delivery;
- retry behavior;
- malformed events.

### Photon HTTP Proxy REST

Verify:

- authentication failure;
- synchronous request failure;
- timeout;
- rate or server failure;
- ambiguous send result;
- idempotency or retry behavior when supported.

Do not require SDK connection tests when the application uses only hosted REST and HTTP webhooks.

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

Live verification is required before claiming migration completion when credentials, lines, devices, and recipients are available.

When live verification cannot be performed:

- report the exact unverified behavior;
- record why live verification was unavailable;
- mark completion incomplete unless the approved plan explicitly accepts the exclusion.

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

Historical migration notes may retain the provider name. Compatibility fields may remain only when they were approved and are still required to read existing records. Active runtime code must not unexpectedly depend on the old provider after a full replacement.

## 9. Complete diff review

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

### Cross-repository verification

When the migration copies or mirrors an application from one repository into another:

1. record the source repository and commit;
2. identify the source scope intentionally copied;
3. compare that copied source scope against the destination scope;
4. allow only approved migration differences;
5. report every unexpected missing, added, or changed file.

Do not require full-tree comparison for an in-place migration or when only selected files were intentionally imported.

Do not use only the destination repository diff as proof that copied source files were preserved.

## 10. Completion rules

Do not report completion when:

- a required capability is blocked;
- provider detection remains low-confidence without explicit risk acceptance;
- the diff exceeds the approved plan;
- an essential test failed;
- a test could not run and was not reported;
- the old provider remains active unexpectedly;
- an active capability was removed because it was absent from only one documentation source;
- an installable Photon package lacks an approved planned version;
- the lockfile-resolved installed version does not match the approved planned version;
- a hosted Photon service lacks a verified public contract or documentation retrieval date;
- an actively reachable closed source value was not verified individually;
- an open-ended source value lacks a verified conversion rule and representative, invalid, and unknown-value tests;
- a mixed Photon architecture lacks responsibility, event ownership, connection ownership, or lifecycle justification;
- an applicable asynchronous Photon error, disconnect, reconnect, webhook retry, REST timeout, or ambiguous-send behavior remains undefined;
- typing cleanup remains unverified when typing behavior is active;
- multi-line or multi-number routing remains unverified when routing behavior is active;
- applicable attachment readiness, retrieval, upload, timeout, MIME, size, unsupported-media, or failure behavior remains unverified;
- RCS, SMS, or iMessage behavior lacks sufficient evidence or an approved behavior change;
- required live service verification was not performed and the exact exclusion was not approved;
- a copied or mirrored external source scope was verified only through the destination repository diff;
- active cutover effects supported by repository evidence were omitted;
- execution occurred on a branch other than the approved user-selected or fallback branch;
- the writable execution destination or pull-request destination was not verified;
- a documentation retrieval failure was represented as documentation absence.

Live tests that require implementation or credentials block completion, not initial plan approval, unless no reliable pre-execution evidence exists.

## 11. Final report

```text
Switch to Photon — Verification Report

Branch: <approved branch>
Starting commit: <sha>
Detected source: <provider, exact SDK/API generation, integration style, confidence>
Photon target:
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
| Exact source behavior or closed value | Photon product | Exact method, endpoint, or event | Evidence | Live or fixture result | Result |
|---|---|---|---|---|---|

Open-value parity:
| Open-ended source value type | Conversion rule | Photon product | Exact method, endpoint, or event | Representative, invalid, and unknown-value results | Evidence | Result |
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
- <complete | incomplete because ...>
```
