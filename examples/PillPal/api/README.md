# @pillpal/api

Hono REST API on `:8787` (Role 2 · Backend). Bodies and responses are typed and validated with
the zod schemas from `@pillpal/shared`. All AI goes through `@pillpal/ai` (never a model API directly).

**Status:** every endpoint except `/dial`, `/reports/generate` and `/notify/dose-change` reads and writes
Supabase. Chert iMessage is wired up (mock by default, see below). FaceTime/LiveKit lands in a follow-up PR.

## Run

```bash
npm install                 # from repo root
cd api
npm run seed:patient        # once: inserts demo patient Rose + 3 meds, prints the patient id
npm run dev                 # http://localhost:8787 (tsx watch)
```

Env is read from the repo-root `.env` via `--env-file=../.env`, and only through `src/env.ts`.
If a required variable is missing, the process exits and names it (never prints values).
Required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. The seed also needs `PATIENT_PHONE`, `CAREGIVER_PHONE`.

| Script | What |
|---|---|
| `npm run dev` | watch mode with `.env` |
| `npm run build` | `tsc -b` → `dist/` |
| `npm start` | run `dist/` with `.env` |
| `npm run typecheck` | typecheck `src/` and `scripts/` |
| `npm run seed:patient` | idempotent demo-patient seed (prints only the id) |
| `npm run chert:ping` | live: `GET /phone-numbers` → line id + capabilities; mock: prints "mock mode, skipping" |

## Endpoints (contracts 5.3)

| Method + path | Body (`@pillpal/shared`) | Response |
|---|---|---|
| `GET /health` | — | `OkResponse` |
| `GET /patients/:id/context` | — | `PatientContext` |
| `POST /patients` | `CreatePatientBody` | `IdResponse` (201) |
| `PATCH /patients/:id` | `UpdatePatientBody` | `IdResponse` |
| `POST /rx/parse` | multipart, file field `image` (`photo` also accepted) | `RxFields` |
| `POST /medications` | `CreateMedicationBody` as JSON, or multipart fields + file `pill_photo` | `IdResponse` (201) |
| `PATCH /medications/:id` | `UpdateMedicationBody` (JSON or multipart) | `IdResponse` |
| `POST /doses` | `CreateDoseBody` | `IdResponse` (201) |
| `POST /symptoms` | `SymptomBody` | `OkResponse` |
| `POST /memories` | `MemoryBody` | `IdResponse` (201) |
| `POST /calls/started` | `CallStartedBody` | `IdResponse` (201) |
| `POST /calls/ended` | `CallEndedBody` | `CallEndedResponse` |
| `POST /escalate` | `EscalateBody` | `EscalateResponse` |
| `POST /dial` | `DialBody` | `DialResponse` |
| `POST /demo/remind` | `DemoRemindBody` | `DemoRemindResponse` |
| `POST /reports/generate` | `GenerateReportBody` | `Brief` |
| `POST /notify/dose-change` | `DoseChangeBody` | `DoseChangeResponse` |

Multipart array fields (`times`, `avoid_foods`) may be a JSON array string or comma-separated.

Errors are JSON: `400 {error:"validation_error", issues:[{path,message}]}`, `404 {error:"not_found"}`,
`500 {error:"internal_error"}`. CORS allows `http://localhost:3000` (override with `WEB_ORIGIN`).
The request logger prints method, path, status and duration only — never bodies, query strings or phones.

## Mock vs live Chert

`CHERT_MODE` picks the iMessage implementation (`src/chert/messaging.ts`). It defaults to **`mock`**.

| | `mock` (default) | `live` |
|---|---|---|
| Outbound (`sendText`, `react`, `sendVoiceNote`, `createCareChat`, `postToChat`, `sendPharmacyPin`, `downloadAttachment`) | no network; logs `[chert-mock] <method> → patient\|caregiver\|care-chat`, returns `mock_msg_<uuid>` / `mock_chat_<uuid>`, keeps an in-memory outbox | HTTPS to `https://console.trychert.com/api/v1`, `Authorization: Bearer $CHERT_MSG_TOKEN`; retries 5xx only (3 attempts, never 4103/4104 "outcome unknown"); every send carries an `idempotency_key` |
| Inbound events | `/dev/chert/*` routes below | SSE `GET /api/v1/events/stream` (auto-reconnect with `?since=`, backoff 1→30 s) **and** `POST /webhooks/chert` |
| Required env | `SUPABASE_*` only | also `CHERT_MSG_TOKEN`, `CHERT_FROM`, `CHERT_WEBHOOK_SECRET` (boot fails naming any that are missing). `CHERT_TENANT` only for multi-tenant accounts |

Both modes feed the same `handleEvent()` (`src/chert/events.ts`):

- **Dedupe:** `event_id` is inserted into `chert_events` first; a duplicate is skipped. If processing fails, the row is removed so a redelivery retries.
- **`reaction.added`** with a heart (`love`, or a ❤️-style custom emoji) → the `dose_events` row whose `chert_message_id` is the target → `status=taken`, `confirmed_via=imessage_tapback`.
- **`message.received`** from a known patient handle:
  - text → `ai.classifyMessage`. A `red_flag`, or a text that reports an extra/double dose, calls the shared `escalate()`: red alert row plus a caregiver iMessage. A `dose_taken` text gets a ❤ tapback.
  - image → `downloadAttachment` → `ai.checkPill` against the first due med; the verdict is logged.
  - voice memo (CAF / `application/octet-stream`) → logs `voice memo received` (transcription is a TODO).

**Webhook** (`POST /webhooks/chert`, live only) verifies `X-Webhook-Signature: t=<ts>,v1=<hex>` (or the legacy
`x-chert-signature: v1,<ts>,<hex>`) = HMAC-SHA256(`CHERT_WEBHOOK_SECRET`, `` `${ts}.${rawBody}` ``) within 300 s, else `401`.
`CHERT_WEBHOOK_SECRET` is the **subscription** secret returned once by `POST /api/v1/webhook-subscriptions`, not the API signing secret.

### Dev routes (registered only when `CHERT_MODE=mock`)

| Route | Body | Does |
|---|---|---|
| `POST /dev/chert/event` | raw Chert envelope `{event_id, event_type, data}` | runs `handleEvent` (send twice → `{"status":"duplicate"}`) |
| `POST /dev/chert/tapback` | `{message_id, kind?="love"}` | builds a `reaction.added` event |
| `POST /dev/chert/text` | `{patient_id, text}` | builds a `message.received` text event from the patient's phone |
| `GET /dev/chert/outbox` | — | `{messages:[{id, kind, to, at}]}`: role labels only, no phones or bodies |

Demo loop in mock mode:

```bash
curl -s -XPOST localhost:8787/demo/remind -H 'content-type: application/json' \
  -d '{"patient_id":"<PATIENT_ID>","medication_id":"<levothyroxine id>"}'      # → {dose_event_id, chert_message_id}
curl -s -XPOST localhost:8787/dev/chert/tapback -H 'content-type: application/json' \
  -d '{"message_id":"<chert_message_id>"}'                                    # dose_event → taken
```

### Going live

1. Set `CHERT_MODE=live` plus the three Chert keys in the root `.env`.
2. `npm run chert:ping`: confirm the line is active and lists `send`.
3. `npm run dev`. The SSE stream needs no public URL. For webhooks, expose `/webhooks/chert` over a tunnel,
   create a subscription with `events: []` (all events, including `reaction.added`), and put its `secret` in `CHERT_WEBHOOK_SECRET`.
   Running SSE and webhooks together is safe because of the `event_id` dedupe.
