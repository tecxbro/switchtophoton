# Choosing the Photon target

Select the Photon surface that most closely matches the repository's current architecture. The migration should feel like a provider replacement, not a platform rewrite.

Before choosing, read:

- Photon documentation index: https://docs.photon.codes/docs/llms.txt
- Photon official skills: https://github.com/photon-hq/skills

| Existing architecture | Preferred Photon target | Use when |
|---|---|---|
| Vercel Chat SDK adapter | `chat-adapter-imessage` | The application already uses the Chat SDK adapter model. |
| TypeScript app with a unified message stream or multi-platform abstraction | `spectrum-ts` through the `spectrum` skill | The app is event/stream based and Spectrum maps cleanly to its transport boundary. |
| Existing HTTP webhook backend | Photon Webhook | The application already receives inbound HTTP events and should retain that shape. |
| REST-based application or non-TypeScript stack | Photon Advanced iMessage HTTP Proxy | Preserving HTTP avoids a language/runtime rewrite. |
| Managed TypeScript iMessage SDK or WebSocket client | `@photon-ai/advanced-imessage-kit` | The app expects a direct managed SDK with real-time events. |
| Local macOS iMessage bridge | `@photon-ai/imessage-kit` | The system intentionally remains self-hosted on a Mac. |
| Existing MCP-native messaging boundary | Photon MCP | The product already uses MCP tools; do not introduce MCP into ordinary backend code. |
| Unified multi-platform messaging abstraction | Spectrum | The existing product needs to preserve a cross-platform provider abstraction rather than only an iMessage transport. |

## Selection rules

1. Preserve the current language, framework, hosting model, and transport shape when possible.
2. Prefer the target that changes the fewest application files.
3. Do not force Spectrum into a simple REST replacement.
4. Do not introduce an SDK into a non-TypeScript application when HTTP provides parity.
5. Do not introduce MCP into ordinary backend code.
6. Do not move a local/self-hosted integration to managed infrastructure without listing that architecture change in the plan.
7. Do not move a managed provider to local Mac infrastructure merely to gain feature parity.
8. If the source provider handles SMS/RCS/WhatsApp as well as iMessage, confirm whether Photon must replace those channels or only iMessage.
9. Select based on capabilities actually used, not the maximum feature list of either provider.
10. Explain the target choice in the plan before execution.

## Photon capability research

After selecting a target:

1. read the corresponding official Photon skill;
2. read current Photon docs for each used source capability;
3. verify identifiers, authentication, event delivery, attachment handling, retries, idempotency, and lifecycle semantics;
4. list any non-equivalence in the plan;
5. do not invent credential names or API methods.

Never place real credentials in committed files. Update only templates, validation, and setup documentation.
