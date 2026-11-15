# Verification: real repositories, synthetic traffic

These experiments prove only the boundaries listed. Do not deploy the adapters
or turn this report into an “all providers migrate” claim. No live API calls,
provider keys, phone traffic, installs, or model calls are needed. Executable
commands use Node 24 and Python 3, with upstream Git repositories checked out
at the exact commits below. Only the first two rows are source-provider
behavioral fixtures. A mock response is not evidence of physical iMessage
delivery or Apple rendering.

| Public source | Pinned revision | What was verified |
| --- | --- | --- |
| [Linq AI Agent Example](https://github.com/linq-team/ai-agent-example/tree/1326d04cd9bd15dde05216bbf689f2d11b42803f) | `1326d04` | Cold plan before/after; ran actual Linq V3 webhook handler and candidate Keiki text-only boundary. Four local tests compare app inputs, fan-out/order, duplicate handling, routing/authorization, quiet suppression and unknown send. Full parity blocked. |
| [Photon Flux](https://github.com/photon-hq/flux/tree/59ba68a5e95e3c1a97fc31dc4a2f6fe49a34ce40) | `59ba68a` | Cold plan before/after; ran actual FluxClient, production callback, split helper and memory with mock gRPC/model. Candidate turn worker matched 5 invocations, 7 ordered bubbles and resulting memory; separate assertions cover duplicate, wrong route, independent-send/media exclusions and ambiguous send. It does not run a LangChain model or migrate the Flux service enrollment. |
| [Sendblue / Vercel Nitro](https://github.com/vercel-labs/nitro-imessage-agent-template/tree/e6f2d5b6b938e629aca51e2baa40bb1bac21706b) | `e6f2d5b` | Cold source review: Chat SDK adapter 0.2.0, SDK 3.9.0, Workflow 4.2.4. A retryable job with a stored Thread ID cannot send after the Keiki turn expires. Preserve Redis subscription state and model/tool steps; use a durable dispatch handoff, not a new untracked task. Exact pinned adapter callbacks still need verification. |
| [Blooio AI Agent Example](https://github.com/Blooio/ai-agent-example/tree/733cbfb785222f1f8119d232c9196ea2df529f58) | `733cbfb` | Cold source review: direct V2 REST, optional base override; group classifier, explicit mark-read, member hydration, rename and avatar block full replacement. Group reply is not group administration. |
| [Open Instinct / Inkbox](https://github.com/mariagorskikh/open-instinct/tree/2e5e71b72622d1262e212da7deb0e785bd95facd) | `2e5e71b` | Cold source review: patched SDK 0.7.13; durable ingress, security-critical membership hydration and independently addressed tools. Preserve shared Inkbox SMS/email/voice/A2A paths. |
| [textdm / LoopMessage](https://github.com/Princeu3/textdm/tree/4d881582e8ec73751cc87862bf0e5a726338e233) | `4d88158` | Cold source review: provider-selectable, newer LoopMessage host, separate reaction event and target IDs, structured transcript and independent-send tools. No deployed default inferred. |
| [AgentPhone Chat SDK adapter](https://github.com/AgentPhone-AI/chat-sdk-adapter/tree/e9b858573e68d799905991026fc7888ccf4e7732) | `e9b8585` | Adapter-only source review: 0.1.0 dispatches inbound message, reaction and call-ended; calls may become messages. Replacing the adapter globally would remove voice/SMS as well. No consuming deployment inferred. |
| [BlueBubbles Server](https://github.com/BlueBubblesApp/bluebubbles-server/tree/76d2b2e786c04d7516de089f31be978a68da8083) | `76d2b2e` | Producer-only source review: 1.9.12, REST and socket routes, local Mac chat database, Private API and explicit read events. An external Keiki turn is not this transport/history server. No consuming deployment inferred. |
| [Hugging Face smolagents server](https://github.com/huggingface/smolagents/tree/96f33faaf028479119ec8d34507b47694cf14e34/examples/server) | `96f33fa` | Greenfield control, not a provider migration. Executed the actual upstream `chat()` function with a synthetic model and checked preserved text/reply behavior. No live model/MCP calls. |

Project Blue, Chert and ZeroSettle have provider-contract playbooks, not pinned
app audits. AgentPhone and BlueBubbles have upstream component reviews, not
pinned consuming-app audits. Runnable source-provider comparisons are limited
to Linq and Flux. Full release readiness also requires source-specific rich-message,
routing and test-line/iPhone verification.

## Reproduce

Check out each linked pin in a separate directory. Do not run its setup scripts,
CLI or server; the tests load selected code from the named immutable commit:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
LINQ_FIXTURE_REPO=/path/to/ai-agent-example node --test benchmarks/linq-boundary.test.mjs
FLUX_FIXTURE_REPO=/path/to/flux node benchmarks/flux-boundary.mjs
SMOLAGENTS_FIXTURE_REPO=/path/to/smolagents python3 benchmarks/smolagents_boundary.py
```

## What the cold runs changed

- The old bundle had the approval gate and general inventory, but missed a concrete
  Flux fingerprint and did not elevate “reply target + effect” to a required combined-action check. The revised bundle requires explicit combined-action negatives,
  maps Flux's local/remote ownership, and treats old callback lifetime as blocking.
- V3 example field is `data.chat_id` (not a nested `data.chat.id`). Model-facing
  `content` is not equivalent to raw text. A Keiki `sms` identity channel does not
  by itself distinguish iMessage from fallback.
- “ACK with 202” was made an example, not a protocol requirement. Keiki allows any
  2xx after acceptance, and durable acceptance while available is app-owned. The
  revised guide makes the DB commit ↔ workflow-start crash window explicit.
- Unrecognized docs pages are retried via primary sources, not interpreted as
  missing features. Fresh public external harness, channel, SDK, OpenAPI and Linq
  docs were obtained on 2026-11-15. Independent cold plans sometimes read cached
  copies; those are not independent live contract or account checks.
- The fixture set excludes rich actions intentionally. Linq's source can require
  explicit read/contact share even in 1:1 conversation; the Flux CLI cannot prove
  how the missing consuming agent uses long-lived callbacks. Neither reduction is
  an approved real-world cutover.

## Release criteria for additional providers

1. Pin an actual consuming application or explicitly label an adapter-only case.
2. Run a clean agent with only this skill, that checkout and official evidence.
   Before approving, score source/version, scope, architecture, exact blockers,
   secret handling and plan gate. A wrong “go” on a parity blocker fails the case.
3. For any eligible isolated slice, compare source and candidate against the same
   fixtures with mocked identity, provider and model. Capture failing traces and
   rerun after fixing the skill. Never turn an intentional downgrade into a pass.
4. Optionally move to authorized test lines for public behavior that mocks cannot
   prove; distinguish accepted dispatch, delivered native rendering and real cutover.
