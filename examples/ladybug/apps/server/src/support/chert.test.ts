import assert from "node:assert/strict";
import { test } from "node:test";
import { readMessagingConfig, sendMessage, readMessages, SendError } from "./chert.ts";

const config = { key: "ftk_shared", line: "line", project: "project", destination: "+15551234567" };

test("shared messaging uses the FaceTime key, project and line, without tenant or webhook secrets", () => {
  assert.equal(readMessagingConfig({}), null);
  const env = { CHERT_API_KEY: "ftk_shared", CHERT_PROJECT_ID: "project", CHERT_LINE_ID: "line", EMERGENCY_NUMBER: "+15551234567" };
  assert.deepEqual(readMessagingConfig(env), config);
  assert.equal(readMessagingConfig({ ...env, CHERT_PROJECT_ID: "" }), null);
  assert.throws(() => readMessagingConfig({ ...env, EMERGENCY_NUMBER: "5551234567" }));
});

test("shared-line send uses the app endpoint, project header, line_id and Idempotency-Key", async () => {
  const receipt = await sendMessage(config, "stable-key", "https://bad.example/", async (url, init) => {
    assert.equal(String(url), "https://app.trychert.com/api/v1/shared-messages");
    assert.deepEqual(init?.headers, { Authorization: "Bearer ftk_shared", "X-Chert-Project-Id": "project", "Content-Type": "application/json", "Idempotency-Key": "stable-key" });
    assert.deepEqual(JSON.parse(String(init?.body)), {
      line_id: "line", recipient: config.destination,
      text: "Computerbug warning: The user is accessing a website that might not be trustworthy:\nhttps://bad.example/\n\nReply within 30 minutes:\nSUPPORT: Start or restart a remote FaceTime support call.\nKILL: Force-close Google Chrome on all connected computers on this account.\nSHUTDOWN: Shut down all connected computers on this account. Unsaved work may be lost.",
    });
    return Response.json({ data: { id: "message", state: "pending" } }, { status: 202 });
  });
  assert.deepEqual(receipt, { id: "message", state: "pending" });
});

test("transport and transient errors retain retry eligibility; access and recipient failures do not", async () => {
  for (const [status, transient] of [[408, true], [429, true], [503, true], [400, false], [401, false], [403, false], [404, false]] as const) {
    await assert.rejects(sendMessage(config, "key", "https://bad.example", async () => new Response(null, { status })), (error) => error instanceof SendError && error.transient === transient);
  }
  await assert.rejects(sendMessage(config, "key", "https://bad.example", async () => { throw new Error("lost response"); }), (error) => error instanceof SendError && error.transient);
  await assert.rejects(sendMessage(config, "key", "https://bad.example", async () => Response.json({})), SendError);
});

test("polling parses the observed shared-line response without inferring an unmasked sender", async () => {
  const row = { id: "message", line_id: "line", direction: "inbound", state: "received", masked_recipient: "•••4567", created_at: "2026-11-14T23:00:00.000Z", text: "SUPPORT" };
  const messages = await readMessages(config, async (url, init) => {
    assert.equal(String(url), "https://app.trychert.com/api/v1/shared-messages");
    assert.deepEqual(init?.headers, { Authorization: "Bearer ftk_shared", "X-Chert-Project-Id": "project" });
    assert.equal(init?.method, undefined);
    return Response.json({ data: { items: [row], total: 1, limit: 50, offset: 0 } });
  });
  assert.deepEqual(messages, [row]);
  for (const body of [{}, { data: { items: [{}] } }, { data: { items: [{ ...row, created_at: "invalid" }] } }]) {
    await assert.rejects(readMessages(config, async () => Response.json(body)));
  }
  await assert.rejects(readMessages(config, async () => new Response(null, { status: 503 })));
});
