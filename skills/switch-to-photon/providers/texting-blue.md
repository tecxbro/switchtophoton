# Texting Blue source reference

## Official documentation

- API reference: https://docs.texting.blue
- Authentication: https://docs.texting.blue/api/authentication/
- Webhooks: https://docs.texting.blue/api/webhooks/
- Official API example repository: https://github.com/textingblue/imessage-api

## Detection and version cues

Look for `https://api.texting.blue/v1`, bearer/API-key authentication, `/v1/messages/send`, `/v1/webhooks`, `/v1/numbers`, `message.received`, and environment names containing `TEXTING_BLUE`.

Confirm the exact endpoint and webhook schema from the current docs and repository fixtures. The service can involve an iPhone connection/shortcut and number provisioning, so record the current operational dependency in the plan.

## Inventory and traps

Inventory sends, inbound webhooks, delivery statuses, media, phone-number/shortcut setup, webhook verification, rate limits, retries, message IDs, and any requirement to keep a physical iPhone connected. Do not treat hardware/shortcut removal as a trivial dependency change.
