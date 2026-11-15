"""iMessage follow-ups through Chert, plus the Chert webhook endpoint.

Sending (verified against https://app.trychert.com/skills.md, "HTTP API" section):

    POST https://app.trychert.com/api/v1/shared-messages
    Authorization: Bearer $CHERT_API_KEY          (project API key, ftk_...)
    X-Chert-Project-Id: $CHERT_PROJECT_ID
    Idempotency-Key: <8..200 chars, unique per message>
    {"line_id": "<line UUID>", "recipient": "<verified phone>", "text": "<= 4000 chars"}

Limits from the same page: on a Shared line you can only text phones verified for the project,
and on the free trial the agent can only REPLY, within 24 hours of that phone's last text.
So for the demo, text the line once from the demo phone before calling.

The shared-messages endpoint documents no media field, so the screenshot goes in as a link.
(Chert's separate Messaging API on console.trychert.com does support uploads - see
TODO(verify) in send_followup.)

Webhook (verified against https://docs.trychert.com/api/receiving-replies and /api/authentication):
HMAC-SHA256 with the *subscription* secret over "<ts>.<raw body>", lowercase hex, either
``X-Webhook-Signature: t=<ts>,v1=<hex>`` (recommended) or legacy ``x-chert-signature: v1,<ts>,<hex>``;
reject if the timestamp is more than 300 s off; answer 401 on failure; dedupe on event id.

Env: CHERT_API_KEY, CHERT_PROJECT_ID, CHERT_LINE_ID (optional; looked up if empty),
CHERT_WEBHOOK_SECRET, SCANSAFE_RESULT_BASE (default https://api.scansafe.nyc/r, served by api/routes_result.py).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
import uuid
from collections import OrderedDict, deque
from typing import Any, Mapping, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

log = logging.getLogger("scansafe.chert")

CHERT_API_BASE = os.getenv("CHERT_API_BASE", "https://app.trychert.com/api/v1").rstrip("/")
SIGNATURE_TOLERANCE_S = 300
MAX_TEXT = 4000


# --- Sending -----------------------------------------------------------------------------------

def _headers(idempotency_key: Optional[str] = None) -> dict:
    h = {
        "Authorization": f"Bearer {os.getenv('CHERT_API_KEY', '')}",
        "X-Chert-Project-Id": os.getenv("CHERT_PROJECT_ID", ""),
        "Content-Type": "application/json",
    }
    if idempotency_key:
        h["Idempotency-Key"] = idempotency_key
    return h


def _items(data: Any, *keys: str) -> list:
    """Pull a list out of a response that may be a bare list or wrapped in data/lines/messages."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in keys + ("data", "items", "results"):
            v = data.get(k)
            if isinstance(v, list):
                return v
            if isinstance(v, dict):
                inner = _items(v, *keys)
                if inner:
                    return inner
    return []


def get_line_id(client: Optional[httpx.Client] = None) -> Optional[str]:
    """CHERT_LINE_ID, or the first line from GET /lines."""
    if os.getenv("CHERT_LINE_ID"):
        return os.environ["CHERT_LINE_ID"]
    c = client or httpx.Client(timeout=15)
    try:
        r = c.get(f"{CHERT_API_BASE}/lines", headers=_headers())
        r.raise_for_status()
        # TODO(verify): response field names aren't documented; we accept a list or {data|lines: [...]}
        lines = _items(r.json(), "lines")
        return str(lines[0]["id"]) if lines and isinstance(lines[0], dict) and "id" in lines[0] else None
    except (httpx.HTTPError, ValueError, KeyError) as e:
        log.warning("chert: couldn't list lines: %s", e)
        return None
    finally:
        if client is None:
            c.close()


PHONE_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def latest_inbound_sender(client: Optional[httpx.Client] = None) -> Optional[str]:
    """Phone of whoever texted our line most recently (from GET /shared-messages, newest 50).

    FaceTime doesn't hand the agent the caller's number (not in any Chert doc we found), so this
    is how we find who to text. TODO(verify): field names for direction/sender are undocumented;
    we try the common ones and only accept E.164-looking values.
    """
    c = client or httpx.Client(timeout=15)
    try:
        r = c.get(f"{CHERT_API_BASE}/shared-messages", headers=_headers())
        r.raise_for_status()
        msgs = _items(r.json(), "messages", "shared_messages")
    except (httpx.HTTPError, ValueError) as e:
        log.warning("chert: couldn't list messages: %s", e)
        return None
    finally:
        if client is None:
            c.close()
    for m in msgs:  # documented as "newest 50"; assume newest first
        if not isinstance(m, dict):
            continue
        direction = str(m.get("direction") or m.get("type") or "").lower()
        if direction and not direction.startswith(("in", "received")):
            continue
        for key in ("sender", "from", "from_handle", "handle", "phone"):
            v = m.get(key)
            if isinstance(v, dict):
                v = v.get("handle") or v.get("phone") or v.get("id")
            if isinstance(v, str) and PHONE_RE.match(v.strip()):
                return v.strip()
    return None


