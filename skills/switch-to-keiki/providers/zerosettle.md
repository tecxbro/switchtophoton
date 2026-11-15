# ZeroSettle source reference

Official documentation: [ZeroSettle](https://phonetw.in/docs).

## Detect and pin

The official docs expose a raw [Markdown contract](https://phonetw.in/docs.md). Look for `/api/imessage/` routes, configured base URL, token names, and `X-ZeroSettle-Signature` when present.

## Inventory and migration risks

Trace event types and dedupe keys, group and SMS fallback support, SSE vs webhook ownership, media, typing and source-agent config. A Keiki turn is not a drop-in replayable SSE stream. Confirm plan/line cohort rather than assuming all existing lines have the same fallback.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Pin /api/imessage route, line routing field, webhook signer, event generation and SSE cursor/reconnect. Inventory direct sends, broadcasts, opt-out notice, polls, chat backgrounds, name/photo, media readiness and reuse, threading, effects and tapbacks. Bounded Keiki history does not replace SSE or persisted transcript IDs; plain image is not a chat background. Test routing across multiple lines and video processing status before send.
