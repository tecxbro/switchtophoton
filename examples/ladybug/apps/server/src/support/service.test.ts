import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { Redis } from "ioredis";
import { SupportService, configureSupport } from "./service.ts";
import type { SupportCommand } from "./service.ts";
import type { MessagingConfig, SharedMessage } from "./chert.ts";
import { SendError } from "./chert.ts";
import { publishEvent } from "@ladybug/backend";
import { scansRouter } from "../scans.ts";
import { checkVisit } from "../checker.ts";
import { configureAnalyzer, isAnalysisRunning, recipientsFor } from "../analyzer.ts";
import { config as analyzerConfig } from "../config.ts";
import { typesense } from "../typesense.ts";
import type { ScanDeps } from "../scans.ts";

const visitor = { userId: "browser-user", username: "alice" };
const visit = (request: Parameters<typeof checkVisit>[0], origin: Parameters<typeof checkVisit>[1]) =>
  checkVisit(request, origin, origin === "admin" ? "everyone" : visitor);

const config: MessagingConfig = { key: "message-key", line: "line", destination: "+15551234567", project: "project" };
const event = (at: number, id = randomUUID()): SharedMessage => ({
  id, line_id: "line", direction: "inbound", state: "received", masked_recipient: config.destination,
  text: " SuPpOrT \n", created_at: new Date(at).toISOString(),
});

