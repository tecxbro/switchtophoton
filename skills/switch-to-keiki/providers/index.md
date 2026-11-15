# Source-provider index

Detect the source provider and exact generation from repository evidence before selecting Keiki. Then read only the matching provider file.

## Agent-readable documentation policy

Use only official agent-readable documentation linked by this skill:

1. Official `llms.txt`
2. Official `llms-full.txt`
3. Official Markdown files ending in `.md`

Do not directly link to normal documentation homepages, ordinary HTML pages, dashboards, marketing pages, API explorers, Swagger pages, unofficial mirrors, or blog posts.

Exceptions to the OpenAPI and repository-root restrictions:

- An **official OpenAPI document published by the provider itself** (`.json`/`.yaml`) is permitted when registered for that provider — it is the provider's machine-readable contract of record.
- An **official product repository** (SDK monorepo, skills repo, docs repo) is permitted when registered — link the specific relevant file or directory inside it where possible rather than the bare root.

This restriction applies to source-provider detection.

Keiki target verification follows [`../keiki-evidence.md`](../keiki-evidence.md), which permits:

- exported public Keiki package types;
- versioned public API documentation;
- the official Keiki OpenAPI document at `https://onkeiki.com/openapi.json`;
- official Keiki hosted-service API and event contracts;
- official Keiki agent-facing documentation (`llms.txt`, `llms-full.txt`, `/setup.md`) and Agent Skills when published;
- official Keiki implementation source when public evidence is incomplete or conflicting;
- official tests when they exist and are relevant;
- official Keiki product repositories.

Do not apply the source-provider documentation restriction in a way that prevents inspection of current official Keiki public-contract or implementation evidence.

Do not treat undocumented internal implementation as a supported public Keiki capability.

When a provider does not publish an approved agent-readable source:

- rely on the repository's lockfiles, imports, API calls, payloads, fixtures, and tests;
- report that no approved agent-readable documentation was available;
- do not assume the latest API generation;
- treat low-confidence provider or version detection as a planning blocker.

Following a link from an approved `llms.txt` is allowed only when the linked resource is itself an official agent-readable source permitted by this policy. Do not substitute an ordinary page.

## Documentation retrieval policy

Documentation retrieval status must be one of:

- retrieved;
- published but inaccessible from the current environment;
- confirmed missing;
- retrieved but insufficient.

A sandbox, DNS, redirect, timeout, or tool failure must not be described as a genuine HTTP 404 or as proof that documentation does not exist.

When retrieval fails:

1. try the registered `llms.txt`;
2. try the registered `llms-full.txt`;
3. retry using another available fetch mechanism;
4. record the exact failure;
5. continue using repository evidence;
6. do not invent documentation contents.

## Provider routing

