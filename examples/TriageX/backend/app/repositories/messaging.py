"""Tiger Data rows for Chert outreach and webhook deliveries (written by PersistenceWriter)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.services.outreach import OutreachRecord, WebhookOutcome

_OUTREACH_SQL = """
INSERT INTO outreach_events (
    outreach_id, run_id, request_id, hospital_id, recipient_hash, recipient_mask, status, body,
    chert_message_id, chert_chat_id, error, send_ms, created_at, sent_at, confirmed_at, channel)
VALUES (:outreach_id, :run_id, :request_id, :hospital_id, :recipient_hash, :recipient_mask,
    :status, :body, :message_id, :chat_id, :error, :send_ms, CAST(:created_at AS timestamptz),
    CAST(:sent_at AS timestamptz), CAST(:confirmed_at AS timestamptz), :channel)
ON CONFLICT (outreach_id) DO UPDATE SET
    status = EXCLUDED.status, chert_message_id = EXCLUDED.chert_message_id,
    chert_chat_id = EXCLUDED.chert_chat_id, error = EXCLUDED.error, send_ms = EXCLUDED.send_ms,
    sent_at = EXCLUDED.sent_at, confirmed_at = EXCLUDED.confirmed_at
"""

_WEBHOOK_SQL = """
INSERT INTO webhook_events (
    delivery_id, event_id, event_type, outcome, detail, http_status, signature_valid,
    sender_hash, run_id, request_id, outreach_id, processing_ms, received_at, channel)
VALUES (:delivery_id, :event_id, :event_type, :outcome, :detail, :http_status,
    :signature_valid, :sender_hash, :run_id, :request_id, :outreach_id, :processing_ms,
    CAST(:received_at AS timestamptz), :channel)
ON CONFLICT DO NOTHING
"""


def _iso(v):
    return v.isoformat() if v is not None else None


@dataclass(slots=True, frozen=True)
class OutreachRow:
    params: dict
    run_id: str
    version: str = "outreach"

    @classmethod
    def of(cls, r: OutreachRecord) -> OutreachRow:
        return cls(
            {
                "outreach_id": r.outreach_id, "run_id": r.run_id, "request_id": r.request_id,
                "hospital_id": r.hospital_id, "recipient_hash": r.recipient_hash,
                "recipient_mask": r.masked, "status": r.status, "body": r.body,
                "message_id": r.message_id, "chat_id": r.lead_id, "error": r.error,
                "send_ms": r.send_ms, "created_at": _iso(r.created_at),
                "sent_at": _iso(r.sent_at), "confirmed_at": _iso(r.confirmed_at),
                "channel": r.channel,
            },  # fmt: skip
            r.run_id,
        )

    def write(self, con) -> int:
        con.run(_OUTREACH_SQL, **self.params)
        return 1


@dataclass(slots=True, frozen=True)
class WebhookRow:
    params: dict
    run_id: str
    version: str = "webhook"

    @classmethod
    def of(cls, o: WebhookOutcome) -> WebhookRow:
        rec = o.record
        # Verified events are keyed by Chert's event_id (so retries collapse); duplicates and
        # unverified deliveries get their own id so every delivery attempt is auditable.
        # Polled shared-line messages are authenticated by our API key, not signed.
        polled = o.channel == "shared_poll"
        keyed = o.event_id and (o.signature_valid or polled) and o.outcome != "duplicate_event"
        return cls(
            {
                "delivery_id": f"evt:{o.event_id}" if keyed else f"dlv:{uuid.uuid4().hex}",
                "event_id": o.event_id if (o.signature_valid or polled) else None,
                "event_type": o.event_type, "outcome": o.outcome, "detail": o.detail[:500],
                "http_status": o.http_status, "signature_valid": o.signature_valid,
                "sender_hash": o.sender_hash, "run_id": rec.run_id if rec else None,
                "request_id": rec.request_id if rec else None,
                "outreach_id": rec.outreach_id if rec else None,
                "processing_ms": o.processing_ms, "received_at": _iso(o.received_at),
                "channel": o.channel,
            },  # fmt: skip
            rec.run_id if rec else "-",
        )

    def write(self, con) -> int:
        con.run(_WEBHOOK_SQL, **self.params)
        return 1
