# Photon source reference

Use this file only after repository evidence indicates Photon.

Photon has two coexisting product generations that must not be mixed: **Stable** (Spectrum, `spectrum-ts`, Advanced iMessage kits, `spectrum.photon.codes`, `SPECTRUM_*`/`IMESSAGE_*` credentials) and **Beta** (Photon 2.0 platform, `api.photon.codes/v1`, `@photon-ai/api` clients, `pho_*` credentials). Detect which generation every active code path uses before planning.

## Approved official documentation

- https://docs.photon.codes/docs/llms.txt
- https://photon.codes/llms.txt
- https://photon.codes/llms-full.txt
- https://photon.codes/docs/skill.md (version-selection contract)
- Official per-page Markdown under `https://photon.codes/docs/**/*.md` and `https://docs.photon.codes/docs/**/*.md`
- https://github.com/photon-hq/skills (official Agent Skills: `skills/imessage`, `skills/spectrum`, `skills/chat-adapter-imessage`, `skills/photon-cli`)
- Product repositories under `github.com/photon-hq/*` (each may publish its own `llms.txt`)

Begin with the official `llms.txt`. Follow only relevant official agent-readable references that also satisfy the policy in [`index.md`](./index.md). Ordinary HTML documentation pages, Swagger UI, registry pages, and unofficial mirrors are not approved sources.

## Detection fingerprints

Confirm combinations of:

- packages or imports such as `spectrum-ts`, `@spectrum-ts/*` (`core`, `imessage`, `imessage-local`, `telegram`, `slack`, `whatsapp-business`, `terminal`, `express`, `hono`, `fastify`, `elysia`), `@photon-ai/advanced-imessage` (`/http`, `/grpc`), `@photon-ai/advanced-imessage-kit`, `@photon-ai/imessage-kit`, `@photon-ai/chat-adapter-imessage`, `chat-adapter-imessage`, `@photon-ai/chat-adapter`, `@photon-ai/api`, `photonhq-api`, `@photon-ai/mcp`, `@photon-ai/cli`, `@photon-ai/whatsapp-business`, `@photon-ai/convex`, `@photon-ai/dashboard-api`;
- hosts `spectrum.photon.codes`, `api.photon.codes`, `app.photon.codes`, `auth.photon.codes`, `mcp.photon.codes`, `imessage-swagger.photon.codes`, `imessage.spectrum.photon.codes`, `line-*.imsg.photon.codes`, `whatsapp-business.spectrum.photon.codes`, `sip.spectrum.photon.codes`;
- environment variables `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET`, `SPECTRUM_WEBHOOK_SECRET`, `SPECTRUM_SIGNING_SECRET`, `SPECTRUM_<PROVIDER>_*`, `IMESSAGE_TOKEN`, `IMESSAGE_PROJECT_ID`, `IMESSAGE_PROJECT_SECRET`, `IMESSAGE_SERVER_URL`, `IMESSAGE_API_KEY`, `IMESSAGE_WEBHOOK_SECRET`, `PHOTON_API_KEY`, `PHOTON_API_TOKEN`, `PHOTON_PROJECT_ID`, `PHOTON_AGENT_USER_ID`, `PHOTON_WEBHOOK_SECRET`, `PHOTON_API_URL`, `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_APP_SECRET`;
- endpoint paths `/projects/{id}/webhooks/`, `/projects/{id}/lines/`, `/users/{id}/redirect`, `/api/v1/{message,attachment,chat,contact,handle,icloud,facetime,server}/*` (legacy kit), `/send`, `/send/file`, `/messages`, `/chats`, `/groups`, `/polls`, `/attachments` (HTTP proxy), `/v1/projects/{id}/{users,spaces,messages,attachments,webhooks,lines}` (Beta API), `/api/projects`, `/api/projects/{id}`, `/api/projects/{id}/platforms[/toggle]`, `/api/projects/{id}/spectrum/users` (Dashboard API);
- authentication shapes: HTTP Basic `base64(projectId:projectSecret)` (Spectrum API), Bearer project secret/token, `X-API-Key` + Socket.IO auth (legacy kit), `Authorization: Bearer base64("serverUrl|apiKey")` (HTTP proxy), `x-server-url`/`x-api-key` (legacy MCP), `pho_ask_`/`pho_sk_`/JWT bearer (Beta), OAuth device flow (RFC 8628 device authorization — `auth.device.code`/`token` grants, Better Auth client, `client_id=photon-cli`, scopes `openid profile email`);
- webhook headers `X-Spectrum-{Event,Webhook-Id,Timestamp,Signature}` (`v0=` HMAC), Standard-Webhooks `webhook-{id,timestamp,signature}` (`whsec_`), `X-Photon-Signature`/`X-Photon-Timestamp` (kit bridge);
- payload fields `spc-msg-` message IDs, Spectrum `space.id` (`any;-;+15550100`), chat GUIDs (`iMessage;-;+…`, `any;-;…`, `any;+;…`, `chat…`), `PhotonEventMap` event names, `pho_prj_`/`pho_sk_`/`pho_ask_`/`pho_usr_` ID prefixes, `message.content.type` discriminators.

