"""Read-only check of the Chert hackathon (Shared/trial) line API. Prints no secrets, no phone
numbers and no message text: only HTTP statuses, line ids/names, field NAMES and counts.

Reads CHERT_API_KEY and CHERT_PROJECT_ID (and CHERT_LINE_ID, if set) from the repo's .env.

    cd backend
    uv run python ../scripts/chert_inspect.py

1. GET /api/v1/lines            -> your line ids (put the right one in CHERT_LINE_ID)
2. GET /api/v1/shared-messages  -> the real response shape (field names), which Chert does not
                                   document; compare it with app/integrations/chert_shared.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import httpx  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.integrations.chert_shared import (  # noqa: E402
    DEFAULT_SHARED_API_BASE,
    list_items,
    parse_list,
)


def _shape(value, depth=0) -> str:
    """Field names and value types only (never values)."""
    if isinstance(value, dict):
        inner = (
            ", ".join(f"{k}: {_shape(v, depth + 1)}" for k, v in value.items())
            if depth < 2
            else "…"
        )
        return "{" + inner + "}"
    if isinstance(value, list):
        return f"list[{len(value)}]" + (f" of {_shape(value[0], depth + 1)}" if value else "")
    return type(value).__name__


def main() -> int:
    s = get_settings()
    if not (s.chert_api_key and s.chert_project_id):
        print("Set CHERT_API_KEY and CHERT_PROJECT_ID in .env first (never paste them in chat).")
        return 2
    base = (s.chert_shared_api_base or DEFAULT_SHARED_API_BASE).rstrip("/")
    headers = {
        "Authorization": f"Bearer {s.chert_api_key}",
        "X-Chert-Project-Id": s.chert_project_id,
    }
    with httpx.Client(base_url=base, headers=headers, timeout=10) as c:
        r = c.get("/lines")
        print(f"GET /lines -> HTTP {r.status_code}")
        if r.status_code < 300:
            data = r.json()
            items = list_items(data)
            print(f"  shape: {_shape(data)}")
            for line in items:
                if isinstance(line, dict):
                    mark = "  <- CHERT_LINE_ID" if line.get("id") == s.chert_line_id else ""
                    name = line.get("name") or line.get("display_name")
                    fields = sorted(line.keys())
                    print(f"  line id={line.get('id')} name={name}{mark}  fields={fields}")
        r = c.get("/shared-messages")
        print(f"GET /shared-messages -> HTTP {r.status_code}")
        if r.status_code < 300:
            data = r.json()
            print(f"  shape: {_shape(data)}")
            messages, unparsed, names = parse_list(data)
            print(f"  field names: {names}")
            directions = {"inbound": 0, "outbound": 0, "unknown": 0}
            for m in messages:
                directions[
                    "unknown" if m.inbound is None else ("inbound" if m.inbound else "outbound")
                ] += 1
            print(
                f"  parsed {len(messages)} messages ({directions}), unparsed {unparsed}; "
                f"with a phone: {sum(1 for m in messages if m.peer)}; "
                f"with a timestamp: {sum(1 for m in messages if m.created_at)}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
