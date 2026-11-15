# Examples — real provider integrations used to dry-run Switch to Keiki

Each directory contains **only the messaging-provider boundary** extracted from a real open-source repository — not the whole app. These slices were produced by running the skill's Phase 1 against the original repos; they document the integration shapes the skill must handle and act as regression fixtures: re-run Phase 1 against a slice and confirm the verdict and flaw detection stay correct.

## Repo shapes covered

| Directory | Source repo | Provider | Shape |
|---|---|---|---|
| `agentphone-webhook/` | johnjacobomega33/agentphone-webhook | AgentPhone | passive webhook sink (ingress-only) |
| `agentphone-mcp/` | AgentPhone-AI/agentphone-mcp | AgentPhone | provider's own MCP server/façade |
| `blatbot/` | aaronblatnoy/blatbot | Inkbox | multi-channel consumer app (mail+SMS+iMessage+voice+A2A+contacts) |
| `claude-code-plugin/` | inkbox-ai/claude-code-plugin | Inkbox | provider's own host-platform plugin (Python) |
| `blooio-mcp/` | Blooio/blooio-mcp | Blooio | provider's own MCP server + REST proxy + OAuth AS |
| `eve-channel-blooio/` | Blooio/eve-channel-blooio | Blooio | provider's own host-platform channel adapter |
| `chat-adapter-linq/` | millionco/chat-adapter-linq | Linq V3 | provider library/adapter (Chat SDK) |
| `linq-imessage-bot/` | saapai/linq-imessage-bot | Linq V3 | consumer bot, raw REST |
| `hermes-linq-plugin/` | linq-team/hermes-linq-plugin | Linq V3 | provider's own host-platform plugin (Python) |
| `dsh-imessage/` | photon-hq/dsh-imessage | Photon | multi-surface plugin (Spectrum SDK + Dashboard API + OAuth device flow) |
| `hermes-agent/` | nousresearch/hermes-agent (Photon template) | Photon | deployment template / wrapper-image |
| `eve-agent/` | photon-comm/eve-agent | Photon Beta | provider-official deployment template |
| `fridge-agent/` | undivisible/fridge-agent | Chert | consumer app (iMessage + FaceTime mixed) |
| `ha-bluebubbles/` | helv-io/ha-bluebubbles | BlueBubbles | consumer integration (self-hosted Mac server) |
| `bluebubbles-server/` | BlueBubblesApp/bluebubbles-server | BlueBubbles | provider's own server (public API surface) |
| `loopmessages/` | Wkasel/loopmessages | LoopMessage | unofficial community SDK |
| `Loopmessage-SDK/` | calebnewtonusc/Loopmessage-SDK | LoopMessage | unofficial community SDK (current host) |
| `textbettingaimessage/` | mattypark/textbettingaimessage | Linq + Sendblue | multi-provider consumer app (primary/secondary adapters + outbox) |
| `pickle-assistant/` | darrenR89/pickle-assistant_paypal-hackathon | Sendblue | consumer app, env-gated channel, polling inbound |
| `zerosettle-ghl/` | eliascroesus/zerosettle-ghl | ZeroSettle | outbound-only relay + adjacent CRM vendor (GHL marked `[GHL-BOUNDARY]`) |
| `PillPal/` | soumiksen/PillPal | Chert | consumer app — Messaging API + CLI/LiveKit FaceTime |
| `StudyBuddy/` | rayan-sharma/StudyBuddy | Chert | consumer app — Shared API (`app.trychert.com`) + `facetime://` links, polling inbound |
| `Unburden/` | Waymond9056/Unburden | Chert | consumer app — FaceTime REST + `chert dev` LiveKit bridge, env-gated demo |
| `HackEmory-2026/` | jzps333/HackEmory-2026 | Chert | consumer app — 3 surfaces: FaceTime REST, Shared API, signed webhook |
| `TriageX/` | mustafadev123/TriageX | Chert | consumer app — dual transport (Shared API polling + console webhook), `ftk_` keys |
| `ladybug/` | IsaacThoman/ladybug | Chert | consumer app — FaceTime `/calls` + Shared `/shared-messages`, masked recipients |
| `FixCam/` | digitalshare/FixCam | Chert | consumer app — Messaging API + SSE + CLI/LiveKit FaceTime |
| `agent-messenger-platform/` | Andersonscat/agent-messenger-platform | AgentPhone | consumer app — Python SDK voice-agent lifecycle + transcript polling |
| `OpenMausBot/` | milind-soni/OpenMausBot | AgentPhone | MCP consumer — hosted `mcp.agentphone.ai` tool source |
| `nicks-stack/` | nickvasilescu/nicks-stack | AgentPhone | deployment template — in-repo webhook bridge + `agentphone-mcp` stdio server |
| `eliza/` | elizaOS/eliza (sparse) | Blooio | platform — provider boundary duplicated across monorepo packages, v2+v4 mixed |
| `sim/` | simstudioai/sim (sparse) | AgentPhone | catalog/plugin host — dual registry variants (`agentphone` + OAuth `agentphone_v2`) |

## Phase-1 verdicts observed during dry-runs

- **Executable with approved changes**: `agentphone-webhook`, `dsh-imessage`, `chat-adapter-linq`, `linq-imessage-bot`, `hermes-linq-plugin`, `eve-agent`, `pickle-assistant`, `textbettingaimessage` (partial)
- **Infeasible as specified**: `agentphone-mcp` (provider's own product), `blatbot` (voice/A2A/contacts), `claude-code-plugin` (Inkbox voice/A2A/contacts/vault), `blooio-mcp` (façade wire contract), `eve-channel-blooio` (full surface; adapter-retirement path exists), `fridge-agent` (FaceTime), `ha-bluebubbles` (cold outbound + echo), `bluebubbles-server` (provider's own server → do-not-migrate), `loopmessages` + `Loopmessage-SDK` (published wrapper SDKs), `zerosettle-ghl` (cold outbound)
- **Blocked on evidence**: `hermes-agent` (provider boundary inside pinned upstream image), `loopmessages` first pass (migration object undefined), `eliza` + `sim` (sparse checkouts — boundary layers outside checkout scope)
- **Round 4 additions**: Chert repos converge on the same reference gaps (Shared API `app.trychert.com`, CLI/LiveKit bridge, `ftk_` key reuse, SSE contract); AgentPhone adds hosted-MCP-consumer and voice-transcript-polling shapes; Blooio adds dual-generation v2/v4 wire shapes and monorepo-platform duplication

Skill flaws these dry-runs exposed and fixed: repo-shape taxonomy (provider's own product, host-platform plugins, templates, wrapper-images, env-gated integrations), raw-REST generation labels, webhook-contract consolidation, substrate/adapter-retirement check, external-ingress retirement, dedup-key mapping, execution-access `unknown` status, core-vs-secondary capability criticality, and per-provider reference corrections (Linq webhook variants, LoopMessage auth/path drift, Photon template fingerprints, Blooio OpenAPI URL, AgentPhone façade surface, Sendblue polling fingerprints, BlueBubbles self-detection guard).
