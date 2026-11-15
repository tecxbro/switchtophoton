from fastapi import APIRouter, BackgroundTasks, Header, Request

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/agentphone")
async def agentphone_webhook(request: Request, bg: BackgroundTasks) -> dict:
    """Receives call lifecycle events from AgentPhone (call ended, transcript ready)."""
    payload = await request.json()
    from app.services.call_processor import handle_agentphone_event
    bg.add_task(handle_agentphone_event, payload)
    return {"ok": True}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    bg: BackgroundTasks,
    stripe_signature: str | None = Header(default=None),
) -> dict:
    body = await request.body()
    from app.services.payments import handle_stripe_event
    bg.add_task(handle_stripe_event, body, stripe_signature)
    return {"received": True}


@router.post("/agentmail")
async def agentmail_webhook(request: Request, bg: BackgroundTasks) -> dict:
    """Inbound email replies routed back to the agent."""
    payload = await request.json()
    # TODO: route reply to agent's inbox handler
    return {"ok": True}
