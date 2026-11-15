"""Chert hackathon (Shared/trial) line: iMessage through the project API.

Read from https://app.trychert.com/skills.md on 2026-11-14:
- Base https://app.trychert.com/api/v1. Every request sends
  "Authorization: Bearer $CHERT_API_KEY" and "X-Chert-Project-Id: <project ID>", plus
  "Idempotency-Key: <8 to 200 characters>" on every POST.
- POST /shared-messages {"line_id": "<line UUID>", "recipient": "<verified phone>",
  "text": "..."} (text up to 4,000 characters). "A message whose send is `unknown` is kept,
  not sent twice": never retry a send with a new key.
- GET /shared-messages: "The newest 50 messages, sent and received".
- GET /lines: the project's lines and their `id`.
- On a Shared line only phones verified for the project can be reached.

NOT documented: the response bodies of both shared-messages calls (field names, status
codes). The parser below therefore accepts several plausible field names and reports which
ones it saw; run `uv run python -m scripts.chert_inspect` (field names only) against the
live API once before relying on it, as the handoff requires.
"""

from __future__ import annotations

import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime

import httpx

from app.integrations.chert import CheckResult, SendResult, normalize_phone

DEFAULT_SHARED_API_BASE = "https://app.trychert.com/api/v1"
MAX_TEXT = 4000

# Candidate field names, most likely first. Only names, never values, are ever logged.
_ID = ("id", "message_id", "uuid", "guid")
_TEXT = ("text", "body", "content", "message")
_DIRECTION = ("direction", "type", "kind")
_FROM_ME = ("is_from_me", "from_me", "is_me", "outbound")
_PEER = ("sender", "from", "handle", "phone", "from_phone", "sender_phone", "recipient", "to")
_TIME = ("created_at", "received_at", "sent_at", "timestamp", "date", "time")
_LIST_KEYS = ("items", "messages", "data", "results", "shared_messages")


@dataclass(slots=True, frozen=True)
class SharedMessage:
    message_id: str
    inbound: bool | None  # None when the direction could not be determined
    peer: str | None  # the other party's phone (E.164) as reported, if any
    text: str
    created_at: datetime | None


@dataclass(slots=True)
class ListResult:
    ok: bool
    status_code: int | None
    messages: list[SharedMessage] = field(default_factory=list)
    unparsed: int = 0
    field_names: list[str] = field(default_factory=list)
    error: str | None = None


def _first(obj: Mapping, keys: tuple[str, ...]):
    for k in keys:
        if k in obj and obj[k] not in (None, ""):
            return obj[k]
    return None


def _handle(value) -> str | None:
    if isinstance(value, Mapping):
        value = _first(value, ("handle", "phone", "number", "address", "value"))
    return value if isinstance(value, str) else None


def _time(value) -> datetime | None:
    if isinstance(value, (int, float)):
        secs = value / 1000 if value > 1e12 else value
        return datetime.fromtimestamp(secs, UTC)
    if isinstance(value, str):
        try:
            t = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return t if t.tzinfo else t.replace(tzinfo=UTC)
    return None


def parse_message(obj: Mapping) -> SharedMessage | None:
    """One message from GET /shared-messages, or None if it has no id or text."""
    mid = _first(obj, _ID)
    text = _first(obj, _TEXT)
    if isinstance(text, Mapping):  # e.g. {"message": {"text": ...}}
        text = _first(text, _TEXT)
    if not isinstance(mid, (str, int)) or not isinstance(text, str):
        return None
    inbound: bool | None = None
    direction = _first(obj, _DIRECTION)
    if isinstance(direction, str):
        d = direction.lower()
        if d in ("inbound", "incoming", "received", "in", "receive"):
            inbound = True
        elif d in ("outbound", "outgoing", "sent", "out", "send"):
            inbound = False
    if inbound is None:
        from_me = _first(obj, _FROM_ME)
        if isinstance(from_me, bool):
            inbound = not from_me
    peer = None
    keys = ("sender", "from", "handle", "from_phone", "sender_phone") if inbound else _PEER
    for k in keys:
        if (p := normalize_phone(_handle(obj.get(k)))) is not None:
            peer = p
            break
    return SharedMessage(str(mid), inbound, peer, text, _time(_first(obj, _TIME)))


