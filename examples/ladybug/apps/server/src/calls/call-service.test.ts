import assert from "node:assert/strict";
import { test } from "node:test";
import type { ParticipantInfo, Room, RoomServiceClient } from "livekit-server-sdk";
import { CallService } from "./call-service.ts";
import { readCallConfig } from "./call-config.ts";
import type { PreparedCall } from "@ladybug/shared";

const config = {
  url: "wss://example.livekit.cloud/", key: "test-key", secret: "test-secret-with-at-least-32-characters",
  chertKey: "chert-test-key", project: "project", line: "line", destination: "+15551234567",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function fixture() {
  let participants: ParticipantInfo[] = [];
  let status = "active";
  let events: unknown[] = [];
  let failCreate = false, failEnd = false, failDelete = false;
  const requests: { url: string; init: RequestInit }[] = [];
  const deleted: string[] = [];
  const rooms = {
    createRoom: async () => ({} as Room),
    deleteRoom: async (room: string) => { if (failDelete) throw new Error("offline"); deleted.push(room); },
    listParticipants: async () => participants,
  } satisfies Pick<RoomServiceClient, "createRoom" | "deleteRoom" | "listParticipants">;
  const service = new CallService({ config: () => config, rooms: () => rooms, mediaReadyTimeoutMs: 20, mediaReadyPollMs: 1, fetch: async (url, init) => {
    requests.push({ url: String(url), init: init! });
    if (init?.method === "POST" && String(url).endsWith("/calls") && failCreate) { failCreate = false; throw new Error("response lost"); }
    if (String(url).endsWith("/end") && failEnd) { failEnd = false; throw new Error("end response lost"); }
    const data = String(url).endsWith("/events") ? events : init?.method === "POST" ? { id: "call-123" } : { id: "call-123", status };
    return new Response(JSON.stringify({ data }), { status: 200 });
  } });
  return { service, rooms, requests, deleted,
    ready: (p: PreparedCall) => { participants = [{ identity: `device-${p.id}`, tracks: [{ type: 0, muted: false }, { type: 1, muted: false }] }] as ParticipantInfo[]; },
    failCreate: () => { failCreate = true; }, failEnd: () => { failEnd = true; },
    failDelete: (fail: boolean) => { failDelete = fail; },
    events: (value: unknown[]) => { events = value; },
    finish: () => { status = "ended"; },
  };
}
function decode(jwt: string) { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()); }

test("provider credentials are required only on the server", () => {
  assert.throws(() => readCallConfig({}), /Configure LIVEKIT_URL in the server/);
});

test("fresh rooms, isolated room-scoped tokens, readiness gate and one call at a time", async () => {
  const f = fixture();
  const pending = f.service.prepare();
  await assert.rejects(f.service.prepare(), /already in progress/);
  const p = await pending;
  await assert.rejects(f.service.dial(p.id), /must be published/);
  assert.equal(f.requests.length, 0);
  const next = await f.service.prepare();
  assert.notEqual(next.id, p.id);
  f.ready(next);
  await Promise.all([f.service.dial(next.id), f.service.dial(next.id)]);
  assert.equal(f.requests.length, 1);
  const body = JSON.parse(f.requests[0].init.body as string);
  assert.deepEqual(body.media, { audio: true, video: true });
  assert.equal(body.destination_type, "phone");
  assert.equal(body.destination, config.destination);
  const device = decode(next.token), bridge = decode(body.participant_token);
  assert.notEqual(device.sub, bridge.sub);
  assert.equal(bridge.sub, next.bridgeIdentity);
  assert.equal(device.video.room, bridge.video.room);
  assert.equal(bridge.video.room, `ladybug-${next.id}`);
  for (const claims of [device, bridge]) {
    assert.equal(claims.video.roomJoin, true);
    assert.equal(claims.video.canPublish, true);
    assert.equal(claims.video.canSubscribe, true);
    assert.ok(Number.isInteger(claims.nbf));
    assert.ok(claims.exp - claims.nbf <= 7200 && claims.exp - claims.nbf > 90);
    assert.equal(claims.video.roomAdmin, undefined);
  }
  const publicData = JSON.stringify({ next, state: f.service.getState() });
  for (const secret of [config.secret, config.chertKey, body.participant_token, config.destination]) assert.ok(!publicData.includes(secret));
  await f.service.poll();
  assert.equal(f.service.getState().bridgeReady, false, "active status alone does not activate audio");
  f.events([{ event_type: "call.started" }]);
  await f.service.poll();
  assert.equal(f.service.getState().bridgeReady, false, "call.started is not worker media readiness");
  f.events([{ event_type: "bridge_ready" }]);
  await f.service.poll();
  assert.equal(f.service.getState().bridgeReady, true);
  f.finish(); await f.service.poll();
  assert.equal(f.service.getState().phase, "ended");
  assert.equal(f.deleted.length, 2);
});

