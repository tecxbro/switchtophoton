# Implementation recipes

Read after selecting the target and before writing the file plan. These are starting
points for approved slices, not provider API shims or authorizations.

## A. App-owned inbound responder (e.g. Linq V3 webhook → external push)

1. Split ingress normalization, immutable application input, and reply sink. Keep
   prompt/model, app auth, conversation memory/quota and hosting intact. Pin source
   signature/ACK and confirm source provider paths and actual fixtures.
2. Map Linq `event_id` to a separate transport receipt, not Keiki conversation identity.
   `data.chat_id` (in the pinned reference app; re-check your schema) mapped into app-owned stable conversation key; never invent continuity
   by substituting an unrelated Keiki conversationId. Map sender/contact and receiving
   bot line independently. Check the actual pinned schema for `data.message.parts`,
   service, reply target, effects, group metadata and attachments.
3. Add a separate signed Keiki route. Verify raw bytes before using body; prefer the
   documented token-bound Ed25519 using trusted Keiki JWKS, or HMAC as documented with
   server-side agent binding. Validate configured origin, route, signed agent/conversation
   mapping, current deadline, accepted envelope kind/version, and line authorization.
4. Dispatch to a durable deduped job before returning 2xx; do not schedule untracked
   promises after ACK on serverless. Treat reception retry, mid-turn arrivals and cancellation
   independently. Contain bearer and signed attachment URLs; don't send them to the model
   or put them in logs.
5. Normalize **all** inbound items. Verify the original semantics if the source
   processed messages individually, grouped them, or triggered other events.
6. Pass the original application input into the unchanged handler. Return via scoped
   `/messages`, optionally `/actions`, and settle with `/complete` once. Bind stable send
   keys to turn/action slot and persist their outcomes. No fallback after ambiguous sends.
7. Verify opted-out, repeated, held-back, unsupported and canceled states before enabling
   a second producer. Do not keep both reply handlers active for the same conversation.

**Hard stop:** mark-read, independent delivery/read events, group admin, native contact
sharing, combined threaded effect, or cross-service behavior from the source must have
explicit rows. Do not treat an SDK credential swap as a valid change.

## B. Persistent consume loop (e.g. Photon Spectrum, BlueBubbles, standalone SSE)


Inventory when the loop owns connection/reconnect, replay cursor, startup readiness and
shutdown. Separate routing fan-out to other platforms. Under relay/inbox, validate offline
behavior, claims, lease expiry, rotating token and cursor, redeliveries after a crash,
separate arrival messages, shutdown handoff and bounded retries. If the app needs raw
transport/history that Keiki turns don't cover, preserve the existing integration or block.
For hosted Spectrum, prove whether a different service owns the loop: deployment CLIs
do not necessarily contain transport implementation. Do not replace endpoints by grep.

## C. Chat SDK adapter or durable workflow (e.g. Sendblue)

Trace adapter lifecycle (register/webhook, new mention/subscribed message, thread state,
serialization, rehydration and outbound post). A durable job with only old thread ID
cannot call Keiki. Preserve app mapping/access state; carry or issue a scoped turn
credential only as documented, respecting deadline, reclaims and cancellation. App-owned
scheduler still needs a distinct proactive route. If using an AI SDK runtime, compare
Keiki's public framework adapter to plain external push; no package substitution unless
it actually preserves the triggers and workflow.

## D. Outbound-first integration

Inventory independently addressed sends, existing and fresh contacts, cron/broadcast,
recipient policy, receipts, idempotency and unknown outcomes. Compare dedicated and
shared plus existing-conversation notice turns. A notice isn't a send API, isn't a
reply that resets reciprocity, and does not automatically run the previous app's rules.
If direct new-recipient behavior has no public equivalent on the exact line, leave the
operation on the old provider or block. Do not set up a dual sender with overlapping reach.

## E. Hosted config conversion

Only consider managed config if the app already accepts the ownership change and every
model/tool/secret/memory, error and routing path is verified. Inventory private APIs,
invocation keys, control-plane permissions, test-line bindings, log redaction, and how
to roll back to the previous app. `kit.sync()` is control-plane registration, not a send.

### Flux nuance
The Flux CLI (v0.6.6 in the benchmark) runs user-supplied agent code locally. The
remote gRPC service owns transport and phone enrollment, not the model loop.
Do not infer the runner from the word “deploy.” The actual user agent is outside
that repository. Check when its callbacks were retained, what they return, and
whether they can address old GUIDs or send after the triggering message. Preserve
per-message invocation, memory-before-delivery order and bubble splitting.
Static inspection is safe; `flux validate` executes imported app code.

## Durable acceptance pattern (for A or C)

The Keiki push endpoint may return **any 2xx** after acceptance; it is not a provider
queue and docs say an unavailable push endpoint can fail a turn. Define an app-side
durable handoff before acknowledging. One implementation pattern:

1. In one app transaction, upsert the authenticated incoming event (agent + turn +
   kind + sequence as applicable), the app job, and an outbox record. Enforce uniqueness.
   Store only minimum required secrets in the application's protected job storage.
2. Commit, then ACK. A relay/dispatcher reads the outbox and uses a deterministic
   job identity or equivalent idempotent start. A crash after workflow start but
   before marking dispatched must not start duplicate work. If the workflow provider
   lacks safe start idempotency, prove equivalent fencing at worker entry and before
   irreversible actions. Do not claim exactly-once execution.
3. Persist per-message/business/action checkpoints separate from turn acceptance.
   A worker claims with fencing and checks remaining time, cancellation and lease.
   A late retry cannot send with an expired turn credential; settle/record failure
   rather than starting a new turn or sending out of band.
4. Use the same per-action key for safe retries within the documented window.
   For explicitly unknown delivery, mark it unknown and stop that send; do not
   generate another key or fall back. Any operator resend is a new deliberate action.
5. Store terminal outcomes, retry completion only under its documented duplicate
   semantics, and redact turn bearer tokens and attachment URLs from queue/history/logs.
   Test crash before DB commit, after DB commit, after dispatch and after send.

## Routing and quiet semantics

Phone-line conversations can have the Keiki identity channel `sms`, including
iMessage. Do not infer native iMessage vs SMS/RCS fallback from that discriminator.
Use documented envelope/current delivery metadata and an explicitly verified
routing map; where the source requires exact service and it cannot be proved, block.
Treat `heldBack`, `silent`, `quietLoop`, reaction, cancellation and arrival as separate
decisions. Held-back responses may be captured for playground/steering rather than
sent to a human; skipping the model entirely is not general parity for those flows.
