"""Tiger Data rows for FaceTime calls and card checks (written by PersistenceWriter).
Text fields only: no images, no phone numbers."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.facetime import CardCheck, FaceTimeCall

_CALL_SQL = """
INSERT INTO facetime_calls (call_id, run_id, status, connected_at, ended_at)
VALUES (:call_id, :run_id, :status, CAST(:connected_at AS timestamptz),
    CAST(:ended_at AS timestamptz))
ON CONFLICT (call_id) DO UPDATE SET
    run_id = EXCLUDED.run_id, status = EXCLUDED.status, ended_at = EXCLUDED.ended_at
"""

_CHECK_SQL = """
INSERT INTO card_checks (
    check_id, call_id, run_id, request_id, card_id, read_name, read_role, read_availability,
    confidence, valid, reason, staff_id, checked_at)
VALUES (:check_id, :call_id, :run_id, :request_id, :card_id, :read_name, :read_role,
    :read_availability, :confidence, :valid, :reason, :staff_id, CAST(:checked_at AS timestamptz))
ON CONFLICT (check_id) DO NOTHING
"""


def _iso(v):
    return v.isoformat() if v is not None else None


@dataclass(slots=True, frozen=True)
class FaceTimeCallRow:
    params: dict
    run_id: str
    version: str = "facetime_call"

    @classmethod
    def of(cls, c: FaceTimeCall) -> FaceTimeCallRow:
        return cls(
            {
                "call_id": c.call_id,
                "run_id": c.run_id,
                "status": c.status,
                "connected_at": _iso(c.connected_at),
                "ended_at": _iso(c.ended_at),
            },  # fmt: skip
            c.run_id or "-",
        )

    def write(self, con) -> int:
        con.run(_CALL_SQL, **self.params)
        return 1


@dataclass(slots=True, frozen=True)
class CardCheckRow:
    params: dict
    run_id: str
    version: str = "card_check"

    @classmethod
    def of(cls, k: CardCheck) -> CardCheckRow:
        return cls(
            {
                "check_id": k.check_id,
                "call_id": k.call_id,
                "run_id": k.run_id,
                "request_id": k.request_id,
                "card_id": k.card_id,
                "read_name": k.read_name,
                "read_role": k.read_role,
                "read_availability": k.read_availability,
                "confidence": k.confidence,
                "valid": k.valid,
                "reason": k.reason,
                "staff_id": k.staff_id,
                "checked_at": _iso(k.checked_at),
            },  # fmt: skip
            k.run_id or "-",
        )

    def write(self, con) -> int:
        con.run(_CHECK_SQL, **self.params)
        return 1