test("room API can report audio before video without rejecting or duplicating the call", async () => {
  const f = fixture();
  const p = await f.service.prepare(); f.ready(p);
  const listReady = f.rooms.listParticipants;
  let reads = 0;
  f.rooms.listParticipants = async () => {
    const participants = await listReady();
    reads++;
    return reads < 3 ? participants.map((participant) => ({ ...participant, tracks: participant.tracks.filter((track) => track.type === 0) })) as ParticipantInfo[] : participants;
  };
  await Promise.all([f.service.dial(p.id), f.service.dial(p.id)]);
  assert.equal(reads, 3);
  assert.equal(f.requests.filter((r) => r.url.endsWith("/calls")).length, 1);
  f.finish(); await f.service.poll();
});

test("cancel while waiting for video never creates an outbound call", async () => {
  const f = fixture();
  const p = await f.service.prepare(); f.ready(p);
  const listReady = f.rooms.listParticipants;
  const waiting = deferred<void>();
  f.rooms.listParticipants = async () => {
    const participants = await listReady();
    waiting.resolve();
    return participants.map((participant) => ({ ...participant, tracks: participant.tracks.filter((track) => track.type === 0) })) as ParticipantInfo[];
  };
  const dialing = f.service.dial(p.id);
  await waiting.promise;
  await f.service.end(p.id);
  await dialing;
  assert.equal(f.requests.length, 0);
  assert.equal(f.service.getState().phase, "ended");
  assert.equal(f.deleted.length, 1);
});

test("extra audio publishers still prevent dialing after the readiness wait", async () => {
  const f = fixture();
  const p = await f.service.prepare(); f.ready(p);
  const participants = await f.rooms.listParticipants();
  f.rooms.listParticipants = async () => [...participants, { identity: "another-device", tracks: [{ type: 0, muted: false }] } as ParticipantInfo];
  await assert.rejects(f.service.dial(p.id), /exactly one microphone/);
  assert.equal(f.requests.length, 0);
  assert.equal(f.service.getState().phase, "error");
});

test("lost create/end responses retain keys and track cleanup after hangup", async () => {
  const f = fixture();
  const p = await f.service.prepare(); f.ready(p); f.failCreate();
  await f.service.dial(p.id);
  await f.service.end(p.id);
  f.failEnd(); await f.service.poll(); await f.service.poll();
  const creates = f.requests.filter((r) => r.url.endsWith("/calls"));
  const ends = f.requests.filter((r) => r.url.endsWith("/end"));
  assert.equal(creates.length, 2); assert.equal(ends.length, 2);
  assert.equal(creates[0].init.body, creates[1].init.body);
  assert.equal(new Headers(creates[0].init.headers).get("Idempotency-Key"), new Headers(creates[1].init.headers).get("Idempotency-Key"));
  assert.equal(new Headers(ends[0].init.headers).get("Idempotency-Key"), new Headers(ends[1].init.headers).get("Idempotency-Key"));
  assert.notEqual(new Headers(creates[0].init.headers).get("Idempotency-Key"), new Headers(ends[0].init.headers).get("Idempotency-Key"));
  assert.equal(f.service.getState().phase, "ending");
  await assert.rejects(f.service.prepare(), /already/);
  f.finish(); f.failDelete(true); await f.service.poll();
  assert.equal(f.service.getState().phase, "ending");
  f.failDelete(false); await f.service.poll();
  assert.equal(f.service.getState().phase, "ended");
  const second = await f.service.prepare(); await f.service.end(second.id);
});

test("cancel while room preparation is pending never dials and deletes the room", async () => {
  const f = fixture(), gate = deferred<Room>();
  f.rooms.createRoom = () => gate.promise;
  const preparing = f.service.prepare();
  await f.service.end(f.service.getState().id!);
  gate.resolve({} as Room);
  await assert.rejects(preparing, /canceled/);
  assert.equal(f.requests.length, 0);
  assert.equal(f.deleted.length, 1);
  assert.equal(f.service.getState().phase, "ended");
});

test("terminal status is still observed when hang-up acknowledgement is lost", async () => {
  const f = fixture();
  const p = await f.service.prepare(); f.ready(p);
  await f.service.dial(p.id); await f.service.end(p.id);
  f.failEnd(); f.finish(); await f.service.poll();
  assert.equal(f.service.getState().phase, "ended");
});
