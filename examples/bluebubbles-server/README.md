# BlueBubbles Server — client-facing API contract extract

Extracted from `/tmp/swttest2/bluebubbles-server` (BlueBubblesApp/BlueBubbles-Server,
commit `76d2b2e786c04d7516de089f31be978a68da8083`, `@bluebubbles/server` v1.9.12,
branch `master`).

Scope: the public API contract only — **not** server internals.

- `src/server/api/http/api/v1/httpRoutes.ts` — REST route table (`/api/v1/...`: ping, mac, icloud/findmy, server, fcm, attachment, chat, message + schedule, handle, facetime, contact, backup, webhook).
- `src/server/api/http/api/v1/socketRoutes.ts` — Socket.IO client API (legacy client event surface).
- `src/server/api/http/index.ts`, `passwordAuth.ts`, `authThrottle.ts`, `types.ts`, `constants.ts` — transport bootstrap, password-in-query auth, throttling, `webhookEventOptions` closed enum.
- `middleware/`, `responses/`, `validators/`, `utils.ts`, `routers/webhookRouter.ts` — request/response envelope and input-validation contract.
- `src/server/events.ts` — event-type constants shared by socket pushes, FCM, and webhooks.
- `src/server/types.ts` — `MessageResponse`/`ChatResponse`/`HandleResponse`/`AttachmentResponse` DTOs + `ValidTapback` closed enum.
- `src/server/api/serializers/`, `src/server/api/types/` — response serialization params and send-operation param types (incl. `method: "apple-script" | "private-api"`).
- `src/server/services/webhookService/` + `databases/server/entity/Webhook.ts` — outbound webhook dispatch semantics (15s timeout, ≤1MB response, ≤5 redirects, SSRF guards: `blockPrivateAddresses`/`requireHttps`/`followRedirects`) and the stored webhook record.

Not copied: controllers (`api/interfaces/*`), databases/entities other than Webhook, private-API bridge (`api/privateApi/*`), managers/services internals, UI package.

Note: files keep `@server/...` path aliases and external imports — this is a contract reference, not a buildable subtree.

Known contract quirk found during extraction: `webhookEventOptions` registers `imessage-alias-removed` (singular, `api/http/constants.ts:84`) but the emitter dispatches `imessage-aliases-removed` (plural, `events.ts:29`, fired from `privateApi/eventHandlers/PrivateApiAddressEventHandler.ts:27`) — webhooks subscribed to that event never fire. `scheduled-message-*` events are emitted but not individually subscribable (only via `*`).
