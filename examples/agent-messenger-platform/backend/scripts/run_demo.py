"""End-to-end demo runner.

Three subcommands match the three demo beats:

  onboard <URL>          — Browser Use scrape + Gemini synth + Supermemory store.
                            Prints the generated profile + system prompt.
                            By default skips AgentPhone provisioning (--provision
                            to actually create agent + buy $3 number).

  process <CALL_ID>      — Pulls the call transcript from AgentPhone, runs
                            Gemini intent extraction, then (if intent says book)
                            sends the AgentMail confirmation email. Skips Calendly
                            booking unless --book is passed (needs CALENDLY_TOKEN).

  latest                 — Convenience: finds the most recent call on the demo
                            agent and runs `process` on it.

Run from repo root: `.venv/bin/python scripts/run_demo.py <subcommand> ...`
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

# Allow `python scripts/run_demo.py` to import app.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(override=True)

from app.integrations import agentmail, browser_use, gemini, supermemory  # noqa: E402
from app.services.prompt_builder import build_system_prompt  # noqa: E402

DEMO_AGENT_ID = "cmpac5xzg0094wl0h9xy52mo9"  # Smith Dental — Demo, already provisioned


async def onboard(
    url: str,
    provision: bool = False,
    update_agent_id: str | None = None,
    use_llm_prompt: bool = False,
    use_cache: bool = False,
) -> None:
    import hashlib
    import json
    from pathlib import Path
    print(f"\n=== ONBOARD: {url} ===\n")

    cache_dir = Path(".cache")
    cache_dir.mkdir(exist_ok=True)
    cache_path = cache_dir / f"scrape_{hashlib.md5(url.encode()).hexdigest()[:10]}.json"

    if use_cache and cache_path.exists():
        print(f"[1/4] Loading cached scrape from {cache_path}…")
        scraped = browser_use.ScrapedBusiness.model_validate_json(cache_path.read_text())
        live_url = None
    else:
        print("[1/4] Browser Use — scraping + system detection…")
        try:
            scraped, live_url = await browser_use.scrape_business(url)
        except Exception as exc:
            print(f"  ✗ scrape failed: {exc}")
            return
        cache_path.write_text(scraped.model_dump_json(indent=2))
        print(f"  ✓ cached to {cache_path} (use --use-cache to skip the scrape next time)")
    print(f"  ✓ name: {scraped.name}")
    print(f"  ✓ business_type: {scraped.business_type}")
    print(f"  ✓ address: {scraped.address}")
    print(f"  ✓ hours: {scraped.hours}")
    if scraped.menu:
        print(f"  ✓ menu items: {len(scraped.menu)}")
        for item in scraped.menu[:8]:
            ing = f"  [{', '.join(item.ingredients)}]" if item.ingredients else ""
            print(f"      - [{item.section or '?'}] {item.name} — {item.price or '?'}{ing}")
        if len(scraped.menu) > 8:
            print(f"      … ({len(scraped.menu) - 8} more)")
    elif scraped.services:
        print(f"  ✓ services: {scraped.services}")
    print(f"  ✓ detected systems: {[s.type for s in scraped.detected_systems]}")
    if live_url:
        print(f"  ✓ live_url for dashboard iframe: {live_url}")

    import re

    if use_llm_prompt:
        print("\n[2/4] Gemini — generating system_prompt (free-form LLM)…")
        brain = await gemini.build_agent_brain(scraped)
        system_prompt = brain.system_prompt
        business_name = brain.business_name
        key_facts = brain.key_facts
        profile_summary = brain.profile_summary
        prompt_source = "gemini"
    else:
        print("\n[2/4] Template renderer — building system_prompt from Jinja2 template…")
        system_prompt = build_system_prompt(scraped)
        business_name = scraped.name
        key_facts = [f for f in (scraped.address, scraped.hours, scraped.description) if f]
        profile_summary = scraped.description or scraped.name
        prompt_source = "app/prompts/agent.j2"

    slug = "demo_" + re.sub(r"[^a-z0-9_-]+", "_", business_name.lower()).strip("_")
    print(f"  ✓ source: {prompt_source}")
    print(f"  ✓ business_name: {business_name}  (slug: {slug})")
    print(f"  ✓ key_facts: {key_facts}")
    print(f"  ✓ system_prompt length: {len(system_prompt)} chars")
    print(f"  ✓ system_prompt:\n{'-'*60}")
    print(system_prompt)
    print(f"{'-'*60}")

    print("\n[3/4] Supermemory — storing business knowledge…")
    try:
        await supermemory.add_business_knowledge(
            agent_id=slug,
            profile_text=f"{profile_summary}\n\nFacts:\n- " + "\n- ".join(key_facts),
        )
        print("  ✓ added (async indexing — ~1 min to be searchable)")
    except Exception as exc:
        print(f"  ✗ supermemory add failed: {exc}")

    if update_agent_id:
        print(f"\n[4/4] AgentPhone — pushing new prompt to existing agent {update_agent_id}…")
        from app.integrations.agentphone import update_system_prompt
        await update_system_prompt(update_agent_id, system_prompt)
        print(f"  ✓ live prompt now: {business_name}")
        print(f"  ✓ same number stays attached — call it to test the new agent")
        # Register this agent for the time-refresh loop in scripts/poll_calls.py
        live_file = cache_dir / "live_agents.json"
        live = json.loads(live_file.read_text()) if live_file.exists() else {}
        live[update_agent_id] = {
            "name": business_name,
            "url": url,
            "scrape_cache": str(cache_path),
        }
        live_file.write_text(json.dumps(live, indent=2))
        print(f"  ✓ registered for 60s prompt refresh (so CURRENT DATE & TIME stays fresh)")
    elif provision:
        print("\n[4/4] AgentPhone — creating agent + buying $3 number…")
        from app.integrations.agentphone import create_agent_with_number
        ap_id, phone = await create_agent_with_number(
            name=business_name,
            system_prompt=system_prompt,
            voice="cartesia-Cleo",
        )
        print(f"  ✓ agent_id: {ap_id}")
        print(f"  ✓ phone: {phone}")
        print(f"\nCall {phone} now to test the agent live.")
    else:
        print("\n[4/4] AgentPhone — SKIPPED (use --provision or --update <agent_id>).")
        print(f"      For testing on existing demo agent: --update {DEMO_AGENT_ID}")


async def process_call(call_id: str, book: bool = False) -> None:
    from agentphone import AsyncAgentPhone

    print(f"\n=== PROCESS CALL: {call_id} ===\n")
    client = AsyncAgentPhone(api_key=os.environ["AGENTPHONE_API_KEY"], timeout=30)
    try:
        t = await client.calls.get_transcript(call_id)
    finally:
        await client.close()
    items = t.get("transcript") if isinstance(t, dict) else []
    if not items:
        print("  ✗ no transcript (call still in progress or empty)")
        return

    flat = ""
    print("--- transcript ---")
    for m in items:
        role = m.get("role", "?")
        text = (m.get("content") or "").strip()
        if not text:
            continue
        print(f"  {role.upper():6}: {text}")
        flat += f"{role}: {text}\n"
    print()

    print("[1/3] Gemini — extracting booking intent…")
    intent = await gemini.extract_intent(flat, business_context="Smith Dental Clinic — San Francisco")
    print(json.dumps(intent.model_dump(), indent=2))

    if intent.action != "book":
        print(f"\n  action={intent.action} — no booking to execute.")
        return

    if book:
        print("\n[2/3] Calendly — booking… (requires CALENDLY_TOKEN, real event_type_uri)")
        cal_token = os.environ.get("CALENDLY_TOKEN")
        if not cal_token:
            print("  ✗ CALENDLY_TOKEN not set — skipping live booking")
        else:
            from app.integrations import calendly
            event_types = await calendly.list_event_types(cal_token)
            print(f"  ✓ {len(event_types)} event types found")
            if event_types:
                link = await calendly.create_single_use_link(cal_token, event_types[0]["uri"])
                print(f"  ✓ booking link: {link}")
    else:
        print("\n[2/3] Calendly — SKIPPED (--book to execute real booking).")

    print("\n[3/3] AgentMail — sending confirmation…")
    if not intent.customer_email:
        # for demo, fall back to user's gmail since the call probably didn't capture an email
        recipient = os.environ.get("DEMO_FALLBACK_EMAIL", "hmmmmm324@gmail.com")
        print(f"  (no email in intent → using fallback {recipient})")
    else:
        recipient = intent.customer_email
    try:
        resp = await agentmail.send_confirmation(
            to=recipient,
            business_name="Smith Dental Clinic",
            customer_name=intent.customer_name or "there",
            scheduled_for=intent.requested_time_human or "your requested time",
            payment_link="https://checkout.stripe.com/demo-deposit",  # mock until Stripe keys land
        )
        print(f"  ✓ sent — message_id: {resp.message_id}")
    except Exception as exc:
        print(f"  ✗ send failed: {exc}")


async def latest() -> None:
    from agentphone import AsyncAgentPhone

    client = AsyncAgentPhone(api_key=os.environ["AGENTPHONE_API_KEY"], timeout=30)
    try:
        listing = await client.calls.list(limit=5)
    finally:
        await client.close()
    items = getattr(listing, "data", None) or getattr(listing, "items", None) or listing
    items = list(items) if hasattr(items, "__iter__") else []
    if not items:
        print("no calls yet")
        return
    call = items[0]
    cid = getattr(call, "id", None) or getattr(call, "call_id", None)
    print(f"latest call_id: {cid}")
    await process_call(cid)


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    p_on = sub.add_parser("onboard")
    p_on.add_argument("url")
    p_on.add_argument("--provision", action="store_true", help="buy a fresh $3 phone number")
    p_on.add_argument("--update", dest="update_agent", help="push the new prompt onto this existing agent_id (no $)")
    p_on.add_argument("--llm-prompt", action="store_true", help="use Gemini to generate the prompt instead of the Jinja2 template")
    p_on.add_argument("--use-cache", action="store_true", help="skip Browser Use scrape, load cached ScrapedBusiness for this URL")

    p_pc = sub.add_parser("process")
    p_pc.add_argument("call_id")
    p_pc.add_argument("--book", action="store_true", help="actually attempt Calendly booking")

    sub.add_parser("latest")

    args = p.parse_args()
    if args.cmd == "onboard":
        asyncio.run(onboard(
            args.url,
            provision=args.provision,
            update_agent_id=args.update_agent,
            use_llm_prompt=args.llm_prompt,
            use_cache=args.use_cache,
        ))
    elif args.cmd == "process":
        asyncio.run(process_call(args.call_id, book=args.book))
    elif args.cmd == "latest":
        asyncio.run(latest())


if __name__ == "__main__":
    main()
