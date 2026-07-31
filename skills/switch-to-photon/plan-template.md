# Required migration plan

Use this exact structure before any repository change.

```text
Switch to Photon — Migration Plan

Repository state
- Repository root: <path>
- Default branch: <branch>
- Current branch: <branch>
- Starting commit: <sha>
- Working tree: <clean or dirty>
- Unrelated changes to preserve:
  - <file/change or none>

Execution access

- Repository permissions:
  - read: <yes/no>
  - create branch: <yes/no>
  - push: <yes/no>
  - open pull request: <yes/no>
- Writable repository:
  - <original repository, existing fork, new fork required, or unavailable>
- Execution branch:
  - <branch>
- Pull-request destination:
  - <repository and base branch or none>
- Blocker:
  - <details or none>

Do not request execution approval until a writable execution destination has been identified.

Execution branch: <user-requested branch or switch-to-photon default>

Execution branch precedence
1. Use the branch explicitly requested by the user.
2. Otherwise reuse an existing dedicated migration branch when safe.
3. Otherwise default to switch-to-photon.

Never override an explicit user-selected branch with the default.

Source integration
- Provider: <provider>
- Detection result: <exact SDK version | known REST API generation | known webhook generation | mixed generations | unknown generation>
- Exact SDK/API generation: <specific result>
- Integration style: <REST, webhook, Socket.IO, WebSocket, SDK, unified stream, adapter, local bridge, MCP, mixed>
- Detection confidence: <High, Medium, Low>
- Approved agent-readable source available: <yes with URL, or no>
- Detection evidence:
  - <lockfile/package version>
  - <import or generated client>
  - <host/base path/endpoint/header>
  - <request, response, or webhook field>
  - <test or fixture>
- Source transport and behavior semantics:
  - inbound: <transport>
  - outbound: <transport>
  - attachments: <transport and readiness model>
  - lifecycle: <request, webhook, Socket.IO, WebSocket, SDK, unified stream, or mixed>
  - errors: <synchronous, asynchronous, retried, ambiguous, or mixed>

Current capabilities
- <only behavior proven by active code, tests, storage, or deployment configuration, with evidence>

Active value classification
- Closed value sets:
  - <enum, union, option list, status, or named behavior>
- Open-ended value sets:
  - <free-form values, MIME types, custom payloads, identifiers, or none>

Intentionally excluded capabilities
- <source-provider or Photon feature not used by this product>

Photon target

- Inbound product:
  - <product>
- Outbound product:
  - <product>
- Attachment product:
  - <product>
- Lifecycle owner:
  - <product or application module>
- Installable package names and exact planned versions:
  - <package>@<planned version or none>
- Hosted services:
  - <service and public endpoint or none>
- Public API or hosted-service contract inspected:
  - <source and revision or retrieval date>
- Official Photon skill/source:
  - <path, commit, or URL>
- Implementation source inspected:
  - <repository, path, and commit, only when public evidence was incomplete; otherwise not required>
- Official tests inspected:
  - <path and commit, unavailable, or not required>
- Documentation retrieval status:
  - <retrieved, published but inaccessible from the current environment, confirmed missing, or retrieved but insufficient>
- Documentation retrieval details:
  - <source, retrieval date, and exact failure when applicable>
- Mixed-target requirement:
  - <why multiple Photon products produce a smaller or safer migration, or none>
- Architecture-preservation comparison:
  - <files, transports, hosting, runtime, dependencies, lifecycle, credentials, verification, and operational behavior>
- Reason:
  - <why this architecture preserves active capabilities with the smallest safe change>

Mixed target decision record
| Responsibility or capability | Required Photon surface | Why the combination is safer or smaller | Why another selected surface is insufficient for this boundary | Shared identifier or credential | Event or connection owner | Lifecycle owner |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

Use this table only when more than one Photon surface is selected. Define duplicate-event and duplicate-listener prevention, retry behavior, ambiguous-result handling, disconnect and reconnect behavior when applicable, webhook acknowledgement and retry behavior when applicable, and shutdown behavior.

Migration plan

A concise, reviewable summary containing:

- Source detection
- Existing architecture
- Selected Photon target or target combination
- Important behavior mappings
- Approved behavior changes
- Files expected to change
- Blockers
- Cutover impact
- Verification strategy
- Execution access, branch, and pull-request destination

Capability evidence appendix

A detailed appendix containing:

- Closed enum mappings
- Open-value conversion rules
- Exact methods and endpoints
- Evidence sources
- Lifecycle matrix
- Attachment behavior
- Routing behavior
- Confidence per capability

Closed-value parity map

| Exact source behavior or closed value | Source evidence | Photon product | Exact method, endpoint, or event | Exact Photon input or value | Output and error semantics | Expected files | Confidence |
|---|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... | ... |

Open-value conversion map

| Open-ended source value type | Conversion rule | Photon product | Exact method, endpoint, or event | Representative tests | Invalid or unknown behavior | Source evidence | Confidence |
|---|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... | ... |

Photon evidence conflicts

- <conflicting or incomplete official sources, or none>
- Public execution boundary:
  - <supported public contract or unknown>
- Resolution:
  - <selected public source and why, alternative Photon target, blocked initial plan, or revised plan required after prior approval>

Behavioral differences requiring target-side compensation

- <typing cleanup, async error handling, attachment waiting, identifier conversion, webhook acknowledgement, retry handling, or none>

Closed-value preservation

- Reactions:
  - <every actively reachable closed source value → exact Photon value>
- Effects:
  - <every actively reachable closed source value → exact Photon value>
- Services:
  - <every actively reachable closed source value → exact Photon representation>
- Status values:
  - <every operationally used closed value → exact Photon representation>

Open-value conversion rules

- Custom emoji or free-form reactions:
  - <conversion rule, representative values, invalid values, and unknown values>
- MIME types:
  - <conversion or normalization rule and representative tests>
- Custom payloads or identifiers:
  - <conversion rule and invalid or unknown behavior>

Lifecycle matrix

| Surface | Startup or request readiness | Failure mode | Retry or reconnect | Duplicate prevention | Shutdown or acknowledgement | Evidence | Confidence |
|---|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... | ... |

Attachment behavior

| Active source attachment behavior | Selected Photon surface | Readiness or upload rule | MIME, size, timeout, and unsupported-media behavior | Failure behavior | Evidence | Confidence |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

Routing behavior

| Active source routing behavior | Source evidence | Photon event or recipient identity | Intended-line behavior | Unintended-line behavior | Multi-number or multi-server behavior | Evidence | Confidence |
|---|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... | ... |

Expected code changes
- <every file or module expected to change and why>

Dependencies and configuration
- Packages to remove:
  - <package or none>
- Packages to add:
  - <package or none>
- Exact planned dependency versions:
  - <package>@<planned version>
- Installed-version verification:
  - confirm the exact lockfile-resolved version matches the approved planned version after installation
- Hosted-service contracts:
  - <service, endpoint, authentication contract, API or event contract, documentation source, retrieval date>
- Environment-variable names to remove:
  - <name or none>
- Photon environment-variable names to add:
  - <name or none>
- Manual dashboard or credential setup:
  - <step without real values>
- Applicable lifecycle:
  - <SDK, WebSocket, Socket.IO, webhook, REST, adapter, or none>
- Connection or request behavior:
  - <startup, ready, disconnect, reconnect, duplicate listeners, shutdown, acknowledgement, retry, timeout, or none as applicable>
- Multi-line or multi-server routing:
  - <configuration and event-to-line identity>

Data and cutover compatibility

Inspect and include only fields supported by active repository evidence.

- Provider IDs currently stored:
  - <field/table/file or none>
- Old IDs that must remain readable:
  - <details or none>
- Active provider sessions affected:
  - <details, none, or not applicable>
- Provider-derived conversations affected:
  - <details, none, or not applicable>
- Process-local or cached provider state:
  - <details, none, or not applicable>
- Onboarding links or magic links:
  - <details, none, or not applicable>
- Provider credentials affected:
  - <details, none, or not applicable>
- User-to-line assignments:
  - <details, none, or not applicable>
- Stored provider identifiers:
  - <details, none, or not applicable>
- User re-onboarding required:
  - <yes/no/not applicable and reason>
- Compatibility aliases or boundary translations:
  - <details or none>
- Persistent data migration:
  - <details or none>
- Process-restart impact:
  - <details, none, or not applicable>
- Cutover procedure:
  - <details>
- Blockers:
  - <details or none>

Do not add irrelevant mandatory fields when the source application has no such behavior.

Documentation retrieval status

- Status:
  - <retrieved, published but inaccessible from the current environment, confirmed missing, or retrieved but insufficient>
- Registered llms.txt result:
  - <result>
- Registered llms-full.txt result:
  - <result>
- Alternate fetch mechanism:
  - <result>
- Exact retrieval failure:
  - <sandbox, DNS, redirect, timeout, tool failure, HTTP response, or none>
- Repository evidence used:
  - <sources>
- Invented documentation content:
  - none

A sandbox, DNS, redirect, timeout, or tool failure must not be described as a genuine HTTP 404 or as proof that documentation does not exist.

Verification plan
- Unit and integration tests:
  - <commands/checks>
- Typecheck, lint, build, schema, generated-client, and deployment validation:
  - <commands/checks>
- Provider-specific fixture tests:
  - <checks>
- Exact dependency verification:
  - <lockfile command or inspection proving each approved planned package version>
- Hosted-service contract verification:
  - <authentication, endpoint, event, and operational checks>
- Lifecycle tests applicable to the selected Photon surfaces:

  For an SDK or Socket.IO/WebSocket target:
  - startup readiness;
  - disconnect;
  - reconnect;
  - send during disconnect;
  - duplicate listeners;
  - clean shutdown.

  For Photon Webhook:
  - signature verification;
  - timestamp validation;
  - acknowledgement;
  - duplicate delivery;
  - retry behavior;
  - malformed events.

  For Photon HTTP Proxy REST:
  - authentication failure;
  - synchronous request failure;
  - timeout;
  - rate or server failure;
  - ambiguous send result;
  - idempotency or retry behavior when supported.

  Do not include SDK connection tests when the application uses only hosted REST and HTTP webhooks.

- Attachment tests applicable to active source behavior and the selected target:
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

  Identify which checks apply and why. Do not require unrelated attachment tests.

- Closed-value tests:
  - every actively reachable standard reaction;
  - every actively reachable documented effect;
  - every actively reachable service value;
  - every operationally used delivery, failure, or group-operation value.
- Open-value tests:
  - representative custom emoji or free-form reaction values;
  - invalid values;
  - unknown values;
  - representative MIME types or custom identifiers.
- Routing tests when routing behavior is active:
  - intended receiving line;
  - unintended receiving line;
  - multiple servers or numbers;
  - DM and group identifiers.
- Behavioral tests when the source behavior exists:
  - typing starts;
  - typing clears after success;
  - typing clears after failure;
  - group classification;
  - participant attribution.
- Service verification:
  - verify RCS, SMS, and iMessage behavior using sufficient public-contract or implementation evidence before plan approval;
  - perform live verification before claiming completion when credentials, lines, devices, and recipients are available;
  - when live verification cannot be performed, report the exact unverified behavior and mark completion incomplete unless the approved plan explicitly accepts its exclusion.
- Source-provider removal searches:
  - <imports, packages, hosts, endpoints, headers, environment variables, routes, clients, services>
- Complete diff review:
  - git diff --stat <starting-commit>...HEAD
  - git diff <starting-commit>...HEAD
- Cross-repository source comparison, only when the migration copies or mirrors application scope from another repository:
  - record <source repository>@<source commit>;
  - compare the intentionally copied source scope against <destination scope>;
  - permit differences only in approved migration files;
  - report every unexpected missing, added, or changed file.

  Do not require full-tree comparison for an in-place migration or when only selected files were intentionally imported.

- Live smoke tests:
  - <tests when credentials are available, or exact unverified item>

Blockers
- <every unsupported, uncertain, or non-equivalent capability, or none>
- <for Low confidence: exact risk that must be explicitly accepted before execution>
- Do not classify a capability as unsupported solely because it is absent from one Agent Skill, README, example, or documentation page.
- Unsupported-capability investigation must follow the bounded escalation in photon-evidence.md.
- Implementation or official tests are required only when the public contract, documentation, and Agent Skill are incomplete or conflicting.
- Record when implementation source or official tests are unavailable.
- Do not plan against undocumented internal behavior.
- An installable Photon dependency must have an exact planned version.
- A hosted Photon service must have an identified public contract and documentation retrieval date.
- Do not invent hosted-service versions.
- Do not request execution approval until repository write access and a writable execution destination are identified.
- A transport change must include an architecture-preservation comparison.
- Spectrum cannot be selected for a REST or webhook application without proving lower total migration risk.
- A mixed target must identify responsibility, event ownership, connection ownership, lifecycle ownership, duplicate prevention, retry behavior, and shutdown behavior.
- Every actively reachable closed value must be mapped individually.
- Every active open-ended value must have a conversion rule and representative, invalid, and unknown-value behavior.
- A documentation retrieval failure must not be represented as documentation absence.

Execution boundary
- No migration changes have been made.
- Execution will occur only on the approved execution branch.
- Only the approved files and behaviors will be changed.
- Any required scope expansion will produce a revised plan.
- Approval applies to both the migration plan and the capability evidence appendix.

To approve this exact migration plan, reply:

APPROVE SWITCH TO PHOTON PLAN
```

Stop after showing the plan. Do not edit while waiting. Low-confidence detection also requires explicit acceptance of the stated risk; the approval phrase alone does not silently waive it.
