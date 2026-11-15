"""FaceTime staff verification: the agent reports card fields, TriageX decides.

The agent (agent/) reads a fictional staff card from the caller's live FaceTime video and
sends only the extracted text fields here. This service is the authority:

1. card_check(): validates the card against the synthetic roster
   (backend/app/data/staff_roster.json) and the active staffing request, and records the
   check (fields only; no images, no phone numbers).
2. confirm(): after a valid check on the same call within CHECK_TTL, and only with the
   caller's explicit verbal confirmation, records the confirmation exactly once through
   DemoService.confirm_live(source="facetime"): the same validation, expiry and recompute
   path as the simulated button and the iMessage webhook.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.services.demo_service import (
    STAFF_NAMES,
    ConflictError,
    DemoService,
    NotFoundError,
    Run,
    StaffingRequest,
)

log = logging.getLogger("triagex.facetime")

ROSTER_PATH = Path(__file__).resolve().parents[1] / "data" / "staff_roster.json"
CHECK_TTL = timedelta(minutes=2)
MIN_CONFIDENCE = 0.8
# What the caller may say, as normalized by the agent; anything else never confirms.
VERBAL_CONFIRMATIONS = {"confirm", "i confirm"}
MAX_CALLS = 200
MAX_CHECKS = 500


@dataclass(slots=True, frozen=True)
class RosterEntry:
    card_id: str
    staff_id: str
    name: str
    role: str
    unit: str
    availability: str
    shift: str | None


def load_roster(path: Path = ROSTER_PATH) -> dict[str, RosterEntry]:
    data = json.loads(path.read_text(encoding="utf-8"))
    roster = {}
    for s in data["staff"]:
        entry = RosterEntry(
            card_id=s["card_id"].upper(), staff_id=s["staff_id"], name=s["name"],
            role=s["role"], unit=s["unit"], availability=s["availability"].upper(),
            shift=s.get("shift"),
        )  # fmt: skip
        if entry.staff_id not in STAFF_NAMES:
            raise ValueError(f"Roster staff_id '{entry.staff_id}' is not a DEMO_STAFF member")
        roster[entry.card_id] = entry
    return roster


def normalize_card_id(value: str | None) -> str:
    return re.sub(r"[\s‐-―−._-]+", "-", (value or "").strip().upper()).strip("-")


def _role_matches(read_role: str | None, roster_role: str) -> bool:
    """The card's role must name the roster role's profession. Text read from a camera is
    noisy (a live read gave "Nurse - Emergency" for "Registered Nurse · Emergency"), so a
    missing role is allowed and a read role needs only one of the roster role's words."""
    if not read_role:
        return True
    words = set(re.findall(r"[a-z]+", read_role.casefold()))
    return bool(words & set(re.findall(r"[a-z]+", roster_role.casefold())))


# Reasons and what the agent should say. The message never claims anything the backend
# did not decide.
REASONS = {
    "valid": "on the TriageX DEMO roster and available",
    "no_active_request": "there is no open TriageX DEMO staffing request right now",
    "low_confidence": "the card was not read clearly enough",
    "not_on_roster": "is not on the TriageX DEMO roster",
    "off_duty": "is on the roster but marked OFF DUTY",
    "role_mismatch": "does not match the roster role",
    "already_confirmed": "has already confirmed this request",
    "request_full": "the staffing request is already fully confirmed",
    "request_expired": "the staffing request has expired",
}


@dataclass(slots=True)
class CardCheck:
    check_id: str
    call_id: str
    run_id: str | None
    request_id: str | None
    card_id: str
    read_name: str | None
    read_role: str | None
    read_availability: str | None
    confidence: float
    valid: bool
    reason: str
    staff_id: str | None
    display_name: str | None
    checked_at: datetime

    @property
    def message(self) -> str:
        who = f"Card {self.card_id}"
        if self.valid:
            return f"{who}, {self.display_name}, is {REASONS['valid']}."
        if self.reason in ("not_on_roster", "off_duty", "role_mismatch", "already_confirmed"):
            return f"{who} {REASONS[self.reason]}."
        return f"{who} cannot be accepted: {REASONS[self.reason]}."


