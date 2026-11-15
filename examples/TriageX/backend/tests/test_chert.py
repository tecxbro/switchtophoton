"""Phase 6: Chert outreach and signed webhook replies.

Chert's HTTP API is replaced by an httpx.MockTransport and webhook deliveries are signed
fixtures built exactly as documented (HMAC-SHA256 over "<ts>." + raw body). These tests
prove TriageX's handling; they are NOT evidence that a live iMessage round trip works.
"""

import json
import threading
import time
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.integrations.chert import (
    SignatureError,
    mask_phone,
    normalize_phone,
    parse_event,
    sign_webhook,
    verify_webhook_signature,
)
from app.main import create_app
from app.services.demo_service import DemoService
from app.services.outreach import ChertClient, ChertConfig, OutreachService, outreach_message

SECRET = "whsec_test_only"
SIGNING = "sk_test_only"
PHONE_A = "+15555550101"
PHONE_B = "+15555550102"
STRANGER = "+15555550199"
BASE_URL = "https://tunnel.example"
WEBHOOK = "/api/webhooks/chert"


class FakeClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class FakeChert:
    """Stands in for console.trychert.com. Records every request it receives."""

    def __init__(self, *, fail_sends: bool = False, whoami_status: int = 200,
                 subscribed_url: str | None = f"{BASE_URL}{WEBHOOK}"):  # fmt: skip
        self.sent: list[dict] = []
        self.headers: list[httpx.Headers] = []
        self.fail_sends = fail_sends
        self.whoami_status = whoami_status
        self.subscribed_url = subscribed_url

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.headers.append(request.headers)
        path = request.url.path
        if path.endswith("/send"):
            body = json.loads(request.content)
            self.sent.append(body)
            if self.fail_sends:
                return httpx.Response(400, json={
                    "status": "failed", "code": 1003,
                    "retryable": False, "reason": "invalid phone",
                })  # fmt: skip
            return httpx.Response(200, json={
                "status": "sent", "message_id": uuid.uuid4().hex,
                "lead_id": f"chat-{body['phone'][-4:]}", "lead_created": True,
            })  # fmt: skip
        if path.endswith("/whoami"):
            return httpx.Response(self.whoami_status, json={"tenant": "test"})
        if path.endswith("/webhook-subscriptions"):
            subs = []
            if self.subscribed_url:
                subs.append({"id": "sub-1", "url": self.subscribed_url,
                             "events": ["message.received"], "is_active": True})  # fmt: skip
            return httpx.Response(200, json={"subscriptions": subs})
        return httpx.Response(404, json={})


def make_outreach(clock, fake: FakeChert | None, *, webhook_secret=SECRET,
                  phones=(PHONE_A, PHONE_B), tenant="triagex-test"):  # fmt: skip
    demo = DemoService(request_ttl=timedelta(minutes=10), clock=clock)
    config = ChertConfig(
        signing_secret=SIGNING if fake else None, tenant=tenant, webhook_secret=webhook_secret,
        allowed_phones=tuple(phones), public_base_url=BASE_URL,
    )  # fmt: skip
    client = (
        ChertClient(SIGNING, tenant, "https://chert.test/api/v1",
                    transport=httpx.MockTransport(fake.handler))
        if fake else None
    )  # fmt: skip
    return OutreachService(demo, config, client, clock=clock)


def event(sender=PHONE_A, text="IN", *, chat_id=None, event_id=None, direction="inbound",
          is_me=False, event_type="message.received") -> dict:  # fmt: skip
    """A message.received payload shaped like the documented example."""
    return {
        "event_id": event_id or f"chert:msg:{uuid.uuid4().hex[:24]}",
        "event_type": event_type,
        "api_version": "2026-04-01",
        "created_at": "2026-11-14T12:01:00.000Z",
        "partner_id": "triagex-test",
        "data": {
            "chat": {"id": chat_id or f"chat-{sender[-4:]}",
                     "owner_handle": {"handle": "+15555550000"}},
            "message": {
                "id": uuid.uuid4().hex, "direction": direction,
                "sender_handle": {"handle": sender, "service": "imessage", "is_me": is_me},
                "parts": [{"type": "text", "value": text}],
            },
        },
    }  # fmt: skip


