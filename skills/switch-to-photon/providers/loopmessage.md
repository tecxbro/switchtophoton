# LoopMessage source reference

## Official documentation

- Legacy API documentation: https://loopmessage.com/apidocs/
- Next-generation documentation: https://docs.loopmessage.com
- API-generation announcement: https://loopmessage.com/helpdesk/whats-new-in-the-next-generation-api/

## Detection and version cues

Look for:

- legacy `https://server.loopmessage.com/api/v1/...` endpoints;
- status lookup paths such as `/api/v1/message/status/{id}`;
- LoopMessage-specific credentials, sender aliases, webhook/callback configuration, and consent/sign-up flows;
- newer hosts, paths, schemas, SDKs, or docs associated with the next-generation API.

LoopMessage announced a redesigned next-generation API beginning in late 2025. Do not apply legacy v1 assumptions to newer code. If the current next-generation docs cannot be resolved, use the repository's exact wire formats and report uncertainty in the plan.

## Inventory and traps

Inventory inbound-first consent requirements, sender pools/names, dedicated versus shared senders, outbound eligibility, sending, media, status polling, callbacks, deep links, webhook retries, identifiers, and any CRM-specific integration behavior.
