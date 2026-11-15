import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import type { ParticipantInfo, Room } from "livekit-server-sdk";
import type { AccountStatus, CallState, PreparedCall } from "@ladybug/shared";
import type { AccountStore, UserRecord } from "@ladybug/backend";
import { hashToken } from "../accounts.ts";
import { CallService } from "./call-service.ts";
import { createCallRouter } from "./router.ts";
import { CallService as DesktopCalls } from "../../../desktop/electron/call-service.ts";

const provider = {
  url: "wss://example.livekit.cloud", key: "provider-key", secret: "provider-secret-at-least-thirty-two-characters",
  chertKey: "private-chert", project: "private-project", line: "private-line", destination: "+15551234567",
};
type TestUser = { status?: AccountStatus; callsEnabled?: boolean };
const defaultUsers: Record<string, TestUser> = { "desktop-one": {}, "desktop-two": {} };

/** Each session token signs in a different user; approved with calls on unless the test says otherwise. */
function accountsFor(users: Record<string, TestUser>) {
  const byHash = new Map(Object.entries(users).map(([token, user]): [string, UserRecord] => [hashToken(token), {
    id: randomUUID(), username: token, passwordHash: "", createdAt: new Date(0).toISOString(),
    status: user.status ?? "approved", callsEnabled: user.callsEnabled ?? true,
  }]));
  const idOf = (token: string) => byHash.get(hashToken(token))!.id;
  return { idOf, accounts: { byToken: async (hash: string) => byHash.get(hash) ?? null } as unknown as AccountStore };
}

