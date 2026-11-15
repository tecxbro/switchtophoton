import { fileURLToPath } from 'node:url';
import { AutoSubscribe, defineAgent, llm, voice } from '@livekit/agents';
import { realtime } from '@livekit/agents-plugin-google';
import { LocalVideoTrack, TrackSource, VideoBufferType, VideoFrame, VideoSource } from '@livekit/rtc-node';
import { drawFace, FPS, HEIGHT, WIDTH } from './face.mjs';
import { runAgent } from './chert-rooms.mjs';
import { greetOnBridgeReady } from './greet.mjs';
import { startFrameProbe } from './frame-probe.mjs';
import { startCardReader } from './card-session.mjs';
import { HINT_SPEECH, spokenCardId } from './card-reader.mjs';
import { callIdFor, createBackend, isConfirmation } from './backend.mjs';

// Change these instructions to build your own agent. Keep replies conversational.
const instructions = `You are the TriageX DEMO staffing agent on a FaceTime video call, part of a
hackathon demo. Everything is synthetic: no real hospital, patient or staff data.
The caller sees a simple animated face while you talk.
TriageX coordinates emergency-department surge staffing for a simulated Atlanta hospital network.
Keep each reply to one or two short sentences. Be clear that you are an AI.

Staff cards: a separate card scanner reads the caller's fictional TriageX DEMO staff card from their
camera. You cannot see the video yourself. Only the scanner's messages tell you what a card says:
never guess, invent or repeat a card ID or name that the scanner did not report.
If the caller wants to show a card again or show another card, call scan_staff_card.
Only the TriageX system decides whether a card is on the roster and whether a confirmation is
recorded; it tells you through system messages. Never say a card is valid or that someone is
confirmed unless a system message says so. When the caller says "I confirm", reply only
"One moment" and wait for the system message.`;
// Said once, as soon as FaceTime is ready. Keep it short: it is the first thing the caller hears.
const greetingFor = request => request
  ? `Greet the caller in two short sentences: say you are the TriageX DEMO staffing agent, an AI; TriageX needs ${request.requested - request.confirmed} more staff at ${request.hospital} for a simulated surge shift starting ${request.shift_starts}; ask them to hold their staff card up to the camera.`
  : 'Greet the caller in one short sentence: say you are the TriageX DEMO staffing agent, an AI, and ask them to hold their staff card up to the camera.';
const CONFIRM_WINDOW_MS = 110_000; // the backend accepts a confirmation up to 2 minutes after the card check
// Gemini Live via the Gemini API (GOOGLE_API_KEY). Override with GEMINI_LIVE_MODEL in .env.local.
const liveModel = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
// Development aid (CARD_AUTO_RESCAN=1): after a card is read or a scan times out, start a new scan
// a few seconds later, so several cards can be tested in one short call without voice commands.
const autoRescan = process.env.CARD_AUTO_RESCAN === '1';

