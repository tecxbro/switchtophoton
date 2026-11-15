-- Phase 6: live Chert iMessage outreach and inbound webhook deliveries.
-- Phone numbers are never stored: only a SHA-256 prefix (recipient_hash) and a mask.

-- One row per outbound "TriageX DEMO" message to an opted-in recipient.
CREATE TABLE IF NOT EXISTS outreach_events (
    outreach_id       text PRIMARY KEY,
    run_id            text NOT NULL,
    request_id        text NOT NULL,
    hospital_id       text NOT NULL,
    recipient_hash    text NOT NULL,
    recipient_mask    text NOT NULL,
    status            text NOT NULL CHECK (status IN ('sending', 'sent', 'failed', 'confirmed')),
    body              text NOT NULL CHECK (body LIKE 'TriageX DEMO%'),
    chert_message_id  text,
    chert_chat_id     text,
    error             text,
    send_ms           double precision,
    created_at        timestamptz NOT NULL,
    sent_at           timestamptz,
    confirmed_at      timestamptz
);
CREATE INDEX IF NOT EXISTS outreach_events_request_idx ON outreach_events (request_id);

-- One row per signature-verified webhook delivery (deduplicated on Chert's event_id),
-- plus rejected deliveries keyed by a generated id.
CREATE TABLE IF NOT EXISTS webhook_events (
    delivery_id       text PRIMARY KEY,
    event_id          text,
    event_type        text,
    outcome           text NOT NULL,
    detail            text,
    http_status       int NOT NULL,
    signature_valid   boolean NOT NULL,
    sender_hash       text,
    run_id            text,
    request_id        text,
    outreach_id       text,
    processing_ms     double precision,
    received_at       timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_event_idx
    ON webhook_events (event_id) WHERE event_id IS NOT NULL AND outcome <> 'duplicate_event';
CREATE INDEX IF NOT EXISTS webhook_events_run_idx ON webhook_events (run_id);
