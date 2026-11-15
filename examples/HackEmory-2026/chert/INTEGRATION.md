# ScanSafe FaceTime agent: integration steps

Files in `chert/`:

| File | What it does |
|---|---|
| `qr_reader.py` | `read_qr(frame)` decodes a QR code from a numpy frame or PIL image (OpenCV only) |
| `scansafe_tools.py` | `scan_url()` calls `POST /scan`; `speech_for()` writes the spoken verdict |
| `agent_integration.py` | The LiveKit agent: Gemini Live, `check_qr_code` tool, video sampler, status video, greeting |
| `imessage.py` | `send_followup()` texts the verdict through Chert; `router` serves `POST /chert/webhook` |

## Important: the starter is Node, our agent is Python

Chert's docs (facetime-cli/build-agent, facetime-cli/video) describe the `chert new` starter as a
**Node.js** project (`agent.mjs`, `npm start`, `@livekit/agents` + OpenAI Realtime). They also say
the `--video` flag only publishes a drawn face and **does not read the caller's camera**.

So we don't paste anything into `agent.mjs`. We use the starter folder for its `.env.local` and for
`chert dev`, and run **our Python worker** (`chert/agent_integration.py`) in place of `npm start`,
registered under the same agent name. `chert dev --agent NAME` just dispatches calls to any LiveKit
agent registered with that name. (If `chert new` gives you a Python starter instead, paste in the
pieces listed at the top of `agent_integration.py`.)

## 1. Make the starter (on the Vultr agent server)

```bash
cd ~/HackEmory-2026/chert
npm install -g @trychert/facetime@0.1.0-beta.20
chert login --device && chert whoami           # project must start with a84bec72
lk cloud auth                                    # pick "hack emory 2026"
chert new scansafe-agent --video
cd scansafe-agent
lk app env -w -d .env.local                      # writes LIVEKIT_URL / _API_KEY / _API_SECRET
chert setup && chert doctor
```

`chert/scansafe-agent/` is where `agent_integration.py` looks for `.env.local`
(`.env.*` is already in `.gitignore`; don't commit `node_modules/` either, also ignored).

## 2. Install Python packages (repo root)

```bash
pip install --break-system-packages "livekit-agents>=1.8,<2" "livekit-plugins-google>=1.8,<2" \
    opencv-python-headless numpy pillow httpx python-dotenv
# tests only:
pip install --break-system-packages qrcode pytest
```

Tested with livekit-agents 1.8.12, livekit 1.2.1, livekit-plugins-google 1.8.12, OpenCV 5.0.

## 3. Environment variables

Add to `chert/scansafe-agent/.env.local` (agent server) or the repo `.env`. Never commit them.

| Var | Needed by | Value |
|---|---|---|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | agent | written by `lk app env` (all from the same project) |
| `AGENT_NAME` | agent | `scansafe-agent` (must match `chert dev --agent`) |
| `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) | agent | Gemini API key for Gemini Live |
| `SCANSAFE_API_URL` | agent | backend base URL, e.g. `https://scansafe.nyc/api` (default `http://127.0.0.1:8000`) |
| `CHERT_API_KEY` | agent (texts) | Chert project API key `ftk_...` (Developer page, owners only) |
| `CHERT_PROJECT_ID` | agent (texts) | full project UUID (starts `a84bec72`) |
| `CHERT_LINE_ID` | agent (texts) | optional; else the first line from `GET /api/v1/lines` |
| `SCANSAFE_DEMO_PHONE` | agent (texts) | optional; demo phone in E.164 (`+1404...`) to text after the call |
| `CHERT_WEBHOOK_SECRET` | API | the subscription `secret` returned once when you create the webhook |
| `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_VOICE` | agent | optional; default `gemini-2.5-flash-native-audio-preview-12-2025`, `Kore` |
| `AGENT_INTERNAL_KEY` | agent + API | shared key (header `X-Agent-Key`) for `POST /operators/dogwood/app-session` and the voice-payment routes `POST /pay/intent*`; the SAME value on both. Without it the agent uses the plain meter flow and can't pay by voice (the app's Pay button still works) |
| `SANDBOX_URL`, `SANDBOX_TOKEN` | agent + API | the agent calls the sandbox's `/operate/stream` directly for the Dogwood app (the backend doesn't proxy it yet); same values as the API's |

