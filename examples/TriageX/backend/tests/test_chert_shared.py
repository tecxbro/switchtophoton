"""Prompt 5: Chert Shared-line iMessage adapter (app.trychert.com project API), with
httpx.MockTransport fixtures. The response shapes are NOT documented by Chert; these
fixtures use one plausible shape and the parser tests cover the others it accepts."""

import json
import time
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

import app.api.chert as chert_api
from app.integrations.chert_shared import SharedLineClient, parse_list
from app.main import create_app
from app.services.demo_service import DemoService
from app.services.outreach import ChertConfig, OutreachService

KEY = "ftk_test_only"
PROJECT = "11111111-2222-3333-4444-555555555555"
LINE = "99999999-8888-7777-6666-555555555555"
PHONE_A = "+15555550101"
PHONE_B = "+15555550102"
STRANGER = "+15555550199"


class FakeClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 14, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class FakeShared:
    """Stands in for app.trychert.com/api/v1/shared-messages."""

    def __init__(self, *, fail_sends=False, list_status=200):
        self.messages: list[dict] = []
        self.requests: list[httpx.Request] = []
        self.sent: list[dict] = []
        self.fail_sends = fail_sends
        self.list_status = list_status
        self._n = 0

    def add(self, sender, text, at, direction="inbound"):
        self._n += 1
        self.messages.append({"id": f"msg-{self._n}", "direction": direction, "from": sender,
                              "text": text, "created_at": at.isoformat()})  # fmt: skip

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path.endswith("/shared-messages") and request.method == "POST":
            body = json.loads(request.content)
            self.sent.append(body)
            if self.fail_sends:
                return httpx.Response(403, json={"error": {"message": "recipient not verified"}})
            self._n += 1
            self.messages.append({"id": f"msg-{self._n}", "direction": "outbound",
                                  "to": body["recipient"], "text": body["text"],
                                  "created_at": datetime.now(UTC).isoformat()})  # fmt: skip
            return httpx.Response(201, json={"id": f"msg-{self._n}", "status": "queued"})
        if request.url.path.endswith("/shared-messages"):
            if self.list_status != 200:
                return httpx.Response(self.list_status, json={"error": "unauthorized"})
            return httpx.Response(200, json={"messages": list(reversed(self.messages[-50:]))})
        return httpx.Response(404, json={})


def make(clock, fake, phones=(PHONE_A, PHONE_B)):
    demo = DemoService(request_ttl=timedelta(minutes=10), clock=clock)
    config = ChertConfig(api_key=KEY, project_id=PROJECT, line_id=LINE, allowed_phones=phones)
    client = SharedLineClient(KEY, PROJECT, LINE, "https://chert.test/api/v1",
                              transport=httpx.MockTransport(fake.handler))  # fmt: skip
    return OutreachService(demo, config, client, clock=clock)


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def fake():
    return FakeShared()


@pytest.fixture
def live(clock, fake, monkeypatch):
    monkeypatch.setattr(chert_api, "SHARED_POLL_S", 0.05)
    outreach = make(clock, fake)
    with TestClient(create_app(outreach=outreach)) as c:
        c.outreach, c.fake, c.clock = outreach, fake, clock
        yield c


def approve_and_send(c) -> dict:
    state = c.post("/api/demo/reset").json()
    card = next(p for p in state["proposals"] if p["recommended"])
    c.post(f"/api/runs/{state['run']['run_id']}/proposals/{card['id']}/approve",
           json={"at_tick": 18})  # fmt: skip
    return wait(c, lambda s: len(s["staffing_requests"][0]["outreach"]) == 2 and all(
        o["status"] != "sending" for o in s["staffing_requests"][0]["outreach"]))  # fmt: skip