test("Redis support integration (dedicated TEST_REDIS_URL; database is cleared)", { skip: !process.env.TEST_REDIS_URL }, async (t) => {
  const redis = new Redis(process.env.TEST_REDIS_URL!, { maxRetriesPerRequest: 1 });
  t.after(() => redis.disconnect());
  const fixture = async () => {
    await redis.flushdb();
    let now = Date.now();
    const sends: { id: string; url: string }[] = [], delivered: string[] = [], commands: SupportCommand[] = [];
    let online = true, fail = false;
    const options = { config: () => config, now: () => now, send: async (_config: typeof config, id: string, url: string) => {
      sends.push({ id, url }); if (fail) throw new SendError(true); return { id: `message-${id}`, state: "sent" };
    } };
    const create = () => new SupportService(redis, (id) => { if (online) { delivered.push(id.id); commands.push(id); } return online; }, options);
    const service = create();
    now += 1;
    return { service, create, sends, delivered, commands, now: () => now, advance: (ms: number) => { now += ms; }, fail: (value: boolean) => { fail = value; }, offline: () => { online = false; }, online: () => { online = true; } };
  };
  await t.test("concurrent pages reserve once per normalized host and cooldown survives a new service", async () => {
    const f = await fixture();
    await Promise.all([f.service.notify("https://user:secret@BAD.example./one#fragment", visitor.userId), f.service.notify("http://bad.example/two", visitor.userId), f.service.notify("https://bad.example/three", visitor.userId)]);
    await Promise.all([f.service.drain(), f.create().drain()]);
    assert.equal(f.sends.length, 1); assert.equal(f.sends[0].url, "https://bad.example./one");
    const cooldown = await redis.pttl((await redis.keys("support:host:*"))[0]);
    assert.ok(cooldown > 3_590_000 && cooldown <= 3_600_000);
    await f.create().notify("https://bad.example/four", visitor.userId); await f.create().drain(); assert.equal(f.sends.length, 1);
    await f.service.notify("https://sub.bad.example/", visitor.userId); await f.service.drain(); assert.equal(f.sends.length, 2);
    // Expire the cooldown in Redis, simulating the hour boundary without sleeping.
    for (const key of await redis.keys("support:host:*")) await redis.del(key);
    f.advance(3_600_001); await f.create().notify("https://bad.example/five", visitor.userId); await f.create().drain();
    assert.equal(f.sends.length, 3);
  });
  await t.test("distinct SUPPORT/KILL replies retain fixed windows, deduplicate concurrently, and route the newest preceding account", async () => {
    const f = await fixture();
    await f.service.notify("https://bad.example", "account-a"); await f.service.drain();
    const first = f.now(), firstReply = event(first);
    f.advance(1000);
    // Same host for another account has an independent cooldown.
    await f.service.notify("https://bad.example", "account-b"); await f.service.drain();
    assert.equal(f.sends.length, 2);
    const second = f.now();
    const peer = f.create();
    f.advance(1);
    const duplicate = { ...event(f.now()), text: " KiLl " };
    await Promise.all([f.service.reply(duplicate), peer.reply(duplicate), f.service.reply(duplicate)]);
    await f.service.reply(firstReply);
    await f.service.reply(event(second));
    await f.service.reply({ ...event(second), text: "kill" });
    assert.deepEqual(f.commands.map((c) => [c.accountId, c.kind, c.expiresAt]), [
      ["account-b", "browser-kill", second + 1_800_000],
      ["account-a", "support", first + 1_800_000],
      ["account-b", "support", second + 1_800_000],
      ["account-b", "browser-kill", second + 1_800_000],
    ]);
    assert.equal(new Set(f.delivered).size, 4);
    assert.ok(f.delivered.every((id) => !f.sends.some((send) => send.id === id)));
    f.advance(1_799_998);
    await f.service.reply(event(f.now()));
    assert.equal(f.commands.at(-1)!.expiresAt, second + 1_800_000);
    f.advance(2);
    await f.service.reply({ ...event(f.now()), text: "kill" });
    await f.service.reply(event(second + 1)); // Created inside, received outside.
    assert.equal(f.commands.length, 5);
  });
  await t.test("SHUTDOWN is exact, account scoped, deduplicated, expires, and is discarded offline", async () => {
    const f = await fixture();
    await f.service.notify("https://bad.example", "shutdown-account"); await f.service.drain();
    const shutdown = (at = f.now()) => ({ ...event(at), text: " \tShUtDoWn\n" });
    for (const text of ["shutdown now", "please shutdown", "SHUTDOWN!", "", "shutdown support"]) {
      await f.service.reply({ ...shutdown(), text });
    }
    await f.service.reply({ ...shutdown(), masked_recipient: "+15550000000" });
    await f.service.reply({ ...shutdown(), line_id: "other" });
    assert.equal(f.commands.length, 0);
    const duplicate = shutdown();
    await Promise.all([f.service.reply(duplicate), f.service.reply(duplicate), f.create().reply(duplicate)]);
    assert.equal(f.commands.length, 1);
    assert.equal(f.commands[0].kind, "device-shutdown");
    assert.equal(f.commands[0].accountId, "shutdown-account");
    const offline = shutdown(); f.offline(); await f.service.reply(offline);
    f.online(); f.advance(1); await f.service.reply(offline);
    assert.equal(f.commands.length, 1);
    await f.service.reply(shutdown()); assert.equal(f.commands.length, 2);
    f.advance(1_800_000);
    await f.service.reply(shutdown()); await f.service.reply(shutdown(f.now() - 1000));
    assert.equal(f.commands.length, 2);
  });
  await t.test("legacy jobs and windows cannot authorize commands", async () => {
    const f = await fixture();
    await f.service.notify("https://legacy.example", visitor.userId);
    const key = (await redis.keys("support:job:*"))[0];
    const job = JSON.parse((await redis.get(key))!); delete job.accountId;
    await redis.set(key, JSON.stringify(job)); await f.service.drain();
    assert.equal(f.sends.length, 0);
    await f.service.notify("https://new.example", visitor.userId); await f.service.drain();
    const windowKey = (await redis.keys("support:shared:windows:*"))[0];
    const window = JSON.parse((await redis.lindex(windowKey, 0))!); delete window.accountId;
    await redis.lset(windowKey, 0, JSON.stringify(window));
    await f.service.reply({ ...event(f.now()), text: "KILL" });
    assert.equal(f.commands.length, 0);
  });
  await t.test("durable retries reuse the original idempotency key and open no window before success", async () => {
    const f = await fixture(); f.fail(true);
    await f.service.notify("https://bad.example/", visitor.userId); await f.service.drain();
    await f.service.reply(event(f.now())); assert.equal(f.delivered.length, 0);
    f.fail(false); f.advance(10_000); await f.create().drain();
    assert.equal(f.sends.length, 2); assert.equal(f.sends[0].id, f.sends[1].id);
    await f.service.reply(event(f.now())); assert.equal(f.delivered.length, 1);
  });
  await t.test("wrong sender/line, outbound, extra content, old/future/expired timestamps cannot start calls", async () => {
    const f = await fixture(); await f.service.notify("https://bad.example", visitor.userId); await f.service.drain();
    const invalid = [
      (e: ReturnType<typeof event>) => { e.line_id = "wrong"; },
      (e: ReturnType<typeof event>) => { e.masked_recipient = "+15550000000"; },
      (e: ReturnType<typeof event>) => { e.direction = "outbound"; },
      (e: ReturnType<typeof event>) => { e.text = "please support"; },
      (e: ReturnType<typeof event>) => { e.created_at = new Date(f.now() - 1).toISOString(); },
      (e: ReturnType<typeof event>) => { e.created_at = new Date(f.now() + 1).toISOString(); },
    ];
    for (const mutate of invalid) { const e = event(f.now()); mutate(e); await f.service.reply(e); }
    assert.equal(f.delivered.length, 0);
    const valid = event(f.now()); await Promise.all([f.service.reply(valid), f.service.reply(valid), f.service.reply(event(f.now()))]);
    assert.equal(f.delivered.length, 2);
    await f.service.notify("https://other.example", visitor.userId); await f.service.drain();
    f.advance(1_800_001); await f.service.reply(event(f.now())); await f.service.reply(event(f.now() - 1_800_001));
    assert.equal(f.delivered.length, 2);
  });
  await t.test("offline replies are discarded; reconnecting requires a distinct fresh reply", async () => {
    const f = await fixture(); await f.service.notify("https://bad.example", visitor.userId); await f.service.drain();
    const offline = event(f.now());
    f.offline(); await f.service.reply(offline);
    f.online(); f.advance(1);
    await f.service.reply(offline);
    assert.equal(f.delivered.length, 0);
    await f.service.reply(event(f.now()));
    assert.equal(f.delivered.length, 1);
  });
  await t.test("registered masked SUPPORT replies match the emergency contact by last four digits", async () => {
    const f = await fixture(); await f.service.notify("https://bad.example", visitor.userId); await f.service.drain();
    await f.service.reply({ ...event(f.now()), masked_recipient: "•••0000" });
    await f.service.reply({ ...event(f.now()), masked_recipient: "arbitrary4567" });
    await f.service.reply({ ...event(f.now()), masked_recipient: "+15550004567" });
    assert.equal(f.delivered.length, 0);
    const masked = { ...event(f.now()), masked_recipient: "•••4567" };
    await f.service.reply(masked); await f.service.reply(masked);
    await f.service.reply(event(f.now())); assert.equal(f.delivered.length, 2);
  });
  await t.test("polling deduplicates the newest-50 window and discards pre-start history", async () => {
    const f = await fixture(); await f.service.notify("https://bad.example", visitor.userId); await f.service.drain();
    const rows = [event(f.now()), event(f.now() - 1000)];
    const polled = new SupportService(redis, (id) => { f.delivered.push(id.id); return true; }, { config: () => config, now: f.now, read: async () => rows });
    f.advance(1); rows[0].created_at = new Date(f.now()).toISOString();
    await polled.poll(); await polled.poll(); assert.equal(f.delivered.length, 1);
    await f.service.notify("https://other.example", visitor.userId); await f.service.drain();
    const restarted = new SupportService(redis, (id) => { f.delivered.push(id.id); return true; }, { config: () => config, now: f.now, read: async () => rows });
    await restarted.poll(); assert.equal(f.delivered.length, 1);
  });
  await t.test("pending sends are observed by id across restarts without another POST", async () => {
    const f = await fixture();
    let posts = 0, state = "pending";
    const options = { config: () => config, now: f.now,
      send: async () => { posts++; return { id: "pending-message", state: "pending" }; },
      read: async () => [{ ...event(f.now()), id: "pending-message", direction: "outbound" as const, state }],
    };
    const service = new SupportService(redis, (id) => { f.delivered.push(id.id); return true; }, options);
    await service.notify("https://pending.example", visitor.userId); await service.drain();
    f.advance(1); await service.reply(event(f.now())); assert.equal(f.delivered.length, 0);
    f.advance(10_000); await service.drain(); assert.equal(posts, 1);
    state = "sent"; f.advance(10_000);
    const restarted = new SupportService(redis, (id) => { f.delivered.push(id.id); return true; }, options);
    await restarted.drain(); f.advance(1); await restarted.reply(event(f.now()));
    assert.equal(posts, 1); assert.equal(f.delivered.length, 1);
  });
  await t.test("browser provenance survives joining admin analysis; safe, failed and admin work do not notify", async (st) => {
    const f = await fixture(); configureSupport(f.service);
    const original = { ...analyzerConfig }; analyzerConfig.analyzer = "placeholder"; analyzerConfig.analysisDelayMs = 5;
    st.after(() => Object.assign(analyzerConfig, original));
    let knownUnsafe = true;
    st.mock.method(typesense, "upsert", async () => ({}));
    // The lookup needs its deterministic candidate ID.
    st.mock.method(typesense, "search", async (_collection: string, options: { filter_by: string }) => ({ hits: knownUnsafe ? [{ document: { id: options.filter_by.slice(4, -1).split(",")[0], verdict: "unsafe", scope: "url", source: "manual", reason: "test" } }] : [] }));
    await visit({ url: "https://known.example/" }, "admin"); await f.service.drain(); assert.equal(f.sends.length, 0);
    await visit({ url: "https://known.example/" }, "extension"); await new Promise((r) => setImmediate(r)); await f.service.drain(); assert.equal(f.sends.length, 1);
    await f.service.reply(event(f.now()));
    assert.equal(f.commands[0].accountId, visitor.userId);
    knownUnsafe = false;
    const wait = async (url: string) => { while (isAnalysisRunning(url)) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setImmediate(r)); };
    await visit({ url: "https://phish.example/" }, "admin");
    await visit({ url: "https://phish.example/" }, "extension");
    await checkVisit({ url: "https://phish.example/" }, "extension", { userId: "second-browser", username: "bob" });
    await checkVisit({ url: "https://phish.example/" }, "admin", { userId: "admin-user", username: "admin" });
    assert.deepEqual(recipientsFor("https://phish.example/"), ["everyone"]);
    await wait("https://phish.example/"); await f.service.drain(); assert.equal(f.sends.length, 3);
    const windowKey = (await redis.keys("support:shared:windows:*"))[0];
    const accounts = (await redis.lrange(windowKey, 0, -1)).map((raw) => JSON.parse(raw).accountId);
    assert.deepEqual(accounts.sort(), [visitor.userId, visitor.userId, "second-browser"].sort());
    await visit({ url: "https://safe.example/" }, "extension"); await wait("https://safe.example/");
    await visit({ url: "https://malware-admin.example/" }, "admin"); await wait("https://malware-admin.example/");
    await f.service.drain(); assert.equal(f.sends.length, 3);
    st.mock.method(typesense, "upsert", async () => { throw new Error("analysis store failure"); });
    await visit({ url: "https://phish-failed.example/" }, "extension"); await wait("https://phish-failed.example/");
    await f.service.drain(); assert.equal(f.sends.length, 3);
  });
  await t.test("sandbox suspicious/malicious results notify browser visits; benign/failed and manual scans do not", async (st) => {
    const f = await fixture(); configureSupport(f.service);
    const original = { ...analyzerConfig }; analyzerConfig.analyzer = "scan";
    st.after(() => Object.assign(analyzerConfig, original));
    st.mock.method(typesense, "search", async () => ({ hits: [] }));
    st.mock.method(typesense, "upsert", async () => ({}));
    let verdict = "suspicious", failed = false;
    const rows = new Map<string, unknown>();
    const deps = {
      redis, apiKeys: ["manual-test-key"], rateLimitPerMinute: 100,
      createSubscriber: () => new Redis(process.env.TEST_REDIS_URL!),
      db: { query: async (sql: string, args: string[]) => {
        if (sql.startsWith("INSERT")) rows.set(args[0], { id: args[0], input_url: args[1], status: failed ? "failed" : "done", error: failed ? "scan failed" : null, created_at: new Date(), updated_at: new Date(), report: failed ? null : { verdict, score: 80, summary: "test" } });
        return { rows: [rows.get(args[0])] };
      } },
      queue: { add: async (_name: string, job: { scanId: string }) => {
        await publishEvent(redis, job.scanId, { type: "status", status: failed ? "failed" : "done", at: new Date().toISOString() });
      } },
    } as unknown as ScanDeps;
    configureAnalyzer(deps);
    const wait = async (url: string) => {
      while (isAnalysisRunning(url)) await new Promise((r) => setTimeout(r, 5));
      await new Promise((r) => setImmediate(r)); await f.service.drain();
    };
    for (const result of ["suspicious", "malicious", "benign", "failed"]) {
      verdict = result; failed = result === "failed";
      const url = `https://${result}.example/`;
      await visit({ url }, "extension"); await wait(url);
    }
    assert.equal(f.sends.length, 2);
    failed = false; verdict = "malicious";
    const app = express(); app.use(express.json()); app.use("/scans", scansRouter(deps));
    const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address(); assert.ok(address && typeof address !== "string");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/scans`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": "manual-test-key" }, body: JSON.stringify({ url: "https://manual.example/" }) });
      assert.equal(response.status, 202); await f.service.drain(); assert.equal(f.sends.length, 2);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });

});