A name alone is insufficient. Confirm active calls, handlers, fixtures, or deployment configuration.

## Detect the exact SDK or API generation

Photon integrations span many generations. Report each active surface separately; a repository may mix them.

### Stable generation surfaces

- **`@photon-ai/imessage-kit`** — self-hosted local macOS SDK; reads `~/Library/Messages/chat.db` + AppleScript; repo archived; v3 requires macOS 26+, v2.x for older macOS; no credentials.
- **`@photon-ai/advanced-imessage-kit`** — legacy hosted SDK (deprecated); HTTP operations + Socket.IO events against a macOS server; REST `/api/v1/*`; often paired with the `photon-hq/webhook` bridge (`X-Photon-Signature`) or HTTP Proxy.
- **`@photon-ai/advanced-imessage` 1.x** — pre-2.0 gRPC-only SDK.
- **`@photon-ai/advanced-imessage` 2.x** — current low-level hosted SDK; HTTP transport by default (`createHttpClient`/`createClient`) plus optional `/grpc` entrypoint (`createGrpcClient`, `subscribeEvents`, `events.catchUp`); inbound via Spectrum-registered webhooks only on HTTP.
- **`spectrum-ts` / `@spectrum-ts/*`** — unified multi-platform SDK; `app.messages` async iterable, `space.send`, `message.react/reply/edit/unsend`, platform narrowing via `imessage(app)`; majors moved 1.x→12.x — major version matters; official skills pin 12.2.0.
- **Spectrum Webhooks / `app.webhook()`** — hosted signed HTTP inbound; one top-level `messages` event; two signature generations (`signingSecret` `v0=` vs `standardSigningSecret` `whsec_` + Standard-Webhooks headers); `schemaVersion` `normalized-events.v1` vs `raw-inbound.v1`.
- **Spectrum API `spectrum.photon.codes`** — management plane (webhooks, lines, users, platforms, billing); HTTP Basic; `{succeed,data}` envelope; no public send-message endpoint.
- **Advanced iMessage HTTP Proxy `imessage-swagger.photon.codes`** — hosted REST facade over kit servers plus Socket.IO events; bearer = `base64("serverUrl|apiKey")`.
- **Legacy MCP `mcp.photon.codes/imessage`** — archived; `x-server-url`/`x-api-key` headers.
- **Chat adapters:** unscoped `chat-adapter-imessage` v1 → `@photon-ai/chat-adapter-imessage` v2/v3 (retired path; `createiMessageAdapter`, `IMESSAGE_*` env) → these are Stable-era.

### Beta (Photon 2.0) surfaces

- **`api.photon.codes/v1`** — platform REST API; `pho_ask_` account keys, `pho_sk_` project keys, JWT; User/Space/Message model; `idempotency-key` header; attachment `409 ATTACHMENT_NOT_READY` + `Retry-After`.
- **`@photon-ai/api`, `photonhq-api` (PyPI/crates), Go client** — generated clients, semver <1.0.
- **`@photon-ai/chat-adapter`** — Beta multi-platform Chat SDK adapter (`createPhotonAdapter`, `PHOTON_*` env, Standard-Webhooks or WebSocket gateway inbound).
- **`@photon-ai/mcp` + `mcp.photon.codes/mcp`** — Beta MCP, OAuth, `PHOTON_API_KEY`.
- **`@photon-ai/cli` 3.x** — Beta CLI; v2.x is the Stable "CLI 1.0" (`@legacy` tag).
- **Photon Apps, Convex component, Beta OAuth (`auth.photon.codes`)** — supporting surfaces.
- **Dashboard API `app.photon.codes/api/*`** — project/platform/user management (`/api/projects`, `/api/projects/{id}/platforms[/toggle]`, `/api/projects/{id}/spectrum/users`). **Generation is ambiguous**: it serves the Stable project/secret/`spectrum/users` shared-vs-dedicated model *and* Beta artifacts — classify by the sibling surfaces in use (Spectrum `projectSecret`+users ⇒ Stable-era; `pho_*` keys ⇒ Beta), and report `Mixed surfaces` when both appear.

Report `Exact SDK version`, `Known REST API generation`, `Known webhook generation`, `Mixed generations`, or `Unknown generation` per surface. Do not infer the installed generation from current documentation; spectrum-ts majors, adapter pins, and kit versions all changed over time.

## Capabilities to inventory

Check active use of, per detected surface:

