"""Chert FaceTime document-intake endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services import chert_calls

router = APIRouter(prefix="/patients/{patient_id}/chert", tags=["chert"])

RINGABLE_PATIENT_ID = "patient-raymond-yao"


class ChertSessionOut(BaseModel):
    session_id: str
    patient_id: str
    call_id: str | None = None
    room_name: str
    status: str
    created_at: str
    error: str | None = None
    document_id: str | None = None
    source_label: str | None = None


class UploadedBody(BaseModel):
    document_id: str = Field(min_length=1)
    source_label: str | None = None


class RingBody(BaseModel):
    requirement_title: str | None = Field(default=None, max_length=300)


def _to_out(session: chert_calls.ChertSession) -> ChertSessionOut:
    return ChertSessionOut(
        session_id=session.session_id,
        patient_id=session.patient_id,
        call_id=session.call_id,
        room_name=session.room_name,
        status=session.status,
        created_at=session.created_at,
        error=session.error,
        document_id=session.document_id,
        source_label=session.source_label,
    )


@router.post("/ring", response_model=ChertSessionOut)
async def ring_document_assistant(
    patient_id: str, body: RingBody = RingBody()
) -> ChertSessionOut:
    if patient_id != RINGABLE_PATIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="FaceTime document assistant is only enabled for the Raymond Yao demo patient.",
        )
    settings = get_settings()
    requirement_title = (body.requirement_title or "").strip() or None
    try:
        session = await chert_calls.start_document_ring(
            settings,
            patient_id=patient_id,
            requirement_title=requirement_title,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — surface Chert/LiveKit failures to the UI
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return _to_out(session)


@router.get("/sessions/{session_id}", response_model=ChertSessionOut)
async def get_chert_session(patient_id: str, session_id: str) -> ChertSessionOut:
    session = chert_calls.get_session(session_id)
    if not session or session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")
    settings = get_settings()
    session = await chert_calls.refresh_session(settings, session)
    return _to_out(session)


@router.post("/sessions/{session_id}/uploaded", response_model=ChertSessionOut)
async def mark_session_uploaded(
    patient_id: str, session_id: str, body: UploadedBody
) -> ChertSessionOut:
    session = chert_calls.get_session(session_id)
    if not session or session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")
    updated = chert_calls.mark_uploaded(session_id, body.document_id, body.source_label)
    assert updated is not None
    return _to_out(updated)
