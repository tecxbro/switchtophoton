# LoopMessage source reference

No approved official agent-readable documentation source is currently registered for this provider.

Do not add or open ordinary LoopMessage documentation, help-center, marketing, or API links. Rely on the inspected repository and report the documentation gap.

## Detection and generation evidence

Retain only fingerprints supported by repository evidence, such as:

- legacy `server.loopmessage.com/api/v1` endpoints;
- status lookup paths under `/api/v1`;
- LoopMessage-specific credential and environment-variable names;
- sender aliases or pools;
- webhook or callback configuration;
- consent, sign-up, deep-link, or inbound-first eligibility flows;
- newer hosts, paths, schemas, packages, or generated clients found in active code.

Do not assume legacy v1 or a newer generation from product history. Report the exact active host, paths, headers, fields, tests, fixtures, and locked package versions. If generation cannot be proven, report `Unknown generation`; low confidence blocks automatic execution.

## Capabilities to inventory

Inventory only active behavior, including:

- inbound-first consent and outbound eligibility;
- shared versus dedicated sender behavior;
- sender pools and aliases;
- text and media sends;
- status polling and callbacks;
- webhook authentication, acknowledgement, retries, deduplication, and ordering;
- deep links and opt-in flow;
- message, conversation, sender, and event identifiers;
- CRM-specific transport behavior;
- lifecycle, timeout, and error handling.

## Migration traps

Consent and outbound-eligibility rules may be product behavior, not provider setup. Sender identity and pooling may also be visible behavior. Do not remove either silently. Any unresolved generation or capability mapping must be a blocker in the plan.