| Provider | Read | Approved official agent-readable sources | Strong repository fingerprints |
|---|---|---|---|
| Sendblue | [`sendblue.md`](./sendblue.md) | `https://docs.sendblue.com/llms.txt` | `sendblue`, `chat-adapter-sendblue`, Sendblue API hosts, `sb-api-key-id`, `/api/send-message` |
| Linq | [`linq.md`](./linq.md) | `https://docs.linqapp.com/channel/imessage/llms.txt`, `https://docs.linqapp.com/channel/imessage/llms-full.txt`, `https://docs.linqapp.com/channel/whatsapp/llms.txt` (WhatsApp channel only) | `@linqapp/sdk`, `chat-adapter-linq`, `/api/partner/v2`, `/api/partner/v3`, `X-LINQ-INTEGRATION-TOKEN`, bearer auth, `event_id`, `LINQ_*`, `whatsapp.messages.api.linqapp.com` |
| Photon | [`photon.md`](./photon.md) | `https://docs.photon.codes/docs/llms.txt`, `https://photon.codes/llms.txt`, `https://photon.codes/llms-full.txt`, `https://photon.codes/docs/skill.md`, `https://github.com/photon-hq/skills` | `spectrum-ts`, `@spectrum-ts/*`, `@photon-ai/*`, `chat-adapter-imessage`, `spectrum.photon.codes`, `api.photon.codes`, `imessage-swagger.photon.codes`, `mcp.photon.codes`, `SPECTRUM_*`, `PHOTON_*`, `IMESSAGE_*` |
| Inkbox | [`inkbox.md`](./inkbox.md) | `https://inkbox.ai/llms.txt`, `https://inkbox.ai/docs/llms.txt`, `https://inkbox.ai/docs/all.md`, `https://github.com/inkbox-ai/inkbox` | `@inkbox/sdk`, `inkbox` (PyPI/Cargo), `inkbox.ai/api/v1`, `X-API-Key`, `ApiKey_`, `INKBOX_API_KEY`, `*.inkboxwire.com` |
| Project Blue | [`project-blue.md`](./project-blue.md) | `https://api.tryprojectblue.com/llms.txt`, `https://api.tryprojectblue.com/llms-full.txt`, `https://api.tryprojectblue.com/llms/*.md`, `https://docs.tryprojectblue.com/llms.txt` | `api.tryprojectblue.com`, `/send-api-message`, `/get-messages-api`, `proj_` keys, `pbm_`/`pbg_`/`ftc_` IDs, `@tryprojectblue/dialer`, `/api/mcp` |
| Blooio | [`blooio.md`](./blooio.md) | `https://blooio.com/llms.txt`, `https://blooio.com/llms-full.txt`, `https://blooio.com/integrations/api.md`, `https://docs.blooio.com/llms.txt`, `https://docs.blooio.com/llms-full.txt`, `https://api.blooio.com/v4/openapi.json` | `@blooio/sdk`, `eve-channel-blooio`, `api.blooio.com`, `/v2`, `/v3`, `/v4` paths, `BLOOIO_API_KEY`, `x-blooio-signature` |
| LoopMessage | [`loopmessage.md`](./loopmessage.md) | `https://loopmessage.com/llms.txt`, `https://loopmessage.com/apidocs/` | `a.loopmessage.com` (current), `server.loopmessage.com` (legacy), `iauth.loopmessage.com`, `t.imsg.link`, `mcp.loopmessage.com`, `/api/v1/message/*` |
| AgentPhone | [`agentphone.md`](./agentphone.md) | `https://docs.agentphone.ai/llms.txt`, `https://docs.agentphone.ai/llms-full.txt`, `https://agentphone.ai/llms.txt`, `https://agentphone.ai/openapi.json` | `agentphone`, `agentphone-mcp`, `api.agentphone.ai`, `mcp.agentphone.ai`, `sk_live_` bearer, `AGENTPHONE_API_KEY`, `X-Sub-Account-Id` |
| Chert | [`chert.md`](./chert.md) | `https://docs.trychert.com/llms.txt`, `https://docs.trychert.com/llms-full.txt`, `https://docs.trychert.com/*.md` | `@trychert/sdk`, `@trychert/facetime`, `chert-sdk`, `console.trychert.com/api/v1`, `app.trychert.com/api/v1` (`/shared-messages`, `/lines`), `facetime.trychert.com`, `x-chert-signature`, `chert dev`, `chert-bridge-`, `chert_bridge_ready`, `CHERT_*` |
| ZeroSettle | [`zerosettle.md`](./zerosettle.md) | `https://phonetw.in/llms.txt`, `https://phonetw.in/docs.md`, `https://portal.zerosettle.io/docs.md` | `portal.zerosettle.io`, `phonetw.in`, `pt_mcp_` tokens, `/api/imessage/*`, `X-ZeroSettle-Signature`, `ZEROSETTLE_*` |
| BlueBubbles | [`bluebubbles.md`](./bluebubbles.md) | `https://docs.bluebubbles.app/server/llms.txt`, `https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/developer-guides/rest-api-and-webhooks.md`, `https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/SUMMARY.md` | self-hosted server URL, `/api/v1`, server auth, webhook events, local Mac dependencies |

## Unknown or custom providers

The registered files above are preferred references, not a closed list. The skill supports any messaging provider.

If the user names a provider that has no registered file:

1. treat the user-provided name as the detection hypothesis and confirm or correct it from repository evidence;
2. identify the provider from locked package metadata, imported API shape, host ownership, deployment configuration, and wire payloads;
3. discover official agent-readable documentation for that provider (`llms.txt`, `llms-full.txt`, or official `.md` pages) and use it only when it satisfies this policy;
4. report exact evidence, generation result, and confidence;
5. inventory capabilities from active repository behavior;
6. do not execute on low-confidence detection without explicit risk acceptance;
7. note the missing registered reference file in the plan so the gap is visible rather than silent.

A provider name or comment alone is not sufficient — always confirm active runtime or test evidence. Do not confuse similarly named products. Sendblue is not Sendinblue/Brevo. ZeroSettle's iMessage API (`portal.zerosettle.io`/`phonetw.in`) is unrelated to the ZeroSettle payments product (`docs.zerosettle.io`). Photon as a *source* provider is unrelated to Keiki as the *target* — Keiki iMessage lines may themselves be Photon-backed, which is a target-side detail, not source detection.

Detection cautions:

- **Transitive dependencies are not usage.** Aggregator and provider SDKs (e.g. Chert) drag other registered providers into lockfiles. A package in a lockfile is not proof — require an import, call, host, header, env var, or payload fingerprint in application code.
- **Multi-vendor repos are normal.** Only integrations that send or receive messages are provider candidates; CRMs, analytics, and webhook sources are adjacent scope, not the provider.
- **Webhook-ingress-only integrations exist.** An app may receive provider webhooks without ever calling the provider API — its fingerprints are route paths, signature headers, payload fields, and webhook-secret env vars, not SDK packages or send endpoints.
- **Provider's own repos self-match.** When the repository is the provider's own codebase (server, SDK, docs, website), consumer fingerprints match its own source — check authorship/ownership before classifying repo shape.
- **Evidence freshness.** Provider files record contracts observed at research time; providers ship breaking webhook/API changes. When repository wire evidence contradicts a provider file, trust the wire evidence and report the doc drift — and when editing a provider file after a dry-run finding, prefer precise observed contract details over generic descriptions.
