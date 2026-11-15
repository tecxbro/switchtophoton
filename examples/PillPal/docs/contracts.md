# PillPal — Shared contracts

> Role 3 owns this file. Change only by PR to Role 3.
> Types for everything below live in `@pillpal/shared` (`packages/shared`). Never redefine them locally.

## 5.1 Repo layout

```
pillpal/
  package.json            # "workspaces": ["web","api","agent","packages/*"]; scripts: check, build, dev
  CLAUDE.md               # rules every Claude Code session reads (5.6)
  .env.example            # every key name, no values
  .github/workflows/ci.yml          # typecheck + build on every PR
  .github/pull_request_template.md
  docs/contracts.md       # this section
  packages/shared/        # Role 3: zod schemas + TS types for every API body and DB row
  packages/ai/            # Role 3: every Claude + Gemini call (imported by api/)
  agent/                  # Role 3: Pal (LiveKit agent from `chert new --video`)
  api/                    # Role 2: Hono :8787, Chert iMessage + FaceTime calls, scheduler
  supabase/schema.sql     # Role 2
  supabase/seed.sql       # Role 2 (one week of demo history)
  web/                    # Role 1: Next.js :3000
```

## 5.2 Database (Supabase) — `supabase/schema.sql` (Backend)

| Table | Columns |
|---|---|
| `patients` | `id` uuid pk, `name`, `preferred_name`, `phone`, `language` (default `'en'`), `meal_times` jsonb, `caregiver_name`, `caregiver_phone`, `doctor_name`, `address`, `consent_at` timestamptz, `care_chat_id`, `created_at` |
| `medications` | `id`, `patient_id` → patients, `drug`, `strength`, `dose`, `times` text[], `food_rule` (`empty_stomach` \| `with_food` \| `none`), `avoid_foods` text[], `pills_left` int, `refill_info`, `pill_description`, `reference_photo_url`, `active` bool (default true), `confirmed_by`, `created_at` |
| `dose_events` | `id`, `medication_id` → medications, `patient_id` → patients, `scheduled_at`, `status` (`pending` \| `taken` \| `missed` \| `skipped` \| `wrong_pill_caught`, default `pending`), `confirmed_via`, `chert_message_id`, `evidence_jpeg_url`, `created_at` |
| `calls` | `id`, `patient_id`, `chert_call_id`, `room_name`, `kind`, `language`, `started_at` (default now), `ended_at`, `transcript` |
| `check_ins` | `id`, `call_id` → calls, `patient_id`, `mood` int, `symptoms` jsonb, `visual_notes` text[], `quotes` jsonb (`[{original, english}]`), `risk_level`, `summary`, `created_at` |
| `alerts` | `id`, `patient_id`, `level` (`yellow` \| `orange` \| `red`), `reason`, `sent_to`, `created_at`, `acknowledged_at` |
| `memories` | `id`, `patient_id`, `fact`, `created_at` |
| `reports` | `id`, `patient_id`, `week_start` date, `brief` jsonb, `doctor_note`, `created_at` |
| `chert_events` | `event_id` text pk, `received_at` — webhook dedupe |

Realtime: `dose_events`, `alerts`, `check_ins`, `calls` are added to the `supabase_realtime` publication.

**Hackathon shortcut:** keep row-level security off and use the service key only on servers (`api/`). The web app uses the anon key for reads.

The exact DDL is in [`supabase/schema.sql`](../supabase/schema.sql).

## 5.3 REST API — `api/` on `:8787` (Backend builds; bodies typed in `@pillpal/shared`)

| Endpoint | Called by | Body → response |
|---|---|---|
| `GET /patients/:id/context` | agent | → `{patient, meds[], due_now[], memories[], last_checkins[]}` |
| `POST /patients` · `PATCH /patients/:id` | web onboarding form | → `{id}` |
| `POST /rx/parse` | web | multipart label photo → `RxFields` (calls `ai.parseRx`) |
| `POST /medications` · `PATCH /medications/:id` | web | confirmed fields + pill photo → stores photo, calls `ai.describePill` |
| `POST /doses` | agent | `{patient_id, medication_id, status, confirmed_via, evidence_jpeg_b64?}` |
| `POST /symptoms` · `POST /memories` | agent | `{patient_id, name, severity, quote}` · `{patient_id, fact}` |
| `POST /calls/started` · `POST /calls/ended` | agent | `{patient_id, room_name, chert_call_id?, kind}` · `{room_name, transcript, language, vision_events[]}` → runs `ai.extractCheckIn` |
| `POST /escalate` | agent | `{patient_id, room_name, reason, summary}` → red alert iMessage, end 1:1 call, start group FaceTime |
| `POST /dial` | web demo button, scheduler | `{patient_id, kind:"check_in"}` → `{chert_call_id, room_name}` |
| `POST /demo/remind` | web | `{patient_id, medication_id}` → tapback reminder now |
| `POST /reports/generate` | web | `{patient_id}` → `Brief` (calls `ai.weeklyBrief`) |
| `POST /notify/dose-change` | web | `{patient_id, medication_id, old_dose, new_dose, doctor_note}` → text + voice note + group chat |

