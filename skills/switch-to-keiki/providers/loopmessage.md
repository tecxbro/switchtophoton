# LoopMessage source reference

Use this file only after repository evidence indicates LoopMessage.

## Approved official documentation

- https://loopmessage.com/llms.txt
- https://loopmessage.com/apidocs/ (published API reference linked from the official index)

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary helpdesk, pricing, roadmap, and HTML documentation pages are not approved linked sources. `docs.loopmessage.com` publishes next-generation product docs but does not currently serve `llms.txt`.

## Detection fingerprints

Confirm combinations of:

- API hosts `a.loopmessage.com` (current generation), `server.loopmessage.com` (legacy generation), `iauth.loopmessage.com` (legacy auth), `t.imsg.link` (opt-in tracker), `dashboard.loopmessage.com`, or `mcp.loopmessage.com`;
- `/api/v1` paths on either host — distinguish generations by host, not path;
- authentication shape: current generation uses `Authorization: <API key>` with a raw organization-level key and no `Bearer`/`Basic` prefix; legacy uses `Authorization: <authKey>` plus a separate `Loop-Secret-Key: <secretKey>` header pair (two credentials, not Basic auth — verify against wire calls; unofficial SDKs have shipped both interpretations);
- LoopMessage credential and environment-variable names;
- sender names, sender IDs, pools, and aliases;
- webhook or callback configuration with `webhook_url` and `webhook_header`;
- consent, sign-up, deep-link, or inbound-first eligibility flows;
- endpoints such as `/api/v1/message/send/`, `/api/v1/message/show-typing/`, `/api/v1/message/edit/{id}/`, `/api/v1/message/unsend/{id}/`, `/api/v1/organizations/*`, `/api/v1/sender/plans/`;
- unofficial SDKs such as `Wkasel/loopmessages` or `n8n-nodes-loopmessage` — confirm they are not mistaken for official clients.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or generation

LoopMessage shipped a next-generation API (public beta December 2025; users migrated through early 2026). The two generations are distinguished by host:

- **Current generation:** `a.loopmessage.com/api/v1/*`, raw API-key `Authorization` header without a scheme prefix, sender IDs (not emails) in `sender_name` fields, redesigned error codes, per-organization webhook configuration.
- **Legacy generation:** `server.loopmessage.com/api/v1/*`, `Authorization: <authKey>` + `Loop-Secret-Key: <secretKey>` header pair, email-based sender names, `alert_type`-style webhook payloads (`webhook_id`, `delivery_type`, `group{}`, `speech{}`, `language{}` fields), `/api/v1/auth/initiate/` imessage-link flow.

Message history and active contacts were not migrated between generations. Report the exact active host, paths, headers, fields, tests, fixtures, and any locked package versions. If generation cannot be proven, report `Unknown generation`; low confidence blocks automatic execution. There is no official messaging SDK — integrations are raw REST.

**Unofficial SDKs:** community wrappers (e.g. `Wkasel/loopmessages`, `n8n-nodes-loopmessage`) are not the API generation — when the repository *is* such an SDK, ignore its npm version for generation detection and fingerprint the wire calls instead. The migration object is then the SDK's consumers or bundled example apps, not the wrapper internals; state that interpretation explicitly.

## Capabilities to inventory

Inventory only active behavior, including:

- inbound-first consent and outbound eligibility;
- shared versus dedicated sender behavior;
- sender pools, aliases, and sender IDs;
- text, media, audio, sticker, and location message types;
- message edit (15-minute window) and unsend (2-minute window);
- typing indicators;
- iMessage effects and `reply_to_id` threading;
- SMS/RCS fallback and WhatsApp channel use under the same number;
- status and lifecycle webhooks (`message_inbound`, `message_scheduled`, `message_delivered`, `message_failed`, reaction events; legacy payloads use `alert_type` such as `message_reply`, `inbound_call`, `unknown`);
- webhook retries (up to 30 attempts with ~15s timeout expectations), `webhook_id` deduplication, and payload fields (`event`, `contact`, `message_id`, `service`, `api_version`; legacy: `alert_type`, `webhook_id`, `delivery_type`, `group{}`, `speech{}`, `language{}`);
- per-message `status_callback` and `status_callback_header` fields, `subject`, `timeout`, and `sandbox` contact handling;
- `/api/v1/auth/initiate/` imessage-link/deep-link flow;
- typing and read indicators delivered as a **webhook-response body convention** (`{typing, read}` returned in the webhook response), not a separate API call — a transport-semantics difference to preserve or explicitly change;
- client-side conversation/thread stores and status polling (`/api/v1/message/status/`);
- deep links and opt-in flow (`t.imsg.link` tracker);
- message, conversation, sender, and event identifiers;
- campaigns, groups, audiences, and CRM-specific transport behavior;
- lifecycle, timeout, and error handling.

Only proven capabilities belong in the plan.

## Migration traps

- The host identifies the generation: `server.loopmessage.com` is legacy, `a.loopmessage.com` is current; both use `/api/v1`, so path alone cannot distinguish them.
- `sender_name` requires a sender ID (not an email) in the current generation, including inside webhook payloads.
- Message history and active contacts were not migrated between generations; stored identifiers may not resolve.
- Current-generation auth is a raw API key with no `Bearer` prefix; legacy auth is the `Authorization` + `Loop-Secret-Key` header pair — copying either shape across generations breaks.
- Typing/read receipts are a webhook-response-body convention, not an API surface — do not map them to a Keiki API call without flagging the transport change.
- Status polling and client-side thread stores have no direct Keiki equivalent — Keiki owns conversation state server-side; treat as a redesign decision, not a mapping.
- Consent and outbound-eligibility rules may be product behavior, not provider setup. Sender identity and pooling may also be visible behavior. Do not remove either silently.
- Webhook retries are numerous but bounded; `webhook_id` is the deduplication key.
- LoopMessage now spans iMessage, SMS/RCS, and WhatsApp under one API; do not replace it with an iMessage-only Keiki target unless the approved plan preserves or explicitly excludes every other active channel.
- Any unresolved generation or capability mapping must be a blocker in the plan.
