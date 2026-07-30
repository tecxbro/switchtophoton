# Choosing the Photon target

Select Photon only after the source provider, exact source generation, active capabilities, and current architecture are known. The target must preserve the existing implementation with the smallest safe change.

Consult:

- Photon agent-readable documentation: https://docs.photon.codes/docs/llms.txt
- Photon official Agent Skills: https://github.com/photon-hq/skills

| Existing architecture | Photon target |
|---|---|
| Vercel Chat SDK adapter | Photon `chat-adapter-imessage` |
| Unified TypeScript message stream | Spectrum |
| Existing HTTP webhook backend | Photon Webhook |
| REST application or non-TypeScript stack | Photon HTTP Proxy |
| Managed TypeScript SDK or WebSocket client | Advanced iMessage Kit |
| Local Mac integration | Self-hosted iMessage Kit |
| Existing MCP-native product | Photon MCP |
| Existing multi-platform transport abstraction | Spectrum |

## Selection rules

1. Prefer the smallest architectural change.
2. Preserve the current programming language.
3. Preserve the hosting model when possible.
4. Preserve the inbound and outbound transport shape.
5. Do not introduce MCP into an ordinary backend.
6. Do not force Spectrum into a simple REST migration.
7. Do not move a managed provider to a local Mac without approval.
8. Do not move a local provider to managed infrastructure without identifying the architecture change.
9. Do not remove non-iMessage channels unless they are explicitly included in the approved scope.
10. Select based on capabilities proven to be active, not either provider's maximum feature list.
11. Load the corresponding official Photon Agent Skill after selecting the target.
12. Use only the selected Photon product unless the approved plan proves that multiple surfaces are required.

## Target-specific routing

| Target | Preserve |
|---|---|
| `chat-adapter-imessage` | Existing Vercel Chat SDK adapter contracts and state flow |
| Spectrum | Existing unified or multi-platform message/event abstraction |
| Photon Webhook | Existing inbound HTTP webhook architecture and application handlers |
| Photon HTTP Proxy | Existing REST boundary and non-TypeScript runtime |
| Advanced iMessage Kit | Existing managed TypeScript SDK or WebSocket lifecycle |
| Self-hosted iMessage Kit | Existing local Mac trust, hosting, and operational model |
| Photon MCP | Existing MCP-native tool boundary only |

After selection, confirm identifiers, authentication, event delivery, attachments, retries, idempotency, lifecycle, and credential names from the matching official Photon skill. Do not invent APIs or copy broad Photon documentation into this repository.
