# Migration plan template

## Switch to Keiki — Migration Plan

### Scope and baseline

- Repository, current branch, starting commit and existing changes to preserve.
- Proposed execution branch and writable destination. Include a push or pull request only when in scope.
- Source provider, exact locked SDK version or REST and event generations, and detection confidence. Record active mixed paths and unknowns.
- Existing app boundary and active capabilities. Link the files, configuration, stored state, tests or fixtures that establish them.

### Target and implementation

- Selected Keiki agent, harness and line type. Identify who owns inbound routing, turn execution, outgoing messages, attachments and lifecycle. Include any source component retained in a split migration and its responsibility.
- Why this design fits the required behavior and limits changes to the app. List affected files, dependencies, configuration names, manual setup and any changes to hosting, prompts, storage, identity or user flows.
- Exact planned version and public exports for any added SDK. For hosted surfaces, record the service, endpoint, auth, API or event contract and documentation access date. Record account or line prerequisites and how they will be verified.
- Behavior changes, blockers and conditional capabilities. State the user impact, resolution needed and whether the plan is full or partial. Scope or behavior changes require explicit approval in the plan.

### Cutover and rollback

- Existing line ownership and import eligibility, sender address, join or enrollment links, incoming route and affected users. Record whether existing users need to re-enroll or start a new thread.
- Conversation history and ID mapping, pending work, subscriptions, sessions and consent or opt-out continuity where applicable.
- Staged test and activation order, the component that may reply at each step, how duplicates are prevented and when the old path can be retired. Specify rollback criteria and how to restore routing without replaying sends.
- Identify any external actions needed, including account setup, provisioning, line changes, test messages and production traffic cutover.

### Verification

List the repo commands and capability-specific fixture and live checks. Specify the authorized test line, mode and recipients needed for each essential live check and note any access required. Define a concrete pass condition for delivery, routing, data compatibility and rollback when they are in scope.

## Capability evidence appendix

| Active source behavior and evidence | Keiki surface, exact API or event, and evidence | Mapping status | Confidence | Verification or required resolution |
|---|---|---|---|---|
| Journey, caller, file or fixture | Method, event or deployment setting and dated source | Verified / Conditional / Unsupported / Unresolved | High / Medium / Low | Expected observable result or blocker |

Use [the target evidence guide](./keiki-evidence.md) for status decisions. Add rows for each reachable closed value and conversion rules for each active open input. Where multiple surfaces or transports are involved, state ownership and correlation IDs for each event and cover acknowledgement, retries, timeout, duplicates, uncertain sends and shutdown as applicable. Describe media readiness, retrieval, upload and errors for each required path. Report unknown evidence and retrieval failures with their impact on the plan.

If the plan is executable, end it with the approval prompt below. If a blocker affects required behavior, state what must be confirmed or changed to make the plan executable.

```text
To approve the migration described above, reply:

APPROVE SWITCH TO KEIKI PLAN
```
