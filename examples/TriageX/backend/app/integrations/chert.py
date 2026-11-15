"""Chert iMessage API: outbound sends, credential checks, and inbound webhook verification.

Verified against docs.trychert.com on 2026-11-14 (pages: api/quickstart, api/authentication,
api/receiving-replies, api/webhook-subscriptions, api/errors):

- Send: POST {base}/send with JSON {"phone": "+1...", "body": "..."}. Success returns
  {"status": "sent", "message_id", "lead_id", ...}; lead_id is the chat id that inbound
  events carry as data.chat.id. Failures return {"status": "failed", "code", "retryable",
  "reason" | "message"}.
- Request auth: x-chert-signature "v1,<unix_seconds>,<hex>" (HMAC-SHA256 of "<ts>." + raw
  body with the signing secret) plus x-chert-tenant; or Authorization: Bearer <secret>.
- Identity: GET {base}/whoami confirms the tenant (response shape not documented, so only
  the HTTP status is trusted).
- Webhooks: X-Webhook-Signature "t=<ts>,v1=<hex>" (legacy x-chert-signature "v1,<ts>,<hex>"),
  HMAC-SHA256 of "<ts>." + raw body with the *subscription* secret, 300 s tolerance,
  at-least-once delivery deduplicated on event_id, 5xx retried (3 attempts), 4xx not.
- Inbound message.received: data.chat.id, data.message.{id, direction, sender_handle.handle,
  sender_handle.is_me, parts[{type: "text", value}]}.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime

import httpx

DEFAULT_API_BASE = "https://console.trychert.com/api/v1"
SIGNATURE_TOLERANCE_S = 300
WEBHOOK_PATH = "/api/webhooks/chert"

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")
_MODERN_SIG = re.compile(r"^t=(\d+),v1=([a-f0-9]+)$")
_LEGACY_SIG = re.compile(r"^v1,(\d+),([a-f0-9]+)$")


# --- phone numbers -------------------------------------------------------------------------
def normalize_phone(value: str | None) -> str | None:
    """Return an E.164 number, or None. Only explicit '+<country><number>' is accepted, so a
    misconfigured allowlist can never message an unintended recipient."""
    if not value:
        return None
    cleaned = re.sub(r"[\s\-().]", "", value.strip())
    return cleaned if _E164.match(cleaned) else None


def mask_phone(phone: str) -> str:
    return f"•••{phone[-4:]}"


def phone_hash(phone: str) -> str:
    """Stable, non-reversible id for storage and correlation logs."""
    return hashlib.sha256(phone.encode()).hexdigest()[:16]


# --- signatures ----------------------------------------------------------------------------
class SignatureError(ValueError):
    pass


def _hmac_hex(secret: str, ts: int | str, raw_body: bytes) -> str:
    return hmac.new(secret.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256).hexdigest()


def sign_webhook(raw_body: bytes, secret: str, ts: int | None = None) -> str:
    """Build an X-Webhook-Signature value exactly as Chert does (used by tests and fixtures)."""
    ts = int(time.time()) if ts is None else ts
    return f"t={ts},v1={_hmac_hex(secret, ts, raw_body)}"


def verify_webhook_signature(
    raw_body: bytes, headers: Mapping[str, str], secret: str, now: float | None = None
) -> int:
    """Verify a webhook delivery against the raw body. Returns the signed timestamp.

    Accepts the recommended X-Webhook-Signature header and the legacy x-chert-signature
    header. Raises SignatureError on anything else."""
    if not secret:
        raise SignatureError("webhook secret not configured")
    lowered = {k.lower(): v for k, v in headers.items()}
    match = None
    if modern := lowered.get("x-webhook-signature"):
        match = _MODERN_SIG.match(modern.strip())
    elif legacy := lowered.get("x-chert-signature"):
        match = _LEGACY_SIG.match(legacy.strip())
    else:
        raise SignatureError("missing signature header")
    if match is None:
        raise SignatureError("malformed signature header")
    ts, received = int(match.group(1)), match.group(2)
    now = time.time() if now is None else now
    if abs(now - ts) > SIGNATURE_TOLERANCE_S:
        raise SignatureError("signature timestamp outside the 300 s tolerance")
    if not hmac.compare_digest(received, _hmac_hex(secret, ts, raw_body)):
        raise SignatureError("signature mismatch")
    return ts


# --- inbound events ------------------------------------------------------------------------
@dataclass(slots=True, frozen=True)
class InboundEvent:
    event_id: str
    event_type: str
    chat_id: str | None
    message_id: str | None
    direction: str | None
    sender: str | None  # phone (E.164) or Apple ID email, as Chert reports it
    is_me: bool
    text: str
    created_at: datetime | None = None  # when Chert says the message was created (polling)


def parse_event(payload: Mapping) -> InboundEvent:
    """Extract the fields TriageX uses. Raises ValueError if the envelope is unusable."""
    event_id = payload.get("event_id")
    event_type = payload.get("event_type")
    if not isinstance(event_id, str) or not event_id or not isinstance(event_type, str):
        raise ValueError("event_id and event_type are required")
    def obj(parent: Mapping, key: str) -> Mapping:
        value = parent.get(key)
        return value if isinstance(value, Mapping) else {}

    data = obj(payload, "data")
    chat, message = obj(data, "chat"), obj(data, "message")
    sender = obj(message, "sender_handle")
    parts = message.get("parts") if isinstance(message.get("parts"), list) else []
    text = " ".join(
        str(p.get("value", ""))
        for p in parts
        if isinstance(p, Mapping) and p.get("type") == "text"
    )
    return InboundEvent(
        event_id=event_id,
        event_type=event_type,
        chat_id=chat.get("id") if isinstance(chat.get("id"), str) else None,
        message_id=message.get("id") if isinstance(message.get("id"), str) else None,
        direction=message.get("direction") if isinstance(message.get("direction"), str) else None,
        sender=sender.get("handle") if isinstance(sender.get("handle"), str) else None,
        is_me=bool(sender.get("is_me", False)),
        text=text,
    )


# --- outbound client -----------------------------------------------------------------------
@dataclass(slots=True)
class SendResult:
    ok: bool
    status_code: int | None
    message_id: str | None = None
    lead_id: str | None = None
    error: str | None = None
    latency_ms: float = 0.0


@dataclass(slots=True)
class CheckResult:
    ok: bool
    status_code: int | None
    detail: str
    subscriptions: list[dict] = field(default_factory=list)


class ChertClient:
    """Synchronous Chert API client (called from worker threads, never the event loop)."""

    def __init__(
        self,
        signing_secret: str,
        tenant: str | None = None,
        base_url: str = DEFAULT_API_BASE,
        timeout_s: float = 8.0,
        transport: httpx.BaseTransport | None = None,
    ):
        self._secret = signing_secret
        self._tenant = tenant or None
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"), timeout=timeout_s, transport=transport
        )

    def close(self) -> None:
        self._client.close()

    def _headers(self, body: bytes) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self._tenant:  # HMAC request signing (Chert's recommended mode)
            ts = int(time.time())
            headers["x-chert-tenant"] = self._tenant
            headers["x-chert-signature"] = f"v1,{ts},{_hmac_hex(self._secret, ts, body)}"
        else:
            headers["authorization"] = f"Bearer {self._secret}"
        return headers

    def _request(self, method: str, path: str, payload: dict | None = None) -> httpx.Response:
        body = b"" if payload is None else json.dumps(payload, separators=(",", ":")).encode()
        # The body is sent byte-for-byte as signed.
        return self._client.request(method, path, content=body or None, headers=self._headers(body))

    def send(self, phone: str, body: str) -> SendResult:
        started = time.perf_counter()
        try:
            resp = self._request("POST", "/send", {"phone": phone, "body": body})
        except httpx.HTTPError as exc:
            return SendResult(False, None, error=f"{type(exc).__name__}: {exc}"[:300],
                              latency_ms=_ms(started))  # fmt: skip
        data = _json(resp)
        if resp.status_code < 300 and data.get("status") == "sent":
            return SendResult(True, resp.status_code, data.get("message_id"), data.get("lead_id"),
                              latency_ms=_ms(started))  # fmt: skip
        reason = data.get("reason") or data.get("message") or data.get("error") or resp.text[:200]
        code = data.get("code")
        return SendResult(False, resp.status_code,
                          error=f"HTTP {resp.status_code}" + (f" code {code}" if code else "")
                          + (f": {reason}" if reason else ""),
                          latency_ms=_ms(started))  # fmt: skip

    def create_subscription(self, url: str) -> tuple[int, dict]:
        """POST /webhook-subscriptions for message.received. The response carries
        subscription.secret exactly once."""
        resp = self._request("POST", "/webhook-subscriptions",
                             {"url": url, "events": ["message.received"]})  # fmt: skip
        return resp.status_code, _json(resp)

    def check(self) -> CheckResult:
        """Credential check: GET /whoami, then list webhook subscriptions."""
        try:
            who = self._request("GET", "/whoami")
        except httpx.HTTPError as exc:
            return CheckResult(False, None, f"Chert unreachable: {type(exc).__name__}")
        if who.status_code >= 300:
            return CheckResult(False, who.status_code, f"whoami rejected: HTTP {who.status_code}")
        subs: list[dict] = []
        try:
            resp = self._request("GET", "/webhook-subscriptions")
            if resp.status_code < 300:
                raw = _json(resp).get("subscriptions")
                subs = [s for s in raw if isinstance(s, dict)] if isinstance(raw, list) else []
        except httpx.HTTPError:
            pass
        return CheckResult(True, who.status_code, "whoami accepted the credentials", subs)


def _ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)


def _json(resp: httpx.Response) -> dict:
    try:
        data = resp.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}
