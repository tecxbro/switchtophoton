# Chert agent (Person 2)

FaceTime line: **+1 650-444-4331** (Chert project `a84bec72…`, free trial: 50 FaceTime min/day, resets 00:00 UTC = 7 PM Atlanta).

## Flow
1. Caller FaceTimes the line and holds a QR code up to the camera.
2. The agent (LiveKit, `--video`) reads the QR code from a video frame.
3. It calls the backend `POST /scan {"url": ...}` and speaks `explanation` slowly, in plain words.
4. After the call, send an iMessage with screenshots + Continue / Nevermind / Report scam.

## Setup (on the agent/backend Vultr server)
```bash
npm install -g @trychert/facetime@0.1.0-beta.20
chert login && chert whoami          # project must start with a84bec72
lk cloud auth                         # pick "hack emory 2026"
chert new scansafe-agent --video && cd scansafe-agent
lk app env -w -d .env.local           # writes LiveKit keys; never commit .env.local
chert setup && chert doctor
# tmux: one window runs the agent (see its README), one runs `chert dev`
```

Webhook (later): `https://scansafe.nyc/api/chert/webhook`, with **webhook signing enabled**.