Optional: `SCANSAFE_RESULT_BASE` (default `https://api.scansafe.nyc/r`, the API's own result page), `CHERT_API_BASE`.

### Who gets the text?

Chert's docs don't say the caller's phone number reaches the agent, and on the **free trial the
agent can only reply within 24 hours of that phone's last iMessage to the line**. So for the demo:

1. From the demo iPhone, **text the line (+1 650-444-4331) once** ("hi") before calling.
2. Set `SCANSAFE_DEMO_PHONE` to that phone. If it's unset, the agent uses the newest inbound
   sender from `GET /api/v1/shared-messages` (field names unverified; see logs).

## 4. Run it (two tmux windows)

```bash
# window 1: the agent (repo root)
cd ~/HackEmory-2026 && python3 -m chert.agent_integration dev
#   wait for "registered worker" in the logs

# window 2: Chert bridge (starter folder)
cd ~/HackEmory-2026/chert/scansafe-agent
chert doctor --agent scansafe-agent      # runs a real test job; may use a little Gemini credit
chert dev --agent scansafe-agent
```

Both must stay running. After code changes, restart both (Ctrl+C `chert dev` first and wait for
"line released"). Use `start` instead of `dev` for the demo (no file-watch reloads).

## 5. Test

1. Backend up: `curl $SCANSAFE_API_URL/health`.
2. Print a QR code: `python3 -c "import qrcode; qrcode.make('https://bit.ly/dogwood-meter-42').save('/tmp/qr.png')"`
   (any URL; in mock mode the backend returns the mock verdicts).
3. **FaceTime Video** +1 650-444-4331 from the verified iPhone.
4. The agent greets you within ~10 s. The agent's video shows a "ScanSafe" card.
5. Hold the code ~20 cm (8 in) from the camera. Within a second or two you should hear "I can see a
   code...", the card turns yellow ("Checking..."), then red/green with the verdict spoken.
6. Hold the same code up again: no repeat for 30 s. Ask "can you check it?" to force the
   `check_qr_code` tool.
7. Hang up and check the iMessage follow-up (verdict, explanation, details link).
8. Agent logs to watch: `watching video track facetime-remote-video`, `QR seen`,
   `follow-up text ok=True`, and the `participant ... attributes=[...]` line (tells us if Chert
   passes any caller info).

If no `watching video track` line appears, caller video isn't reaching the agent: Chert says
caller capture is a separate opt-in per line. Ask the Chert team to enable it for our line.

## 6. Webhook (API server)

Add the router to `api/main.py` (see the lines in the final report), then create the subscription
once and save the `secret` it returns as `CHERT_WEBHOOK_SECRET`:

```bash
curl -X POST https://app.trychert.com/api/v1/webhook-subscriptions ...   # TODO(verify) host
```

`TODO(verify)`: the webhook-subscriptions doc shows `console.trychert.com/api/v1/webhook-subscriptions`
with HMAC tenant auth (Messaging API); the `ftk_` project key works on `app.trychert.com/api/v1`.
Easiest is to create it in the Chert dashboard if it has a webhook page, with signing enabled, URL
`https://scansafe.nyc/api/chert/webhook` (our reverse proxy must forward `/api/*` to FastAPI with the
`/api` prefix stripped, since the router path is `/chert/webhook`).

Local check:
```bash
python3 -c "from chert.imessage import sign_for_test; print(sign_for_test('$CHERT_WEBHOOK_SECRET', b'{\"event_id\":\"t1\",\"event_type\":\"call.incoming\"}'))"
curl -X POST localhost:8000/chert/webhook -H "X-Webhook-Signature: <paste>" \
     -d '{"event_id":"t1","event_type":"call.incoming"}'
```

## What's verified vs not

Verified (docs read, or the installed package inspected):
- Chert: bridge identity `chert-bridge-<call id>`, tracks `facetime-remote-video`/`-audio`, agent must
  publish video from its audio participant, greet within 10 s of `bridge_ready`, Node starter,
  `chert dev --agent NAME`, shared-messages send API + headers, trial reply-only rule, webhook HMAC
  format (`X-Webhook-Signature: t=,v1=` and legacy `x-chert-signature: v1,ts,hex`, 300 s window).
- LiveKit Python: every class/argument used in `agent_integration.py` exists with that signature in
  livekit-agents 1.8.12; Gemini Live (`google.realtime.RealtimeModel`) implements `push_video`, and
  LiveKit's Gemini Live vision recipe uses `room_io.RoomOptions(video_input=True)`.
- Gemini Live has no `say()` without a TTS, so fixed lines go through `generate_reply(instructions=...)`.

`TODO(verify)` (grep for it):
- Python worker accepted by `chert dev` (docs only show Node; should work since dispatch is by name).
- `bridge_ready` metadata format (we look for the word anywhere; greet after 8 s anyway).
- Caller phone number in participant attributes (probably absent; we log attribute keys).
- Response field names of `GET /lines` and `GET /shared-messages`.
- Whether Chert's bridge video track has camera source (else Gemini itself won't see video; our QR
  reader still does).