def wait(c, predicate, timeout=5.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        state = c.get("/api/demo/state").json()
        if predicate(state):
            return state
        time.sleep(0.03)
    raise AssertionError("condition not reached")


def confs(state):
    return state["staffing_requests"][0]["confirmations"]


def test_send_uses_the_documented_request(live):
    approve_and_send(live)
    posts = [r for r in live.fake.requests if r.method == "POST"]
    assert len(posts) == 2
    for r in posts:
        assert r.headers["authorization"] == f"Bearer {KEY}"
        assert r.headers["x-chert-project-id"] == PROJECT
        assert 8 <= len(r.headers["idempotency-key"]) <= 200
    keys = {r.headers["idempotency-key"] for r in posts}
    assert len(keys) == 2  # one key per outreach message
    for body in live.fake.sent:
        assert body["line_id"] == LINE and body["recipient"] in (PHONE_A, PHONE_B)
        assert body["text"].startswith("TriageX DEMO")
        assert "Reply IN within 10 minutes" in body["text"]


def test_in_reply_confirms_once_as_live_imessage(live):
    approve_and_send(live)
    live.fake.add(PHONE_A, " in ", live.clock.now + timedelta(seconds=20))
    state = wait(live, lambda s: len(confs(s)) == 1)
    assert confs(state)[0]["source"] == "imessage"
    assert any(e["title"] == "Staff Confirmed" and "live iMessage" in e["detail"]
               for e in state["feed"])  # fmt: skip
    time.sleep(0.3)  # the same message is returned by every later poll: still one
    assert len(confs(live.get("/api/demo/state").json())) == 1


def test_messages_from_before_our_send_never_confirm(live):
    # An old "IN" already on the line (baseline), and one dated before our message.
    live.fake.add(PHONE_A, "IN", live.clock.now - timedelta(hours=1))
    approve_and_send(live)
    live.fake.add(PHONE_B, "IN", live.clock.now - timedelta(minutes=1))
    time.sleep(0.4)
    assert confs(live.get("/api/demo/state").json()) == []
    assert live.outreach.counters["stale_request"] == 1


@pytest.mark.parametrize(
    ("sender", "text", "outcome"),
    [(STRANGER, "IN", "unknown_sender"), (PHONE_A, "maybe", "not_confirmation_text"),
     (PHONE_A, "IN please", "not_confirmation_text")],
)  # fmt: skip
def test_unknown_senders_and_other_text_change_nothing(live, sender, text, outcome):
    approve_and_send(live)
    live.fake.add(sender, text, live.clock.now + timedelta(seconds=5))
    deadline = time.monotonic() + 3
    while live.outreach.counters[outcome] == 0 and time.monotonic() < deadline:
        time.sleep(0.03)
    assert live.outreach.counters[outcome] == 1
    assert confs(live.get("/api/demo/state").json()) == []


def test_reply_after_expiry_changes_nothing(live):
    approve_and_send(live)
    live.clock.now += timedelta(minutes=10, seconds=1)
    live.fake.add(PHONE_A, "IN", live.clock.now)
    # The request expired, so polling stops; a manual poll shows the rejection.
    outcomes = live.outreach.poll_shared()
    assert [o.outcome for o in outcomes] == ["rejected_request"]
    assert confs(live.get("/api/demo/state").json()) == []


def test_reply_to_a_previous_run_is_stale(live):
    approve_and_send(live)
    live.post("/api/demo/reset")
    live.fake.add(PHONE_A, "IN", live.clock.now + timedelta(seconds=5))
    assert [o.outcome for o in live.outreach.poll_shared()] == ["stale_request"]


def test_failed_send_is_reported_and_cannot_be_confirmed(clock, monkeypatch):
    monkeypatch.setattr(chert_api, "SHARED_POLL_S", 0.05)
    fake = FakeShared(fail_sends=True)
    with TestClient(create_app(outreach=make(clock, fake))) as c:
        state = approve_and_send(c)
        out = state["staffing_requests"][0]["outreach"]
        assert {o["status"] for o in out} == {"failed"}
        assert "HTTP 403" in out[0]["error"]
        fake.add(PHONE_A, "IN", clock.now + timedelta(seconds=5))
        time.sleep(0.3)
        assert confs(c.get("/api/demo/state").json()) == []


def test_health_is_ok_only_after_a_real_authenticated_get(clock):
    good = make(clock, FakeShared())
    assert good.health()[0] == "starting"
    good.check_connection()
    status, detail = good.health()
    assert status == "ok" and "GET /shared-messages accepted" in detail
    bad = make(clock, FakeShared(list_status=401))
    bad.check_connection()
    assert bad.health()[0] == "error"
    missing = OutreachService(DemoService(clock=clock), ChertConfig(api_key=KEY), clock=clock)
    status, detail = missing.health()
    assert status == "not_configured" and "CHERT_PROJECT_ID" in detail and "CHERT_LINE_ID" in detail


def test_parser_accepts_other_plausible_shapes():
    at = "2026-11-14T12:00:30Z"
    shapes = [
        [{"id": "a", "direction": "inbound", "sender": PHONE_A, "text": "IN", "created_at": at}],
        {"data": [{"message_id": "a", "is_from_me": False, "handle": {"handle": PHONE_A},
                   "body": "IN", "timestamp": 1794657630}]},
        {"items": [{"uuid": "a", "direction": "received", "from_phone": "+1 555 555 0101",
                    "content": "IN", "date": at}]},
    ]  # fmt: skip
    for shape in shapes:
        messages, unparsed, names = parse_list(shape)
        assert unparsed == 0 and names
        m = messages[0]
        assert (m.message_id, m.inbound, m.peer, m.text) == ("a", True, PHONE_A, "IN")
        assert m.created_at is not None and m.created_at.tzinfo is not None
    # The envelope Chert actually returns (observed live on GET /lines and /shared-messages).
    envelope = {"data": {"items": shapes[0], "total": 1, "limit": 50, "offset": 0},
                "request_id": "req_1"}  # fmt: skip
    messages, unparsed, _ = parse_list(envelope)
    assert unparsed == 0 and messages[0].text == "IN"
    assert parse_list({"data": {"items": [], "total": 0, "limit": 50, "offset": 0}}) == ([], 0, [])
    assert parse_list({"weird": 1}) == ([], 0, [])
    _, unparsed, _ = parse_list([{"no_id": True}, "x"])
    assert unparsed == 2


def test_console_api_settings_still_select_the_console_client(clock):
    svc = OutreachService(DemoService(clock=clock), ChertConfig(signing_secret="sk", allowed_phones=(PHONE_A,)), clock=clock)  # noqa: E501
    assert not svc.shared and svc.client is not None


def test_shared_line_events_are_persisted_without_phone_numbers(database, clock, monkeypatch):
    from app.repositories.persistence import PersistenceWriter

    monkeypatch.setattr(chert_api, "SHARED_POLL_S", 0.05)
    writer = PersistenceWriter(database, retry_initial_s=0.05, retry_max_s=0.2)
    fake = FakeShared()
    outreach = make(clock, fake)
    with TestClient(create_app(outreach=outreach, persistence=writer)) as c:
        writer.start()
        approve_and_send(c)
        fake.add(PHONE_A, "IN", clock.now + timedelta(seconds=10))
        fake.add(STRANGER, "IN", clock.now + timedelta(seconds=11))
        wait(c, lambda s: len(confs(s)) == 1)
        deadline = time.monotonic() + 3
        while outreach.counters["unknown_sender"] == 0 and time.monotonic() < deadline:
            time.sleep(0.03)
        assert writer.flush(15), writer.status.last_error
        assert writer.status.dead_letters == []

        def rows(sql):
            with database.connection() as con:
                return con.run(sql)

        assert sorted(map(tuple, rows("SELECT channel, status FROM outreach_events"))) == [
            ("shared", "confirmed"), ("shared", "sent")]  # fmt: skip
        hooks = rows("SELECT channel, outcome, signature_valid FROM webhook_events")
        assert sorted(map(tuple, hooks)) == [
            ("shared_poll", "confirmed", False),
            ("shared_poll", "unknown_sender", False),
        ]
        assert rows("SELECT source FROM staff_confirmations") == [["imessage"]]
        dump = json.dumps(rows("SELECT row_to_json(o)::text FROM outreach_events o")
                          + rows("SELECT row_to_json(w)::text FROM webhook_events w"))  # fmt: skip
        assert PHONE_A not in dump and STRANGER not in dump
    writer.stop()
