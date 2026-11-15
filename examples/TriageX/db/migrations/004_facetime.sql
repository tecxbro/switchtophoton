-- Prompts 4 and 5: live FaceTime verification and Chert Shared-line iMessage confirmations.
-- No images and no phone numbers are stored: only text fields read from fictional cards.

-- Confirmation sources: simulated fallback, console-API webhook, shared-line iMessage, FaceTime.
ALTER TABLE staff_confirmations DROP CONSTRAINT IF EXISTS staff_confirmations_source_check;
ALTER TABLE staff_confirmations ADD CONSTRAINT staff_confirmations_source_check
    CHECK (source IN ('simulated', 'webhook', 'imessage', 'facetime'));

-- Messaging channel: the console API (signed webhooks) or the hackathon Shared line (polled).
ALTER TABLE outreach_events ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'console'
    CHECK (channel IN ('console', 'shared'));
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'console_webhook'
    CHECK (channel IN ('console_webhook', 'shared_poll'));

-- One row per FaceTime call reported by the agent (Chert's call id; no caller number).
CREATE TABLE IF NOT EXISTS facetime_calls (
    call_id       text PRIMARY KEY,
    run_id        text,
    status        text NOT NULL CHECK (status IN ('connected', 'ended')),
    connected_at  timestamptz NOT NULL,
    ended_at      timestamptz
);
CREATE INDEX IF NOT EXISTS facetime_calls_run_idx ON facetime_calls (run_id);

-- One row per card check: the fields the agent read and the backend's roster decision.
CREATE TABLE IF NOT EXISTS card_checks (
    check_id           text PRIMARY KEY,
    call_id            text NOT NULL,
    run_id             text,
    request_id         text,
    card_id            text NOT NULL,
    read_name          text,
    read_role          text,
    read_availability  text,
    confidence         double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    valid              boolean NOT NULL,
    reason             text NOT NULL,
    staff_id           text,
    checked_at         timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS card_checks_run_idx ON card_checks (run_id);
CREATE INDEX IF NOT EXISTS card_checks_call_idx ON card_checks (call_id);
