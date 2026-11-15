# Photon source reference

## Official documentation

Reviewed 2026-11-14. Start with the [Photon LLM index and version indicators](https://photon.codes/docs/llms.txt). Use the matching [Stable Spectrum iMessage guide](https://photon.codes/docs/spectrum-ts/providers/imessage), [Spectrum SDK webhooks](https://photon.codes/docs/spectrum-ts/webhooks.md), [Advanced iMessage Kit](https://photon.codes/docs/advanced-kits/imessage/messages.md), or [Photon 2.0 Beta iMessage guide](https://photon.codes/docs/beta/messaging/imessage.md).

## Detection

- Stable Spectrum signals include `spectrum-ts`, `@spectrum-ts/*`, `spectrum.photon.codes`, and project ID/secret configuration. Cloud `imessage` and macOS `local_imessage` can coexist in one app. Distinguish `@spectrum-ts/imessage`, `@spectrum-ts/imessage-local`, and the earlier `imessage.config({ local: true })` form using the installed version and active entry points. [Stable Spectrum iMessage guide](https://photon.codes/docs/spectrum-ts/providers/imessage)
- Also inspect `@photon-ai/advanced-imessage`, `@photon-ai/advanced-imessage-kit`, `@photon-ai/imessage-kit`, and the legacy iMessage Chat SDK adapter. Confirm direct client calls, an Apple Messages database on a Mac, a hosted line, or a proxy from source configuration and tests. [Legacy iMessage Chat SDK integration](https://photon.codes/docs/integrations/chat-sdk.md), [Advanced iMessage Kit](https://photon.codes/docs/advanced-kits/imessage/messages.md)
- Photon 2.0 Beta signals include `api.photon.codes/v1`, `@photon-ai/api`, `photonhq-api`, `@photon-ai/chat-adapter`, and bearer credentials. Record the actual SDK lockfile version, host, REST paths, credential types, and subscribed transports. Record both generations when active call sites or deployments prove mixed use. [Photon LLM index and version indicators](https://photon.codes/docs/llms.txt)

## Behavior to inventory

- Identify how messages enter each application path. Stable Spectrum may use SDK streams or request-scoped webhooks, with native JSON or Fusor protobuf. Webhook handling via `app.webhook()` does not feed `app.messages`. Photon 2.0 Beta has signed HTTPS webhooks and a Socket.IO event stream with a resume cursor. Record relevant signature checks, deduplication keys, event ordering, reconnect, and replay behavior. [Spectrum SDK webhooks](https://photon.codes/docs/spectrum-ts/webhooks.md), [Beta webhook](https://photon.codes/docs/beta/message-delivery/webhook.md), [Beta WebSocket](https://photon.codes/docs/beta/message-delivery/websocket.md)
- Trace active outbound sends and replies, cloud token renewal versus explicit client tokens, line selection and platform narrowing, group routing, space identifiers, device state, and handling of partial failures or retries. Verify plan and runtime restrictions using the matching surface.
- Inventory active use of attachments and lazy reads, native effects or app cards, edits and unsend, tapbacks, typing, read receipts, groups, and any SMS, WhatsApp, Telegram, or voice features registered alongside iMessage. Check whether conversation history, thread and message IDs, or attachment references are tied to the original project, line, Mac, or application cache.
