# iMessage parity audit

This is a decision aid, not a support promise. Re-fetch the [channel matrix](https://onkeiki.com/docs/channels.md),
[external harness contract](https://onkeiki.com/docs/external-harness.md),
[hosted behaviors](https://onkeiki.com/docs/cloud-agents.md),
[cards](https://onkeiki.com/docs/imessage-apps.md), [SDK](https://onkeiki.com/docs/sdk.md)
and [public API](https://onkeiki.com/openapi.json) for each audit. Contracts reviewed
2026-11-15. Record actual line type (Instant / Standard / On request), underlying
provider, shared/dedicated/imported, agent flags, runtime and Apple constraints.
An app can have multiple lines or routing populations; don't average their capability.

| Source iMessage behavior | What can be mapped or needs proof | Critical negative check |
| --- | --- | --- |
| Inbound 1:1 text | Compare raw event callbacks to batched external turns; normalize each entry, not just last text. Use `content` for model input only when intended; use `text` for verbatim output. | Multi-message burst, repeated turn, changed arrival, quiet/held-back, cancel, self echo. |
| Text to the current conversation | Turn `/messages` using stable per-action idempotency; trace accepted response separately from delivered. | Never create a fresh key to retry unknown delivery automatically. |
| New outbound recipient / bulk send | Require a public target route for intended line and recipient state. Proactive notice sends run an agent turn, and phone selection requires an existing conversation. | New recipient, existing recipient who must reply first, consent and suppression, correct line, per-contact retry. |
| Reply to specific inbound or prior outbound message | `replyToMessageId` where the channel supports it; use Keiki message IDs scoped to the turn/conversation. | Source IDs cannot be passed through; do not drop thread or effect when both requested. |
| Tapback add/remove, custom emoji, reaction event | `/actions` react; incoming reaction turns have their own envelope. Map standard variants/skin tones, custom emoji, remove and replace independently. | No activation on unrecognized events; verify which messages accept reaction or removal and what iOS shows. |
| Effects | `effect` on `/messages`, documented bubble/screen values only. Mutually exclusive with threaded reply. | Test each actual source effect and the combined reply/effect case; do not approximate with emojis. |
| Typing | `/typing` is a request, not proof of a start/stop pair. | Verify failure, quiet, overlap, cancel and clear timing independently. |
| Mark-read / read and delivered receipts | Find a public explicit read control and public recipient receipt event separately. Channel send response is not delivery/read. Consent webhooks are not receipts. | Preserve app callbacks/workflows only if they can observe the same milestones; no invented timestamps. |
| Edit and unsend | Native `edit` / `delete` actions; Instant supports both, On request edit only, Standard neither per channel matrix. Native Apple timing applies. | Verify wrong sender/line, external ID, expired window, consumed reply and no accidental resend. |
| Attachment inbound/outbound | Scoped download, expiry fallback, byte upload + `send_file`; channel/line limits and redirect policy apply. | MIME and limits, caption, multiple ordered parts, expired URLs, upload vs send races; no iMessage file-as-threaded-reply in channel matrix. |
| Native audio and video | Distinguish native voice memo rendering from an audio file, photo vs video, thumbnails and transcoding. Confirm exact send route, not only inbound description. | Same MIME may render differently on device; malformed/over-limit media. |
| Existing group participation | Dedicated Photon/Blooio routes only when group chats enabled per current docs; Linq-backed and shared are not replacements. Verify human mention/reply behavior and author attribution. | Never send a group answer to a DM. Verify actual group routing and line capability. |
| Group creation and administration | Existing-group reply isn't proof of creation, membership, role/leave, name, avatar or system events. Require a documented specific surface for each active operation. | Multi-sender collision, renamed group, removed member, title/icon changes, invite-only group. |
| Contact sharing / ID / onboarding | Verify vCard file vs native business identity card vs iMessage Apps card separately. Shared numbers require join and have no contact card per docs. | Keep display identity, source opt-out state and owner assignment. Same phone doesn't prove the same history. |
| Polls, widget cards, decorations, location | Evaluate each native feature individually; docs mention polls by line and configure cards separately. HTML/link/plain text is a different user experience. | Prove interaction events, text formatting/ranges, tap behavior, animations and accessibility on iPhone. |
| Native stickers | No public native sticker send/place/remove action identified in the reviewed surfaces. Mark unproven parity; never rename a PNG, tapback, or app card as a sticker. | If intentional downgrade is approved, call it an image and test that UX separately. |
| Replay/history/SSE/live callback streams | Harness history is bounded model context; arrivals cover a particular turn. Neither proves a queryable transcript, independent CDC, or receipt feed. | Backfill, cross-turn cursor, reconnect, opt-outs, read-after-write and event types. |
| SMS/RCS/voice/FaceTime/CRM | Out of iMessage scope. Keep these routes working independently unless a separate approved migration maps them. | No channel downgrade or delivery misclassification; no breaking shared state or global line config. |

## Documentation handoff for product gaps

For every active unsupported/unresolved behavior, return:
`source flow + exact callsite → observed iPhone behavior → Keiki surface / line tested
→ official source or missing contract → smallest public capability needed
→ proposed acceptance fixture and iPhone smoke check`.

State whether it is a **confirmed limit**, **not publicly exposed/documented**, or
**needs account/device evidence**. Do not conflate "no documented sticker API" with
"Keiki internally cannot store a sticker", or a mock passing with Apple rendering.