@dataclass(slots=True)
class FaceTimeCall:
    call_id: str
    run_id: str | None
    connected_at: datetime
    status: str = "connected"  # connected | ended
    ended_at: datetime | None = None
    checks: list[CardCheck] = field(default_factory=list)
    confirmed_staff_ids: set[str] = field(default_factory=set)


@dataclass(slots=True)
class ConfirmResult:
    confirmed: bool
    duplicate: bool
    reason: str
    message: str
    run: Run | None = None  # set only when this call changed the run
    staff_id: str | None = None
    display_name: str | None = None
    request_id: str | None = None
    confirmed_count: int | None = None
    requested: int | None = None
    effective_clock: str | None = None


class FaceTimeService:
    def __init__(
        self,
        demo: DemoService,
        roster: dict[str, RosterEntry] | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        enabled: bool = False,
    ):
        self.demo = demo
        self.enabled = enabled  # True when the agent token is configured
        self.roster = roster if roster is not None else load_roster()
        self.clock = clock
        self._lock = threading.RLock()
        self._calls: dict[str, FaceTimeCall] = {}
        self.last_contact_at: datetime | None = None  # last authenticated agent request
        demo.facetime = self

    # --- queries ----------------------------------------------------------------------
    def open_request(self, run: Run) -> StaffingRequest | None:
        """The most recently approved request that can still take confirmations."""
        open_ = [
            r
            for r in run.staffing_requests.values()
            if self.demo.request_status(r) in ("awaiting_replies", "partially_confirmed")
        ]
        return max(open_, key=lambda r: r.approved_at, default=None)

    def calls_for_run(self, run_id: str) -> list[FaceTimeCall]:
        with self._lock:
            return [c for c in self._calls.values() if c.run_id == run_id]

    def checks_for_request(self, request_id: str) -> list[CardCheck]:
        with self._lock:
            return [k for c in self._calls.values() for k in c.checks if k.request_id == request_id]

    # --- call lifecycle ---------------------------------------------------------------
    def call_event(self, call_id: str, event: str) -> FaceTimeCall:
        with self._lock:
            call = self._call(call_id)
            if event == "ended" and call.status != "ended":
                call.status, call.ended_at = "ended", self.clock()
            elif event == "connected" and call.status == "ended":
                call.status, call.ended_at = "connected", None
            return call

    def _call(self, call_id: str) -> FaceTimeCall:
        call = self._calls.get(call_id)
        if call is None:
            run_id = self.demo.active_run().run_id
            call = FaceTimeCall(call_id=call_id, run_id=run_id, connected_at=self.clock())
            self._calls[call_id] = call
            while len(self._calls) > MAX_CALLS:
                self._calls.pop(next(iter(self._calls)))
        return call

    # --- card check -------------------------------------------------------------------
    def card_check(
        self,
        call_id: str,
        card_id: str,
        name: str | None,
        role: str | None,
        availability: str | None,
        confidence: float,
    ) -> CardCheck:
        with self._lock:
            call = self._call(call_id)
            run = self.demo.active_run()
            request = self.open_request(run)
            cid = normalize_card_id(card_id)
            entry = self.roster.get(cid)
            reason = "valid"
            if request is None:
                reason = self._closed_reason(run)
            elif confidence < MIN_CONFIDENCE:
                reason = "low_confidence"
            elif entry is None:
                reason = "not_on_roster"
            elif entry.availability != "AVAILABLE":
                reason = "off_duty"
            elif not _role_matches(role, entry.role):
                reason = "role_mismatch"
            elif entry.staff_id in {c.staff_id for c in request.confirmations}:
                reason = "already_confirmed"
            check = CardCheck(
                check_id=f"chk-{uuid.uuid4().hex[:10]}",
                call_id=call_id,
                run_id=run.run_id,
                request_id=request.request_id if request else None,
                card_id=cid,
                read_name=name,
                read_role=role,
                read_availability=availability,
                confidence=confidence,
                valid=reason == "valid",
                reason=reason,
                staff_id=entry.staff_id if entry else None,
                display_name=entry.name if entry else None,
                checked_at=self.clock(),
            )
            call.run_id = run.run_id
            call.checks.append(check)
            del call.checks[:-MAX_CHECKS]
            log.info("card check", extra={"call_id": call_id, "card_id": cid,
                                          "valid": check.valid, "reason": reason})  # fmt: skip
            return check

    def _closed_reason(self, run: Run) -> str:
        latest = max(run.staffing_requests.values(), key=lambda r: r.approved_at, default=None)
        if latest is None:
            return "no_active_request"
        status = self.demo.request_status(latest)
        return {"fully_confirmed": "request_full", "expired": "request_expired"}.get(
            status, "no_active_request"
        )

    # --- confirmation -----------------------------------------------------------------
    def confirm(self, call_id: str, card_id: str, verbal_confirmation: str) -> ConfirmResult:
        """Record the caller's confirmation exactly once. Requires a valid card check on this
        call, for this card, within CHECK_TTL, on the active run's open request."""
        verbal = " ".join(verbal_confirmation.casefold().split()).strip(" .!")
        cid = normalize_card_id(card_id)
        with self._lock:
            call = self._calls.get(call_id)
            if verbal not in VERBAL_CONFIRMATIONS:
                return ConfirmResult(False, False, "no_verbal_confirmation",
                                     "The caller has not said 'I confirm'.")  # fmt: skip
            check = None
            if call is not None:
                now = self.clock()
                check = next(
                    (
                        k
                        for k in reversed(call.checks)
                        if k.card_id == cid and now - k.checked_at <= CHECK_TTL
                    ),
                    None,
                )
            if check is None:
                return ConfirmResult(
                    False,
                    False,
                    "no_prior_check",
                    f"Card {cid} has no recent card check on this call.",
                )
            if not check.valid:
                return ConfirmResult(False, False, check.reason, check.message)
            assert call is not None and check.staff_id and check.request_id and check.run_id
            run = self.demo.get_run(check.run_id) if self._run_exists(check.run_id) else None
            if run is None or run.run_id != self.demo.active_run().run_id:
                return ConfirmResult(False, False, "stale_run",
                                     "The demo was reset after this card check.")  # fmt: skip
            request = run.staffing_requests.get(check.request_id)
            if check.staff_id in call.confirmed_staff_ids or (
                request is not None
                and any(
                    c.staff_id == check.staff_id and c.source == "facetime"
                    for c in request.confirmations
                )  # fmt: skip
            ):
                return self._result(run, request, check, confirmed=True, duplicate=True,
                                    reason="duplicate", changed=False)  # fmt: skip
            try:
                run, _ = self.demo.confirm_live(
                    run.run_id, check.request_id, check.staff_id, check.display_name or
                    STAFF_NAMES[check.staff_id], "IN", source="facetime",
                )  # fmt: skip
            except (ConflictError, NotFoundError) as exc:
                return ConfirmResult(False, False, "rejected_request", str(exc))
            call.confirmed_staff_ids.add(check.staff_id)
            request = run.staffing_requests[check.request_id]
            log.info(
                "facetime confirmation",
                extra={
                    "call_id": call_id,
                    "staff_id": check.staff_id,
                    "confirmed": request.confirmed_staff,
                },
            )
            return self._result(run, request, check, confirmed=True, duplicate=False,
                                reason="confirmed", changed=True)  # fmt: skip

    def _run_exists(self, run_id: str) -> bool:
        try:
            self.demo.get_run(run_id)
            return True
        except NotFoundError:
            return False

    def _result(
        self,
        run: Run,
        request: StaffingRequest | None,
        check: CardCheck,
        *,
        confirmed: bool,
        duplicate: bool,
        reason: str,
        changed: bool,
    ) -> ConfirmResult:
        effective = None
        if request is not None:
            effective = run.scenario.clock_label(request.intervention().effective_tick)
        name = check.display_name or ""
        msg = (f"{name} is already confirmed." if duplicate else
               f"{name} is confirmed for the surge shift starting {effective}.")  # fmt: skip
        return ConfirmResult(
            confirmed, duplicate, reason, msg, run if changed else None, check.staff_id,
            check.display_name, check.request_id,
            request.confirmed_staff if request else None,
            request.requested_staff if request else None, effective,
        )  # fmt: skip
