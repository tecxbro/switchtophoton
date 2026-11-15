"""Post-call execution pipeline (Option C).

T+0   AgentPhone webhook delivers call.ended + transcript.
T+1s  Claude extracts structured booking intent from the transcript.
T+2s  Booking executed:
        - if business has a Calendly token attached → Calendly API (fast)
        - else if business has a known booking URL → Browser Use (slower fallback)
        - else → no slot reservation, just lead capture
T+4s  AgentMail dispatches confirmation email with Stripe Checkout link.
T+5s  Supermemory records caller history for future calls.
Each step publishes an event on the WS bus so the dashboard animates live.
"""

from __future__ import annotations

import os
import secrets

from sqlalchemy import select

from app.db import Agent, Booking, Call, SessionLocal
from app.integrations import agentmail, browser_use, calendly, gemini, stripe_client, supermemory
from app.services.event_bus import EventType, publish


async def handle_agentphone_event(payload: dict) -> None:
    event_type = payload.get("event") or payload.get("type") or ""

    if event_type.startswith("call.started") or event_type == "call_started":
        await _on_call_started(payload)
    elif (
        event_type.startswith("call.ended")
        or event_type == "call_ended"
        or event_type.startswith("transcript")
    ):
        await _on_call_ended(payload)


async def _on_call_started(payload: dict) -> None:
    ap_agent_id = payload.get("agentId") or payload.get("agent_id")
    call_id = payload.get("callId") or payload.get("call_id") or f"call_{secrets.token_urlsafe(6)}"
    from_number = payload.get("fromNumber") or payload.get("from")

    async with SessionLocal() as session:
        agent = await _agent_by_ap_id(session, ap_agent_id)
        if agent is None:
            return
        session.add(Call(id=call_id, agent_id=agent.id, from_number=from_number))
        await session.commit()
        await publish(agent.id, EventType.CALL_STARTED, {"call_id": call_id, "from": from_number})


async def _on_call_ended(payload: dict) -> None:
    ap_agent_id = payload.get("agentId") or payload.get("agent_id")
    call_id = payload.get("callId") or payload.get("call_id")
    transcript = payload.get("transcript") or ""
    duration_s = payload.get("durationSeconds") or payload.get("duration_s")

    async with SessionLocal() as session:
        agent = await _agent_by_ap_id(session, ap_agent_id)
        if agent is None:
            # Agent was provisioned directly via SDK (not through our /agents endpoint) —
            # auto-register a minimal DB row so the pipeline doesn't silently bail.
            agent = await _auto_register_from_agentphone(session, ap_agent_id)
            if agent is None:
                return

        call = await session.get(Call, call_id) if call_id else None
        if call is None:
            call_id = call_id or f"call_{secrets.token_urlsafe(6)}"
            call = Call(id=call_id, agent_id=agent.id)
            session.add(call)
        call.transcript = transcript
        call.duration_s = duration_s
        await session.commit()
        agent_id = agent.id
        business_summary = (agent.business_profile or {}).get("summary", agent.business_name or "")
        detected = agent.detected_systems or []

    await publish(agent_id, EventType.CALL_ENDED, {"call_id": call.id, "duration_s": duration_s})

    # 1. Intent extraction (Gemini — sponsor coverage + free tier).
    try:
        intent = await gemini.extract_intent(transcript, business_context=business_summary)
    except Exception as exc:
        await publish(agent_id, EventType.ERROR, {"step": "intent", "message": str(exc)})
        return
    await publish(agent_id, EventType.INTENT_PARSED, {"call_id": call.id, "intent": intent.model_dump()})

    # Capture every question the agent could not answer — business owner must follow up.
    contact = intent.customer_phone or intent.customer_email or call.from_number or ""
    for question in (intent.unanswered_questions or []):
        await publish(agent_id, EventType.UNANSWERED_QUESTION, {
            "call_id": call.id,
            "question": question,
            "from": contact,
        })
        try:
            await supermemory.add_caller_history(
                agent_id=agent_id,
                from_number=contact or "unknown",
                summary=f"[follow-up needed] Caller asked: {question}",
            )
        except Exception as exc:
            await publish(agent_id, EventType.ERROR, {"step": "memory_unanswered", "message": str(exc)})

    # Restaurant takeout — fire an order email to the business owner (demo: a fixed inbox).
    if intent.order_items:
        await _send_order_email(agent_id, call.id, intent)

    # Customer service complaint — fire a complaint email to the manager.
    if intent.complaint_details:
        await _send_complaint_email(agent_id, call.id, intent, transcript)

    if intent.action != "book":
        # Lead/question/cancel — record and stop. Send a generic ack email if we have a contact.
        await _record_caller_history(agent_id, call.from_number or "", transcript)
        return

    # 2. Booking execution (clinic/salon path — only when no restaurant order was captured).
    if not intent.order_items:
        booking_id = await _execute_booking(agent_id, call.id, intent, detected)
        if booking_id is None:
            return

        # 3. AgentMail confirmation + Stripe Checkout link.
        await _send_confirmation_and_payment(agent_id, booking_id, intent)

    # 4. Caller history.
    await _record_caller_history(agent_id, call.from_number or intent.customer_phone or "", transcript)


