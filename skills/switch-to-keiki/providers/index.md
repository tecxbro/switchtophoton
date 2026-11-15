# Source-provider index

Use exact repository evidence to detect the provider and generation first, then
read the matching reference. Official public documentation (including HTML, Markdown,
public specs and the official BlueBubbles project) is allowed. Prefer agent-readable
sources when available. Treat inaccessible pages as retrieval failures, not proof of
absence. Never use competitor docs as proof of Keiki parity.

| Source | Reference | Key distinction |
| --- | --- | --- |
| Linq | [Linq migration notes](linq.md) | Pin V2 vs V3 or mixed; inventory receipt and chat schemas separately. |
| Photon | [Photon migration notes](photon.md) | Distinguish Spectrum cloud vs local and direct API/webhook paths. |
| Sendblue | [Sendblue migration notes](sendblue.md) | Separate incoming and status callbacks, SMS fallback and porting. |
| Inkbox | [Inkbox migration notes](inkbox.md) | Inspect identity, shared vs dedicated routing and webhooks. |
| Blooio | [Blooio migration notes](blooio.md) | Pin v2/v4 per route; preserve other active messaging channels. |
| Project Blue | [Project Blue migration notes](project-blue.md) | Inspect direct send, fallback and independent call events. |
| LoopMessage | [LoopMessage migration notes](loopmessage.md) | Trace task/message IDs, sender choice, retries and webhooks. |
| AgentPhone | [AgentPhone migration notes](agentphone.md) | Distinguish reply-only versus outbound iMessage lines and regular SMS/voice. |
| Chert | [Chert migration notes](chert.md) | Separate Messaging API from CRM/Slack and FaceTime paths. |
| ZeroSettle | [ZeroSettle migration notes](zerosettle.md) | Separate push webhooks, SSE, and provider-managed agent behavior. |
| BlueBubbles | [BlueBubbles migration notes](bluebubbles.md) | Distinguish macOS relay, REST, live events and Private API. |

If another provider is present, inventory it from code and verify its official
contract. Report unresolved generation or capability separately and block affected
changes rather than guessing.
