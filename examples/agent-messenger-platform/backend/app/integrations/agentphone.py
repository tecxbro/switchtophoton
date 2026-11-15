"""AgentPhone SDK wrapper.

Uses the real async client (AsyncAgentPhone) per the actual installed SDK
(agentphone 0.7.0). Hosted-mode agents only — confirmed empirically that the
agents.create signature has no tools/functions field, so all dynamic work
happens post-call (services/call_processor.py).
"""

from __future__ import annotations

from typing import AsyncIterator

from app.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        from agentphone import AsyncAgentPhone  # type: ignore
        _client = AsyncAgentPhone(api_key=settings.agentphone_api_key)
    return _client


async def create_agent_with_number(
    name: str,
    system_prompt: str,
    voice: str | None = None,
    model_tier: str = "balanced",
    area_code: str | None = None,
) -> tuple[str, str]:
    """Create hosted agent + buy and attach a US number. Returns (agent_id, phone_number)."""
    client = _get_client()

    agent = await client.agents.create(
        name=name[:64],
        voice_mode="hosted",
        system_prompt=system_prompt,
        voice=voice,
        model_tier=model_tier,
    )
    number = await client.numbers.buy(country="US", area_code=area_code, agent_id=agent.id)
    return agent.id, number.phone_number


async def update_system_prompt(agentphone_agent_id: str, new_prompt: str) -> None:
    """Push a refreshed system prompt — used by the availability-refresh job
    so the agent always quotes today's open slots when answering inbound calls."""
    client = _get_client()
    await client.agents.update(agentphone_agent_id, system_prompt=new_prompt)


async def register_webhook(agentphone_agent_id: str, webhook_url: str) -> None:
    """Point AgentPhone at our /webhooks/agentphone endpoint for lifecycle events."""
    client = _get_client()
    await client.agents.set_webhook(agentphone_agent_id, url=webhook_url)


async def make_web_call(agentphone_agent_id: str, variables: dict[str, str] | None = None) -> dict:
    """Browser-based call to the agent — used as demo fallback if live phone fails."""
    client = _get_client()
    return await client.calls.create_web_call(agentphone_agent_id, variables=variables)


async def stream_transcript(call_id: str) -> AsyncIterator[dict]:
    """Yield transcript chunks for a live call — populates dashboard transcript pane."""
    client = _get_client()
    async for chunk in client.calls.stream_transcript(call_id):
        yield chunk


def verify_webhook(body: bytes, signature: str | None) -> dict:
    """Verify a webhook delivery from AgentPhone."""
    from agentphone import construct_event  # type: ignore
    return construct_event(body, signature or "", settings.agentphone_api_key)
