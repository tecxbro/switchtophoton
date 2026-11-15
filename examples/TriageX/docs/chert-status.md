# Chert FaceTime status

Last updated: 2026-11-14 (macOS, Node 24.22.3, `@trychert/facetime@0.1.0-beta.21`).
No secrets and no phone numbers are recorded here. Times are US Eastern (UTC−5).

> The **hosted Chert demo agent** was not used for any result below. Every call in this file was
> answered by **our own agent** (`agent/`, `triagex-facetime-agent`) through `chert dev`.

## Status

| Item | Status | Evidence |
|---|---|---|
| Chert authentication | **VERIFIED** | `chert whoami`: signed in, role **owner**, project `36c65de7-…-4398`, `confirmed: true` |
| Line provisioned | **VERIFIED** | `chert doctor`: line "Silas Thorne" available, routing configured, calls enabled, worker Mac checked in |
| iPhone verified (iMessage code) | **VERIFIED** | Completed by the developer in Chert's onboarding; the line accepted two FaceTime Video calls from that iPhone (below) |
| Hosted demo call (`demo_outcome`) | **SKIPPED** | Not run: it proves nothing about our agent and costs trial minutes. The local onboarding record is an expired pre-sign-in session; setup was already complete when checked |
| Trial | **ACTIVE** | `chert doctor`: about 41 of 50 FaceTime minutes left after four test calls (not re-checked after call 4); "trial line stays yours until your trial ends" |
| LiveKit Cloud (own project) | **VERIFIED** | `chert doctor`: "LiveKit accepted the credentials"; `doctor --agent`: agent joined a test room in 1.2 s. Chert-managed LiveKit: `livekit_not_provisioned` |
| Voice model | **VERIFIED** | Gemini Live `gemini-2.5-flash-native-audio-preview-12-2025`, Gemini API free tier, via `@livekit/agents-plugin-google` 1.8.0 (replaces the starter's paid OpenAI realtime model) |
| Two-way voice with our agent | **VERIFIED** (logs) | Call 1, below. Subjective audio quality not yet reported by the caller |
| Caller camera capture (`facetime-remote-video`) | **VERIFIED** | Call 2, below. Enabled on this line without a request to Chert |
| Our agent receives real caller frames | **VERIFIED** | Call 2: 609 frames, luminance follows the camera |
| Vision model for cards | **VERIFIED** | `gemini-3.5-flash-lite` (`VISION_MODEL`), Gemini API free tier, same key. Listed by `GET /v1beta/models` for the key; Google's model page: stable, image input, structured output. Free-tier limit measured: **15 requests/min per model** |
| Staff-card recognition from live FaceTime video | **VERIFIED** | Call 3: 5 different cards read with the exact `card_id` (1001, 1002, 1003, 9999, 1004); blank screen gave `card_present=false`; 45 s timeout fired |
| Card validation + "I confirm" → dashboard (Prompt 4) | **BUILT, live call PENDING** | Backend, agent and dashboard tested (pytest, agent and vitest suites); over real HTTP the agent client got 9999 rejected, 1004 off duty, 1001 valid → confirmed once (repeat = duplicate); the dashboard updated 48–68 ms after the confirm call. Token set in both files. Call 4 (14:05–14:06 ET, about 1 min, made before outreach was approved): the agent's authenticated calls reached the backend (`POST /api/agent/call` 200 ×3; `GET /api/agent/active-request` correctly 404 with no open request); 11 samples, no card shown, 45 s timeout. The card → "I confirm" path is still to be tested on a call |
| Shared-line iMessage (Prompt 5) | **BUILT, live PENDING** | Adapter tested with mocked HTTP. Keys are in `.env`; the backend health check reported `ok` (a real authenticated `GET /shared-messages` succeeded). Responses come wrapped as `{data: {items, total, limit, offset}, request_id}` (seen live, now parsed); per-message field names are still unknown because the line had no messages. The response shape of `/shared-messages` is undocumented: run `scripts/chert_inspect.py` first. Trial lines may only reply within 24 h of a phone's last text |
| AI operational brief (Prompt 6) | **VERIFIED** (real Gemini API, local run) | Real Gemini briefs: primary `gemini-3.1-flash-lite` (≈1 s), forced primary failure → fallback `gemini-3.5-flash-lite` with the reason shown; a real primary timeout also fell back visibly. Needs `GEMINI_API_KEY` in `.env` for the dashboard |
| Outbound FaceTime (agent places the call) | **SKIPPED** | Out of scope by decision on 2026-11-14 |
| Project API key / `CHERT_LINE_ID` in `.env` | **PENDING** | Not needed for inbound calls via `chert dev`; needed for outbound calls and the shared-line iMessage adapter (Prompt 5) |

## Call 1: two-way voice (11:08:59–11:10:21, about 80 s)

`chert dev` records: `call_incoming` (FaceTime Video) → `call_accepted` in 0.1 s (warm) →
`call_bridge_ready` after 6.6 s → `call_media`: "Video and audio are coming from" our agent
participant (`video: true`) → `call_ended`.

Agent log: greeting started in the same second as `bridge_ready` (Chert requires < 10 s); Gemini's
server-side voice activity detection registered 5 caller turns and a spoken reply was generated for
each; no errors; the session closed on caller hang-up (`CLIENT_INITIATED`).

## Call 2: caller frames (11:21:16–11:22:11, about 55 s)

Frame probe (`agent/frame-probe.mjs`) excerpt. Numbers only; no image was stored.

```text
11:21:18 participant_connected  chert-bridge-0d536eaa-…
11:21:23 track_published         facetime-remote-video  KIND_VIDEO SOURCE_CAMERA video/VP8 1280x720
11:21:23 track_published         facetime-remote-audio  KIND_AUDIO SOURCE_MICROPHONE audio/opus
11:21:25 room_snapshot (bridge_ready): both tracks present, unmuted
11:21:26 frame 1280x720 I420 ts=109306574000us luma=58.2 fps=14.9 total=49     (normal view)
11:21:32 frame 1280x720 I420 ts=109312692000us luma=75.1 fps=14.5 total=139    (bright)
11:21:45 frame 1280x720 I420 ts=109324865000us luma=14.2 fps=14.8 total=319    (lens covered)
11:21:47 frame 1280x720 I420 ts=109326883000us luma=12.2 fps=14.9 total=349    (lens covered)
11:21:53 frame 1280x720 I420 ts=109332980000us luma=49.9 fps=14.9 total=439    (printed page)
11:22:04 track_muted facetime-remote-video                                       (hang-up)
11:22:06 no_current_frame muted=true ms_since_last_frame=2123                    (no stale frame reused)
11:22:06 video_stream_closed total_frames=609; tracks unpublished; participant_disconnected
```

Findings:
- The bridge publishes `facetime-remote-video` (1280×720, about 15 fps) and `facetime-remote-audio`.
- Frame timestamps advance about 1.01 s per sample, so frames are live, not repeated.
- Luminance tracks the camera: about 50–60 normal, about 12–20 with the lens covered. The caller
  reports the lens was only partly covered, which explains why it did not reach 0. Chert's docs
  warn that frames may include FaceTime UI or self-preview, so card recognition should still crop
  to the centre and require two consistent reads.
- On hang-up the track is muted, and the probe reports `no_current_frame` rather than an old frame.

## Call 3: staff-card recognition (12:19:39–12:24:41, about 5 min)

FaceTime Video from the verified iPhone to our agent (`CARD_AUTO_RESCAN=1`, so the scan re-armed
6 s after each read). The caller pointed the iPhone's camera at the cards from
`docs/handoff/cards.html`, shown full-screen on a monitor (printed cards are for the demo).
`chert dev`: `call_accepted` in 0.1 s (warm), `call_bridge_ready` after 6.4 s, `call_media`: video and
audio from our agent, `call_ended`. Fields only below; no image was stored.

| Card shown | Accepted `card_id` | Other fields as read | Confidence | First sighting → accepted |
|---|---|---|---|---|
| TX-RN-1001 | **TX-RN-1001** | name "Fictional RN", role "Nurse - Emergency", AVAILABLE, shift "06:30-20:30 (simulated)" | 1.0, 1.0 | 12:20:01 → 12:20:03 |
| TX-RN-1002 | **TX-RN-1002** | Jordan (fictional RN), AVAILABLE, shift "arge shift 16:30–20:30 (simulated)" | 0.99, 0.99 | 12:21:02 → 12:21:02 |
| TX-RN-1003 | **TX-RN-1003** | Morgan (fictional RN), Registered Nurse · Emergency, AVAILABLE, Surge shift 16:30–20:30 (simulated) | 1.0, 0.99 | 12:21:11 → 12:21:12 |
| TX-RN-9999 | **TX-RN-9999** (read as printed; rejection is Prompt 4) | Sam (fictional RN), AVAILABLE | 0.99, 0.99 | 12:22:18 → 12:22:19 |
| TX-RN-1004 (OFF DUTY) | **TX-RN-1004** | Riley (fictional RN), **OFF DUTY**, No surge shift (simulated) | 1.0, 1.0 | 12:23:05 → 12:23:13 |
| Blank screen | none: `card_present=false` on every sample (12:24:07–12:24:27) | — | 0 | voice nudge "hold the card up" twice; scan timed out at 45 s (12:24:08) |

- Every accepted reading had `header_says_triagex_demo=true` and two consecutive samples with the same
  ID at confidence ≥ 0.8. All 34 applied model results had either the correct `card_id` or null
  (13 null: no card in view). Another 24 results arrived after a newer sample and were dropped
  unlogged; the agent now logs their fields too.
- Before each card appeared the model returned `card_present=false` (12:19:51–12:20:01); a card still in
  view after being read was ignored by the re-armed scan, and the next card replaced it within 1–2 samples.
- Secondary text is less reliable than the ID when a monitor is filmed (1001's name and shift, 1002's
  shift). The backend should match on `card_id` only and take name, role and shift from the roster.
- Model latency per request: 1.3–15.0 s (median 3.7 s, 58 results).
- Not tested live: covered lens (handled locally as "too dark", unit-tested), camera turned off, and
  printed cards (the demo will use printed cards).

Problems found, fixed after the call (unit-tested, `npm test` 38/38, **not yet re-verified on a call**):
1. **Free-tier rate limit.** Sampling once a second with up to 4 requests in flight exceeded the
   free tier's 15 requests/min; five 429s each paused sampling for the server's retry delay (up to
   about 56 s; after 1001 nothing was sampled for 49 s). Now requests come from a client-side budget
   (14/min, burst 3, `VISION_RPM`), and an unchanged empty scene that just gave "no card" is not sent
   again for 8 s, so the budget is full when a card appears.
2. **Gemini Live called `scan_staff_card` on its own** five times,
   restarting scans in progress. A scan already running is now left alone.
3. A control character (U+0010) appeared inside one role string; control characters are now removed.

## Next

1. Add the keys listed in the README/handoff to `.env` and `agent/.env.local` (never in chat).
2. One live call (about 3 min): approve outreach, call, show 9999 (rejected aloud), then 1001,
   say "I confirm"; the dashboard shows 1/3 **Live FaceTime**. Record the result here.
3. With the Chert key: `scripts/chert_inspect.py`, then one real iMessage round trip.
