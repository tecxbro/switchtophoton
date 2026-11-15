"""Background worker — poll AgentPhone for new completed calls and run the
post-call pipeline on each. Stand-in for a real webhook while we don't have a
public URL set up.

On startup it snapshots the existing call IDs and only processes calls that
appear AFTER the worker started — so it never re-fires emails for historic
test calls.

Run: .venv/bin/python scripts/poll_calls.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(override=True)

import json
from pathlib import Path

from agentphone import AsyncAgentPhone  # noqa: E402

from app.integrations.browser_use import ScrapedBusiness  # noqa: E402
from app.services.call_processor import handle_agentphone_event  # noqa: E402
from app.services.prompt_builder import build_system_prompt  # noqa: E402

POLL_INTERVAL_S = 8
REFRESH_INTERVAL_S = 60
LIVE_AGENTS_FILE = Path(".cache/live_agents.json")


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


async def _process(client: AsyncAgentPhone, call) -> None:
    cid = call.id
    print(f"[{_ts()}] new completed call detected: {cid}")
    try:
        t = await client.calls.get_transcript(cid)
    except Exception as exc:
        print(f"[{_ts()}]   transcript fetch failed: {exc}")
        return
    items = t.get("transcript") if isinstance(t, dict) else []
    transcript_text = "\n".join(
        f"{m.get('role','?')}: {(m.get('content') or '').strip()}"
        for m in items
        if (m.get("content") or "").strip()
    )
    if not transcript_text:
        print(f"[{_ts()}]   empty transcript — skipping")
        return

    payload = {
        "event": "call.ended",
        "agentId": call.agent_id,
        "callId": cid,
        "transcript": transcript_text,
        "durationSeconds": getattr(call, "duration_seconds", None),
        "fromNumber": getattr(call, "from_number", None),
    }
    try:
        await handle_agentphone_event(payload)
        print(f"[{_ts()}]   pipeline ran — check the order-notification inbox")
    except Exception as exc:
        print(f"[{_ts()}]   pipeline error: {type(exc).__name__}: {exc}")


async def _poll_loop(client: AsyncAgentPhone, seen: set[str]) -> None:
    while True:
        try:
            listing = await client.calls.list(limit=20)
            items = getattr(listing, "data", None) or getattr(listing, "items", None) or listing
            items = list(items) if hasattr(items, "__iter__") else []
            for call in items:
                cid = getattr(call, "id", "")
                status = getattr(call, "status", "")
                if cid and status == "completed" and cid not in seen:
                    await _process(client, call)
                    seen.add(cid)
        except Exception as exc:
            print(f"[{_ts()}] poll error: {type(exc).__name__}: {exc}")
        await asyncio.sleep(POLL_INTERVAL_S)


async def _refresh_loop(client: AsyncAgentPhone) -> None:
    """Re-render and re-push system_prompts for every registered live agent so
    the CURRENT DATE & TIME block stays fresh between explicit re-onboards."""
    while True:
        try:
            if LIVE_AGENTS_FILE.exists():
                live = json.loads(LIVE_AGENTS_FILE.read_text())
                for ap_id, info in live.items():
                    scrape_cache = Path(info.get("scrape_cache", ""))
                    if not scrape_cache.exists():
                        continue
                    scraped = ScrapedBusiness.model_validate_json(scrape_cache.read_text())
                    new_prompt = build_system_prompt(scraped)
                    await client.agents.update(ap_id, system_prompt=new_prompt)
                    print(f"[{_ts()}] refreshed prompt for {ap_id} ({info.get('name', '?')})")
        except Exception as exc:
            print(f"[{_ts()}] refresh error: {type(exc).__name__}: {exc}")
        await asyncio.sleep(REFRESH_INTERVAL_S)


async def main() -> None:
    client = AsyncAgentPhone(api_key=os.environ["AGENTPHONE_API_KEY"], timeout=30)
    try:
        # Seed: snapshot the existing call IDs so we don't re-process historic calls.
        listing = await client.calls.list(limit=50)
        items = getattr(listing, "data", None) or getattr(listing, "items", None) or listing
        items = list(items) if hasattr(items, "__iter__") else []
        seen: set[str] = {getattr(c, "id", "") for c in items}
        live_count = len(json.loads(LIVE_AGENTS_FILE.read_text())) if LIVE_AGENTS_FILE.exists() else 0
        print(f"[{_ts()}] watching for new completed calls (snapshot: {len(seen)} historic calls ignored)")
        print(f"[{_ts()}] poll interval: {POLL_INTERVAL_S}s | prompt-refresh interval: {REFRESH_INTERVAL_S}s ({live_count} live agents). ctrl-c to stop.")

        await asyncio.gather(_poll_loop(client, seen), _refresh_loop(client))
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
