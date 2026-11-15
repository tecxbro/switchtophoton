# Verify the migration

Review the diff against the recorded starting commit, including staged and unstaged changes. Compare changes against the approved scope and execution branch. For a cross-repository copy, also compare the copied scope with the pinned original tree. Verify existing records still load after any schema or ID translation. Run the repo's relevant tests, type checks, lint, build and config checks using its documented commands.

## Check the target boundary

- Confirm lockfile-resolved versions match the plan and the code calls supported exports. For hosted Keiki surfaces, confirm the endpoint, API and event contracts and the selected line, agent and harness.
- Trace each capability and reachable closed value in the approved plan to an observed result. For open values, check representative, invalid and unknown inputs. Compare conversation behavior at the app and recipient boundaries.
- Exercise the applicable lifecycle. For an external harness, verify the configured push, relay or inbox mode, auth and agent scoping, replay or duplicate processing, turn deadline and completion, and failure recovery. For hosted mode, check registered tools and the agent's reply behavior with the configured channel and identity.
- Confirm inbound routing and intended sender on the actual line. When applicable, exercise shared-line join and consent, separate configured lines, direct and group conversations, new and existing conversations, multi-message turns, typing and suppression, and relevant opt-out and fallback behavior.
- Distinguish an accepted API or turn response from confirmed delivery. Exercise the existing app's delivery and failure handling on the selected surface, including timeout and ambiguous retry behavior if applicable.
- Verify active media with the supported MIME types and sizes, including attachment retrieval, readiness, send errors and unsupported inputs where the app previously handled them.

## Check cutover

Verify the approved sender identity, onboarding, contact and conversation mapping, persisted IDs, open work and consent continuity. Show that one responder handles each live flow and that disabled routes do not create duplicate sends on rollback. Search active runtime and deployment configuration for old hosts, dependencies, auth variables, callbacks, listeners and queued work. For a partial migration, verify the retained sender or listener is limited to its approved traffic.

## Report results

List the commands run, evidence per required capability, branch and commit, and operational steps performed. Label fixture results and live results separately. When live access or authorization is missing, state the exact check and prerequisite, and keep the affected capability pending. Report required failures or unresolved parity as incomplete. A code-only delivery may be ready for handoff when the approved plan assigns deployment or live verification to the owner, with those steps still listed as pending.
