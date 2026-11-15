# Project Blue source reference

Use this file only after repository evidence indicates Project Blue.

## Approved official documentation

- https://api.tryprojectblue.com/llms.txt
- https://api.tryprojectblue.com/llms-full.txt
- https://docs.tryprojectblue.com/llms.txt
- Official per-section Markdown under `https://api.tryprojectblue.com/llms/*.md`

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary HTML docs pages, `help.tryprojectblue.com` articles, the OpenAPI `.json` file, dashboard pages, and the MCP endpoint are not approved linked sources.

## Detection fingerprints

Confirm combinations of:

- hosts `api.tryprojectblue.com` (REST, docs, MCP), `app.tryprojectblue.com` (dashboard, OAuth issuer, dialer token mint), `docs.tryprojectblue.com`, `help.tryprojectblue.com`;
- unversioned hyphenated endpoint paths such as `/send-api-message`, `/send-group-message`, `/send-typing-indicator`, `/send-reaction`, `/get-effects`, `/get-messages-api`, `/get-message-api/:message_handle`, `/get-lines`, `/request-line`, `/api-check-imessage-availability`, `/create-external-contact`, `/set-contact-card`, `/get-flows`, `/enroll-flow`, FaceTime `*-facetime-call-api` paths, and `/api/mcp`;
- `Authorization: Bearer` authentication with `proj_` + 64-hex API keys or OAuth 2.1 access tokens (both arrive as Bearer — token format alone does not distinguish them);
- environment-variable names `PB_API_KEY` and `PROJECT_BLUE_API_KEY` in documentation examples;
- npm package `@tryprojectblue/dialer` and MCP client configuration pointing at `api.tryprojectblue.com/api/mcp`;
- ID prefixes `pbm_` (message handles), `pbg_` (group IDs), `ftc_` (FaceTime call UUIDs), `chat…` group chat IDs;
- request/response fields `mediaAttachmentUrl`, `audioAttachmentUrl`, `enableAiVoiceMemo`, `shouldAutoCreateContact`, `customFields`, `idempotencyKey`, `effect`, `messageHandle`, `messageType`, `deduped`, `lineId`/`pb_line_id`/`line_id`.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or REST generation

- There is no official messaging SDK in any language — messaging integrations are raw REST. Report `raw REST, unversioned` when no versioned client exists.
- The REST API is unversioned (no `/v1` prefix); the only versioned path is the dialer token mint at `app.tryprojectblue.com/api/v1/dialer/token`.
- Distinguish REST+webhook integrations, MCP client configuration (`/api/mcp`, OAuth 2.1), the browser dialer SDK (voice only), FaceTime call endpoints, Workflows enrollment, and CRM-connected contact models.
- Account tier matters: trial accounts get a shared line, verified destinations only, and gated endpoints — detect whether the repository targets trial or paid behavior.
- Do not infer the integration generation from current documentation.

## Capabilities to inventory

Check active use of:

- 1:1 iMessage sends with automatic SMS fallback and `messageType` channel resolution;
- group sends (2–32 recipients, participant-set identity, no create step, `pbg_` group IDs);
- message list and single-message reads (`message_handle` correlation, `media_attachment_url`, `voice_attachment_url`);
- typing indicators (existing thread required) and reactions (6 tapbacks plus `remove`, inbound messages only, `partIndex`);
- send effects (4 bubble, 8 screen — iMessage only);
- attachments via public `mediaAttachmentUrl`/`audioAttachmentUrl` (one file, mutually exclusive) and `enableAiVoiceMemo`;
- lines (`get-lines`, `request-line` manual provisioning), iMessage availability checks, and per-line identity;
- contact models — CRM-connected (HighLevel/GHL, HubSpot, Close) versus external contacts with `customFields`;
- contact cards (set/get/share) and line readiness states;
- Workflows (`get-flows`, `enroll-flow`, `cancel-flow-runs`) and call logs;
- FaceTime Audio calls (feature-gated, `ftc_` UUIDs) and the PSTN dialer only when active code proves use;
- webhooks (`message.inbound`/`message.outbound`, FaceTime events, lead forms) — note they are dashboard-configured with no management API;
- MCP tool usage mirroring the REST surface.

Only proven capabilities belong in the plan.

## Migration traps

- `POST /send-api-message` returns no message ID — correlation requires polling `/get-messages-api` or webhooks; the target must offer equivalent correlation.
- Silent dedupe: identical text to the same number within 1 hour returns `200 {deduped:true}` without sending; out-of-range `idempotencyKey` values are silently ignored.
- Webhooks are fire-and-forget: no retries, no replay, no signature/HMAC, auto-disabled after 20 consecutive failures; plan polling reconciliation.
- Delivery status is binary (`pending`|`delivered`) and weak; there are no read receipts, delivery-failure webhooks, message edits, unsends, or reply-threading parameters.
- Per-line rate pacing and new-destination caps queue rather than reject; the API returns success.
- Trial versus paid divergence changes endpoints, line IDs, and available features.
- Group semantics differ: no create call, participant-set identity, async resolution, `service:null`, and whole-group SMS fallback when any participant lacks iMessage.
- iMessage-only features degrade or fail on SMS/RCS (`effect` → 400, tapbacks error on outbound, typing needs an existing thread).
- Inbound attachments are not in webhook payloads — fetch the message; PDFs, documents, and files over 25 MB are unretrievable via API; HEIC unsupported.
- Naming is inconsistent (`lineId` vs `pb_line_id` vs `line_id`, `phone` vs `phoneNumber`, `messageHandle` vs `message_handle`).
- Line provisioning is a manual queue (`request-line`), not instant DID purchase; lines are BlueBubbles-backed Macs whose capabilities depend on server version and Private API state.
- STOP-keyword opt-out handling is off by default and exact-match only, with no blocked-list API.
- FaceTime and dialer features are entitlement-gated (`FACETIME_NOT_ENABLED`, `dialer_subscription_required`); verify entitlements before promising parity.
- Error envelopes are inconsistent across endpoints; rate limits are counted pre-auth by token string.
- MCP-configured integrations may carry no API key in the environment — detect `api/mcp` configuration and OAuth issuer references.
- CRM/Zapier side-channels (HubSpot automation payload variants, `shouldAutoCreateContact` writes) mean the provider boundary may extend beyond messaging.
- Current Project Blue features not used by the repository are out of scope.