async function fixture(users = defaultUsers) {
  let roomCount = 0, status = "active", now = 0;
  const requests: { url: string; body?: string }[] = [];
  const calls = new CallService({
    config: () => provider,
    rooms: () => ({
      createRoom: async () => { roomCount++; return {} as Room; }, deleteRoom: async () => {},
      listParticipants: async (room) => [{ identity: `device-${room.slice("ladybug-".length)}`, tracks: [{ type: 0, muted: false }, { type: 1, muted: false }] }] as ParticipantInfo[],
    }),
    fetch: async (url, init) => {
      requests.push({ url: String(url), body: init?.body as string | undefined });
      const data = String(url).endsWith("/events") ? [{ event_type: "bridge_ready" }] : init?.method === "POST" ? { id: "chert-call" } : { status };
      return new Response(JSON.stringify({ data }));
    },
  });
  const { accounts, idOf } = accountsFor(users);
  const router = createCallRouter({ service: calls, accounts, now: () => now, leaseMs: 30_000 });
  const app = express(); app.use(express.json()); app.use("/api/calls", router);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const api = (path: string, body?: unknown, token = "desktop-one") => fetch(url + "/api/calls" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const deliver = (id: string, sentAt = now, token = "desktop-one", kind: "support" | "browser-kill" | "device-shutdown" = "support") =>
    router.deliverSupport({ id, sentAt, accountId: idOf(token), kind, expiresAt: now + 1_800_000 });
  return { deliver, url, api, calls, router, idOf, requests, roomCount: () => roomCount, advance: () => { now += 31_000; }, finish: () => { status = "ended"; },
    close: async () => {
      status = "ended";
      await calls.endCurrent(); await calls.poll(); await router.shutdown();
      server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test("call routes need an approved account that an admin turned calls on for", async () => {
  const f = await fixture({ off: { callsEnabled: false }, waiting: { status: "pending" }, refused: { status: "rejected" } });
  try {
    for (const [token, status] of [["off", 403], ["waiting", 403], ["refused", 403], ["unknown", 401]] as const) {
      assert.equal((await f.api("/state", undefined, token)).status, status, token);
      assert.equal((await f.api("/prepare", { requestId: randomUUID() }, token)).status, status, token);
      assert.equal((await f.api("/support/stream", undefined, token)).status, status, token);
    }
    assert.equal((await fetch(`${f.url}/api/calls/state`)).status, 401);
    assert.equal(f.roomCount(), 0);
  } finally { await f.close(); }
});

test("revoking an account hangs up its call and drops its support stream", async () => {
  const f = await fixture();
  const abort = new AbortController();
  try {
    const stream = await fetch(`${f.url}/api/calls/support/stream`, { headers: { Authorization: "Bearer desktop-one" }, signal: abort.signal });
    const reader = stream.body!.getReader(); await reader.read();
    const prepared = await (await f.api("/prepare", { requestId: randomUUID() })).json() as PreparedCall;
    await f.api(`/${prepared.id}/dial`, {}); await f.calls.poll();
    f.router.revoke(f.idOf("desktop-two"));
    assert.equal(f.calls.getState().phase, "active", "another account's revocation leaves the call alone");
    f.router.revoke(f.idOf("desktop-one"));
    assert.equal((await reader.read()).done, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(f.calls.getState().phase, "ending");
    assert.equal(f.deliver(randomUUID()), false);
    assert.equal(f.deliver(randomUUID(), 0, "desktop-one", "device-shutdown"), false);
  } finally { abort.abort(); await f.close(); }
});

test("authenticated prepare is idempotent, isolated per client, and returns only a short-lived room token", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.api("/prepare", { requestId: randomUUID() }, "wrong")).status, 401);
    const requestId = randomUUID();
    const replies = await Promise.all([f.api("/prepare", { requestId }), f.api("/prepare", { requestId })]);
    const [a, b] = await Promise.all(replies.map(async (r) => await r.json() as PreparedCall));
    assert.equal(a.id, b.id); assert.equal(f.roomCount(), 1);
    for (const secret of [provider.secret, provider.chertKey, provider.project, provider.line, provider.destination]) assert.ok(!JSON.stringify(a).includes(secret));
    const claims = JSON.parse(Buffer.from(a.token.split(".")[1], "base64url").toString());
    assert.ok(claims.exp - claims.nbf <= 300);
    assert.equal(claims.video.roomAdmin, undefined);
    assert.equal((await f.api("/prepare", { requestId: randomUUID() }, "desktop-two")).status, 409);
    assert.equal((await (await f.api("/state", undefined, "desktop-two")).json() as CallState).id, undefined);
    assert.equal((await f.api(`/${a.id}/end`, {}, "desktop-two")).status, 404);
    assert.equal((await f.api(`/${a.id}/dial`, { destination: "+15559999999" })).status, 200);
    assert.equal(JSON.parse(f.requests.find((r) => r.url.endsWith("/calls"))!.body!).destination, provider.destination);
    f.advance(); await f.router.checkLease();
    assert.equal(f.calls.getState().phase, "ending");
    await f.calls.poll();
    assert.ok(f.requests.some((r) => r.url.endsWith("/end")), "expired clients cannot leave an unattended outbound call");
  } finally { await f.close(); }
});

test("desktop proxy controls a server call without provider credentials and stops on connection loss", async () => {
  const f = await fixture();
  let offline = false;
  const desktop = new DesktopCalls({
    auth: () => ({ url: f.url, token: "desktop-one" }),
    fetch: async (...args) => { if (offline) throw new Error("network down"); return fetch(...args); },
  });
  try {
    const prepared = await desktop.prepare();
    await desktop.dial(prepared.id); await f.calls.poll(); await desktop.poll();
    assert.equal(desktop.getState().phase, "active");
    assert.equal(desktop.getState().bridgeReady, true);
    offline = true; await desktop.poll();
    assert.equal(desktop.getState().phase, "ending");
    assert.equal(desktop.getState().bridgeReady, false);
    offline = false; await desktop.poll();
    f.finish(); await f.calls.poll(); await desktop.poll();
    assert.equal(desktop.getState().phase, "ended");
    assert.ok(f.requests.some((r) => r.url.endsWith("/end")));
  } finally { f.finish(); await f.calls.poll(); await desktop.poll(); await f.close(); }
});

test("support stream authenticates, selects only the newest connected desktop, drops offline and busy requests", async () => {
  const f = await fixture();
  const streams: { reader: ReadableStreamDefaultReader<Uint8Array>; abort: AbortController }[] = [];
  const connect = async (token: string) => {
    const abort = new AbortController();
    const response = await fetch(`${f.url}/api/calls/support/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal });
    assert.equal(response.status, 200);
    const reader = response.body!.getReader(); await reader.read();
    streams.push({ reader, abort }); return reader;
  };
  try {
    assert.equal((await f.api("/support/stream", undefined, "wrong")).status, 401);
    assert.equal(f.deliver(randomUUID()), false);
    const old = await connect("desktop-one"), latest = await connect("desktop-one");
    const id = randomUUID(); assert.equal(f.deliver(id), true);
    const chunk = await latest.read(); assert.match(new TextDecoder().decode(chunk.value), new RegExp(id));
    const oldPending = old.read();
    const prepared = await (await f.api("/prepare", { requestId: randomUUID() })).json() as PreparedCall;
    assert.equal(f.deliver(randomUUID()), false);
    const kill = randomUUID();
    assert.equal(f.deliver(kill, 0, "desktop-one", "browser-kill"), true);
    assert.match(new TextDecoder().decode((await latest.read()).value), new RegExp(`event: browser-kill.*`, "s"));
    assert.match(new TextDecoder().decode((await oldPending).value), new RegExp(kill));
    await f.api(`/${prepared.id}/dial`, {}); await f.calls.poll();
    assert.equal(f.calls.getState().phase, "active");
    const shutdown = randomUUID();
    assert.equal(f.deliver(shutdown, 0, "desktop-one", "device-shutdown"), true);
    assert.match(new TextDecoder().decode((await latest.read()).value), /event: device-shutdown/);
    assert.match(new TextDecoder().decode((await old.read()).value), new RegExp(shutdown));
    const afterKill = old.read();
    await f.api(`/${prepared.id}/end`, {}); f.finish(); await f.calls.poll();
    streams[1].abort.abort(); await new Promise((r) => setTimeout(r, 10));
    const next = randomUUID(); assert.equal(f.deliver(next), true);
    const received = new TextDecoder().decode((await afterKill).value);
    assert.ok(!received.includes(id)); assert.ok(received.includes(next));
    streams[0].abort.abort(); await new Promise((r) => setTimeout(r, 10));
    assert.equal(f.deliver(randomUUID()), false);
    f.advance();
    const reconnected = await connect("desktop-one");
    assert.equal(f.deliver(randomUUID(), 0), false, "a newly connected desktop must not receive a reply recorded before it connected");
    const fresh = randomUUID(); f.deliver(fresh);
    assert.match(new TextDecoder().decode((await reconnected.read()).value), new RegExp(fresh));
  } finally { for (const stream of streams) { stream.abort.abort(); await stream.reader.cancel().catch(() => {}); } await f.close(); }
});
