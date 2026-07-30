# Sendblue source reference

Use this file to recognize how the repository uses Sendblue. Fetch current official details instead of duplicating the full documentation here.

## Official documentation

- LLM index: https://docs.sendblue.com/llms.txt
- Introduction and guides: https://docs.sendblue.com/
- API reference and current SDK versions: https://docs.sendblue.com/api
- API v2 overview: https://docs.sendblue.com/api-v2
- Sending: https://docs.sendblue.com/getting-started/sending-messages
- Receiving: https://docs.sendblue.com/getting-started/receiving-messages
- Webhooks: https://docs.sendblue.com/getting-started/webhooks
- TypeScript SDK reference: https://docs.sendblue.com/api/typescript
- Chat SDK adapter: https://docs.sendblue.com/guides/chat-sdk-adapter

Read the `llms.txt` index first, then only the pages relevant to capabilities found in the repository.

## Detection fingerprints

Look for combinations of:

- packages/imports: `sendblue`, `chat-adapter-sendblue`, `sendblue-api-mcp`, `@sendblue/cli`;
- hosts: `api.sendblue.com`, `api.sendblue.co`;
- headers: `sb-api-key-id`, `sb-api-secret-key`, `sb-signing-secret`;
- environment names containing `SENDBLUE`, commonly API key, secret, from-number, webhook, or signing-secret values;
- current endpoints such as `/api/send-message`, `/api/send-group-message`, `/api/v2/messages`, `/api/status`, `/api/account/webhooks`, `/api/send-typing-indicator`, `/api/send-reaction`, `/api/mark-read`;
- older endpoints such as `/accounts/messages`;
- webhook fields such as `message_handle`, `from_number`, `to_number`, `sendblue_number`, `media_url`, `is_outbound`, `service`, `group_id`, `participants`, `send_style`, and `was_downgraded`.

A name alone is insufficient; confirm runtime calls or payloads.

## Determine the integration generation

Report one or more of these:

### Official SDK

- Read the exact installed `sendblue` version from the lockfile.
- Confirm imported methods against the matching official SDK reference.
- Do not infer the SDK version from the latest docs page.

### Current raw REST

Common signals:

- `/api/send-message` for outbound sends;
- `/api/v2/messages` for message retrieval;
- API key and secret headers;
- account-level webhook CRUD;
- modern features under `/api/v2/*` while some send operations remain under `/api/*`.

This can legitimately be a mixed path structure; do not label it legacy merely because every endpoint is not under `/api/v2`.

### Legacy raw REST

Possible signals include older hosts or resources such as `/accounts/messages`, old response casing, old fixtures, or old Sendblue wrappers. Treat the exact repository wire format as authoritative and locate historical official docs when possible.

### Chat SDK adapter

Look for `chat-adapter-sendblue`, Chat SDK state adapters, adapter initialization, and provider-specific webhook handling. This normally maps to Photon's Chat SDK adapter rather than a full application rewrite.

### CLI or MCP usage

If the product invokes Sendblue through a CLI or MCP tools rather than application code, preserve that boundary. Do not replace it with an SDK unless the approved Photon target requires it.

## Capabilities to inventory

Check whether active code uses:

- direct sends: `number`, `from_number`, `content`;
- media through `media_url`, upload APIs, captions, file limits, and voice-note formatting;
- inbound `receive` webhooks;
- outbound/status callbacks and the statuses the application depends on;
- message history or polling through `/api/v2/messages` or older retrieval endpoints;
- `message_handle` for deduplication, status lookup, reactions, replies, or persistence;
- sender-line selection and any sticky relationship between recipient and `from_number`;
- automatic iMessage/SMS/RCS fallback and `service` or `was_downgraded` handling;
- typing indicators;
- read receipts;
- reactions and `part_index`;
- inline replies and `reply_to.message_handle`;
- direct/group messaging, `group_id`, participants, group modification, and group correlation;
- message effects through `send_style`;
- contacts, opt-out state, contact cards, line provisioning, carousels, location, calling, or FaceTime;
- webhook signing, acknowledgement, retry, and duplicate-delivery behavior;
- rate limits, queues, idempotency, and application retries.

Only mapped capabilities belong in the migration plan.

## Migration traps

- `from_number` may be required and may be expected to remain consistent for a conversation.
- `message_handle` may be a durable application dependency, not merely a transport field.
- Webhook delivery can be repeated; preserve deduplication and return/acknowledgement behavior.
- A status callback and an account webhook may both feed lifecycle state; do not accidentally process both twice.
- SMS/RCS fallback can be product behavior. Do not silently remove it when moving to an iMessage-only Photon surface.
- Group conversations may depend on `group_id` as their only stable correlator.
- Media URLs, expiry, maximum size, and download timing may differ from Photon attachments.
- Deleting a provider record is not necessarily equivalent to unsending an iMessage.
- New Sendblue features in current docs are out of scope unless the repository already uses them.
