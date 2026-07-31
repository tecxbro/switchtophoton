# Source-provider index

Detect the source provider and exact generation from repository evidence before selecting Photon. Then read only the matching provider file.

## Agent-readable documentation policy

Use only official agent-readable documentation linked by this skill:

1. Official `llms.txt`
2. Official `llms-full.txt`
3. Official Markdown files ending in `.md`

Do not directly link to normal documentation homepages, ordinary HTML pages, dashboards, marketing pages, API explorers, Swagger pages, GitHub repository roots, `.yaml` or `.json` OpenAPI files, unofficial mirrors, or blog posts.

This restriction applies to source-provider detection.

Photon target verification follows [`../photon-evidence.md`](../photon-evidence.md), which permits:

- exported public Photon package types;
- versioned public API documentation;
- hosted-service API and event contracts;
- official Photon Agent Skills;
- official Photon implementation source when public evidence is incomplete or conflicting;
- official tests when they exist and are relevant;
- official product repositories.

Do not apply the source-provider documentation restriction in a way that prevents inspection of current official Photon public-contract or implementation evidence.

Do not treat undocumented internal implementation as a supported public Photon capability.

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
| Linq | [`linq.md`](./linq.md) | `https://docs.linqapp.com/llms.txt`, `https://docs.linqapp.com/llms-full.txt` | `@linqapp/sdk`, `/api/partner/v2`, `/api/partner/v3`, `X-LINQ-INTEGRATION-TOKEN`, bearer auth, `event_id` |
| BlueBubbles | [`bluebubbles.md`](./bluebubbles.md) | `https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/developer-guides/rest-api-and-webhooks.md`, `https://github.com/BlueBubblesApp/bluebubbles-docs/blob/master/server/SUMMARY.md` | self-hosted server URL, `/api/v1`, server auth, webhook events, local Mac dependencies |
| Blooio | [`blooio.md`](./blooio.md) | None registered | Blooio API hosts/paths, `BLOOIO_API_KEY`, provider-specific payloads |
| LoopMessage | [`loopmessage.md`](./loopmessage.md) | None registered | `server.loopmessage.com/api/v1`, LoopMessage credentials, callbacks, consent flow |
| Texting Blue | [`texting-blue.md`](./texting-blue.md) | `https://github.com/textingblue/imessage-api/blob/main/README.md` | `api.texting.blue/v1`, `TEXTING_BLUE_API_KEY`, `message.received` |

## Unknown or custom providers

If no provider matches:

1. identify the provider from locked package metadata, imported API shape, host ownership, deployment configuration, and wire payloads;
2. use an external source only when it meets this policy;
3. report exact evidence, generation result, and confidence;
4. inventory capabilities from active repository behavior;
5. do not execute on low-confidence detection without explicit risk acceptance;
6. do not add a permanent provider reference until official agent-readable documentation and fingerprints are verified.

Do not confuse similarly named products. Sendblue is not Sendinblue/Brevo.
