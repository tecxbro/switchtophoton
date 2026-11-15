"""Offline greenfield boundary control, not an iMessage migration.

Run with SMOLAGENTS_FIXTURE_REPO pointing at the pinned public checkout.
Extracts only the upstream handler function. Does not import the live app,
connect an MCP tool, load a model, or send to a provider.
"""
import ast
import os
import subprocess
from types import SimpleNamespace
import unittest

UPSTREAM = "96f33faaf028479119ec8d34507b47694cf14e34"


class Request:
    def __init__(self, message):
        self.message = message

    async def json(self):
        return {"message": self.message}


class BoundaryControl(unittest.IsolatedAsyncioTestCase):
    async def test_existing_handler_keeps_ownership_and_text_contract(self):
        repo = os.environ["SMOLAGENTS_FIXTURE_REPO"]

        def git(*args):
            return subprocess.check_output(["git", "-C", repo, *args], text=True)

        self.assertEqual(git("rev-parse", "HEAD").strip(), UPSTREAM)
        upstream = ast.parse(git("show", f"{UPSTREAM}:examples/server/main.py"))
        chat = next(node for node in upstream.body if getattr(node, "name", "") == "chat")
        self.assertIsInstance(chat, ast.AsyncFunctionDef)
        calls = []

        def run(text):
            calls.append(text)
            return {"example": text}

        async def run_sync(func, arg):
            return func(arg)

        scope = {"agent": SimpleNamespace(run=run), "to_thread": SimpleNamespace(run_sync=run_sync),
                 "JSONResponse": dict}
        exec(compile(ast.Module(body=[chat], type_ignores=[]), "upstream:chat", "exec"), scope)
        direct = await scope["chat"](Request("  hello  "))

        async def replay_fixture(dispatch):
            # Input only from a pre-authorized synthetic 1:1 fixture. No headers,
            # networking, authentication or live delivery are exercised here.
            if dispatch["heldBack"] or dispatch["messages"][0].get("silent"):
                return []
            output = await scope["chat"](Request(dispatch["messages"][0]["text"]))
            return [("messages", {"text": output["reply"]}), ("complete", {"status": "completed"})]

        turn = {"heldBack": False, "messages": [{"text": "  hello  ", "content": "metadata + hello"}]}
        self.assertEqual(await replay_fixture(turn), [
            ("messages", {"text": direct["reply"]}), ("complete", {"status": "completed"}),
        ])
        self.assertEqual(calls, ["hello", "hello"])
        self.assertEqual(await replay_fixture({**turn, "heldBack": True}), [])
        self.assertEqual(calls, ["hello", "hello"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
