"""Outbound Chert FaceTime Video calls for document intake."""

from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from livekit.api import AccessToken, LiveKitAPI, VideoGrants
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest
from livekit.protocol.models import ParticipantInfo
from livekit.protocol.room import CreateRoomRequest, ListParticipantsRequest

from app.core.config import Settings

CHERT_CALLS_BASE = "https://facetime.trychert.com/api/v1"


@dataclass
class ChertSession:
    session_id: str
    patient_id: str
    call_id: str | None
    room_name: str
    status: str
    created_at: str
    error: str | None = None
    document_id: str | None = None
    source_label: str | None = None
    raw_call: dict[str, Any] = field(default_factory=dict)


_SESSIONS: dict[str, ChertSession] = {}


def get_session(session_id: str) -> ChertSession | None:
    return _SESSIONS.get(session_id)


def mark_uploaded(
    session_id: str, document_id: str, source_label: str | None
) -> ChertSession | None:
    session = _SESSIONS.get(session_id)
    if not session:
        return None
    session.document_id = document_id
    session.source_label = source_label
    session.status = "uploaded"
    return session


def _require_chert(settings: Settings) -> None:
    missing = []
    if not settings.chert_api_key:
        missing.append("CHERT_API_KEY")
    if not settings.chert_project_id:
        missing.append("CHERT_PROJECT_ID")
    if not settings.chert_line_id:
        missing.append("CHERT_LINE_ID")
    if not settings.chert_destination_phone:
        missing.append("CHERT_DESTINATION_PHONE")
    if missing:
        raise RuntimeError(f"Missing Chert config: {', '.join(missing)}")


def _require_livekit(settings: Settings) -> None:
    missing = []
    if not settings.livekit_url:
        missing.append("LIVEKIT_URL")
    if not settings.livekit_api_key:
        missing.append("LIVEKIT_API_KEY")
    if not settings.livekit_api_secret:
        missing.append("LIVEKIT_API_SECRET")
    if missing:
        raise RuntimeError(
            "Outbound ringing requires your own LiveKit project. "
            f"Missing: {', '.join(missing)}. "
            "Create one at https://cloud.livekit.io and put the values in .env "
            "(and in agents/document-intake/.env.local)."
        )


def _livekit_http_url(url: str) -> str:
    """LiveKitAPI wants an https host; Chert/outbound still get the original wss URL."""
    trimmed = url.strip().rstrip("/")
    if trimmed.startswith("wss://"):
        return "https://" + trimmed[len("wss://") :]
    if trimmed.startswith("ws://"):
        return "http://" + trimmed[len("ws://") :]
    return trimmed


def _mint_token(
    *,
    api_key: str,
    api_secret: str,
    identity: str,
    room: str,
    ttl: timedelta,
) -> str:
    grant = VideoGrants(
        room_join=True,
        room=room,
        can_publish=True,
        can_subscribe=True,
        can_update_own_metadata=True,
    )
    return (
        AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_grants(grant)
        .with_ttl(ttl)
        .to_jwt()
    )


def _is_agent_participant(participant: ParticipantInfo) -> bool:
    kind = int(getattr(participant, "kind", 0) or 0)
    identity = participant.identity or ""
    # ParticipantInfo.Kind.AGENT == 4 in livekit protocol
    return kind == 4 or identity.startswith("agent-")


def _agent_has_audio(participant: ParticipantInfo) -> bool:
    for track in participant.tracks or []:
        # TrackType.AUDIO == 0
        if int(getattr(track, "type", -1)) == 0 and not bool(getattr(track, "muted", False)):
            return True
    return False


def _pick_ready_agent(participants: list[ParticipantInfo]) -> ParticipantInfo | None:
    """Prefer an agent that already published unmuted audio (Chert requirement)."""
    agents = [p for p in participants if _is_agent_participant(p)]
    for participant in agents:
        if _agent_has_audio(participant):
            return participant
    return None


