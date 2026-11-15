# TriageX FaceTime agent

Chert's video starter (`chert new agent --video`, @trychert/facetime 0.1.0-beta.21), adapted for
TriageX. All data is synthetic. Differences from the starter:

- **Voice model:** Gemini Live via `@livekit/agents-plugin-google` 1.8.0 (free tier of the Gemini
  API, `GOOGLE_API_KEY`) instead of OpenAI realtime. Model:
  `gemini-2.5-flash-native-audio-preview-12-2025`, overridable with `GEMINI_LIVE_MODEL`.
- **Staff-card reading** (`card-session.mjs`, `card-reader.mjs`, `frame-utils.mjs`, `vision.mjs`):
  while a scan is active ("awaiting card"), at most one frame per second from the caller's
  `facetime-remote-video` track is centre-cropped (80 %, dropping FaceTime controls and self-preview),
  downscaled to a 1024 px grayscale PNG **in memory**, and sent to `VISION_MODEL`
  (default `gemini-3.5-flash-lite`, same `GOOGLE_API_KEY`) with a strict JSON schema. A reading is
  accepted only when the same `card_id` comes back in 2 consecutive samples with confidence ≥ 0.8;
  otherwise the agent asks the caller (by voice) to hold the card closer, steadier, out of glare, or to
  turn the camera on. A scan times out after 45 s. The scan starts with the greeting; the caller can ask
  to scan again (`scan_staff_card` tool). Logs are `[card]` lines with text fields only; no frame is ever
  written to disk. **The agent only extracts fields; the backend validates cards (Prompt 4).**
- **Why a separate vision call:** `@livekit/agents-plugin-google` 1.8.0 does not forward video to
  Gemini Live (`pushVideo` is a no-op), so the voice model never sees the camera.
- **Frame probe:** `frame-probe.mjs` (Stage C evidence) now runs only with `FRAME_PROBE=1`.
- **Tests:** `npm test` (Node's built-in runner; recorded model outputs in `test/fixtures/`, no images).
- **Roster check and confirmation** (`backend.mjs`, Prompt 4): after a stable reading the agent
  sends the fields to the TriageX backend (`BACKEND_URL`, header `X-TriageX-Agent-Token` =
  `TRIAGEX_AGENT_TOKEN`), which decides validity against the synthetic roster. The agent says the
  result; for a valid card it asks the caller to say "I confirm". That phrase is checked on the
  caller's own words (Gemini Live input transcription, `isConfirmation`), never left to the voice
  model; only then does the backend record one confirmation. A rejected card re-arms the scanner
  for a different card. Without the token the agent only reads cards.

Run (Node 24): `npm start` in one terminal; in a second terminal, from this folder,
`npx --yes @trychert/facetime@0.1.0-beta.21 dev --agent triagex-facetime-agent --minutes 30`.
Then FaceTime Video the line. Status and evidence: [../docs/chert-status.md](../docs/chert-status.md).

The starter's original notes follow (they mention OpenAI; TriageX uses Gemini as above).

## Starter video agent

A voice agent with a face, for FaceTime Video calls through Chert. It is the voice
starter plus one camera track: an animated face drawn in `face.mjs`. Node 22.23.2
or later, Node 24 or Node 26 is required.

## Run it

1. Install it:
   ```sh
   npm install
   ```
2. Create your private env file, then replace each `YOUR_` placeholder in it:
   ```sh
   cp .env.example .env.local && chmod 600 .env.local
   ```
   The three LiveKit values come from one LiveKit Cloud project (Settings, API
   keys). The OpenAI key needs Realtime access and credits. Set `AGENT_NAME` to a
   name no other team uses.
3. Terminal 1, your agent:
   ```sh
   npm start
   ```
4. Terminal 2, in this same folder:
   ```sh
   chert login     # once per computer
   chert dev
   ```
5. When `chert dev` says your agent is in a waiting room, make a **FaceTime Video**
   call to the line it shows. The agent greets you as soon as FaceTime is ready. A
   FaceTime Audio call works too, but the caller then only hears the agent.

A few seconds into each call `chert dev` says what the Mac is taking from your
agent: video and audio, audio only, or what is wrong.

## The greeting

The Mac ends a call that hears nothing from the agent within 10 seconds of
FaceTime being ready (`remote_audio_timeout`). When the Mac reports `bridge_ready`,
`chert dev` writes `"chert_bridge_ready": true` into the room metadata, and the
agent greets once (`greet.mjs`, the `greeting` line in `agent.mjs`). It never
greets just because the caller joined. Without the signal it does not greet,
and the caller speaks first.

## The one rule for video

The Mac that answers FaceTime takes audio from the **one** participant that
publishes an audio track, and shows video **only from that same participant**.

- This starter follows the rule: the agent publishes its own voice and its own camera track.
- Two participants publishing audio ends the call.
- Video from a participant that does not speak is not shown.

## Change the picture

Edit `drawFace` in `face.mjs`. It returns one RGBA frame, 640 by 360, 15 times a
second. Draw anything: an image, a chart, a game board.

## Use a realtime avatar instead

LiveKit has plugins for avatar services (Tavus, Beyond Presence, Anam and others).
The avatar joins the room as a third participant and publishes the voice and the
face together, which fits the rule above. LiveKit admits it to a Chert room.

```js
import * as bey from '@livekit/agents-plugin-bey';   // Beyond Presence; needs BEY_API_KEY

const avatar = new bey.AvatarSession({ avatarId: '...' });
await avatar.start(session, ctx.room);   // before session.start
```

The plugins and their options are listed at https://docs.livekit.io/agents/models/avatar/.

Remove the `VideoSource` code when you do this, and keep the agent's own audio
output off the room (the plugin does that), so that only the avatar speaks. Each
service needs its own account and API key. This path has not been tested on a
FaceTime call by Chert yet: watch the media line in `chert dev` on your first call.

## What it does not do

- The starter did not look at the caller's camera; TriageX's card reader (above) does.
- The waiting room shows that the agent joined LiveKit. It does not verify the
  model key or the media path. The first call does.
- Never commit or share `.env.local`. LiveKit and model usage may cost money.
