"""Chert integration endpoints: signed inbound webhook, credential check, outbound delivery.

POST /api/webhooks/chert            Chert -> TriageX (message.received), signature-verified
POST /api/integrations/chert/check  re-run the credential check against Chert
"""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.repositories.messaging import OutreachRow, WebhookRow
from app.repositories.persistence import build_snapshot
from app.services.dashboard import build_dashboard
from app.services.demo_service import NotFoundError, Run
from app.services.outreach import OutreachRecord, OutreachService

router = APIRouter(tags=["chert"])
log = logging.getLogger("triagex.chert")


def _outreach(app: FastAPI) -> OutreachService:
    return app.state.outreach


def _submit(app: FastAPI, item) -> None:
    writer = app.state.persistence
    if writer.enabled:
        try:
            writer.submit(item)
        except Exception:
            log.exception("could not queue messaging row")


async def publish_run(app: FastAPI, run: Run, reason: str) -> None:
    """Persist a snapshot of the run and notify every dashboard (same path as the API)."""
    state = build_dashboard(app.state.demo_service, run)
    _submit(app, build_snapshot(run, state, reason))
    await app.state.ws_manager.broadcast(
        {
            "type": "run.updated",
            "run_id": run.run_id,
            "version": run.version,
            "reason": reason,
            "recompute_ms": run.last_recompute_ms,
        }
    )


def start_outreach(app: FastAPI, run: Run, request_id: str) -> int:
    """Called after an approval. Sends nothing unless live messaging is configured. Delivery
    runs in the background so the approval response never waits on Chert."""
    records = _outreach(app).prepare(run, request_id)
    if not records:
        return 0
    for r in records:
        _submit(app, OutreachRow.of(r))
    task = asyncio.get_running_loop().create_task(_deliver(app, run.run_id, records))
    tasks: set = app.state.background_tasks
    tasks.add(task)
    task.add_done_callback(tasks.discard)
    return len(records)


async def _deliver(app: FastAPI, run_id: str, records: list[OutreachRecord]) -> None:
    outreach = _outreach(app)
    try:
        if outreach.shared:  # baseline first, so no earlier message can confirm this request
            await run_in_threadpool(outreach.prime_shared)
        await run_in_threadpool(outreach.deliver, records)
    except Exception:
        log.exception("outreach delivery crashed")
        for r in records:
            if r.status == "sending":
                r.status, r.error = "failed", "delivery crashed"
    for r in records:
        _submit(app, OutreachRow.of(r))
    try:
        run = app.state.demo_service.touch(run_id)
    except NotFoundError:  # the demo was reset meanwhile
        return
    await publish_run(app, run, "outreach_sent")
    if outreach.shared:
        ensure_shared_polling(app)


SHARED_POLL_S = 2.0


def ensure_shared_polling(app: FastAPI) -> None:
    """Poll GET /shared-messages every 2 s while a shared-line message awaits a reply; the
    loop stops by itself when none does. At most one loop runs."""
    current = getattr(app.state, "shared_poller", None)
    if current is not None and not current.done():
        return
    task = asyncio.get_running_loop().create_task(_poll_shared(app))
    app.state.shared_poller = task
    tasks: set = app.state.background_tasks
    tasks.add(task)
    task.add_done_callback(tasks.discard)


async def _poll_shared(app: FastAPI) -> None:
    outreach = _outreach(app)
    try:
        while await run_in_threadpool(outreach.awaiting_shared):
            outcomes = await run_in_threadpool(outreach.poll_shared)
            for o in outcomes:
                _submit(app, WebhookRow.of(o))
                if o.record is not None:
                    _submit(app, OutreachRow.of(o.record))
                if o.run is not None:
                    await publish_run(app, o.run, "staff_confirmed_live")
            await asyncio.sleep(SHARED_POLL_S)
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("shared-messages polling crashed")


@router.post("/webhooks/chert")
async def chert_webhook(request: Request) -> JSONResponse:
    started = time.perf_counter()
    raw = await request.body()  # verified byte-for-byte; never re-serialized
    outreach = _outreach(request.app)
    outcome = await run_in_threadpool(outreach.handle_webhook, raw, dict(request.headers))
    if outcome.outcome != "not_configured":
        _submit(request.app, WebhookRow.of(outcome))
    body = {"outcome": outcome.outcome, "detail": outcome.detail, "event_id": outcome.event_id}
    if outcome.run is not None:
        if outcome.record is not None:
            _submit(request.app, OutreachRow.of(outcome.record))
        await publish_run(request.app, outcome.run, "staff_confirmed_live")
        body["version"] = outcome.run.version
    body["server_ms"] = round((time.perf_counter() - started) * 1000, 2)
    return JSONResponse(body, status_code=outcome.http_status)


@router.post("/integrations/chert/check")
async def chert_check(request: Request) -> dict:
    outreach = _outreach(request.app)
    await run_in_threadpool(outreach.check_connection)
    status, detail = outreach.health()
    return {"status": status, "detail": detail, "checked_at": outreach.checked_at}
