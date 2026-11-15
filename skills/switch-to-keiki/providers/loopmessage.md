# LoopMessage source reference

## Official documentation

Verified on 2026-11-14. Start with the [documentation index](https://loopmessage.com/llms.txt), then read [sending](https://loopmessage.com/apidocs/send-message), [credentials](https://loopmessage.com/apidocs/credentials), [webhooks](https://loopmessage.com/apidocs/conversation-api-webhooks), and the [generation changes](https://loopmessage.com/helpdesk/whats-new-in-the-next-generation-api/).

## Detection

- Distinguish the legacy `server.loopmessage.com/api/v1` fingerprint from the documented `a.loopmessage.com/api/v1` host. Both use a v1 path. The legacy documentation entry redirected to the current docs during verification, so use deployed configuration, code, and fixtures for legacy details.
- On the current API, look for `POST /api/v1/message/send/`, the raw organization API key in `Authorization`, `contact` or `group`, and a `sender` ID. Inspect older `sender_name` use and its actual value type. The vendor describes a switch from email aliases to IDs and changes to error codes.
- Corroborate with event names such as `message_inbound`, `message_delivered`, and `message_failed`, plus `message_id`, `webhook_id`, and recorded sender fields. Establish the active generation for sends and callbacks independently.

## Behavior to inventory

- Preserve phone and iMessage email normalization, inbound-first eligibility, opt-in links and forms, submission metadata, sender pools, and the distinction between dedicated and shared senders where used.
- Separate queue acceptance from delivery. Identify status polling, callback authorization as configured in the dashboard, acknowledgement, deduplication by `webhook_id`, and retry and ordering assumptions.
- Track explicit channel selection or fallback, public HTTPS attachment URLs, group replies, inline replies, tapback removal, typing/read side effects, and the provider IDs on which these operations depend. Inventory CRM callbacks and any retained history or contacts needed for cutover.
