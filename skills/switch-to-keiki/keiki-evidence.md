# Keiki evidence and contracts

Re-fetch current official sources at planning time. Record URL/section, retrieval date,
SDK version or public contract revision, line/plan restrictions and local file/line
showing the behavior is used. For hosted services record contract/date, not an invented version.

1. Start with [Keiki docs](https://onkeiki.com/docs), [agent-readable index](https://onkeiki.com/llms.txt),
   [SDK](https://onkeiki.com/docs/sdk.md), [harnesses](https://onkeiki.com/docs/harnesses.md),
   [external contract](https://onkeiki.com/docs/external-harness.md), [channels](https://onkeiki.com/docs/channels.md),
   and the [public OpenAPI](https://onkeiki.com/openapi.json).
2. Check exact public SDK types, changelog and official examples where relevant. Inspect
   official implementation/tests only to resolve ambiguity. Private/internal code is not
   proof of a supported public API. An omitted capability is unresolved until the relevant
   contract and applicable restrictions are checked. Conflicting evidence blocks the mapping.
3. Label evidence retrieved, inaccessible, missing (confirmed), or insufficient. Distinguish
   documented, fixture-verified, live-verified, unsupported and unresolved. A page that
   loads is not evidence of support for the application's pinned generation.

## Public contract anchors (checked 2026-11-15)

- [External harness](https://onkeiki.com/docs/external-harness.md): version 1 `keiki.turn`
  requests and `Keiki-Turn-Id`, `Keiki-Turn-Token`, `Keiki-Signature`. Use the documented
  verification, deadline and acceptance rules; use the returned `turnUrl` on the
  configured Keiki origin with turn-scoped auth. Keep tokens and signed URLs out of logs.
- `POST {turnUrl}/messages` sends a turn-scoped text reply; `replyToMessageId` and
  `effect` are mutually exclusive. `/actions` handles documented native actions.
  Upload with `POST {turnUrl}/attachments?filename=…`, then send the returned ID using
  `send_file`; actual limits depend on the channel. Inbound attachment URLs expire.
- Complete work using `POST {turnUrl}/complete`; validate quiet/held-back/steered and
  cancellation paths. Maintain stable per-action idempotency keys. A delivery outcome
  marked unknown must not trigger blind retries. Respect `recipient_reply_required`.
- [Event webhooks](https://onkeiki.com/docs/webhooks.md) document consent changes. They
  are not a general inbound-message or receipt stream by default. [Proactive notice
  turns](https://onkeiki.com/docs/external-harness.md#proactive-turns) require their own
  eligibility checks; do not infer this supports arbitrary sends to new contacts.
