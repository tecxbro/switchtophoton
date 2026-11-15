# iMessage-only gaps to document or build

The order reflects impact observed in public repo audits, not an exhaustive
Keiki internal inventory. Some issues require a product change; docs alone
cannot grant an endpoint or a line capability.

| Priority | Gap | Source behavior affected | What would resolve it |
| --- | --- | --- | --- |
| 1 | Independently addressed sends and lifecycle | Flux long-lived send, Inkbox recipient-targeted tools, LoopMessage scheduler, other direct senders | Public route/eligibility contract for new vs known recipients, sender selection, scope, consent, idempotency, receipt correlation and deadlines. If not offered, document the distinction from a notice and when retained transport is necessary. |
| 1 | Exact native delivery metadata and IDs | Linq/Blooio fallback discrimination and model behavior, durable Sendblue replies | Public fixtures for transport service vs identity channel, sender line, group participant/auth scope, reply IDs, accepted vs delivered/read/failed and whether complete receipts/replay exist. |
| 1 | Group admin and context | Linq/Blooio rename, icon, member removal; Inkbox group authorization | Publish supported read/member/admin operations, events, permissions and backend line matrix, or explicitly document reply-only bounds. Verify two groups sharing members and rejected wrong-line actions. |
| 2 | Explicit read and typing controls | Linq/Blooio mark-read, side-effect order, typing behavior | Separate mark-read command from read-receipt events and automatic policy. Document start/clear/timeout, failure, group and fallback rules with fixtures. |
| 2 | Native decorations, effect composition and effect aliases | Linq can attach effect and reply anchor together, attach effect to image and apply range styles/animations | Current external messages explicitly disallow reply target + effect. Specify if/when combination, effects on media, UTF-16 formatting/animations and exact wire values are exposed. Confirm via device. |
| 2 | Native contact-sharing controls | Linq native share cadence and VCF flow | Document native contact-card share control and line support, VCF upload vs native sharing, timing/recipient prerequisites and observable outcomes. |
| 3 | Native stickers | Rich source/private integrations can treat sticker placement/removal as actions | No public action identified. Document deliberate non-support, or publish placement/reply target, asset format, line eligibility, expiry and remove/replace semantics. A PNG message or tapback does not close this gap. |
| 3 | Native feature edge cases | Custom tapbacks and removal, group replies, voice-note presentation, native polls/background/location | Publish canonical value/request fixtures and line/client limits; mark supported only where the exact public operation and iOS outcome are proved. |

Primary target references: [Channel matrix](https://onkeiki.com/docs/channels.md),
[external harness](https://onkeiki.com/docs/external-harness.md),
[SDK](https://onkeiki.com/docs/sdk.md), [public OpenAPI](https://onkeiki.com/openapi.json).