const agent = defineAgent({
  entry: async ctx => {
    // Register track handlers before connecting, and subscribe to video as well as audio, so the
    // caller's facetime-remote-video track reaches this agent. The frame probe (Stage C evidence)
    // now runs only with FRAME_PROBE=1: the card reader handles the caller video.
    const probe = process.env.FRAME_PROBE === '1' ? startFrameProbe(ctx.room) : null;
    ctx.addShutdownCallback(async () => probe?.stop());

    /** @type {voice.AgentSession | null} */
    let session = null;
    /** @type {string | null} */
    let lastCardId = null;
    let rescanTimer = null;
    // Backend (Prompt 4): roster check and confirmation. Without TRIAGEX_AGENT_TOKEN the agent
    // only reads cards and says that nothing can be checked.
    const backend = createBackend();
    const card = (event, data) => console.log(`[card] ${JSON.stringify({ card: event, at: new Date().toISOString(), ...data })}`);
    let callId = callIdFor(ctx.room);
    /** @type {any} */ let request = null;
    /** A valid card waiting for the caller's "I confirm". */
    /** @type {{ cardId: string, name: string, until: number } | null} */ let pendingConfirm = null;
    const say = text => {
      try { session?.generateReply({ instructions: text }); } catch { /* the call ended */ }
    };
    const rescan = (ms, ignoreCardId) => {
      clearTimeout(rescanTimer);
      rescanTimer = setTimeout(() => reader.scan({ ignoreCardId }), ms);
    };

    async function checkCard(r) {
      const spoken = spokenCardId(r.card_id);
      if (!backend.enabled) {
        say(`The card scanner read the caller's card: ID ${spoken}${r.name ? `, name ${r.name}` : ''}. Tell them this, reading the ID character by character, and say the TriageX roster check is not connected, so nothing can be confirmed.`);
        return;
      }
      let res;
      try {
        res = await backend.cardCheck(callId, r);
      } catch (e) {
        card('backend_error', { step: 'card_check', error: e.code ?? String(e) });
        say(`Tell the caller in one short sentence that you read card ${spoken} but could not reach the TriageX system to check it, so nothing can be confirmed right now.`);
        return;
      }
      card('backend_check', { card_id: res.card_id, valid: res.valid, reason: res.reason });
      if (res.valid) {
        pendingConfirm = { cardId: res.card_id, name: res.display_name, until: Date.now() + CONFIRM_WINDOW_MS };
        const shift = request ? ` at ${request.hospital}, starting ${request.shift_starts}` : '';
        say(`System message: the TriageX roster check passed. ${res.message} Tell the caller, reading the ID character by character (${spoken}), that their card is on the TriageX DEMO roster, then ask them to say "I confirm" to accept the simulated surge shift${shift}. They are not confirmed yet.`);
      } else {
        pendingConfirm = null;
        say(`System message: the TriageX roster check rejected the card. ${res.message} Tell the caller this in one or two short sentences, reading the ID character by character (${spoken}), say it cannot be used to confirm, and ask them to show a different card if they have one.`);
        rescan(7000, res.card_id); // ready for a different card; the rejected one is ignored
      }
    }

    async function confirmShift() {
      const p = pendingConfirm;
      pendingConfirm = null;
      if (!p) return;
      card('confirm_phrase_heard', { card_id: p.cardId }); // the phrase, not the transcript
      let res;
      try {
        res = await backend.confirm(callId, p.cardId);
      } catch (e) {
        card('backend_error', { step: 'confirm', error: e.code ?? String(e) });
        say('Tell the caller in one short sentence that the TriageX system could not be reached, so the confirmation was not recorded.');
        return;
      }
      card('backend_confirm', { card_id: p.cardId, confirmed: res.confirmed, duplicate: res.duplicate, reason: res.reason, count: res.confirmed_count, requested: res.requested });
      if (res.confirmed) {
        say(`System message: the TriageX system recorded the confirmation. ${res.message} Thank the caller in one or two short sentences, say ${p.name ?? 'they'} ${res.duplicate ? 'was already' : 'is now'} confirmed for the simulated surge shift starting ${res.shift_starts}, and that they can hang up.`);
      } else {
        say(`System message: the TriageX system did not record a confirmation. ${res.message} Tell the caller this in one short sentence.`);
      }
    }

    const reader = startCardReader(ctx.room, {
      onEvent: event => {
        if (event.type === 'nudge') {
          say(HINT_SPEECH[event.hint]);
        } else if (event.type === 'accepted') {
          lastCardId = event.reading.card_id;
          void checkCard(event.reading);
          if (autoRescan) rescan(12000, lastCardId);
        } else if (event.type === 'timed_out') {
          say('Tell the caller in one short sentence that you could not read the staff card, and ask whether they would like to try again.');
          if (autoRescan) rescan(6000, lastCardId);
        }
      },
    });
    ctx.addShutdownCallback(async () => {
      clearTimeout(rescanTimer);
      reader.stop();
      if (backend.enabled) await backend.callEvent(callId, 'ended').catch(() => {});
    });

    const scanTool = llm.tool({
      description: 'Start reading a fictional TriageX DEMO staff card from the caller\'s camera. Use it when the caller wants to show a card again or show a different card. The result is reported to you later by the scanner.',
      parameters: {
        type: 'object',
        properties: {
          different_card: { type: 'boolean', description: 'True if the caller is showing a different card from the one just read.' },
        },
        required: [],
      },
      execute: async ({ different_card }) => {
        // In the live test Gemini Live called this tool on its own several times, which restarted
        // scans in progress. A scan that is already running is left alone.
        if (reader.state === 'awaiting') {
          return 'The scanner is already reading the camera. Ask the caller to keep the card 20 to 30 centimetres from the camera and still. Do not state any card details until the scanner reports them.';
        }
        clearTimeout(rescanTimer);
        reader.scan({ ignoreCardId: different_card ? lastCardId : null });
        return 'The scanner is reading the camera now. Ask the caller to hold the card 20 to 30 centimetres from the camera and keep it still. Do not state any card details until the scanner reports them.';
      },
    });

    await ctx.connect(undefined, AutoSubscribe.SUBSCRIBE_ALL);
    probe?.snapshot('connected');
    // Chert prepares a room before a caller exists. Join promptly so Chert can
    // find us, but wait before opening a paid model session or sending video.
    const caller = await ctx.waitForParticipant();
    reader.syncTracks();
    // Look up the open staffing request now, so the greeting can name it without delay.
    const requestLookup = backend.enabled
      ? backend.activeRequest().then(r => { request = r; }).catch(e => card('backend_error', { step: 'active_request', error: e.code ?? String(e) }))
      : Promise.resolve();

    // Video: one camera track, published by this agent. The Mac shows video only
    // from the participant that speaks, so the picture and the voice stay together.
    const source = new VideoSource(WIDTH, HEIGHT);
    const track = LocalVideoTrack.createVideoTrack('agent-video', source);
    let tick = 0, speaking = false;
    const frame = () => source.captureFrame(new VideoFrame(drawFace(tick++, speaking), WIDTH, HEIGHT, VideoBufferType.RGBA));
    frame();
    await ctx.room.localParticipant.publishTrack(track, { source: TrackSource.SOURCE_CAMERA });
    const timer = setInterval(frame, 1000 / FPS);

    session = new voice.AgentSession({
      llm: new realtime.RealtimeModel({ model: liveModel, voice: 'Puck' }),
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, event => { speaking = event.newState === 'speaking'; });
    // "I confirm" is checked on the caller's own words (Gemini Live input transcription), not left
    // to the voice model: only a clear, unnegated phrase after a valid card check confirms.
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, event => {
      if (!event.isFinal || !pendingConfirm) return;
      if (Date.now() > pendingConfirm.until) { pendingConfirm = null; return; }
      if (isConfirmation(event.transcript)) void confirmShift();
    });
    ctx.addShutdownCallback(async () => {
      clearInterval(timer);
      await session.close();
      await track.close();
      await source.close();
    });
    await session.start({
      room: ctx.room,
      agent: new voice.Agent({ instructions, tools: { scan_staff_card: scanTool } }),
      record: false,
      inputOptions: {
        participantIdentity: caller.identity,
        audioEnabled: true,
        videoEnabled: false, // the Gemini Live plugin ignores video; cards go through the card reader
        textEnabled: false,
        closeOnDisconnect: true,
        deleteRoomOnClose: false,
      },
      outputOptions: { audioEnabled: true, transcriptionEnabled: false },
    });
    // Greet once when chert dev reports that FaceTime is ready (bridge_ready in the
    // room metadata): the Mac ends the call if it hears nothing within 10 seconds
    // of that. Participant arrival alone is not readiness, so there is no greeting
    // on it. Without the signal there is no greeting, and the caller speaks first.
    // The card scan ("awaiting card") starts with the greeting; the first voice
    // nudge comes no earlier than 9 s later, so it does not cut the greeting off.
    const stopGreeting = greetOnBridgeReady(ctx.room, () => {
      callId = callIdFor(ctx.room); // chert dev puts the call id in the metadata at bridge_ready
      // Greet within the 10 s limit: wait at most 1.5 s for the request lookup.
      void Promise.race([requestLookup, new Promise(r => setTimeout(r, 1500))]).then(() => {
        session.generateReply({ instructions: greetingFor(request) });
        reader.scan();
      });
      if (backend.enabled) {
        backend.callEvent(callId, 'connected').catch(e => card('backend_error', { step: 'call', error: e.code ?? String(e) }));
      }
    });
    ctx.addShutdownCallback(async () => stopGreeting());
  },
});

export default agent;

// Your own LiveKit project when .env.local has its three LIVEKIT_ values; otherwise Chert rooms through chert dev.
runAgent(agent, { file: fileURLToPath(import.meta.url), agentName: process.env.AGENT_NAME || 'video-agent' });