def _clean(text: str, limit: int) -> str:
    text = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", " ", str(text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    # Keep the follow-up in plain words too.
    text = re.sub(r"\bphishing\b", "scam", text, flags=re.I)
    text = re.sub(r"\b(?:hidden\s+)?redirects?\b", "hidden jumps to other websites", text, flags=re.I)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


HEADLINES = {
    "malicious": "ScanSafe: Please DON'T pay or sign in on this QR code. It looks like a scam.",
    "suspicious": "ScanSafe: Be careful with this QR code. We're not sure it's safe.",
    "safe": "ScanSafe: This QR code looks safe.",
}


def result_link(scan_id: Optional[str]) -> Optional[str]:
    if not scan_id:
        return None
    base = os.getenv("SCANSAFE_RESULT_BASE", "https://api.scansafe.nyc/r").rstrip("/")
    return f"{base}/{scan_id}"


def followup_text(result: Mapping[str, Any]) -> str:
    """The iMessage body: headline, explanation, screenshot + details links, reply options."""
    verdict = result.get("verdict")
    lines = [HEADLINES.get(str(verdict), "ScanSafe: We couldn't finish checking this QR code. "
                                        "Please don't pay or type anything on it for now.")]
    # explanation is model-written after reading the page; it's plain text in a text bubble
    # (not instructions to anyone), trimmed and stripped of control characters.
    if verdict in HEADLINES and result.get("explanation"):
        lines.append(_clean(result["explanation"], 700))
    shots = [s for s in (result.get("screenshots") or []) if isinstance(s, str)
             and s.startswith("https://")]
    if shots:
        lines.append(f"What the page looked like: {shots[0]}")
    link = result_link(result.get("scan_id"))
    if link:
        lines.append(f"Details: {link}")
    if verdict in ("malicious", "suspicious"):
        lines.append("Reply REPORT to warn people nearby, or NEVERMIND to ignore.")
    return "\n\n".join(lines)[:MAX_TEXT]


def send_followup(recipient: str, result: Mapping[str, Any], *,
                  client: Optional[httpx.Client] = None) -> dict:
    """Text the verdict to ``recipient`` (E.164, e.g. +14045551234). Never raises.

    Returns {"ok": bool, "status": int | None, "response"| "error": ...}.
    TODO(verify): the shared-messages endpoint documents no attachment field, so the first
    screenshot is sent as a link. To attach the image itself you'd use the console Messaging
    API (POST console.trychert.com/api/v1/attachments -> PUT bytes -> chats/{id}/messages with a
    {"type": "media", "attachment_id": ...} part), which uses a different signing secret.
    """
    if not os.getenv("CHERT_API_KEY") or not os.getenv("CHERT_PROJECT_ID"):
        return {"ok": False, "status": None, "error": "CHERT_API_KEY / CHERT_PROJECT_ID not set"}
    if not recipient or not PHONE_RE.match(recipient.strip()):
        return {"ok": False, "status": None, "error": "recipient must be an E.164 phone number"}
    c = client or httpx.Client(timeout=20)
    try:
        line_id = get_line_id(c)
        if not line_id:
            return {"ok": False, "status": None, "error": "no Chert line id"}
        # Same scan + same person -> same key, so a retry can't double-text them.
        key = f"scansafe-{result.get('scan_id') or uuid.uuid4().hex}-{recipient.strip().lstrip('+')}"[:200]
        body = {"line_id": line_id, "recipient": recipient.strip(), "text": followup_text(result)}
        r = c.post(f"{CHERT_API_BASE}/shared-messages", headers=_headers(key), json=body)
        try:
            payload: Any = r.json()
        except ValueError:
            payload = r.text[:500]
        ok = 200 <= r.status_code < 300
        if not ok:
            log.warning("chert: send failed %s %s", r.status_code, payload)
        return {"ok": ok, "status": r.status_code, "response": payload}
    except httpx.HTTPError as e:
        log.warning("chert: send error: %s", e)
        return {"ok": False, "status": None, "error": str(e)[:300]}
    finally:
        if client is None:
            c.close()


# --- Webhook -----------------------------------------------------------------------------------

