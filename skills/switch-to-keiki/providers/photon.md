# Photon source reference

Official documentation: [Photon](https://photon.codes/docs/spectrum-ts/providers/imessage).

## Detect and pin

Look for `spectrum-ts`, `@spectrum-ts/imessage`, and `@spectrum-ts/imessage-local`; the platform IDs are `imessage` and `local_imessage`. Trace configured platforms, not merely installed packages. For legacy Chat SDK, direct REST/webhooks or local bridge usage, read the matching Photon version/runtime contract.

## Inventory and migration risks

Inventory Space/User/message identifiers, multiple registered platforms, groups and membership events, typing, reads, replies/tapbacks, attachments, effects, app cards and outbound initiation. Keiki external turn handling is not a replacement for a Spectrum event stream. Importing a Photon-backed line can retain Photon dependency; state that explicitly.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Flux fingerprint: @photon-ai/flux, better-grpc, FluxService, fluxy.photon.codes, FLUX_SERVER_ADDRESS, locally loaded agent.ts. Despite deploy wording, the Flux CLI runs the agent locally. Inventory managed registration/phone login, local loader and memory, streaming ACK/reconnect, imageBase64, tapback GUID, and long-lived onInit callbacks. Compare relay or inbox without moving the loop. Detect the consuming project separately; the CLI package alone does not identify a deployed agent.

For Flux confirm the registered user's phone separately from the service-owned
receiving line. Existing gRPC stream handling does not prove reconnect/replay.
Inspect normal vs proactive failure handling (Flux 0.6.6 continues normal bubbles
after a false send return but stops proactive sends), local vs production error hooks,
and the six tapback values (love, like, dislike, laugh, emphasize, question).
Retaining a turn token cannot implement a long-lived callback after it expires.
