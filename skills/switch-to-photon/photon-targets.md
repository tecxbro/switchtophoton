# Choosing the Photon target

Select Photon only after the source provider, exact source generation, active capabilities, and current architecture are known. The target must preserve the existing implementation with the smallest safe change.

Consult:

- Photon agent-readable documentation: https://docs.photon.codes/docs/llms.txt
- Photon official Agent Skills: https://github.com/photon-hq/skills
- Photon evidence and capability verification: [`photon-evidence.md`](./photon-evidence.md)

## Separate transport decisions

Choose each layer independently while preserving the existing application architecture by default.

| Application layer | Photon options |
|---|---|
| Inbound HTTP events | Photon Webhook |
| Inbound unified TypeScript stream | Spectrum |
| Inbound managed SDK WebSocket stream | Advanced iMessage Kit |
| Inbound Socket.IO events through an HTTP-oriented integration | Photon HTTP Proxy |
| Outbound REST | Photon HTTP Proxy |
| Outbound unified messaging API | Spectrum |
| Outbound managed TypeScript SDK | Advanced iMessage Kit |
| Local Mac messaging | Self-hosted iMessage Kit |
| MCP-native actions | Photon MCP |
| Vercel Chat SDK adapter | `chat-adapter-imessage` |
| Attachment send or retrieval over REST | Photon HTTP Proxy |
| Attachment handling inside an existing Spectrum stream | Spectrum |
| Attachment handling through a direct managed SDK | Advanced iMessage Kit |

The final target may contain one or more surfaces.

Select the architecture that produces the smallest safe migration rather than automatically preferring the fewest surfaces.

## Selection rules

1. Prefer the smallest architectural change.
2. Preserve the current programming language.
3. Preserve the hosting model when possible.
4. Preserve the inbound and outbound transport shape.
5. Do not introduce MCP into an ordinary backend.
6. Do not force Spectrum into a REST or webhook application solely because Spectrum supports the required capabilities. Select Spectrum only when the source already uses a unified message-stream abstraction, or when the plan proves that adopting Spectrum creates a smaller and safer migration than preserving the existing REST and webhook boundaries.
7. Do not move a managed provider to a local Mac without approval.
8. Do not move a local provider to managed infrastructure without identifying the architecture change.
9. Do not remove non-iMessage channels unless they are explicitly included in the approved scope.
10. Select based on capabilities proven to be active, not either provider's maximum feature list.
11. Load the corresponding official Photon Agent Skill after selecting the target.
12. Select one or more Photon surfaces based on the smallest safe complete architecture. A mixed target may be preferred when it preserves existing inbound, outbound, attachment, hosting, adapter, or lifecycle boundaries with fewer application changes.
13. For installable Photon packages, record the exact planned package version. During verification, confirm that the exact lockfile-resolved installed version matches the approved planned version.
14. For hosted Photon services, record the service, endpoint, public API or event contract, documentation source, and retrieval date. Do not invent a hosted-service version when none is published.
15. Inspect exact public methods, endpoints, event contracts, types, closed values, open-value rules, and applicable error behavior before assigning confidence.
16. Never remove an active capability to fit the initially selected target. Reconsider the Photon architecture first.
17. Do not claim that one target makes identifiers, attachments, or routing less direct without exact public API evidence.
18. Compare source failure behavior with the synchronous, asynchronous, webhook, Socket.IO, WebSocket, or REST behavior applicable to the selected Photon surfaces.
19. Verify recipient-line identity and multi-number routing before claiming line parity.
20. Architecture preservation remains the default. A capability supported by Spectrum or Advanced iMessage Kit does not by itself justify replacing an existing REST or HTTP-webhook boundary.
21. Any transport change must identify:

    - why the existing Photon REST, Socket.IO, or webhook surface is insufficient;
    - every application module affected;
    - the lifecycle introduced by the new transport;
    - the additional verification required;
    - why the change is safer than preserving the current architecture.
22. Prefer the Photon architecture that produces the smallest safe migration.

    Compare:

    - application files changed;
    - transport changes;
    - hosting changes;
    - runtime and dependency changes;
    - lifecycle complexity;
    - credential complexity;
    - verification difficulty;
    - operational behavior.

    Do not prefer one Photon surface merely because it has broad capability coverage.

## Mixed target decision record

When more than one Photon product is selected, the plan must include:

| Responsibility or capability | Required Photon surface | Why the combination is safer or smaller | Why another selected surface is insufficient for this boundary | Shared identifier or credential | Event or connection owner | Lifecycle owner |
|---|---|---|---|---|---|---|

The plan must also define:

- duplicate-event and duplicate-listener prevention;
- retry behavior;
- ambiguous-result handling;
- disconnect and reconnect behavior when applicable;
- webhook acknowledgement and retry behavior when applicable;
- shutdown behavior.

Mixed targets are blocked until every applicable responsibility and lifecycle row is complete.

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

After selection, confirm identifiers, authentication, event delivery, attachments, retries, idempotency, lifecycle, closed and open values, error semantics, credential names, package versions, and hosted-service contracts from the matching official Photon evidence. Do not invent APIs or copy broad Photon documentation into this repository.