def _parse_signature(headers: Mapping[str, str]) -> tuple[Optional[int], list[str]]:
    """Return (timestamp, [hex signatures]) from either Chert header format."""
    h = {k.lower(): v for k, v in headers.items()}
    new = h.get("x-webhook-signature")
    if new:  # t=<ts>,v1=<hex>[,v1=<hex>]
        ts, sigs = None, []
        for part in new.split(","):
            k, _, v = part.strip().partition("=")
            if k == "t" and v.isdigit():
                ts = int(v)
            elif k == "v1" and v:
                sigs.append(v.strip().lower())
        if ts is None and h.get("x-webhook-timestamp", "").isdigit():
            ts = int(h["x-webhook-timestamp"])
        return ts, sigs
    legacy = h.get("x-chert-signature")
    if legacy:  # v1,<ts>,<hex>
        bits = [b.strip() for b in legacy.split(",")]
        if len(bits) == 3 and bits[0] == "v1" and bits[1].isdigit():
            return int(bits[1]), [bits[2].lower()]
    return None, []


def verify_signature(secret: str, raw_body: bytes, headers: Mapping[str, str],
                     now: Optional[float] = None) -> bool:
    ts, sigs = _parse_signature(headers)
    if ts is None or not sigs:
        return False
    now = time.time() if now is None else now
    if abs(now - ts) > SIGNATURE_TOLERANCE_S:
        return False
    expected = hmac.new(secret.encode(), str(ts).encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in sigs)


def sign_for_test(secret: str, raw_body: bytes, ts: Optional[int] = None) -> str:
    """Build an X-Webhook-Signature value (handy for tests and curl)."""
    ts = int(time.time()) if ts is None else ts
    hex_ = hmac.new(secret.encode(), str(ts).encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return f"t={ts},v1={hex_}"


_seen_events: "OrderedDict[str, None]" = OrderedDict()
recent_events: deque = deque(maxlen=200)       # for debugging (/chert/webhook logs to stdout too)
recent_senders: deque = deque(maxlen=20)       # phones that texted us (message.received)


def _remember(event_id: str) -> bool:
    """False if we've already processed this event (Chert delivers at least once)."""
    if event_id in _seen_events:
        return False
    _seen_events[event_id] = None
    while len(_seen_events) > 1000:
        _seen_events.popitem(last=False)
    return True


router = APIRouter()


@router.post("/chert/webhook")
async def chert_webhook(request: Request) -> dict:
    raw = await request.body()
    secret = os.getenv("CHERT_WEBHOOK_SECRET", "")
    if secret:
        if not verify_signature(secret, raw, request.headers):
            log.warning("chert webhook: bad or missing signature")
            raise HTTPException(status_code=401, detail="bad signature")
    else:
        log.warning("chert webhook: CHERT_WEBHOOK_SECRET not set, accepting unsigned event")
    try:
        event = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="bad json")
    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="bad json")

    event_type = (event.get("event_type") or event.get("type")
                  or request.headers.get("x-webhook-event") or request.headers.get("x-chert-event") or "")
    event_id = (event.get("event_id") or event.get("id") or request.headers.get("x-webhook-event-id")
                or request.headers.get("x-chert-event-id") or hashlib.sha256(raw).hexdigest())
    if not _remember(str(event_id)):
        return {"ok": True, "duplicate": True}

    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    if event_type.startswith("call."):
        # e.g. call.incoming {call_id, line_id, media, from_handle_hash, occurred_at}
        # TODO(verify): call.started / call.ended payloads aren't documented; we log what we get.
        log.info("chert call event %s call_id=%s media=%s", event_type, data.get("call_id"),
                 data.get("media"))
    elif event_type == "message.received":
        msg = data.get("message") if isinstance(data.get("message"), dict) else {}
        # TODO(verify): exact sender path; docs describe "message: id, direction, sender handle, parts"
        sender = msg.get("sender") or msg.get("from") or msg.get("handle")
        if isinstance(sender, dict):
            sender = sender.get("handle") or sender.get("id")
        text = " ".join(str(p.get("value") or p.get("text") or "") for p in (msg.get("parts") or [])
                        if isinstance(p, dict) and p.get("type") == "text").strip()
        if isinstance(sender, str) and PHONE_RE.match(sender):
            recent_senders.appendleft(sender)
        word = text.strip().upper()
        if word in ("REPORT", "NEVERMIND", "CONTINUE"):
            log.info("chert reply %s from ...%s", word, str(sender)[-4:])
        else:
            log.info("chert message.received from ...%s", str(sender)[-4:])
    else:
        log.info("chert event %s", event_type or "(unknown)")
    recent_events.appendleft({"type": event_type, "id": str(event_id), "at": int(time.time())})
    return {"ok": True}
