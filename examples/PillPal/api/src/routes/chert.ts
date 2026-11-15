/**
 * Chert event entry points.
 *  - webhooks (live only): POST /webhooks/chert, signed with the subscription secret.
 *  - dev (mock only): /dev/chert/* to inject Chert-shaped events and read the mock outbox.
 */
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { Uuid } from "@pillpal/shared";
import { handleEvent, verifyWebhookSignature, webhookSecret } from "../chert/events.js";
import { mockOutbox } from "../chert/messaging.js";
import type { ChertEnvelope, MessageReceivedEvent, ReactionEvent } from "../chert/types.js";
import { getPatient } from "../lib/data.js";
import { ValidationError, jsonBody } from "../lib/http.js";

// ---------------------------------------------------------------- live: signed webhook

export const webhooks = new Hono();

webhooks.post("/chert", async (c) => {
  const raw = await c.req.text(); // verify over the exact bytes, never re-serialized JSON
  if (!verifyWebhookSignature(raw, { get: (n) => c.req.header(n) }, webhookSecret())) {
    console.warn("[chert] webhook rejected: bad or stale signature");
    return c.json({ error: "invalid_signature" }, 401);
  }
  let event: ChertEnvelope;
  try {
    event = JSON.parse(raw) as ChertEnvelope;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  event.event_id ??= c.req.header("x-webhook-event-id") ?? "";
  event.event_type ??= c.req.header("x-webhook-event") ?? "";
  // A thrown error → 500 → Chert retries (dedupe row was rolled back).
  const result = await handleEvent(event);
  return c.json({ ok: true, status: result.status });
});

// ---------------------------------------------------------------- mock: dev routes

export const devChert = new Hono();

const EnvelopeBody = z
  .object({ event_id: z.string().min(1), event_type: z.string().min(1), data: z.unknown() })
  .passthrough();

/** Raw Chert-shaped event (same envelope as a webhook delivery). */
devChert.post("/event", async (c) => {
  const event = (await jsonBody(c, EnvelopeBody)) as ChertEnvelope;
  return c.json(await handleEvent(event));
});

/** Simulate the patient ❤-tapping one of our messages. */
devChert.post("/tapback", async (c) => {
  const { message_id, kind } = await jsonBody(
    c,
    z.object({ message_id: z.string().min(1), kind: z.string().default("love") }),
  );
  const event: ReactionEvent = {
    event_id: `mock:reaction:${randomUUID()}`,
    event_type: "reaction.added",
    created_at: new Date().toISOString(),
    api_version: "v1",
    data: {
      reaction: {
        id: `mock_rx_${randomUUID()}`,
        target_message_id: message_id,
        applied_at: new Date().toISOString(),
        service: "imessage",
        reaction: { kind },
      },
    },
  };
  return c.json(await handleEvent(event));
});

/** Simulate the patient texting the line. */
devChert.post("/text", async (c) => {
  const { patient_id, text } = await jsonBody(c, z.object({ patient_id: Uuid, text: z.string().min(1) }));
  const patient = await getPatient(patient_id);
  if (!patient.phone) throw new ValidationError([{ path: "patient_id", message: "Patient has no phone on file" }]);
  const now = new Date().toISOString();
  const event: MessageReceivedEvent = {
    event_id: `mock:msg:${randomUUID()}`,
    event_type: "message.received",
    created_at: now,
    api_version: "v1",
    data: {
      chat: { id: `mock_chat_${randomUUID()}`, is_group: false },
      message: {
        id: `mock_in_${randomUUID()}`,
        direction: "inbound",
        sender_handle: { handle: patient.phone, service: "imessage", is_me: false },
        parts: [{ type: "text", value: text }],
        sent_at: now,
        service: "imessage",
      },
    },
  };
  return c.json(await handleEvent(event));
});

/** Mock outbox: ids, kinds, recipient role and timestamps only (no phones, no bodies). */
devChert.get("/outbox", (c) => c.json({ messages: mockOutbox() ?? [] }));
