# Inkbox source reference

Official documentation: [Inkbox](https://inkbox.ai/docs/capabilities/imessage).

## Detect and pin

Look for Inkbox SDK imports and calls retaining identity or connection IDs, plus webhook signing config. Confirm documentation generation against the lockfile or actual HTTP contracts.

## Inventory and migration risks

Document human-initiated shared routing, dedicated-line first contact/group support, receive-only routes, and directional permissions. Check identity handoff, messages/attachments, tapbacks, read/typing and retries; do not collapse access rules into a flat contact allowlist.

Read [Keiki targets](../keiki-targets.md) only after the source contract is pinned.

## Implementation checkpoints

Use official [iMessage API](https://inkbox.ai/docs/api/imessage.md), [group API](https://inkbox.ai/docs/api/imessage/groups.md) and [messages](https://inkbox.ai/docs/api/imessage/messages.md). Pin standard router vs org pool vs dedicated. Trace connect/inactive/reconnect, direction permissions, sender identity, phone vs email receive-only and first-reply gating of links/phone/media. For each flow verify reply IDs, native tapbacks, dedicated/sponsor group behavior and queued status. A shared Keiki code does not reproduce the Inkbox authorization model.

Check lockfile patches in addition to the published version; this may change
tunnel transport and ingress. Trace model tool registrations separately from SDK
method support. Membership hydration can be an authorization requirement: if the
webhook cannot prove participant scope, fail closed rather than guessing DM routing.
