# Source-provider index

Detect the provider from repository evidence, then read only the matching file. The links below are live official references; do not copy their complete contents into this skill.

| Provider | Read | Primary official references | Strong fingerprints |
|---|---|---|---|
| Sendblue | [`sendblue.md`](./sendblue.md) | `https://docs.sendblue.com/llms.txt`, `https://docs.sendblue.com/api` | `sendblue`, `chat-adapter-sendblue`, `api.sendblue.com`, `api.sendblue.co`, `sb-api-key-id`, `/api/send-message` |
| Linq | [`linq.md`](./linq.md) | `https://docs.linqapp.com/llms.txt`, `https://docs.linqapp.com/llms-full.txt`, `https://cdn.linqapp.com/openapi/linq-api-v3.yaml` | `@linqapp/sdk`, `linq-python`, `api.linqapp.com/api/partner/v2|v3`, `X-LINQ-INTEGRATION-TOKEN`, `event_id` |
| BlueBubbles | [`bluebubbles.md`](./bluebubbles.md) | `https://docs.bluebubbles.app/server/developer-guides/rest-api-and-webhooks` | BlueBubbles server URL, `/api/v1`, `guid`/`password`/`token` query auth, BlueBubbles webhook events |
| Blooio | [`blooio.md`](./blooio.md) | `https://docs.blooio.com`, `https://docs.blooio.com/reference/v2`, `https://docs.blooio.com/guides/message-fields-v4` | `api.blooio.com/v2`, `api.blooio.com/v4`, `bl_live_`, `BLOOIO_API_KEY` |
| LoopMessage | [`loopmessage.md`](./loopmessage.md) | `https://loopmessage.com/apidocs/`, `https://docs.loopmessage.com` | `server.loopmessage.com/api/v1`, LoopMessage credential/webhook fields |
| Texting Blue | [`texting-blue.md`](./texting-blue.md) | `https://docs.texting.blue`, `https://github.com/textingblue/imessage-api` | `api.texting.blue/v1`, `TEXTING_BLUE_API_KEY`, `message.received` |

## Unknown or custom providers

If no reference matches:

1. identify the provider from official package metadata, API host ownership, deployment docs, and webhook payloads;
2. find its current official docs, OpenAPI, SDK reference, or `llms.txt`;
3. document detection evidence and version confidence in the plan;
4. build a capability inventory from source code;
5. do not execute on low-confidence detection;
6. do not add a permanent provider reference unless its official documentation and fingerprints are verified.

Do not confuse similarly named products. For example, Sendblue is not the former email platform Sendinblue/Brevo.