## 5.4 `@pillpal/ai` functions (AI Eng. builds; Backend calls)

| Function | Model | Returns |
|---|---|---|
| `checkPill(frameB64, meds, dueMedId)` | Claude Haiku 5.5 | `{verdict: match\|mismatch\|unsure, confidence, what_i_see, looks_like_med_id?}` |
| `checkPlate(frameB64, med)` | Claude Haiku 5.5 | `{verdict: ok\|wait\|not_allowed, confidence, what_i_see, reason}` |
| `parseRx(imageB64, mime)` · `describePill(imageB64)` | Claude Sonnet 5.5 · Haiku | `{drug, strength, dose, times[], food_rule, avoid_foods[], quantity, refills, warnings[]}` · `string` |
| `classifyMessage(text)` · `translate(text, lang)` | Claude Haiku 5.5 (cached) | `{language, english, intent, red_flag}` · `string` |
| `extractCheckIn(transcript, visionEvents, meds)` | Claude Sonnet 5.5 | `{summary, mood, symptoms[], visual_notes[], quotes[{original, english}], risk_level}` |
| `weeklyBrief(data)` · `doseChangeMessage(patient, change)` | Claude Sonnet 5.5 | `Brief` · `{patient_text, english_text}` |
| `transcribe(wavBuffer)` | Gemini 2.5 Flash (free) | `{language, transcript, english}` |
| `tts(text, lang)` | Gemini 2.5 Flash TTS (free, disk cache) | PCM WAV `Buffer` (mono) ready for Chert voice notes |

By 5:30 every function exists as a stub returning realistic fake data, so Backend and Frontend are never blocked. Real versions replace stubs without changing signatures.

## 5.5 Environment (`.env.example`)

```
PATIENT_ID=
LIVEKIT_URL= LIVEKIT_API_KEY= LIVEKIT_API_SECRET= AGENT_NAME=pillpal-agent
GOOGLE_API_KEY=              # Gemini free tier, your OWN project while building
ANTHROPIC_API_KEY=  CLAUDE_FAST=claude-haiku-5-5  CLAUDE_SMART=claude-sonnet-5-5
CHERT_API_KEY= CHERT_PROJECT_ID= CHERT_LINE_ID=          # https://facetime.trychert.com/api
CHERT_MSG_TOKEN= CHERT_FROM= CHERT_WEBHOOK_SECRET=       # https://console.trychert.com/api/v1
SUPABASE_URL= SUPABASE_ANON_KEY= SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= NEXT_PUBLIC_API_URL=http://localhost:8787
API_URL=http://localhost:8787   PATIENT_PHONE= CAREGIVER_PHONE= DEMO_LANGUAGE=es
```

## 5.6 CLAUDE.md

```markdown
# PillPal — rules for every Claude Code session
- Read docs/contracts.md first. Types live in packages/shared; never redefine them locally.
- Stay in your folder: web/ = Frontend, api/ + supabase/ = Backend, agent/ + packages/ = AI Eng.
  Root files, packages/shared and docs/ change only through a PR reviewed by Role 3.
- Branch names: fe/<thing>, be/<thing>, ai/<thing>. Never push to main. Small PRs, often.
- Before every PR: git fetch origin && git merge origin/main, then npm run check (must pass).
- TypeScript, Node 22+. Never commit .env. Never log tokens or patient data.
- AI: Gemini (free) only for live voice, voice-memo transcription and TTS. Claude for all vision and text.
  Claude JSON = one tool with input_schema + tool_choice forcing it. Cache translations and TTS.
- Safety: never invent or change a dose; never auto-call 911; vision "unsure" below 0.7 confidence.
- Chert docs index: https://docs.trychert.com/llms.txt — fetch pages instead of guessing.
```
