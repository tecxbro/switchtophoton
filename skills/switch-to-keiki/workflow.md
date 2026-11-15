# Migration workflow

## Phase 1 — Inspect and plan

### Establish repository state and scope

Record the repository, starting commit, worktree changes to preserve, local checks, and intended execution branch. Check whether the requested repository and branch are writable. Include a push or pull-request destination when the user requests one. Keep this phase read-only in the app repository and provider accounts.

### Trace the active source integration

Search lockfiles, package imports, source adapters, deployment config, webhook and stream consumers, tests, fixtures and persisted identifiers. Trace outbound sends and inbound replies through active entry points. Identify each active SDK version from the lockfile or generated-client metadata. For raw HTTP or a local bridge, record the REST and event generations independently using hosts, paths, auth schemes and payload fields. Report mixed generations and unknown versions explicitly.

Use the [provider index](./providers/index.md). A name in a comment or unused dependency is a lead. Corroborate it with runtime configuration, calls or wire shapes. Label detection confidence high when a version or generation is proven, medium when a provider is clear and its version remains unknown, and low when the integration itself is ambiguous. Show uncertainty wherever it prevents a reliable capability mapping.

### Inventory the behavior the app depends on

Follow behaviors to their callers, including operational and stored-state dependencies:

- Who starts a new conversation, selects the sender and receives replies. Distinguish direct, group and multi-line traffic, enrollment, consent, fallback and service selection.
- What users receive. Check text, attachments, replies, reactions, edits, unsend, typing, read state and effects as applicable.
- What the app observes. Check send acceptance, delivery or failure, callbacks, history, retries and deduplication, ordering, rate limits, reconnection and shutdown as applicable.
- What the app stores. Look for provider line, contact, message and conversation IDs, sessions, queued work, invitations and onboarding links.
- What else shares this integration. Account for SMS, RCS, other channels and non-messaging integrations when removing dependencies or changing routing.

For active closed sets such as service enums, reactions or statuses, map each reachable value. For open inputs such as free-form emoji or MIME types, state the conversion and handling of valid, invalid and unknown input.

### Select and prove the Keiki target

Read [Keiki target selection](./keiki-targets.md) and [Keiki evidence](./keiki-evidence.md) after tracing the source. Choose the smallest architecture that explains who owns the channel, the turn and outgoing messages. Check the actual agent, line type, harness, and account requirements for each capability. Compare inbound, outbound, media, event lifecycle and identity separately when the source app uses them.

Prefer retaining the app's prompts, business logic, internal types, hosting and storage where the supported target permits. A switch from a raw message webhook to a Keiki turn can change batching, acknowledgement, reply timing and attribution. A switch from direct sending can change who may initiate contact and what delivery signals are available. Record each observed difference and its proposed handling.

Treat a partial migration as a distinct plan. Specify which component owns each line and flow, the source integration that must remain, and how the split avoids duplicate sends, lost events and divergent consent. Expose unresolved required capabilities as blockers. Offer verified alternatives, with product behavior changes explicit for approval.

### Plan cutover and review

Use [the plan template](./plan-template.md). Verify eligibility for any line import or connection and account for old sender identities, conversations, provider IDs, pending work, consent, onboarding and rollback where they matter. Define one live responder for each line and an observation and rollback point before retiring the old path.

Show the plan with the evidence appendix. Use the approval prompt in [the plan template](./plan-template.md) when the plan is executable. Keep the plan concise while covering each required behavior.

## Phase 2 — Implement and verify

1. Reconfirm the starting state, approved scope and branch. Use the user-requested branch first, a safe existing migration branch second, or `switch-to-keiki` as the fallback. Preserve unrelated changes.
2. Implement the approved provider boundary and tests or fixtures needed to preserve active behavior. Translate IDs and events into the app's existing shapes. Preserve the approved policy for retries, ambiguous sends, duplicate events, media, routing and error handling.
3. Perform only the account, credential, line, live-test and cutover actions covered by the approved plan and available access. Record manual steps and their impact for anything requiring an account owner.
4. Handle newly discovered material changes as plan revisions. State what changed, the effect on users and verification, and what approval is needed before proceeding.
5. Follow [verification](./verification.md) before reporting completion.
