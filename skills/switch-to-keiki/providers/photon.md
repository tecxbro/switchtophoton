# Photon source reference

Official documentation: [Photon](https://photon.codes/docs/spectrum-ts/providers/imessage).

## Detect and pin

Look for `spectrum-ts`, `@spectrum-ts/imessage`, and `@spectrum-ts/imessage-local`; the platform IDs are `imessage` and `local_imessage`. Trace configured platforms, not merely installed packages. For legacy Chat SDK, direct REST/webhooks or local bridge usage, read the matching Photon version/runtime contract.

## Inventory and migration risks

Inventory Space/User/message identifiers, multiple registered platforms, groups and membership events, typing, reads, replies/tapbacks, attachments, effects, app cards and outbound initiation. Keiki external turn handling is not a replacement for a Spectrum event stream. Importing a Photon-backed line can retain Photon dependency; state that explicitly.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.
