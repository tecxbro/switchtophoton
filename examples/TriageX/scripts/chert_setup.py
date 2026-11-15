"""Check Chert credentials and create the TriageX webhook subscription.

Usage (from backend/):
    uv run python ../scripts/chert_setup.py check
    uv run python ../scripts/chert_setup.py subscribe

`check` calls GET /whoami and lists webhook subscriptions. It prints PASS only if Chert
accepts the credentials and a message.received subscription points at
PUBLIC_BASE_URL/api/webhooks/chert.

`subscribe` creates that subscription. Chert returns its signing secret exactly once: the
script writes it to the repo-root .env as CHERT_WEBHOOK_SECRET (the file is gitignored) and
never prints it.

Neither command sends a message.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import REPO_ROOT, get_settings  # noqa: E402
from app.services.outreach import ChertConfig, OutreachService  # noqa: E402
from app.services.demo_service import DemoService  # noqa: E402


def _service() -> OutreachService:
    config = ChertConfig.from_settings(get_settings())
    if not config.signing_secret:
        sys.exit("FAIL: CHERT_SIGNING_SECRET is not set in .env")
    return OutreachService(DemoService(), config)


def check() -> int:
    svc = _service()
    svc.check_connection()
    status, detail = svc.health()
    for sub in (svc.check_result.subscriptions if svc.check_result else []):
        print(f"  subscription {sub.get('id')}: {sub.get('url')} events={sub.get('events')} "
              f"active={sub.get('is_active')}")  # fmt: skip
    print(f"{'PASS' if status == 'ok' else 'FAIL'}: {detail}")
    return 0 if status == "ok" else 1


def subscribe() -> int:
    svc = _service()
    url = svc.config.webhook_url
    if not url or not url.startswith("https://"):
        sys.exit("FAIL: set PUBLIC_BASE_URL to the public HTTPS tunnel URL first")
    code, body = svc.client.create_subscription(url)
    sub = body.get("subscription") if isinstance(body.get("subscription"), dict) else {}
    secret = sub.get("secret")
    if code >= 300 or not secret:
        print(f"FAIL: HTTP {code}: {body}")
        return 1
    env = REPO_ROOT / ".env"
    text = env.read_text(encoding="utf-8") if env.exists() else ""
    line = f"CHERT_WEBHOOK_SECRET={secret}"
    if re.search(r"(?m)^CHERT_WEBHOOK_SECRET=.*$", text):
        text = re.sub(r"(?m)^CHERT_WEBHOOK_SECRET=.*$", lambda _: line, text)
    else:
        text = text.rstrip("\n") + "\n" + line + "\n"
    env.write_text(text, encoding="utf-8")
    print(f"PASS: subscription {sub.get('id')} -> {url}; secret saved to .env "
          "(restart the backend to load it)")  # fmt: skip
    return 0


if __name__ == "__main__":
    commands = {"check": check, "subscribe": subscribe}
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        sys.exit(__doc__)
    sys.exit(commands[sys.argv[1]]())