- unified stream consumption (`app.messages`) versus webhook/Socket.IO/WebSocket/HTTP-REST inbound;
- text, markdown, rich links, voice messages, contacts, polls, custom content;
- attachments — send builders, inbound lazy `read()`/`stream()`, by-GUID fetch, download params, blurhash, local-path requirements;
- direct and group messaging — chat creation, participants, rename, avatar, leave, membership events;
- reactions/tapbacks (emoji aliases, custom emoji, part indices) and removals;
- message effects (bubble/screen), text effects, formatting ranges;
- edits, unsends, scheduled messages;
- typing indicators, read state and granular receipts (`dateRead`/`dateDelivered`/`datePlayed`/`shareStatus`);
- replies and threading (`replyTo` guid/partIndex, `selectedMessageGuid`);
- delivery states, send errors, status callbacks;
- chat backgrounds, iMessage Apps/mini-app cards, contact-card sharing, native metadata;
- polls create/vote/unvote/options;
- line and server selection (`clients[]`, `x-photon-server`, dedicated tokens, `space.phone`, line APIs);
- multi-platform routing (iMessage, local iMessage, WhatsApp/WhatsApp Business, Telegram, Slack, Terminal, Voice SIP, SMS, email);
- history, catch-up (`events.catchUp(since)`), polling, search;
- FaceTime, Find My, iCloud features on legacy kit surfaces;
- webhook signature schemes, acknowledgement, retries, deduplication, ordering;
- idempotency (`x-idempotency-key`, `idempotency-key`), application retries, rate handling;
- MCP tool boundaries, CLI-managed resources, dashboard/OAuth provisioning.

Only proven capabilities belong in the plan.

## Migration traps

- **Identifier zoo:** chat GUIDs differ per surface (`iMessage;-;+…`, `any;-;…`, `any;+;…`, `chat…`, Spectrum `space.id`); message IDs differ (raw iMessage `guid` vs `spc-msg-` UUID vs Spectrum `message.id` vs Beta IDs); line identity lives in `space.phone`, `clients[].phone`, `x-photon-server`, or is implicit. Stored IDs are likely durable application dependencies.
- **Spectrum abstraction loss:** `Space`/`User`/`Message` normalize away provider IDs; migrating out requires mapping `space.id`, `message.id`, `sender.id`, `platform` back to raw handles; `local_imessage` and `imessage` are distinct platforms.
- **Four distinct webhook signature schemes:** Spectrum legacy `X-Spectrum-Signature: v0=`, Standard-Webhooks `webhook-*` headers with `whsec_`, kit bridge `X-Photon-Signature: v0=`, and legacy-kit `X-API-Key`/Socket.IO auth. Secret env names drift (`SPECTRUM_WEBHOOK_SECRET` vs `SPECTRUM_SIGNING_SECRET` vs registration `signingSecret`/`standardSigningSecret`) — do not conflate them.
- **Attachment readiness differs:** Beta returns `409 ATTACHMENT_NOT_READY` + `Retry-After`; Spectrum webhook attachments are metadata-only with lazy fetch; legacy `downloadAttachment` has resize/force params; `imessage-kit` needs local paths.
- **Group semantics:** Spectrum cloud group creation requires a dedicated Business line; group chat IDs must never be hand-constructed; chat-adapter v3.2.1 had a real wrong-line bug when GUIDs are reused across lines — line identity is subtle.
- **iMessage-only features may not map:** tapbacks, bubble/screen effects, native polls, chat backgrounds, mini-app cards, contact-card share, voice messages, granular read receipts, Digital Touch/embedded media, Find My/FaceTime/iCloud, scheduled messages.
- **Provisioning-model shift:** per-user OAuth device flows + shared-line pools (`type:'shared'|'dedicated'` users, `assignedPhoneNumber`, `space.phone='shared'` sentinel) map to Keiki org API keys + per-deployment paid lines — there is no sender registry or shared-pool routing; the Keiki shared number uses a join-code UX instead. Credential replacement is detach-then-attach (brief downtime), not staged prepare/activate.
- **Dashboard API generation ambiguity:** `app.photon.codes` management endpoints appear with both Stable and Beta artifacts — do not file them under one generation; report the sibling surfaces and mark generation `Mixed surfaces` when both appear.
- **Transport/lifecycle asymmetry:** Spectrum is a long-lived stream with token renewal; advanced-imessage gRPC holds client streams needing `catchUp` after disconnect; HTTP transport is outbound-only with webhook inbound; legacy kit auto-reconnects over Socket.IO; HTTP Proxy is stateless REST+Socket.IO; MCP is a tool-call boundary, not a messaging transport.
- **Retired surfaces:** unscoped `chat-adapter-imessage`, `@photon-ai/chat-adapter-imessage`, `photon-hq/mcp-legacy`, `photon-hq/imessage-kit` (archived), `advanced-imessage-kit` (deprecated), advanced-imessage 1.x gRPC-only.
- **Stable↔Beta mixing:** `pho_prj_` prefixes and `pho_*` credentials vs UUID project+secret; `api.photon.codes/v1` vs `spectrum.photon.codes`; `PHOTON_*` vs `SPECTRUM_*`/`IMESSAGE_*` env vars; different thread/ID models.
- **Hosted vs self-hosted:** legacy kit needs a macOS server you run; `imessage-kit` needs Full Disk Access and macOS 26 for v3; HTTP Proxy/MCP/Spectrum cloud are hosted; advanced-imessage HTTP can point at a self-hosted middleware.
- **Keiki line-provider note:** Keiki iMessage lines may themselves be Photon-, Blooio-, or Linq-backed; group chats require dedicated `photon`/`blooio` lines. A Photon→Keiki migration does not preserve the underlying provider boundary — verify group-chat and line-kind support in the approved plan.
- Current Photon features not used by the repository are out of scope.
