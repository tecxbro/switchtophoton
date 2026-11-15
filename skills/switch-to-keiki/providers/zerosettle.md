# ZeroSettle source reference

Use this file only after repository evidence indicates ZeroSettle (the iMessage API at `portal.zerosettle.io`; docs also served at `phonetw.in` and marketed at `zerosettle.io`).

Do not confuse the ZeroSettle iMessage API with the unrelated ZeroSettle payments product (`docs.zerosettle.io`, `github.com/zerosettle` SDKs) — only the iMessage API is a messaging source provider.

## Approved official documentation

- https://phonetw.in/llms.txt
- https://phonetw.in/docs.md (raw markdown mirror of the full docs)
- https://portal.zerosettle.io/docs.md (canonical raw markdown, no auth)

Begin with the official `llms.txt` or `docs.md`. `phonetw.in` serves the same ZeroSettle iMessage API documentation as `portal.zerosettle.io`; treat the portal as the API origin. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md).

## Detection fingerprints

Confirm combinations of:

- API hosts `portal.zerosettle.io` or `phonetw.in` in active code or configuration;
- bearer tokens with `pt_mcp_` prefix sent as `Authorization: Bearer`;
- endpoint paths `/api/imessage/send`, `/api/imessage/broadcast`, `/api/imessage/line`, `/api/imessage/webhook`, `/api/imessage/messages`, `/api/imessage/conversations`, `/api/imessage/reactions`, `/api/imessage/typing`, `/api/imessage/groups`, `/api/imessage/groups/update`, `/api/imessage/groups/leave`, `/api/imessage/videos`, `/api/imessage/messages/delivery`, `/api/imessage/stream-token`, `/api/imessage/stream`, `/api/imessage/profile`, `/api/imessage/availability`, `/api/imessage/agent`, `/account/mcp/token`, `/mcp`;
- environment-variable names containing `ZEROSETTLE`;
- webhook headers `X-ZeroSettle-Signature` (`t=<unix>,v1=<hmac>`), `X-ZeroSettle-Event`, and `User-Agent: ZeroSettle-iMessage/1`;
- payload fields `chat_id` (`iMessage;+;chat…`), `line_id` (`ln_…`), `group_id` (`lg_…`), `video_id` (`vid_…`), `kind`, `effect`, `message.service`, `managed_by`;
- MCP server URL `https://portal.zerosettle.io/mcp`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- ZeroSettle publishes no SDK for the iMessage API — integrations are plain HTTPS and JSON. Report `raw REST, unversioned` when no versioned client exists.
- The API is a single unversioned generation (no `/v1/` prefix). Feature availability varies by account flags and handset client versions rather than API version: SMS fallback is an operator-enabled pilot, and group chats, polls, backgrounds, and videos return `409 *_unsupported` on older clients.
- Multi-line accounts expose `line_id`/`group_id` fields that single-line accounts do not; report which model the repository uses.
- Do not assume `phonetw.in` and `portal.zerosettle.io` are different providers — they serve the same product.

## Capabilities to inventory

Check active use of:

- text, media (inline `image_b64`/`audio_b64`), video (2-step `vid_` upload), polls, effects, and reply-to sends;
- broadcast sends to 1–100 handles with per-recipient results;
- group creation and management (`groups`, `groups/update`, `groups/leave`), group events, and group `chat_id` routing;
- reactions send and receive (`love`, `like`, `dislike`, `laugh`, `emphasize`, `question`, `remove_` prefix);
- typing start/stop, conversation profile (name/photo), and availability checks;
- inbound webhooks (`message.received/sent/failed`, `reaction.*`, `poll.voted`, `background.*`, `group.event`, `typing.*`, `contact.opted_out/opted_in`, `line.ready`), HMAC signature verification, retries, and `(message.id, event)` deduplication;
- SSE live stream (`/api/imessage/stream`) for message, delivery, typing, conversation, opt-out, credits, and group events;
- delivery receipts via poll-only `/api/imessage/messages/delivery` (including `delivered_as_junk`);
- message history, conversation listing and deletion;
- hosted AI agent control (`managed_by`, `/agent` endpoints) — note the hosted agent can consume inbound messages before webhooks;
- MCP server tools (`send_imessage`, `list_messages`, `set_webhook`, `create_api_key`, `set_agent`, etc.);
- SMS fallback behavior, new-contact caps, unanswered-message limits, and opt-out state.

Only proven capabilities belong in the plan.

## Migration traps

- Numbers do not port: contacts see a new number and must re-initiate; existing contacts count as new contacts on the new line until they text first.
- New-contact caps, the 2-unanswered-message rule, and attachment-before-reply restrictions are product-visible behavior that Keiki lines will not reproduce identically.
- STOP opt-outs do not transfer consent; sends to opted-out recipients fail.
- There are no delivered/read webhook events — real receipts are poll-only; SMS fallback always reports `unconfirmed`.
- Your own sends echo back as `message.sent` events; auto-reply logic must filter event types or it loops.
- The webhook secret is shown once and rotates on re-register; signatures cover `"t." + raw_body`.
- `managed_by:"zerosettle"` (the default for line groups) means the hosted agent answers inbound and your webhook is never called — migration must set `managed_by:"api"` first or inbound texts are silently consumed.
- Media is inline base64, not URLs; video costs AI credits and is time/size limited.
- No message edit/unsend and no idempotency-key header; sends serialize per line.
- Re-minting tokens does not revoke old ones, but `DELETE /account/mcp/token` revokes every token on the account.
- Current ZeroSettle features not used by the repository are out of scope.
