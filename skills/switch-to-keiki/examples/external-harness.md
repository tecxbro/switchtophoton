# Connect an existing HTTP agent to Keiki

Use this recipe when an existing HTTPS application can keep its turn logic and the source workflow maps to a Keiki-managed iMessage conversation. The requests show the public contract. They use placeholders and have no dependency on an adapter with an unverified package version. [External harness](https://onkeiki.com/docs/external-harness)

## Configure the receiving agent

Connect and verify the chosen line for the test agent. Use the agent's developer configuration or a partner deployment agent spec with these fields. Partner deployments may provision lines and are a separate decision. [External harness setup](https://onkeiki.com/docs/external-harness#configure-an-agent), [Partner deployments](https://onkeiki.com/docs/partner-deployments#channels)

```json
{
  "harness": "external",
  "harness_config": {
    "mode": "push",
    "dispatchUrl": "https://agent.example.com/keiki/turn",
    "timeoutMs": 600000
  }
}
```

For Ed25519 verification, get the Keiki public key with the matching `kid` from the [Keiki JWKS](https://onkeiki.com/.well-known/keiki-turn-keys.json). Cache the keys and refetch on an unknown `kid`. Where HMAC verification is selected, the documented signing-secret operation is `POST /api/v1/developer/agents/:agentId/harness/signing-secret`. Store its one-time value securely. [Signing setup](https://onkeiki.com/docs/external-harness#configure-an-agent)

## Validate and accept dispatch

1. Retain the raw body. Verify the timestamp and signature before taking action, using an appropriate replay window. The Ed25519 signed bytes are the ASCII prefix `<timestamp>.<turn-token>.` followed by the raw body. The token part is empty for cancellation and reaction events. For HMAC-SHA256 the prefix is `<timestamp>.`, followed by the raw body. Read `t`, `kid` where applicable and `v1` from the appropriate signature header. Compare HMAC bytes in constant time. [Turn request signatures](https://onkeiki.com/docs/external-harness#turn-request)
2. Validate the event type and configured agent binding. For a `keiki.turn`, take `turnId`, `conversationId` and `keiki.turnUrl` from the authenticated body and `Keiki-Turn-Token` from the dispatch header. Check that the turn ID agrees with `Keiki-Turn-Id` and that the turn URL is on the expected Keiki origin. Use the bearer only for that turn while its authorization is live. Keep it out of logs, redirects and outbound requests to any other origin.
3. Accept work durably once per agent and turn ID, then answer `202`. Run the original application behavior from the mapped turn messages and history. Honor held-back and silent state. Handle signed cancellation and any arrival sequence the application is configured to consume. Dispatch acceptance and the later turn completion are separate acknowledgements. [Turn request](https://onkeiki.com/docs/external-harness#turn-request), [Mid-turn arrivals](https://onkeiki.com/docs/external-harness#mid-turn-arrivals), [Completion](https://onkeiki.com/docs/external-harness#completion-and-errors)

Consent and reaction notifications have no turn to complete. Match the documented event identity and delivery semantics, and acknowledge consent only after durable acceptance. An inbound Tapback can be feedback for the app. Prove a separate Keiki send context before mapping a workflow that replies automatically to it. [Consent webhooks](https://onkeiki.com/docs/webhooks#verify-and-acknowledge), [Reaction events](https://onkeiki.com/docs/external-harness#reaction-events)

Keep the source app's text and prompt boundary. Keiki supplies both verbatim `messages[].text` and annotated `content` for model-aware native replies, along with optional `screening.flagged`. Preserve which fields are treated as untrusted user content. If the migration adopts the annotations or prompt guard, inspect how the selected adapter passes them and test flagged input, attachments and the source's existing prompts and tools. [Turn request](https://onkeiki.com/docs/external-harness#turn-request)

### Durable worker credentials

A workflow engine can persist every function argument and log request metadata. Keep the dispatch bearer out of those arguments. For an HMAC-configured external harness, Keiki documents a worker-signed bearer. Store only the accepted agent ID, turn ID, validated URL, deadline and necessary work in the durable job. In the worker, read the agent signing secret from its own environment and create a five-minute credential at use time. The app still enforces the active turn's deadline and cancellation state. An Ed25519-only push handler lacks the signing secret for this scheme and needs a different supported handoff. [Documented worker credential](https://onkeiki.com/docs/external-harness#turn-request)

```text
claims = base64url(UTF8(JSON.stringify({ a: agentId, t: turnId, ts: unixSeconds })))
signature = hex(HMAC_SHA256(agentSigningSecret, "keiki-turn-auth.v1." + claims))
Authorization: Bearer kts1.<claims>.<signature>
```

Bind job admission and send ownership to the verified agent and turn identity. A process-local deduplication set cannot establish cross-worker ownership. Use the app's verified durable execution or shared storage primitives, test an enqueue failure and duplicate execution, and define who may retry completion. Keep success, failure and ambiguous delivery states separate.

## Deliver a reply and complete the turn

### Replace a provider-specific reaction tool

When the contact asks the agent for a thumbs-up, use the Keiki built-in reaction. A hosted agent sees the incoming message ID and can attach the Tapback. For an external agent, expose `react_to_message` from `turn.keiki.mcpUrl` when it is available, or use the equivalent turn action below. Bind the action to the target message in the current conversation and remove the old provider-specific tool and client. Check that the recipient sees 👍 attached to the intended bubble. [Hosted iMessage actions](https://onkeiki.com/docs/cloud-agents#imessage), [Native channel actions](https://onkeiki.com/docs/external-harness#native-channel-actions)

```http
POST {turnUrl}/actions
Authorization: Bearer {turnToken}
Content-Type: application/json

{"action":"react","messageId":"{keikiMessageId}","emoji":"👍","idempotencyKey":"{stableLogicalActionId}"}
```

### Send text and files

The authenticated event supplies `{turnUrl}` and `{turnToken}`. The application chooses a stable idempotency key for each logical message and reuses it if processing resumes. For a native threaded reply, use an active Keiki message ID from the turn. Omit `replyToMessageId` for a plain reply. A screen or bubble `effect` is a separate send option that cannot share a request with `replyToMessageId`. [Turn-scoped API](https://onkeiki.com/docs/external-harness#turn-scoped-api)

```http
POST {turnUrl}/messages
Authorization: Bearer {turnToken}
Content-Type: application/json

{"text":"Your reservation is confirmed.","idempotencyKey":"reservation-123-confirmed","replyToMessageId":"{keikiMessageId}"}
```

Keiki returns a message ID for a successful send. A duplicate success acknowledgement means the original key was already processed. An ambiguous failure (`502`) or prior failed attempt (`409 previous_attempt_failed`) must not cause an automatic resend with a new key. On `429 recipient_reply_required`, wait for a real recipient reply before attempting a new send. [Turn-scoped API](https://onkeiki.com/docs/external-harness#turn-scoped-api), [Recipient reply required](https://onkeiki.com/docs/external-harness#recipient-reply-required)

File delivery uses a separate upload followed by a native action. URL-encode the filename and apply the selected line's size and type limits. Use the upload response's `id` as the action's `attachmentId`. An inbound file download uses `GET {turnUrl}/attachments/{attachmentId}` under the active turn or the temporary signed URL, when available. [Turn-scoped API](https://onkeiki.com/docs/external-harness#turn-scoped-api), [Inbound attachments](https://onkeiki.com/docs/external-harness#turn-request)

```http
POST {turnUrl}/attachments?filename=confirmation.pdf
Authorization: Bearer {turnToken}
Content-Type: application/pdf

{raw PDF bytes}
```

```http
POST {turnUrl}/actions
Authorization: Bearer {turnToken}
Content-Type: application/json

{"action":"send_file","attachmentId":"{uploadedAttachmentId}","idempotencyKey":"reservation-123-document"}
```

After the work settles, report the turn outcome. Send `status: "failed"` and a bounded, non-sensitive `error` for a failed turn. For push arrivals report the processed `consumedArrivals` sequence numbers when applicable. A repeated completion is acknowledged as a duplicate. [Completion](https://onkeiki.com/docs/external-harness#completion-and-errors), [Arrivals](https://onkeiki.com/docs/external-harness#mid-turn-arrivals)

```http
POST {turnUrl}/complete
Authorization: Bearer {turnToken}
Content-Type: application/json

{"status":"completed"}
```

## Start a turn for an existing conversation

A server event can start a notice turn with a separate developer credential that has `agents:write` for the target agent. Use the identity of an existing Keiki conversation. Pass `line` only when the existing conversation lacks a line and the agent needs a line selected. Save the business-event identity to prevent duplicate notices at the application boundary. Keiki frames the text as context for the harness. It can be part of a mixed turn with actual inbound messages. To send explicit text externally, use that new turn's `/messages` and then `/complete`. [Agent notice endpoint](https://onkeiki.com/docs/agent-api#notices-from-your-server), [External notice turns](https://onkeiki.com/docs/external-harness#proactive-turns)

```http
POST https://onkeiki.com/api/v1/developer/agents/{agentId}/notice
Authorization: Bearer {developerApiKey}
Content-Type: application/json

{"phone":"+15550100123","text":"Reservation 123 is confirmed."}
```

An unknown conversation returns 404. Omitting `phone` broadcasts to up to 200 recent conversations. The notice response reports dispatch or queueing, and the later message send still follows the line's eligibility and opt-out rules. [Agent notice endpoint](https://onkeiki.com/docs/agent-api#notices-from-your-server)

## Poll when the application cannot accept a push

With an inbox harness, authenticate with a harness API key at `GET /api/v1/harness/inbox/next?wait=25`. A response can have a claimed turn, a reaction event, or neither. For a claim, use its rotated turn token, preserve stable send keys across reclaim, refresh the claim at `POST {turnUrl}/lease` while it is active, and complete the turn as above. Relay mode is a separate mode for a connected relay to claim work and forward its signed raw payload to the app. [Inbox mode](https://onkeiki.com/docs/external-harness#inbox-mode), [Relay mode](https://onkeiki.com/docs/external-harness#relay-mode)

Verify the boundary with fixture requests covering bad signatures, duplicate turns, cancellations, held-back work, delayed responses, and recipient-reply errors. When an authorized test line and recipient are available, confirm that the intended sender, body, threading and media are observable in Messages. [Migration verification](../verification.md)
