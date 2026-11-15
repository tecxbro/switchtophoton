# AgentPhone source reference

Use this file only after repository evidence indicates AgentPhone.

## Approved official documentation

- https://docs.agentphone.ai/llms.txt
- https://docs.agentphone.ai/llms-full.txt
- https://agentphone.ai/llms.txt
- https://agentphone.ai/openapi.json

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Mintlify Markdown pages under `docs.agentphone.ai` ending in `.md` are permitted; `agentphone.ai/docs/*` may mirror the same content — treat `docs.agentphone.ai` as canonical.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `agentphone`, `agentphone-mcp`, `agentphone-web-sdk`, `@agentphone/chat-sdk-adapter`, `makecall`, `crewai-agentphone`, or `openai-agents-agentphone`;
- API hosts `api.agentphone.ai` or `mcp.agentphone.ai`;
- bearer authentication with `sk_live_` keys and `AGENTPHONE_API_KEY` environment variables;
- `X-Sub-Account-Id` header usage for sub-account scoping;
- endpoint patterns including `/v1/messages`, `/v1/agents`, `/v1/numbers`, `/v1/conversations`, `/v1/contacts`, `/v1/calls`, `/v1/webhooks`, `/v1/register`, `/v1/agents/{id}/webhook` (self-registration returning a fresh signing `secret`), `/integrations/whatsapp/*`;
- Python SDK signals: `agentphone`/`AsyncAgentPhone` imports, `voice_mode="hosted"`, `numbers.buy`, `calls.list`/`get_transcript` polling, `agents.set_webhook`, `construct_event` webhook verification;
- hosted-MCP-consumer signals: `mcp.agentphone.ai/mcp` as a remote tool source inside an MCP-client catalog (the repo consumes the provider's tools rather than calling its REST API);
- unauthenticated `/v0/agent/sign-up` and `/v0/agent/verify` self-signup calls;
- webhook headers `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-ID`, `X-Webhook-Event`;
- webhook-secret environment variables such as `AGENTPHONE_WEBHOOK_SECRET` and dedicated webhook receiver routes (`/webhook`, `/webhooks/agentphone`) — a webhook-ingress-only integration may have zero SDK/REST fingerprints; the route + secret + provider name is then the fingerprint set;
- identifier prefixes `agt_`, `num_`, `msg_`, `conv_`, `ct_`, `call_`, `rcs_`, `grp_`, and `ext:` external IDs;
- **provider-façade fingerprints** — when the repository *is* AgentPhone's own MCP server or API proxy rather than a consumer: `agentphone-mcp` package name, `server.json` MCP registry manifest, `/.well-known/mcp.json`, `mcp.agentphone.ai` host, MCP tool names (`send_message`, `make_call`, `buy_number`, `manage_contact`, `get_messages`, webhook CRUD, `get_usage`), JSON-RPC/stdio+Streamable-HTTP transports, OAuth proxy code, `sk_live_`/`sk_test_` key handling, and signed internal event-ingress routes (`/internal/events/*` with Standard-Webhooks `whsec_` HMAC verification).

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration. Note: the channel (SMS/MMS/iMessage/WhatsApp/RCS/voice) is often undeterminable from a passive webhook receiver — record it as provisioning-time scope, not a detection failure.

## Detect the exact SDK or REST generation

- Read the exact installed SDK version from lockfiles or package metadata (`agentphone` on npm or PyPI).
- For raw REST, report the exact active host, base path (`/v1`, `/v0`, `/integrations/whatsapp`), endpoints, headers, and wire fields.
- Distinguish the Fern-generated TypeScript SDK, the Python SDK, the MCP server boundary, the Vercel Chat SDK adapter, and raw REST.
- `channel` on `POST /v1/messages` accepts only `whatsapp` or `rcs` overrides; SMS, MMS, iMessage, and voice are selected by number/agent configuration, not by that field.
- Do not infer the installed generation from current documentation.
- **Registry/catalog dual variants:** app platforms may register two entries for the same provider (e.g. a legacy `agentphone` block and an OAuth-based `agentphone_v2` successor linked by `sunset.replacedBy` fields). Enumerate every registry entry, record each variant's auth mode and disposition, and do not collapse them into one detection result.

## Capabilities to inventory

Check active use of:

- SMS, MMS, iMessage line types, WhatsApp, RCS, and voice channels;
- agent and number provisioning, including iMessage line subscription state;
- direct sends, group sends (`recipients`), media attachments (`media_url`/`media_urls`, 1–20), threaded replies, and `send_style` iMessage effects;
- reactions send and receive, typing indicators, chat background, and read receipts;
- delivery and failure status — note there is no dedicated delivery-status webhook; status is polled from message history (`status`, `failureReason`, `errorCode`, `deliveredChannel`) and `409 DELIVERY_UNCONFIRMED` is possible;
- inbound webhooks (`agent.message`, `agent.call_ended`, `agent.reaction`, `agent.contact_shared`, `number.released`), signature verification, retries (non-voice only, 8 attempts), and `X-Webhook-ID` deduplication;
- webhook contract details observed in the wild: HMAC-SHA256 `sha256=` over `timestamp.body` with `X-Webhook-Timestamp` ~5-minute window, `X-Webhook-Event`/`X-Webhook-ID` headers, per-webhook `channel` enum `sms|mms|imessage`, `contextLimit`/`timeout` registration params, and **out-of-order/late delivery** — real integrations keep per-conversation timestamp watermarks in addition to ID dedup;
- voice transcript semantics: `agent.message` events with `channel:"voice"` carry in-progress transcript chunks; `agent.call_ended` carries the final transcript + analysis — integrations polling `calls.list`/`get_transcript` instead are on a different (polling) contract;
- voice calls — hosted LLM mode versus webhook turn mode, recordings, transcripts, SIP trunks;
- 10DLC registration, sub-accounts (`X-Sub-Account-Id`), and STOP/HELP compliance state;
- number rental lifecycle, `expiresAt` release, and `number.released` events;
- WhatsApp Embedded Signup connection state and template usage;
- history polling, conversation state, and contact capability lookups;
- **façade/MCP-server capabilities** (when the repo is AgentPhone's own MCP/API product): the full MCP tool surface as individually named tools, JSON-RPC method/error semantics, bearer-token formats issued or verified, `server.json`/`.well-known/mcp.json` manifest contract, OAuth flows, pass-through REST proxy routes (`/v1/*`), signed internal event ingress (`message-received` wake events), outbound webhook-subscription CRUD, usage/billing endpoints, number rental/provisioning, voice-call control, and contacts CRM — each is a capability row, not just messaging flow.

Only proven capabilities belong in the plan.

## Migration traps

- Numbers are rented, not owned: migration means new numbers, and all contacts must re-initiate — iMessage is inbound-locked and outbound lines cap new contacts per day.
- iMessage lines are separate card-billed subscriptions provisioned asynchronously; they are not portable to Keiki lines.
- Webhook secrets rotate on every save; voice webhook turns are synchronous request/response with no retry queue.
- Field naming is inconsistent across surfaces (`agentId` vs `agent_id`, webhook camelCase vs REST snake_case); do not assume interchangeability.
- Sub-account scoping changes resource visibility; IDs are not portable across scopes.
- RCS is concierge-onboarded and deliberately absent from OpenAPI/SDK types; raw HTTP is required.
- Apple Messages for Business availability is early-access and unverified in the public docs.
- **When the repository is AgentPhone's own product** (its MCP server, SDK, or API proxy), migration inverts the repo's purpose: Keiki MCP exposes org operations rather than messaging primitives, so MCP↔MCP is a role inversion — the honest verdict is infeasible-as-specified/do-not-migrate unless the user redefines the migration object.
- **When the repository merely consumes `mcp.agentphone.ai/mcp`** as a hosted tool source (MCP-client catalog entry), the inverse problem applies: there is no Keiki hosted messaging-MCP to swap the tool source to — Keiki MCP is org-ops. Treat as a disqualifying boundary unless the user approves descoping the MCP integration or Keiki-side gap requests cover a messaging-MCP surface. Tool inventories discovered dynamically at runtime cannot be fully proven from repo evidence — cap detection confidence on the tool surface and mark it unresolved.
- Current AgentPhone features not used by the repository are out of scope.
