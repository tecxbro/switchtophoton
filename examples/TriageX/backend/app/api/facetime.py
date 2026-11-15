"""Endpoints for the FaceTime agent (agent/). Every call needs X-TriageX-Agent-Token.

GET  /api/agent/active-request   the open staffing request the caller can confirm, or 404
POST /api/agent/call             {call_id, event: connected | ended}
POST /api/agent/card-check       card fields read from live video -> roster decision
POST /api/agent/confirm          {call_id, card_id, verbal_confirmation} -> one confirmation

The backend binds to 127.0.0.1 (see docs); the token is compared in constant time.
"""

from __future__ import annotations

import hmac
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.chert import _submit, publish_run
from app.config import get_settings
from app.repositories.facetime import CardCheckRow, FaceTimeCallRow
from app.services.facetime import FaceTimeService

router = APIRouter(prefix="/agent", tags=["facetime-agent"])
log = logging.getLogger("triagex.facetime.api")

TOKEN_HEADER = "X-TriageX-Agent-Token"


def require_agent_token(request: Request) -> None:
    expected = get_settings().triagex_agent_token
    if not expected:
        raise HTTPException(503, "TRIAGEX_AGENT_TOKEN is not configured on the backend")
    given = request.headers.get(TOKEN_HEADER, "")
    if not hmac.compare_digest(given.encode(), expected.encode()):
        raise HTTPException(401, "Invalid or missing agent token")
    ft = request.app.state.facetime
    ft.last_contact_at = ft.clock()


def _ft(request: Request) -> FaceTimeService:
    return request.app.state.facetime


class CallEvent(BaseModel):
    call_id: str = Field(min_length=1, max_length=128)
    event: Literal["connected", "ended"]


class CardCheckIn(BaseModel):
    call_id: str = Field(min_length=1, max_length=128)
    card_id: str = Field(min_length=1, max_length=40)
    name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    availability: str | None = Field(default=None, max_length=40)
    confidence: float = Field(ge=0, le=1)


class ConfirmIn(BaseModel):
    call_id: str = Field(min_length=1, max_length=128)
    card_id: str = Field(min_length=1, max_length=40)
    verbal_confirmation: str = Field(min_length=1, max_length=40)


@router.get("/active-request", dependencies=[Depends(require_agent_token)])
async def active_request(request: Request) -> dict:
    ft = _ft(request)
    run = ft.demo.active_run()
    req = ft.open_request(run)
    if req is None:
        raise HTTPException(404, "No open staffing request")
    hospital = run.network.get(req.hospital_id)
    iv = req.intervention()
    return {
        "run_id": run.run_id,
        "request_id": req.request_id,
        "hospital_id": req.hospital_id,
        "hospital": hospital.short_name,
        "requested": req.requested_staff,
        "confirmed": req.confirmed_staff,
        "shift_starts": run.scenario.clock_label(iv.effective_tick),
        "expires_at": req.expires_at.isoformat(),
    }


@router.post("/call", dependencies=[Depends(require_agent_token)])
async def call_event(request: Request, body: CallEvent) -> dict:
    ft = _ft(request)
    call = ft.call_event(body.call_id, body.event)
    _submit(request.app, FaceTimeCallRow.of(call))
    run = ft.demo.touch(call.run_id) if call.run_id else None
    if run is not None:
        await publish_run(request.app, run, f"facetime_{body.event}")
    return {"call_id": call.call_id, "status": call.status}


@router.post("/card-check", dependencies=[Depends(require_agent_token)])
async def card_check(request: Request, body: CardCheckIn) -> dict:
    ft = _ft(request)
    check = ft.card_check(body.call_id, body.card_id, body.name, body.role, body.availability,
                          body.confidence)  # fmt: skip
    _submit(request.app, CardCheckRow.of(check))
    if check.run_id:
        await publish_run(request.app, ft.demo.touch(check.run_id), "facetime_card_check")
    return {
        "valid": check.valid,
        "reason": check.reason,
        "message": check.message,
        "card_id": check.card_id,
        "staff_id": check.staff_id,
        "display_name": check.display_name,
        "request_id": check.request_id,
    }


@router.post("/confirm", dependencies=[Depends(require_agent_token)])
async def confirm(request: Request, body: ConfirmIn) -> dict:
    ft = _ft(request)
    result = ft.confirm(body.call_id, body.card_id, body.verbal_confirmation)
    if result.run is not None:
        await publish_run(request.app, result.run, "staff_confirmed_facetime")
    status = 200 if result.confirmed else 409
    payload = {
        "confirmed": result.confirmed,
        "duplicate": result.duplicate,
        "reason": result.reason,
        "message": result.message,
        "staff_id": result.staff_id,
        "display_name": result.display_name,
        "confirmed_count": result.confirmed_count,
        "requested": result.requested,
        "shift_starts": result.effective_clock,
    }
    if status != 200:
        raise HTTPException(status, payload)
    return payload