async def _execute_booking(agent_id: str, call_id: str, intent, detected_systems: list[dict]) -> str | None:
    cal_token = os.environ.get(f"CALENDLY_TOKEN_{agent_id}") or os.environ.get("CALENDLY_TOKEN")
    cal_sys = next((s for s in detected_systems if s.get("type") == "calendly"), None)

    system_used = "none"
    external_id: str | None = None

    if cal_sys and cal_token:
        system_used = "calendly"
        await publish(agent_id, EventType.BOOKING_IN_PROGRESS, {"call_id": call_id, "system": system_used})
        try:
            event_types = await calendly.list_event_types(cal_token)
            if event_types:
                # Create a single-use scheduling link so the customer can finalize the slot.
                external_id = await calendly.create_single_use_link(cal_token, event_types[0]["uri"])
        except Exception as exc:
            await publish(agent_id, EventType.ERROR, {"step": "calendly", "message": str(exc)})
            external_id = None
    elif cal_sys and cal_sys.get("url"):
        system_used = "browser_use"
        await publish(agent_id, EventType.BOOKING_IN_PROGRESS, {"call_id": call_id, "system": system_used})
        try:
            res = await browser_use.book_via_browser(
                agent_id=agent_id,
                booking_url=cal_sys["url"],
                customer_name=intent.customer_name or "",
                phone=intent.customer_phone or "",
                time=intent.requested_time_human or "",
            )
            external_id = str(res.get("output", ""))[:120]
            live = await browser_use.get_live_url(agent_id)
            if live:
                await publish(agent_id, EventType.BROWSER_USE_LIVE, {"live_url": live})
        except Exception as exc:
            await publish(agent_id, EventType.ERROR, {"step": "browser_use_book", "message": str(exc)})
            return None

    booking_id = f"bk_{secrets.token_urlsafe(6)}"
    async with SessionLocal() as session:
        session.add(Booking(
            id=booking_id,
            agent_id=agent_id,
            call_id=call_id,
            customer_name=intent.customer_name or "",
            customer_phone=intent.customer_phone or "",
            external_booking_id=external_id,
        ))
        await session.commit()

    await publish(agent_id, EventType.BOOKING_DONE, {
        "call_id": call_id,
        "booking_id": booking_id,
        "system": system_used,
        "time": intent.requested_time_human,
        "external_id": external_id,
    })
    return booking_id


async def _send_confirmation_and_payment(agent_id: str, booking_id: str, intent) -> None:
    async with SessionLocal() as session:
        agent = await session.get(Agent, agent_id)
        if agent is None:
            return
        business_name = agent.business_name or "your appointment"

    # Stripe deposit link — fall back to a placeholder so the email always carries one.
    payment_url = "https://stripe.com"
    try:
        session_id, real_url = await stripe_client.create_deposit_session(
            booking_id=booking_id,
            business_name=business_name,
        )
        payment_url = real_url
        await publish(agent_id, EventType.PAYMENT_LINK_CREATED, {
            "booking_id": booking_id,
            "url": payment_url,
            "stripe_session_id": session_id,
        })
        async with SessionLocal() as session:
            booking = await session.get(Booking, booking_id)
            if booking is not None:
                booking.stripe_session_id = session_id
                await session.commit()
    except Exception as exc:
        # Stripe keys likely missing — keep going with the placeholder link.
        await publish(agent_id, EventType.ERROR, {"step": "stripe", "message": str(exc)})

    # Recipients: caller's email if we got one, plus the demo notification inbox so the
    # business owner always sees the confirmation regardless of what the caller gave.
    customer_email = getattr(intent, "customer_email", None)
    demo_inbox = os.environ.get("ORDER_NOTIFICATION_EMAIL", "assylzhanscat@gmail.com")
    recipients = {customer_email, demo_inbox} - {None, ""}
    for to in recipients:
        try:
            await agentmail.send_confirmation(
                to=to,
                business_name=business_name,
                customer_name=intent.customer_name or "there",
                scheduled_for=intent.requested_time_human or "your requested time",
                payment_link=payment_url,
            )
            await publish(agent_id, EventType.EMAIL_SENT, {"to": to, "kind": "booking_confirmation"})
        except Exception as exc:
            await publish(agent_id, EventType.ERROR, {"step": "agentmail", "message": str(exc)})


