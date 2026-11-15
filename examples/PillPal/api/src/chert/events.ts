/**
 * Inbound Chert events. Every source (SSE stream, signed webhook, mock /dev routes) calls handleEvent().
 *
 * Dedupe: event_id is inserted into chert_events first; a duplicate key means we already handled it.
 * If processing then fails, the dedupe row is removed so a redelivery can retry.
 *
 * Logs never contain phone numbers, message bodies or tokens.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import * as ai from "@pillpal/ai";
import type { PatientRow } from "@pillpal/shared";
import { db } from "../db.js";
import { env } from "../env.js";
import { activeMeds, dueNow, findPatientByHandle, must } from "../lib/data.js";
import { escalate } from "../services/escalate.js";
import { CHERT_BASE, authHeaders } from "./http.js";
import { messaging } from "./messaging.js";
import type {
  ChertEnvelope,
  MediaPart,
  MessageReceivedEvent,
  ReactionEvent,
  TextPart,
} from "./types.js";

export type HandleResult =
  | { status: "duplicate"; event_id: string }
  | { status: "ignored"; event_id: string; reason: string }
  | { status: "processed"; event_id: string; actions: string[] };

// ---------------------------------------------------------------- dispatcher

export async function handleEvent(event: ChertEnvelope): Promise<HandleResult> {
  const event_id = event.event_id;
  if (!event_id || !event.event_type) throw new Error("event missing event_id or event_type");

  const ins = await db.from("chert_events").insert({ event_id });
  if (ins.error) {
    if (ins.error.code === "23505") {
      console.log(`[chert] ${event.event_type} duplicate, skipped`);
      return { status: "duplicate", event_id };
    }
    throw new Error(`dedupe insert: ${ins.error.message}`);
  }

  try {
    const result = await dispatch(event);
    const summary = result.status === "processed" ? result.actions.join(",") : "reason" in result ? result.reason : "";
    console.log(`[chert] ${event.event_type} ${result.status}${summary ? `: ${summary}` : ""}`);
    return result;
  } catch (err) {
    await db.from("chert_events").delete().eq("event_id", event_id);
    throw err;
  }
}

async function dispatch(event: ChertEnvelope): Promise<HandleResult> {
  switch (event.event_type) {
    case "reaction.added":
      return onReaction(event as ReactionEvent);
    case "message.received":
      return onMessage(event as MessageReceivedEvent);
    default:
      return { status: "ignored", event_id: event.event_id, reason: `unhandled type ${event.event_type}` };
  }
}

// ---------------------------------------------------------------- reaction.added

const HEART_EMOJI = new Set(["❤️", "❤", "♥️", "♥", "😍", "🥰", "💖", "💗", "💕", "💓", "💞", "💝", "🧡", "💛", "💚", "💙", "💜"]);

function isHeart(r: { kind: string; emoji?: string }): boolean {
  if (r.kind === "love") return true;
  return r.kind === "emoji" && !!r.emoji && HEART_EMOJI.has(r.emoji);
}

async function onReaction(event: ReactionEvent): Promise<HandleResult> {
  const r = event.data?.reaction;
  if (!r?.target_message_id) return { status: "ignored", event_id: event.event_id, reason: "no target_message_id" };
  if (!isHeart(r.reaction ?? { kind: "" })) {
    return { status: "ignored", event_id: event.event_id, reason: `reaction ${r.reaction?.kind ?? "?"} is not a heart` };
  }
  const updated = must(
    "tapback → dose taken",
    await db
      .from("dose_events")
      .update({ status: "taken", confirmed_via: "imessage_tapback" })
      .eq("chert_message_id", r.target_message_id)
      .select("id"),
  ) as { id: string }[];
  if (updated.length === 0) {
    return { status: "ignored", event_id: event.event_id, reason: "no dose_event for that message" };
  }
  return { status: "processed", event_id: event.event_id, actions: [`dose_taken x${updated.length}`] };
}

// ---------------------------------------------------------------- message.received

/**
 * Deterministic safety net on top of ai.classifyMessage: a patient saying they took an extra
 * dose is always escalated to the caregiver, even if the classifier misses it.
 */
