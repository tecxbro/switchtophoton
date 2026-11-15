# Project Blue source reference

Official documentation: [Project Blue](https://docs.tryprojectblue.com/).

## Detect and pin

Look for `api.tryprojectblue.com` and `/send-api-message` with Bearer authentication, then identify exact routes and subscribed events from the app.

## Inventory and migration risks

Trace iMessage versus automatic SMS fallback, media/voice memos, effects, receipt handling, and sender assignment. Keep Voice SDK and FaceTime Audio separate; do not map calls into Keiki iMessage.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Pin direct send, webhook subscription and receipt schemas independently. Check trial vs production configuration and line assignment. Inventory proactive send, fallback, effects, attachments and native voice notes; separately retain Voice SDK and FaceTime Audio. Prove received vs accepted vs delivered and that SMS fallback remained on the original approved path. An existing-conversation Keiki notice is not an arbitrary number send.

### Current direct-API contract checkpoints

- [Send message](https://docs.tryprojectblue.com/docs/send-message): separate explicit
  `lineId` from automatic line selection and trial restrictions. Trace the source's
  default repeat-suppression window vs explicit `idempotencyKey`; compare
  `processing`, `done`, and the separately resolved message/delivery status.
- [Webhooks](https://docs.tryprojectblue.com/docs/webhooks): inbound/outbound direction
  and numeric message ID vs GUID are distinct. The normal webhook has no delivery
  retry/replay; examine whether the app reconciles with the history API. HubSpot
  shape and failure rules differ.
- [Typing](https://docs.tryprojectblue.com/docs/send-typing-indicator) requires an
  existing conversation on the sending line. Capture this separately from send
  permission, native voice memo format and Apple rendering.