async def _send_complaint_email(agent_id: str, call_id: str, intent, transcript: str) -> None:
    """Alert the manager that a complaint came in.
    Same hardcoded recipient as orders for the demo (ORDER_NOTIFICATION_EMAIL)."""
    recipient = os.environ.get("ORDER_NOTIFICATION_EMAIL", "assylzhanscat@gmail.com")
    async with SessionLocal() as session:
        agent = await session.get(Agent, agent_id)
        business_name = agent.business_name if agent else "the business"
    excerpt = transcript[:1200] if transcript else None
    try:
        await agentmail.send_complaint_email(
            to=recipient,
            business_name=business_name,
            customer_name=intent.customer_name,
            customer_phone=intent.customer_phone,
            customer_email=intent.customer_email,
            room_number=intent.room_number,
            complaint_details=intent.complaint_details,
            severity=intent.complaint_severity,
            transcript_excerpt=excerpt,
            notes=intent.notes,
        )
        await publish(agent_id, EventType.COMPLAINT_REPORTED, {
            "call_id": call_id,
            "to": recipient,
            "severity": intent.complaint_severity,
            "summary": intent.complaint_details,
            "room": intent.room_number,
        })
    except Exception as exc:
        await publish(agent_id, EventType.ERROR, {"step": "complaint_email", "message": str(exc)})


async def _send_order_email(agent_id: str, call_id: str, intent) -> None:
    """Email the order summary + payment link to the configured order-recipient address.
    For the hackathon this is hardcoded via ORDER_NOTIFICATION_EMAIL env var (default
    assylzhanscat@gmail.com) — in prod it would be each business's own email."""
    recipient = os.environ.get("ORDER_NOTIFICATION_EMAIL", "assylzhanscat@gmail.com")
    async with SessionLocal() as session:
        agent = await session.get(Agent, agent_id)
        business_name = agent.business_name if agent else "the business"
    try:
        resp = await agentmail.send_order_email(
            to=recipient,
            business_name=business_name,
            customer_name=intent.customer_name,
            customer_phone=intent.customer_phone,
            pickup_time=intent.requested_time_human,
            order_items=intent.order_items,
            payment_link="https://stripe.com",
            notes=intent.notes,
        )
        await publish(agent_id, EventType.EMAIL_SENT, {
            "call_id": call_id,
            "to": recipient,
            "kind": "order",
            "items": intent.order_items,
        })
    except Exception as exc:
        await publish(agent_id, EventType.ERROR, {"step": "order_email", "message": str(exc)})


async def _record_caller_history(agent_id: str, from_number: str, transcript: str) -> None:
    if not from_number:
        return
    try:
        await supermemory.add_caller_history(
            agent_id=agent_id,
            from_number=from_number,
            summary=transcript[:1000],
        )
    except Exception as exc:
        await publish(agent_id, EventType.ERROR, {"step": "memory_save", "message": str(exc)})


async def _agent_by_ap_id(session, ap_id: str | None) -> Agent | None:
    if not ap_id:
        return None
    return (
        await session.execute(select(Agent).where(Agent.agentphone_agent_id == ap_id))
    ).scalar_one_or_none()


async def _auto_register_from_agentphone(session, ap_agent_id: str | None) -> Agent | None:
    """Pull agent metadata from AgentPhone and seed a local DB row on the fly —
    used when a call arrives for an agent we don't yet have in our DB
    (e.g. provisioned directly via SDK during testing)."""
    if not ap_agent_id:
        return None
    from agentphone import AsyncAgentPhone
    from app.config import settings
    c = AsyncAgentPhone(api_key=settings.agentphone_api_key, timeout=15)
    try:
        ap_agent = await c.agents.get(ap_agent_id)
    finally:
        await c.close()
    new = Agent(
        id=f"agt_auto_{secrets.token_urlsafe(6)}",
        status="ready",
        source_url="",
        business_name=getattr(ap_agent, "name", None) or "Unknown Business",
        business_profile={"summary": "(auto-registered from AgentPhone)"},
        detected_systems=[],
        system_prompt=getattr(ap_agent, "system_prompt", "") or "",
        agentphone_agent_id=ap_agent_id,
        phone_number="",
    )
    session.add(new)
    await session.commit()
    return new