const POSSIBLE_DOUBLE_DOSE =
  /\b(took|taken|take|tomé|tome)\b[^.!?\n]{0,25}\b(two|2|double|twice|extra|another|dos|doble|otra)\b|\bdouble[- ]?dos(e|ed|ing)\b|\bdosis doble\b/i;

const isText = (p: { type: string }): p is TextPart => p.type === "text" && typeof (p as TextPart).value === "string";
const isMedia = (p: { type: string }): p is MediaPart => p.type === "media" && typeof (p as MediaPart).attachment_id === "string";

function mediaKind(p: MediaPart): "image" | "voice_memo" | "other" {
  const mime = (p.mime_type ?? "").toLowerCase();
  const name = (p.filename ?? "").toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|heic|heif|gif|webp)$/.test(name)) return "image";
  // Apple voice memos arrive as application/octet-stream CAF (often with no filename).
  if (mime.startsWith("audio/") || name.endsWith(".caf") || mime === "application/octet-stream") return "voice_memo";
  return "other";
}

async function onMessage(event: MessageReceivedEvent): Promise<HandleResult> {
  const msg = event.data?.message;
  if (!msg) return { status: "ignored", event_id: event.event_id, reason: "no message" };
  if (msg.direction === "outbound" || msg.sender_handle?.is_me) {
    return { status: "ignored", event_id: event.event_id, reason: "outbound/own message" };
  }
  const handle = msg.sender_handle?.handle;
  const patient = handle ? await findPatientByHandle(handle) : undefined;
  if (!patient) return { status: "ignored", event_id: event.event_id, reason: "sender is not a known patient" };

  const actions: string[] = [];
  const parts = msg.parts ?? [];

  const text = parts.filter(isText).map((p) => p.value).join("\n").trim();
  if (text) actions.push(...(await onText(patient, text, msg.id)));

  for (const p of parts.filter(isMedia)) {
    const kind = mediaKind(p);
    if (kind === "image") actions.push(await onImage(patient, p));
    else if (kind === "voice_memo") {
      console.log("[chert] voice memo received"); // TODO: ffmpeg CAF → WAV → ai.transcribe
      actions.push("voice_memo_received");
    } else actions.push("media_ignored");
  }

  if (actions.length === 0) return { status: "ignored", event_id: event.event_id, reason: "no text or media parts" };
  return { status: "processed", event_id: event.event_id, actions };
}

async function onText(patient: PatientRow, text: string, messageId: string): Promise<string[]> {
  const c = await ai.classifyMessage(text);
  const doubleDose = POSSIBLE_DOUBLE_DOSE.test(text);
  const actions = [`classified intent=${c.intent} red_flag=${c.red_flag}${doubleDose ? " double_dose" : ""}`];

  if (c.red_flag || doubleDose) {
    const reason = doubleDose ? "Possible double dose reported by text" : "Red-flag symptom reported by text";
    const name = patient.preferred_name ?? patient.name ?? "The patient";
    const r = await escalate({ patient_id: patient.id, reason, summary: `${name} wrote: "${c.english}"` });
    actions.push(`escalated alert=${r.alert_id}`);
  } else if (c.intent === "dose_taken") {
    // Acknowledge with a ❤ tapback on their message; confirming the dose itself stays with the tapback/agent flow.
    await messaging.react(messageId, "love").catch((e: Error) => console.error(`[chert] react failed: ${e.message}`));
    actions.push("reacted love");
  }
  return actions;
}

async function onImage(patient: PatientRow, part: MediaPart): Promise<string> {
  const meds = await activeMeds(patient.id);
  const due = (await dueNow(patient.id, meds))[0];
  if (!due) {
    console.log("[chert] image received, no dose due — pill check skipped");
    return "pill_check_skipped_no_due_med";
  }
  const file = await messaging.downloadAttachment(part.attachment_id);
  const check = await ai.checkPill(file.data.toString("base64"), meds, due.medication_id);
  console.log(`[chert] pill check verdict=${check.verdict} confidence=${check.confidence.toFixed(2)}`);
  return `pill_check ${check.verdict}`;
}

// ---------------------------------------------------------------- webhook signature (live)

const SIGNATURE_WINDOW_S = 300;

