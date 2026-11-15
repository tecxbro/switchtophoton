# Switch to Keiki verification

This record covers the Agent Skill itself. The [migration verification protocol](../skills/switch-to-keiki/verification.md) covers a customer application after the skill runs.

## Baseline audit

The comparison starts at [Switch to Photon on main](https://github.com/tecxbro/switchtophoton/tree/f77e7fb1f32ea9b1dd0e957b167c2a027adde62a) and the initial [Switch to Keiki branch](https://github.com/tecxbro/switchtophoton/tree/cdd4ef67276fdc1a543bfeef1c898b71328d9d7e).

| Baseline control or flaw | Updated control |
|---|---|
| The first Keiki branch retained the phases and shortened the detailed evidence contract. | Restored all 12 workflow steps, separate closed and open value maps, architecture and lifecycle selection, cutover details, and the full verification report. |
| The original restricted provider evidence to a small set of Markdown/index formats. | Prefer machine-readable evidence and allow official OpenAPI, rendered contracts, package exports and pinned source when they resolve actual behavior. Record retrieval and evidence separately. |
| The original imposed remote execution access checks even for local work. | Confirm writability for the requested destination and check permissions for remote actions only if in scope. |
| The original reviewed a commit-to-HEAD diff, which misses staged, unstaged and untracked files. | Review the complete tree delta from the starting commit and explicitly inspect untracked files. |
| The original approval rule relied on a phrase appearing in the latest message. | Require the actual user's explicit approval of the identified plan. Quoted text and retrieved content cannot approve it. |
| The original selected among transport products. Keiki's boundary is an agent and its line. | Prove line identity, turn ownership, ingress, egress, media and event lifecycle separately. Check first-contact eligibility, event correlation, native operations and conversation continuity. |
| A successful request or compile could hide a package or live behavior gap. | Smoke-import exact dependency versions in an isolated app. Separate code checks, signed fixtures, provider or Keiki sandbox, and recipient-observed delivery. |

## Reproduce the evaluation

1. Clone the listed upstream revision into an isolated worktree. Record the source commit, checkout state, available test commands, versions and exact files under consideration. Review package scripts before running them. Keep sample keys and message payloads local and fake.
2. Run the baseline checks. Give a fresh coding agent the skill, the checkout, and a realistic migration request for the active integration. Keep expected findings out of the request. Verify Phase 1 leaves the app and Git refs untouched.
3. For an executable offline plan, authorize only that plan. Compare the emitted diff to upstream. Compile and run the upstream checks and the migration-boundary fixture tests. For a blocked plan, corroborate the active source paths and the exact target contract, and check that the agent left affected code and behavior intact.
4. Record failure cases and correct the skill. Replay the affected scenario when an instruction or capability mapping changes. Recheck the documentation, package and line evidence when revisiting a live migration.

## Upstream evaluations

Checked on 2026-11-14 with separate agents given the skill, a pinned checkout and an offline request. A fixture test proves the app and mock boundary exercised by that test. A documented Keiki operation still needs eligible-line and device evidence for live parity.

| App and source | Baseline | Scope reached and evidence |
|---|---|---|
| [Linq AI Agent example, `1326d04`](https://github.com/linq-team/ai-agent-example/tree/1326d04cd9bd15dde05216bbf689f2d11b42803f) | `npm ci --ignore-scripts --no-audit --no-fund` and `npm test`; TypeScript compiled, 11 checks passed | Read-only independent plan blocked full parity. The app reacts to or replies to unaddressed group activity and can rename, remove members and set a group icon. A direct reply can combine native threading and an effect. File effects, native text decorations, Name and Photo Sharing cadence, VCF behavior, source-controlled mark-read and the receiving line need separate mappings. Verified no application or ref changes during planning. |
| [TextDM LangChain coach, `4d88158`](https://github.com/Princeu3/textdm/tree/4d881582e8ec73751cc87862bf0e5a726338e233) | `python test_textdm.py` in an isolated environment with its local dependencies; seven existing checks passed | Read-only independent plan blocked full parity. An ASGI replay used the actual app with mocked model and HTTP boundaries, 10 model calls and 18 fake outbound requests. Unaddressed groups, reaction-triggered model runs, and cron sends with empty history are active. Replayed media, six Tapbacks, authorization, deduplication and other provider registrations. No app or ref edits. TextDM is a public third-party LangChain integration with no declared license in the checked revision. |
| [Vercel Nitro iMessage agent, `e6f2d5b`](https://github.com/vercel-labs/nitro-imessage-agent-template/tree/e6f2d5b6b938e629aca51e2baa40bb1bac21706b) | `corepack pnpm install --frozen-lockfile --ignore-scripts`, `corepack pnpm exec nitro prepare` and `corepack pnpm typecheck` passed. The upstream Vitest command found zero tests. | Independent agent first blocked a full Sendblue switch. It then implemented an explicitly approved local direct-text trial on an isolated branch, preserved Nitro, the durable workflow and the model, prompt and tools, gated the old Sendblue receiver out of Keiki trial mode, and used fake credentials. Build, typecheck, lint and 21 new fixture tests passed. Known live gaps include actual inbound transport identity, sender eligibility, group and Apple Account addressing, mark-read parity, typing cleanup and device delivery. |
| [Photon Advanced iMessage Kit, `53b09ba`](https://github.com/photon-hq/advanced-imessage-kit/tree/53b09ba70cbae5e55b06b84c2bb6a86d699776b3) | Static verification of `examples/message-sticker.ts`, `examples/message-reply-sticker.ts` and `modules/attachment.ts` | Independent plan blocked full parity. The direct SDK sends a standalone native sticker and a positioned sticker on a returned message GUID. Keiki has documented file sends and Tapbacks. Its public turn contract does not establish native sticker mode, target GUID and part mapping, placement, scale or rotation. |
| [ZeroSettle GHL worker, `95dc99f`](https://github.com/eliascroesus/zerosettle-ghl/tree/95dc99f73da281fe5012b799455cb398f1d54464) | Static verification of `src/index.js`, `src/lib.js`, `src/queue.js` and `wrangler.toml` | Independent plan blocked full parity. GHL-triggered first contact and queued follow-ups select a sender line without an inbound turn. The Keiki notice route requires an existing conversation. Import of the ZeroSettle line and equivalence for per-line history, quotas and refusal handling remain unverified. The checked third-party revision declares no license. |

### Nitro code trial

The generated application adds a signed Nitro route at `/api/webhooks/keiki`, backed by a local durable workflow. It validates the signature, freshness, agent and turn bindings, then queues eligible plain-text inputs. A worker claims the turn, calls the original reply generator and tools, sends with a stable idempotency key, and reports completion after the work settles. The Sendblue route remains the default until trial mode is enabled. The original generator, tool definitions and dependency lockfile matched upstream.

In addition to the 21 fixtures, a loopback run booted the compiled Nitro app and the real local Vercel Workflow runtime. A deny-by-default HTTP interceptor returned fake responses for the AI gateway and Keiki, and the application executed its actual `getCurrentTime` tool. A signed text dispatch and replay produced one typing request, one formatted reply with a stable action key, and one completion. A held-back turn completed without a model call or send. The app rejected unsigned dispatch and disabled the Sendblue receiver in trial mode. The parent independently reran the build artifact's loopback check, typecheck, lint and fixture suite.

### Findings applied to the skill

- The Linq case exercises effects and thread replies on one bubble, decorated character ranges, and two contact identity flows. Added compound-payload checks and separated native Name and Photo Sharing from VCF and dynamic cards. Linq's demo also exposes `invisible_ink` where its public API lists `invisible`. The plan now requires observed source normalization or an explicit uncertainty.
- The LangChain case uses different deduplication keys for ordinary callbacks and reactions and starts new model sends from reaction events. Updated the LoopMessage plan with event-specific identity, response context, scheduler and provider transcript checks.
- The Nitro case uses a durable worker that can persist job arguments. Added the documented worker-signed Keiki credential to the raw recipe so the dispatch bearer stays out of workflow state. The code trial uses a local durable filesystem for claim and cancellation state. Deployments with more than one worker or host need a proven shared coordination and retry contract.
- A clean Node 23.11.0 import of `@onkeiki/ai-sdk@0.1.8` with its pinned `@onkeiki/channels@0.1.6` failed with a missing `isRecipientReplyRequiredError` export. The raw HTTP recipe avoids those dependencies. Pin and import-test any candidate adapter in the application's runtime. [Package evidence](../skills/switch-to-keiki/keiki-evidence.md#published-package-findings)