- Webhook payloads for call events; where to create the webhook subscription with an `ftk_` key.
- Image attachments: shared-messages has no media field, so screenshots go as links.

## Parking meter + linked Dogwood account (official app instead of the sticker)

On a parking meter call (`chert/meter_pay.py`), the agent asks the backend
`POST {SCANSAFE_API_URL}/operators/dogwood/app-session {scan_id}` (header `X-Agent-Key`) as soon as
the call is placed. If it answers `{"linked": true, "app_url", "plate"}`, the agent says "You've
linked your Dogwood Parking account. I'll use the official Dogwood app instead of the sticker." and
the live view is the sandbox operating the made-up Dogwood Parking app (`/operate/stream` on
`SANDBOX_URL`: install, open, plate, hours, "Pay with linked ScanSafe account", waiting). Hours
changes from `/pay/quote` before payment re-run it (straight to the app, no second install). When
`/pay/status` says paid: "Paid. 3 hours on meter 42 for plate GA 4821K. Your receipt is in the
Dogwood app." and the Paid banner over the app's receipt. The agent still never pays: the person
taps Pay in ScanSafe. Not linked, no key, app-session error, or the app run failing before Pay
(e.g. the sandbox isn't redeployed yet) -> today's meter flow. "Stop" stops all of it.

## Voice-confirmed payment (parking meter calls)

The agent can pay the meter by voice, but never on its own (`chert/voice_pay.py`, server side
`api/voice_pay.py` + `api/routes_voicepay.py`). Needs `AGENT_INTERNAL_KEY` set to the same value on
the agent and the API (restart both after setting it). Gemini Live input transcription is on
(`input_audio_transcription` in `make_model`); the agent keeps the caller's latest FINAL transcript
(`user_input_transcribed`) and when the agent/caller were speaking (`agent_state_changed`,
`user_state_changed`).

Only meter calls get the tools (`MeterPayAgent`: `prepare_payment(hours?, pay_with?)`,
`confirm_payment()`, `cancel_payment()`); ordinary calls keep `ScanSafeAgent`.

Spoken flow (Dogwood, 3 hours, test SOL):
1. Caller: "Can you pay for 3 hours?" -> `prepare_payment(3)` -> `POST /pay/intent {scan_id, hours,
   plate?}`. The server prices it and returns the line; the model reads it word for word:
   "Pay 0.03 SOL to Dogwood Lot and Meter for 3 hours, plate GA 4821K. Say 'yes, pay' to confirm,
   or 'no' to cancel." (card: "Pay $7.50 to Dogwood Lot and Meter for 3 hours, plate GX 4242, with a
   one-time virtual card. Say 'yes, pay' to confirm."). Our video shows an amber card:
   "Say “yes, pay” to confirm · 0.03 SOL · 3 h · GA 4821K".
2. Caller: "Yes, pay." -> `confirm_payment()`. Locally it needs: an open intent (45 s), a finished
   agent speaking stretch long enough for the readback after the intent was made, the caller not
   talking over it, and their latest final transcript after it, within 20 s, matching the consent
   rule (`yes`/`yeah`/`yep`/`confirm` AND `pay` as words; no `no`/`don't`/`not`/`stop`/`cancel`/
   `wait`; no question; at most 8 words). Otherwise nothing is sent and the model is told: "Ask
   the caller to clearly say 'yes, pay' to confirm". Then `POST /pay/intent/{id}/confirm
   {utterance}`; the server checks the words again (3 tries, single use) and pays.
3. Agent: "Okay." Then the usual status poll: "Paid. 3 hours on meter 42. Your receipt is in the
   app." (linked Dogwood: "... for plate GA 4821K. Your receipt is in the Dogwood app.") + the Paid
   banner, exactly as when they tap Pay in the app.

"No" / "stop" / "cancel" / "wait" after the readback, the stop tool, the app changing the hours,
or the meter getting paid in the app all cancel the open intent and take the card off the video.
Method: `pay_with` "card"/"sol" if the caller asks; otherwise the server uses the scan owner's saved
preference when a card payment can go ahead for them (Lithic configured, Dogwood linked, plate),
else test SOL. A card payment is made for the scan's owner as the server recorded it at /call-me,
never an identity the agent sends.