/**
 * Verify a Chert webhook delivery. Accepts the recommended `X-Webhook-Signature: t=<ts>,v1=<hex>`
 * (falling back to X-Webhook-Timestamp for ts) and the legacy `x-chert-signature: v1,<ts>,<hex>`.
 * Signature = hex HMAC-SHA256(subscription secret, `${ts}.${rawBody}`), ts within ±300 s.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: { get(name: string): string | null | undefined },
  secret: string,
  nowS = Math.floor(Date.now() / 1000),
): boolean {
  let ts: string | undefined;
  const sigs: string[] = [];

  const modern = headers.get("x-webhook-signature");
  if (modern) {
    for (const piece of modern.split(",")) {
      const [k, v] = piece.trim().split("=", 2);
      if (k === "t" && v) ts = v;
      if (k === "v1" && v) sigs.push(v);
    }
    ts ??= headers.get("x-webhook-timestamp") ?? undefined;
  } else {
    const legacy = headers.get("x-chert-signature");
    const m = legacy ? /^v1,(\d+),([0-9a-fA-F]+)$/.exec(legacy.trim()) : null;
    if (m) {
      ts = m[1];
      sigs.push(m[2]!);
    }
  }
  if (!ts || !/^\d+$/.test(ts) || sigs.length === 0) return false;
  if (Math.abs(nowS - Number(ts)) > SIGNATURE_WINDOW_S) return false;

  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

// ---------------------------------------------------------------- SSE stream (live)

type SseFrame = { id?: string; type?: string; payload?: unknown; created_at?: string };

/** SSE frames wrap the event as {id, type, payload, created_at}; payload is normally the webhook envelope. */
function frameToEnvelope(f: SseFrame): ChertEnvelope | undefined {
  const p = (f.payload ?? {}) as Partial<ChertEnvelope> & Record<string, unknown>;
  const event_type = (p.event_type as string | undefined) ?? f.type;
  const event_id = (p.event_id as string | undefined) ?? f.id;
  if (!event_type || !event_id) return undefined;
  return { ...p, event_id, event_type, created_at: p.created_at ?? f.created_at, data: p.data ?? p } as ChertEnvelope;
}

/**
 * GET /api/v1/events/stream. Chert closes each connection after ~60 s with `event: close`
 * and `reconnect_with_since`; we reconnect with ?since=. Network errors back off 1 s → 30 s.
 */
export function startEventStream(signal?: AbortSignal): void {
  let since: string | undefined;
  let backoffMs = 1000;

  const loop = async () => {
    while (!signal?.aborted) {
      try {
        const url = `${CHERT_BASE}/events/stream${since ? `?since=${encodeURIComponent(since)}` : ""}`;
        const res = await fetch(url, { headers: { ...authHeaders(), accept: "text/event-stream" }, signal });
        if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`);
        console.log("[chert] event stream connected");
        backoffMs = 1000;
        since = await consume(res.body, since);
      } catch (err) {
        if (signal?.aborted) return;
        console.error(`[chert] event stream error: ${(err as Error).message}; retry in ${backoffMs / 1000}s`);
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(backoffMs * 2, 30_000);
      }
    }
  };
  void loop();
}

/** Reads one SSE connection to its end; returns the `since` cursor to resume from. */
async function consume(body: ReadableStream<Uint8Array>, since: string | undefined): Promise<string | undefined> {
  const decoder = new TextDecoder();
  let buf = "";
  let eventName = "";
  let data: string[] = [];

  const flush = async () => {
    const payload = data.join("\n");
    const name = eventName;
    eventName = "";
    data = [];
    if (!payload) return;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      console.warn("[chert] unparseable SSE frame skipped");
      return;
    }
    if (name === "close") {
      if (typeof json.reconnect_with_since === "string") since = json.reconnect_with_since;
      return;
    }
    const envelope = frameToEnvelope(json as SseFrame);
    if (!envelope) return;
    try {
      await handleEvent(envelope);
    } catch (err) {
      console.error(`[chert] ${envelope.event_type} failed: ${(err as Error).message}`);
    }
    if (typeof json.created_at === "string") since = json.created_at;
  };

  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line === "") await flush();
      else if (line.startsWith(":")) continue; // comment / heartbeat
      else if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
  }
  await flush();
  return since;
}

/** Live-mode secret for the webhook route (validated at boot by env.ts). */
export const webhookSecret = (): string => env.CHERT_WEBHOOK_SECRET ?? "";
