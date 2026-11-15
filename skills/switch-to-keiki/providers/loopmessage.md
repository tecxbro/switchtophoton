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
- authentication shape: current generation uses `Authorization: <API key>` with a raw organization-level key and no `Bearer`/`Basic` prefix; legacy used HTTP Basic `base64(authKey:secretKey)`;
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
- **Legacy generation:** `server.loopmessage.com/api/v1/*`, HTTP Basic `authKey:secretKey`, email-based sender names, older webhook payloads.

Message history and active contacts were not migrated between generations. Report the exact active host, paths, headers, fields, tests, fixtures, and any locked package versions. If generation cannot be proven, report `Unknown generation`; low confidence blocks automatic execution. There is no official messaging SDK — integrations are raw REST.

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
- status and lifecycle webhooks (`message_inbound`, `message_scheduled`, `message_delivered`, `message_failed`, reaction events);
- webhook retries (up to 30 attempts), `webhook_id` deduplication, and payload fields (`event`, `contact`, `message_id`, `service`, `api_version`);
- deep links and opt-in flow (`t.imsg.link` tracker);
- message, conversation, sender, and event identifiers;
- campaigns, groups, audiences, and CRM-specific transport behavior;
- lifecycle, timeout, and error handling.

Only proven capabilities belong in the plan.

## Migration traps

- The host identifies the generation: `server.loopmessage.com` is legacy, `a.loopmessage.com` is current; both use `/api/v1`, so path alone cannot distinguish them.
- `sender_name` requires a sender ID (not an email) in the current generation, including inside webhook payloads.
- Message history and active contacts were not migrated between generations; stored identifiers may not resolve.
- Current-generation auth is a raw API key with no `Bearer` prefix — copying legacy Basic-auth code breaks.
- Consent and outbound-eligibility rules may be product behavior, not provider setup. Sender identity and pooling may also be visible behavior. Do not remove either silently.
- Webhook retries are numerous but bounded; `webhook_id` is the deduplication key.
- LoopMessage now spans iMessage, SMS/RCS, and WhatsApp under one API; do not replace it with an iMessage-only Keiki target unless the approved plan preserves or explicitly excludes every other active channel.
- Any unresolved generation or capability mapping must be a blocker in the plan.