def post_webhook(client, payload, *, secret=SECRET, ts=None, legacy=False, raw=None):
    body = raw if raw is not None else json.dumps(payload).encode()
    sig = sign_webhook(body, secret, ts)
    if legacy:
        t, v = sig.split(",")
        headers = {"x-chert-signature": f"v1,{t[2:]},{v[3:]}"}
    else:
        headers = {"X-Webhook-Signature": sig}
    headers |= {"content-type": "application/json", "X-Webhook-Event": "message.received"}
    return client.post(WEBHOOK, content=body, headers=headers)


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def fake():
    return FakeChert()


@pytest.fixture
def live(clock, fake):
    outreach = make_outreach(clock, fake)
    with TestClient(create_app(outreach=outreach)) as c:
        c.outreach, c.fake, c.clock = outreach, fake, clock
        yield c


def reset(client) -> dict:
    r = client.post("/api/demo/reset")
    assert r.status_code == 200, r.text
    return r.json()


def approve(client, state) -> dict:
    """Approve the headline proposal at 16:30 (tick 18), as in the demo."""
    card = next(p for p in state["proposals"] if p["recommended"])
    assert card["tick"] == 17  # 16:15 proposal, verified Phase 3 timeline
    r = client.post(f"/api/runs/{state['run']['run_id']}/proposals/{card['id']}/approve",
                    json={"at_tick": 18})  # fmt: skip
    assert r.status_code == 200, r.text
    return r.json()