def unwrap(body):
    """Chert wraps responses: {"data": {"items": [...], "total", "limit", "offset"},
    "request_id"} (observed live on GET /lines and GET /shared-messages, 2026-11-14)."""
    for _ in range(3):
        if isinstance(body, Mapping) and isinstance(body.get("data"), Mapping):
            body = body["data"]
        else:
            break
    return body


def list_items(body) -> list:
    body = unwrap(body)
    if isinstance(body, list):
        return body
    if isinstance(body, Mapping):
        return next((body[k] for k in _LIST_KEYS if isinstance(body.get(k), list)), [])
    return []


def parse_list(data) -> tuple[list[SharedMessage], int, list[str]]:
    """(messages, unparsed count, sorted field names seen) from a GET response body."""
    items = list_items(data)
    if not isinstance(items, list):
        return [], 0, []
    names: set[str] = set()
    out: list[SharedMessage] = []
    unparsed = 0
    for obj in items:
        if not isinstance(obj, Mapping):
            unparsed += 1
            continue
        names.update(obj.keys())
        m = parse_message(obj)
        if m is None:
            unparsed += 1
        else:
            out.append(m)
    return out, unparsed, sorted(names)


class SharedLineClient:
    """Synchronous client (called from worker threads, never the event loop)."""

    shared = True

    def __init__(
        self,
        api_key: str,
        project_id: str,
        line_id: str,
        base_url: str = DEFAULT_SHARED_API_BASE,
        timeout_s: float = 8.0,
        transport: httpx.BaseTransport | None = None,
    ):
        self.line_id = line_id
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout_s,
            transport=transport,
            headers={"Authorization": f"Bearer {api_key}", "X-Chert-Project-Id": project_id},
        )

    def close(self) -> None:
        self._client.close()

    def send(self, phone: str, body: str, idempotency_key: str | None = None) -> SendResult:
        if not idempotency_key or not 8 <= len(idempotency_key) <= 200:
            return SendResult(False, None, error="Idempotency-Key must be 8 to 200 characters")
        started = time.perf_counter()
        try:
            resp = self._client.post(
                "/shared-messages",
                json={"line_id": self.line_id, "recipient": phone, "text": body[:MAX_TEXT]},
                headers={"Idempotency-Key": idempotency_key},
            )
        except httpx.HTTPError as exc:
            # The send state is unknown: it is never retried with a new key.
            return SendResult(False, None, error=f"send state unknown: {type(exc).__name__}",
                              latency_ms=_ms(started))  # fmt: skip
        data = _json(resp)
        ms = _ms(started)
        if resp.status_code < 300:
            data = unwrap(data)
            mid = _first(data, _ID) if isinstance(data, Mapping) else None
            nested = data.get("message") if isinstance(data, Mapping) else None
            if mid is None and isinstance(nested, Mapping):
                mid = _first(nested, _ID)
            return SendResult(True, resp.status_code, str(mid) if mid is not None else None,
                              latency_ms=ms)  # fmt: skip
        reason = ""
        if isinstance(data, Mapping) and "error" not in data:
            data = unwrap(data)
        if isinstance(data, Mapping):
            err = data.get("error")
            reason = (err.get("message") if isinstance(err, Mapping) else err) or data.get(
                "message"
            ) or data.get("code") or ""  # fmt: skip
        error = f"HTTP {resp.status_code}" + (f": {reason}"[:200] if reason else "")
        return SendResult(False, resp.status_code, error=error, latency_ms=ms)

    def list_messages(self) -> ListResult:
        try:
            resp = self._client.get("/shared-messages")
        except httpx.HTTPError as exc:
            return ListResult(False, None, error=f"Chert unreachable: {type(exc).__name__}")
        if resp.status_code >= 300:
            return ListResult(False, resp.status_code, error=f"HTTP {resp.status_code}")
        try:
            data = resp.json()
        except ValueError:
            return ListResult(False, resp.status_code, error="response is not JSON")
        messages, unparsed, names = parse_list(data)
        return ListResult(True, resp.status_code, messages, unparsed, names)

    def check(self) -> CheckResult:
        """Credential check: a real authenticated GET /shared-messages (read-only)."""
        r = self.list_messages()
        if not r.ok:
            return CheckResult(False, r.status_code, f"shared-messages rejected: {r.error}")
        return CheckResult(True, r.status_code,
                           f"GET /shared-messages accepted the API key ({len(r.messages)} "
                           f"recent messages readable)")  # fmt: skip


def _ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)


def _json(resp: httpx.Response):
    try:
        return resp.json()
    except ValueError:
        return {}
