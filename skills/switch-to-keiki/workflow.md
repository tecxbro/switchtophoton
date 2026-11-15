# Migration workflow

## 1. Inspect and plan (read-only)

- Record repository, current/default branch, starting commit, dirty changes, package manager,
  test commands, deployment/runtime model, and requested destination. Record access limits
  and protect unrelated work. Identify any user or repo policy that requires extra gates.
- Search manifests, lockfiles, imports, HTTP origins/routes, webhook handlers, fixture payloads,
  deploy configuration and environment *names*. Trace reachable inbound and outbound code
  and real configuration references. Distinguish samples, dead code and fallback adapters
  from active code. Never open, print, copy or commit secret values.
- Record each provider, exact resolved SDK version or API/webhook generation, sender and
  line selection, tenant ownership, and file/line references. Different origins, packages,
  versions or handlers can coexist. If exact generation cannot be pinned, record the
  evidence and block the affected mapping pending resolution.
- Trace incoming event → dedupe → normalize → application handling → send → status.
  Also trace independent sends, group operations, media, consent/opt-outs, retry and
  unknown delivery, read/typing state, and non-iMessage/voice paths when applicable.
  Separate transport semantics from business behavior. Map each reachable closed enum
  value; for unbounded values record conversion, validation and representative edge cases.
- Select inbound, outbound, attachments, state, lifecycle and line routing separately, then
  pick the smallest documented coherent Keiki target. Identify which system owns each
  responsibility, including duplicate prevention if both providers coexist.
- Apply [evidence rules](keiki-evidence.md) and populate [plan-template.md](plan-template.md).
  List unresolved and explicitly unsupported items separately. State what can be proved
  with fixtures and what requires a test line, iOS device, or vendor confirmation.
- Show the complete plan and stop. No source changes, new worktree, package installation,
  configuration edits, account creation, infrastructure mutation or external traffic.

## 2. Execute only after explicit approval

- Check current branch/commit/diff against the approved baseline. Use the owner's chosen
  branch, otherwise a dedicated migration branch named in the approved plan. Do not
  overwrite local changes. Get fresh approval if scope, cost, line, identity, hosting,
  permissions, data destination, downgrade, or release action changes.
- Change only approved files and pin exact dependency versions. Retain normalized
  domain interfaces, persistence, auth and prompts where possible. Build the adapter and
  fixture tests before touching live configuration.
- Validate Keiki inbound authentication using its public contract and verify tenant/agent
  binding; never accept a raw payload merely because its shape resembles a Keiki turn.
  Use durable dispatch acceptance/dedupe and stable per-action idempotency where applicable.
  Do not automatically resend a message with unknown delivery.
- Make ID mappings explicit and scoped per tenant/agent/line; prove identity continuity
  independently of phone-number matching. Do not replay historical sends or copy raw
  transcripts into a new service without authorization.
- Keep existing production routing in place while testing on approved test lines or
  fixtures. Separate approvals for user-facing sends, paid lines, ports, releases or
  other material actions are obtained as applicable. Never cut over both senders at once.
- Run [verification.md](verification.md), report exact commit and test outcomes, and
  declare remaining blockers. Do not push, open a PR, merge or deploy unless authorized.