def wait_sent(client, run_id, n=2, timeout=5.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = client.get(f"/api/runs/{run_id}").json()
        out = state["staffing_requests"][0]["outreach"]
        if len(out) == n and all(o["status"] != "sending" for o in out):
            return state
        time.sleep(0.02)
    raise AssertionError("outreach was not delivered")


def request_of(state) -> dict:
    return state["staffing_requests"][0]


def approved_and_sent(client) -> dict:
    state = reset(client)
    approve(client, state)
    return wait_sent(client, state["run"]["run_id"])


# --- signature verification ------------------------------------------------------------
BODY = b'{"event_id":"e1","event_type":"message.received"}'


def test_valid_modern_and_legacy_signatures_verify():
    now = time.time()
    sig = sign_webhook(BODY, SECRET, int(now))
    assert verify_webhook_signature(BODY, {"X-Webhook-Signature": sig}, SECRET, now) == int(now)
    t, v = sig.split(",")
    legacy = {"x-chert-signature": f"v1,{t[2:]},{v[3:]}"}
    assert verify_webhook_signature(BODY, legacy, SECRET, now) == int(now)


@pytest.mark.parametrize(
    ("headers_for", "reason"),
    [
        (lambda s: {}, "missing"),
        (lambda s: {"X-Webhook-Signature": "garbage"}, "malformed"),
        (lambda s: {"X-Webhook-Signature": s.replace("v1=", "v1=00")}, "mismatch"),
        (lambda s: {"X-Webhook-Signature": sign_webhook(BODY, "wrong-secret")}, "mismatch"),
        (lambda s: {"X-Webhook-Signature": sign_webhook(BODY + b" ", SECRET)}, "mismatch"),
        (lambda s: {"X-Webhook-Signature": sign_webhook(BODY, SECRET, int(time.time()) - 301)},
         "tolerance"),
        (lambda s: {"X-Webhook-Signature": sign_webhook(BODY, SECRET, int(time.time()) + 301)},
         "tolerance"),
    ],
)
def test_bad_signatures_are_rejected(headers_for, reason):
    with pytest.raises(SignatureError, match=reason):
        verify_webhook_signature(BODY, headers_for(sign_webhook(BODY, SECRET)), SECRET)


def test_empty_secret_never_verifies():
    with pytest.raises(SignatureError):
        verify_webhook_signature(BODY, {"X-Webhook-Signature": sign_webhook(BODY, "")}, "")


def test_phone_allowlist_requires_e164():
    assert normalize_phone("+1 (555) 555-0101") == PHONE_A
    for bad in ("5555550101", "15555550101", "+0123456789", "user@example.com", "", None):
        assert normalize_phone(bad) is None
    assert mask_phone(PHONE_A) == "•••0101"


def test_parse_event_reads_documented_fields():
    e = parse_event(event(PHONE_A, " In "))
    assert (e.event_type, e.chat_id, e.sender, e.direction, e.text) == (
        "message.received", "chat-0101", PHONE_A, "inbound", " In ")
    with pytest.raises(ValueError):
        parse_event({"data": {}})


# --- outbound ---------------------------------------------------------------------------
def test_outreach_message_is_prefixed_and_unambiguous():
    msg = outreach_message("Grady")
    assert msg.startswith("TriageX DEMO")
    assert "Reply IN within 10 minutes" in msg and "fictional" in msg


def test_approval_sends_only_to_opted_in_recipients_with_signed_requests(live):
    state = approved_and_sent(live)
    sent = live.fake.sent
    assert sorted(s["phone"] for s in sent) == [PHONE_A, PHONE_B]
    assert all(s["body"].startswith("TriageX DEMO") for s in sent)
    send_headers = [h for h in live.fake.headers if "x-chert-signature" in h]
    assert send_headers and all(h["x-chert-tenant"] == "triagex-test" for h in send_headers)
    out = request_of(state)["outreach"]
    assert {o["recipient"] for o in out} == {"•••0101", "•••0102"}
    assert all(o["status"] == "sent" for o in out)
    assert PHONE_A not in json.dumps(state)  # full numbers never reach the dashboard
    assert any(f["kind"] == "outreach_sent" and f["origin"] == "live_message"
               for f in state["feed"])  # fmt: skip
    assert request_of(state)["confirmed_staff"] == 0  # sending confirms nobody


def test_failed_send_is_reported_and_cannot_be_confirmed(clock):
    fake = FakeChert(fail_sends=True)
    with TestClient(create_app(outreach=make_outreach(clock, fake))) as c:
        state = approved_and_sent(c)
        out = request_of(state)["outreach"]
        assert all(o["status"] == "failed" and "1003" in o["error"] for o in out)
        assert not any(f["kind"] == "outreach_sent" for f in state["feed"])
        r = post_webhook(c, event(PHONE_A))
        assert r.json()["outcome"] == "unknown_sender"
        assert request_of(c.get("/api/demo/state").json())["confirmed_staff"] == 0


# --- the demo flow ----------------------------------------------------------------------
def test_valid_in_reply_confirms_exactly_once_and_pushes_to_dashboards(live):
    before = approved_and_sent(live)
    run_id = before["run"]["run_id"]
    with live.websocket_connect("/ws") as ws:
        assert ws.receive_json()["type"] == "hello"
        sent_at = time.perf_counter()
        r = post_webhook(live, event(PHONE_A, "IN"))
        assert r.status_code == 200 and r.json()["outcome"] == "confirmed", r.text
        msg = ws.receive_json()
        push_ms = (time.perf_counter() - sent_at) * 1000
    assert msg["type"] == "run.updated" and msg["reason"] == "staff_confirmed_live"
    assert msg["run_id"] == run_id and msg["version"] == before["run"]["version"] + 1
    assert push_ms < 5000, push_ms  # acceptance: on the dashboard within 5 s of receipt

    after = live.get(f"/api/runs/{run_id}").json()
    req = request_of(after)
    assert req["confirmed_staff"] == 1
    [conf] = req["confirmations"]
    assert conf["source"] == "webhook" and conf["display_name"] == "Teammate •••0101"
    assert {o["recipient"]: o["status"] for o in req["outreach"]} == {
        "•••0101": "confirmed", "•••0102": "sent"}
    feed = [f for f in after["feed"] if f["kind"] == "staff_confirmed"]
    assert len(feed) == 1 and feed[0]["origin"] == "webhook"
    assert live.outreach.counters["confirmed"] == 1


def test_live_confirmation_preserves_baseline_and_45_minute_lead_time(live):
    before = approved_and_sent(live)
    assert post_webhook(live, event(PHONE_A)).json()["outcome"] == "confirmed"
    after = live.get(f"/api/runs/{before['run']['run_id']}").json()
    req = request_of(after)
    assert (req["approved_tick"], req["approved_clock"]) == (18, "16:30")
    assert (req["effective_tick"], req["effective_clock"]) == (21, "17:15")  # +45 min

    def baseline(state):
        curve = [{k: v for k, v in p.items() if k.startswith("baseline_")}
                 for p in state["curves"]["points"]]  # fmt: skip
        return curve, [s["baseline"] for s in state["series"]]

    assert baseline(after) == baseline(before)  # the baseline never changes
    for s in after["series"]:  # identical futures at every hospital until 17:15
        assert s["triagex"][:21] == s["baseline"][:21]
    for p in after["curves"]["points"]:
        if p["tick"] < 21:
            assert p["triagex_ambulance_hours_cumulative"] == p[
                "baseline_ambulance_hours_cumulative"]
            assert p["ambulance_hours_saved_so_far"] == 0
    assert after["divergence"]["tick"] >= 21


def test_live_and_simulated_replies_share_one_request(live):
    state = approved_and_sent(live)
    rid, req_id = state["run"]["run_id"], request_of(state)["request_id"]
    assert post_webhook(live, event(PHONE_A)).json()["outcome"] == "confirmed"
    sim = live.post(f"/api/runs/{rid}/staffing-requests/{req_id}/simulate-reply")
    assert sim.status_code == 200
    assert post_webhook(live, event(PHONE_B, "in")).json()["outcome"] == "confirmed"
    req = request_of(live.get(f"/api/runs/{rid}").json())
    assert req["confirmed_staff"] == 3 and req["status"] == "fully_confirmed"
    assert [c["source"] for c in req["confirmations"]] == ["webhook", "simulated", "webhook"]


# --- duplicates -------------------------------------------------------------------------
def test_duplicate_delivery_never_adds_staff(live):
    approved_and_sent(live)
    payload = event(PHONE_A, event_id="chert:msg:retry-me")
    first = post_webhook(live, payload)
    retry = post_webhook(live, payload)  # Chert retry: same event_id, fresh signature
    legacy_retry = post_webhook(live, payload, legacy=True)
    assert first.json()["outcome"] == "confirmed"
    assert retry.status_code == 200 and retry.json()["outcome"] == "duplicate_event"
    assert legacy_retry.json()["outcome"] == "duplicate_event"
    # A second, distinct "IN" from the same teammate is not another staff member either.
    again = post_webhook(live, event(PHONE_A, "IN"))
    assert again.json()["outcome"] == "already_confirmed"
    assert request_of(live.get("/api/demo/state").json())["confirmed_staff"] == 1


def test_concurrent_duplicate_deliveries_confirm_once(live):
    approved_and_sent(live)
    body = json.dumps(event(PHONE_A, event_id="chert:msg:race")).encode()
    headers = {"X-Webhook-Signature": sign_webhook(body, SECRET)}
    outcomes: list[str] = []
    threads = [
        threading.Thread(target=lambda: outcomes.append(
            live.outreach.handle_webhook(body, headers).outcome))
        for _ in range(8)
    ]  # fmt: skip
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(outcomes) == ["confirmed"] + ["duplicate_event"] * 7
    assert request_of(live.get("/api/demo/state").json())["confirmed_staff"] == 1


# --- replies that must not change anything -------------------------------------------
def _unchanged(client, before: dict) -> None:
    after = client.get(f"/api/runs/{before['run']['run_id']}").json()
    assert after["run"]["version"] == before["run"]["version"]
    assert request_of(after)["confirmed_staff"] == 0
    assert after["curves"] == before["curves"]


@pytest.mark.parametrize(
    ("kwargs", "status", "outcome"),
    [
        ({"secret": "attacker-secret"}, 401, "invalid_signature"),
        ({"ts": int(time.time()) - 600}, 401, "invalid_signature"),  # stale / replayed
        ({"raw": b"not json"}, 400, "malformed"),
    ],
)
def test_unverified_or_malformed_deliveries_change_nothing(live, kwargs, status, outcome):
    before = approved_and_sent(live)
    r = post_webhook(live, event(PHONE_A), **kwargs)
    assert r.status_code == status and r.json()["outcome"] == outcome
    _unchanged(live, before)


def test_tampered_body_is_rejected(live):
    before = approved_and_sent(live)
    signed = json.dumps(event(PHONE_A, "NO")).encode()
    tampered = signed.replace(b'"NO"', b'"IN"')
    r = live.post(WEBHOOK, content=tampered,
                  headers={"X-Webhook-Signature": sign_webhook(signed, SECRET)})  # fmt: skip
    assert r.status_code == 401
    _unchanged(live, before)


@pytest.mark.parametrize(
    ("payload", "outcome"),
    [
        (lambda: event(STRANGER, chat_id="chat-unknown"), "unknown_sender"),
        (lambda: event(PHONE_A, "Yes"), "not_confirmation_text"),
        (lambda: event(PHONE_A, "IN please"), "not_confirmation_text"),
        (lambda: event(PHONE_A, "OUT"), "not_confirmation_text"),
        (lambda: event(PHONE_A, direction="outbound"), "ignored_outbound"),
        (lambda: event(PHONE_A, is_me=True), "ignored_outbound"),
        (lambda: event(PHONE_A, event_type="reaction.added"), "ignored_event_type"),
    ],
)
def test_unauthorized_or_non_confirming_replies_change_nothing(live, payload, outcome):
    before = approved_and_sent(live)
    r = post_webhook(live, payload())
    assert r.status_code == 200 and r.json()["outcome"] == outcome  # 200: no Chert retry
    _unchanged(live, before)


def test_reply_from_an_apple_id_correlates_by_chat_id(live):
    approved_and_sent(live)
    r = post_webhook(live, event("teammate@icloud.com", "IN", chat_id="chat-0102"))
    assert r.json()["outcome"] == "confirmed"
    [conf] = request_of(live.get("/api/demo/state").json())["confirmations"]
    assert conf["display_name"] == "Teammate •••0102"


def test_reply_after_the_10_minute_expiry_changes_nothing(live):
    before = approved_and_sent(live)
    live.clock.now += timedelta(minutes=10, seconds=1)
    r = post_webhook(live, event(PHONE_A))
    assert r.json()["outcome"] == "rejected_request" and "expired" in r.json()["detail"]
    _unchanged(live, before)


def test_reply_to_a_previous_run_changes_nothing(live):
    approved_and_sent(live)
    fresh = reset(live)
    r = post_webhook(live, event(PHONE_A))
    assert r.json()["outcome"] == "stale_request"
    assert live.get(f"/api/runs/{fresh['run']['run_id']}").json()["staffing_requests"] == []


def test_reply_before_any_outreach_changes_nothing(live):
    state = reset(live)
    r = post_webhook(live, event(PHONE_A))
    assert r.json()["outcome"] == "unknown_sender"
    assert live.get(f"/api/runs/{state['run']['run_id']}").json()["run"]["version"] == 1


# --- not configured: clearly labeled fallback ------------------------------------------
def test_without_chert_nothing_is_sent_and_the_simulated_fallback_works(clock):
    outreach = make_outreach(clock, None, webhook_secret=None, phones=())
    with TestClient(create_app(outreach=outreach)) as c:
        health = c.get("/api/integrations/health").json()["messaging"]
        assert health["status"] == "not_configured"
        for name in ("CHERT_SIGNING_SECRET", "CHERT_WEBHOOK_SECRET", "DEMO_ALLOWED_PHONES"):
            assert name in health["detail"]
        state = reset(c)
        assert state["messaging"]["live"] is False
        assert state["messaging"]["status"] == "not_configured"
        approved = approve(c, state)
        req = request_of(approved)
        assert req["outreach"] == []
        r = c.post(f"/api/runs/{state['run']['run_id']}/staffing-requests/"
                   f"{req['request_id']}/simulate-reply")  # fmt: skip
        assert r.status_code == 200
        conf = request_of(r.json())["confirmations"][0]
        assert conf["source"] == "simulated"
        # A webhook cannot be verified without the secret: 503 and no state change.
        hook = post_webhook(c, event(PHONE_A))
        assert hook.status_code == 503 and hook.json()["outcome"] == "not_configured"
        assert request_of(c.get("/api/demo/state").json())["confirmed_staff"] == 1


# --- health: "ok" only after Chert itself accepted the credentials --------------------
def _health(clock, fake, **kw):
    outreach = make_outreach(clock, fake, **kw)
    outreach.check_connection()
    return outreach.health()


def test_health_is_ok_only_when_chert_accepts_and_webhook_is_subscribed(clock):
    status, detail = _health(clock, FakeChert())
    assert status == "ok" and "whoami HTTP 200" in detail and "webhook subscribed" in detail
    assert "no live reply verified yet" in detail


def test_health_reports_rejected_credentials(clock):
    status, detail = _health(clock, FakeChert(whoami_status=401))
    assert status == "error" and "401" in detail


def test_health_reports_missing_subscription_and_secret(clock):
    status, detail = _health(clock, FakeChert(subscribed_url="https://elsewhere/x"))
    assert status == "error" and "no active message.received subscription" in detail
    status, detail = _health(clock, FakeChert(), webhook_secret=None)
    assert status == "error" and "CHERT_WEBHOOK_SECRET" in detail


def test_health_before_the_first_check_is_starting(clock):
    assert make_outreach(clock, FakeChert()).health()[0] == "starting"


def test_outreach_and_webhook_events_are_persisted(database, clock):
    from app.repositories.persistence import PersistenceWriter

    writer = PersistenceWriter(database, retry_initial_s=0.05, retry_max_s=0.2)
    fake = FakeChert()
    with TestClient(create_app(outreach=make_outreach(clock, fake), persistence=writer)) as c:
        writer.start()
        state = approved_and_sent(c)
        run_id = state["run"]["run_id"]
        payload = event(PHONE_A, event_id="chert:msg:persist-1")
        assert post_webhook(c, payload).json()["outcome"] == "confirmed"
        assert post_webhook(c, payload).json()["outcome"] == "duplicate_event"
        assert post_webhook(c, event(PHONE_B), secret="bad").status_code == 401
        assert post_webhook(c, event(PHONE_B, "maybe")).json()["outcome"] == (
            "not_confirmation_text")
        assert writer.flush(15), writer.status.last_error
        assert writer.status.dead_letters == []

        def rows(sql, **p):
            with database.connection() as con:
                return con.run(sql, **p)

        outreach = rows("SELECT recipient_mask, status, body, chert_chat_id FROM outreach_events "
                        "WHERE run_id = :r ORDER BY recipient_mask", r=run_id)  # fmt: skip
        assert [(o[0], o[1]) for o in outreach] == [("•••0101", "confirmed"), ("•••0102", "sent")]
        assert all(o[2].startswith("TriageX DEMO") and o[3] for o in outreach)
        hooks = rows("SELECT outcome, http_status, signature_valid, run_id FROM webhook_events "
                     "ORDER BY received_at")  # fmt: skip
        assert [(h[0], h[1], h[2]) for h in hooks] == [
            ("confirmed", 200, True), ("duplicate_event", 200, True),
            ("invalid_signature", 401, False), ("not_confirmation_text", 200, True)]  # fmt: skip
        assert rows("SELECT count(*) FROM webhook_events WHERE event_id = 'chert:msg:persist-1' "
                    "AND outcome = 'confirmed'")[0][0] == 1  # fmt: skip
        assert rows("SELECT source, display_name FROM staff_confirmations") == [
            ["webhook", "Teammate •••0101"]]
        dump = json.dumps(rows("SELECT row_to_json(o)::text FROM outreach_events o")
                          + rows("SELECT row_to_json(w)::text FROM webhook_events w"))
        assert PHONE_A not in dump and PHONE_B not in dump  # numbers are never stored

        insights = c.get(f"/api/runs/{run_id}/db/insights").json()["queries"]
        counts = dict(insights["stored_row_counts"]["rows"])
        assert counts["outreach_events"] == 2 and counts["webhook_events"] == 3
        assert len(insights["messaging_events"]["rows"]) == 5
    writer.stop()


def test_check_endpoint_reruns_the_credential_check(live):
    r = live.post("/api/integrations/chert/check")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    assert live.get("/api/integrations/health").json()["messaging"]["status"] == "ok"
