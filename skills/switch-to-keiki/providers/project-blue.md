# Project Blue source reference

Official documentation: [Project Blue](https://docs.tryprojectblue.com/).

## Detect and pin

Look for `api.tryprojectblue.com` and `/send-api-message` with Bearer authentication, then identify exact routes and subscribed events from the app.

## Inventory and migration risks

Trace iMessage versus automatic SMS fallback, media/voice memos, effects, receipt handling, and sender assignment. Keep Voice SDK and FaceTime Audio separate; do not map calls into Keiki iMessage.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.