async def _wait_for_agent_identity(
    lk: LiveKitAPI, room_name: str, *, timeout_s: float = 25.0
) -> str:
    deadline = asyncio.get_event_loop().time() + timeout_s
    last_ids: list[str] = []
    while asyncio.get_event_loop().time() < deadline:
        listed = await lk.room.list_participants(ListParticipantsRequest(room=room_name))
        participants = list(listed.participants or [])
        last_ids = [
            f"{p.identity}(audio={_agent_has_audio(p)})" for p in participants if p.identity
        ]
        ready = _pick_ready_agent(participants)
        if ready and ready.identity:
            return ready.identity
        await asyncio.sleep(0.5)
    raise RuntimeError(
        "Timed out waiting for document-intake to join LiveKit with an unmuted audio track. "
        f"Seen: {last_ids or 'none'}. Restart `npm start` in agents/document-intake."
    )


async def start_document_ring(
    settings: Settings,
    *,
    patient_id: str,
    requirement_title: str | None = None,
) -> ChertSession:
    _require_chert(settings)
    _require_livekit(settings)

    session_id = str(uuid.uuid4())
    room_name = f"unburden-{patient_id}-{session_id[:8]}"
    dispatch_name = settings.chert_agent_name
    bridge_identity = f"chert-bridge-out-{session_id[:8]}"
    meta: dict[str, str] = {
        "patient_id": patient_id,
        "session_id": session_id,
        "unburden_patient_id": patient_id,
        "unburden_session_id": session_id,
    }
    if requirement_title:
        meta["requirement_title"] = requirement_title
    metadata = json.dumps(meta)

    session = ChertSession(
        session_id=session_id,
        patient_id=patient_id,
        call_id=None,
        room_name=room_name,
        status="preparing",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _SESSIONS[session_id] = session

    lk = LiveKitAPI(
        _livekit_http_url(settings.livekit_url),
        settings.livekit_api_key,
        settings.livekit_api_secret,
    )
    try:
        await lk.room.create_room(CreateRoomRequest(name=room_name, empty_timeout=300))
        await lk.agent_dispatch.create_dispatch(
            CreateAgentDispatchRequest(
                agent_name=dispatch_name,
                room=room_name,
                metadata=metadata,
            )
        )
        # Chert looks up this exact LiveKit identity; dispatch name != participant identity.
        agent_identity = await _wait_for_agent_identity(lk, room_name)
        session.raw_call = {"agent_identity": agent_identity, "room_name": room_name}

        bridge_token = _mint_token(
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
            identity=bridge_identity,
            room=room_name,
            ttl=timedelta(hours=2),
        )

        payload = {
            "direction": "outbound",
            "mode": "customer_managed",
            "line_id": settings.chert_line_id,
            "destination": settings.chert_destination_phone,
            "destination_type": "phone",
            "media": {"audio": True, "video": True},
            "livekit_url": settings.livekit_url,
            "participant_token": bridge_token,
            "remote_participant_identity": agent_identity,
        }
        headers = {
            "Authorization": f"Bearer {settings.chert_api_key}",
            "X-Chert-Project-Id": settings.chert_project_id,
            "Idempotency-Key": f"unburden-ring-{session_id}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{CHERT_CALLS_BASE}/calls",
                headers=headers,
                json=payload,
            )
            body: Any = response.json() if response.content else {}
            if response.status_code not in (200, 201):
                session.status = "failed"
                session.error = f"Chert call create failed ({response.status_code}): {body}"
                raise RuntimeError(session.error)

            data = body.get("data") or body
            session.call_id = data.get("id") if isinstance(data, dict) else None
            if isinstance(data, dict):
                session.raw_call = {**session.raw_call, **data}
            session.status = "ringing"
            return session
    except Exception as exc:
        if session.status != "failed":
            session.status = "failed"
            session.error = str(exc)
        raise
    finally:
        await lk.aclose()


async def refresh_session(settings: Settings, session: ChertSession) -> ChertSession:
    if not session.call_id or session.status in {"uploaded", "failed", "ended"}:
        return session
    if not settings.chert_api_key or not settings.chert_project_id:
        return session

    headers = {
        "Authorization": f"Bearer {settings.chert_api_key}",
        "X-Chert-Project-Id": settings.chert_project_id,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{CHERT_CALLS_BASE}/calls/{session.call_id}",
            headers=headers,
        )
        if response.status_code != 200:
            return session
        body = response.json()
        data = body.get("data") or body
        if not isinstance(data, dict):
            return session
        session.raw_call = data
        status = str(data.get("status") or session.status)
        if session.status != "uploaded":
            session.status = status
            if status in {"ended", "failed"} and data.get("terminal_reason"):
                session.error = str(data.get("terminal_reason"))
    return session
