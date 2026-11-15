# Source-provider index

Identify the active source and API generation from repository evidence, then read each matching reference. Several companies use similar names, and a single app can have more than one active integration.

| Source | Reference | Strong repository fingerprints |
|---|---|---|
| Linq | [linq.md](./linq.md) | `api.linqapp.com`, `/api/partner/v2`, `/api/partner/v3`, `X-LINQ-INTEGRATION-TOKEN` |
| Photon | [photon.md](./photon.md) | `spectrum-ts`, `@photon-ai/chat-adapter-imessage`, Photon iMessage Kit or webhook code |
| Sendblue | [sendblue.md](./sendblue.md) | `api.sendblue.com` or `api.sendblue.co`, `sb-api-key-id`, `/api/send-message` |
| Inkbox | [inkbox.md](./inkbox.md) | `inkbox.ai/api/v1/imessage`, `@inkbox/sdk`, `imessage.received` |
| Blooio | [blooio.md](./blooio.md) | `api.blooio.com`, `/v2/api/chats` or `/v4/messages`, `X-Blooio-Signature` |
| Project Blue | [project-blue.md](./project-blue.md) | `api.tryprojectblue.com`, Project Blue credentials and event payloads |
| LoopMessage | [loopmessage.md](./loopmessage.md) | `server.loopmessage.com` or `a.loopmessage.com`, `/api/v1`, `message_inbound` |
| AgentPhone | [agentphone.md](./agentphone.md) | `api.agentphone.ai/v1`, `agentphone` SDK, `agent.message` |
| Chert | [chert.md](./chert.md) | `console.trychert.com/api/v1`, `x-chert-tenant`, `lead_reply` |
| ZeroSettle / Phonetwin | [zerosettle.md](./zerosettle.md) | `phonetw.in` or `portal.zerosettle.io` with `/api/imessage`, `X-ZeroSettle-Signature` |
| BlueBubbles | [bluebubbles.md](./bluebubbles.md) | Self-hosted `/api/v1`, message or chat `guid`, `new-message`, Private API |

## Source evidence

Start with the primary links in the provider reference. Prefer official Markdown, `llms.txt`, OpenAPI, package exports and versioned docs. Use official rendered docs where they carry the contract and consult upstream release source or tests when public evidence leaves an important behavior ambiguous. Match the evidence to the installed or deployed generation.

Record the official source, access date, revision when available, and whether it was retrieved, inaccessible, confirmed missing or insufficient for the question. Record the actual retrieval failure when applicable. Use app code, saved events and tests to fill gaps, with provenance and confidence. An unsuccessful fetch leaves the documentation status uncertain. Never infer a generation from the current docs alone.

For an unknown or custom provider, trace the same evidence from the repo and find the closest official contract. Identify the exact host and package before using a similarly named reference. Leave any required behavior with unresolved source semantics blocked.
