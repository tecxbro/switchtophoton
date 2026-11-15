// Runs this agent the way chert dev needs it.
//
// With LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET filled in, the agent registers with your own LiveKit project,
// as every LiveKit agent does. With none of them (Chert rooms, on the Shared plan), it needs no LiveKit account: chert dev
// hands it each call's room and a token for that room only, and the agent joins with that token. Your entry function runs
// unchanged in both cases.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { cli, initializeLogger, ServerOptions } from '@livekit/agents';
import { ParticipantKind, Room, RoomEvent, TrackKind } from '@livekit/rtc-node';

const KEYS = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
const filled = value => Boolean(value) && !/^(wss:\/\/)?YOUR_/.test(value);

/** True when all three LiveKit values are set to real values: the agent then uses your own LiveKit project. */
export function usesOwnLiveKit(env = process.env) {
  return KEYS.every(key => filled(env[key]));
}

/**
 * Starts the agent: on your own LiveKit project when its keys are set, otherwise in Chert rooms through chert dev.
 * @param {{ entry: (ctx: any) => Promise<void>, prewarm?: (proc: any) => unknown }} agent the defineAgent() result
 * @param {{ file: string, agentName: string }} options
 */
export function runAgent(agent, { file, agentName }) {
  if (usesOwnLiveKit()) return cli.runApp(new ServerOptions({ agent: file, agentName }));
  return serveChertRooms(agent, agentName);
}

/** Where chert dev says how to reach it: the same folder chert itself uses (CHERT_HOME, or ~/.chert). */
export const linkFile = (agentName, env = process.env) => join(env.CHERT_HOME || join(homedir(), '.chert'), 'rooms', `${agentName}.json`);

const calls = new Map();

async function serveChertRooms(agent, agentName) {
  initializeLogger({ pretty: true, level: process.env.LOG_LEVEL || 'info' });
  const proc = { userData: {} };
  if (agent.prewarm) await agent.prewarm(proc);
  const file = linkFile(agentName);
  console.log(`[chert] No LiveKit keys: "${agentName}" takes calls in Chert rooms through chert dev.`);
  let waiting = false;
  for (;;) {
    let link;
    try { link = JSON.parse(await readFile(file, 'utf8')); }
    catch {
      if (!waiting) console.log('[chert] Waiting for chert dev. Run it in this folder: chert dev');
      waiting = true; await pause(1000); continue;
    }
    let response;
    try { response = await fetch(`${link.url}/v1/next`, { headers: { authorization: `Bearer ${link.token}` }, signal: AbortSignal.timeout(30_000) }); }
    catch { await pause(1000); continue; }
    if (response.status === 204) continue;
    if (!response.ok) { await response.body?.cancel(); await pause(1000); continue; }
    if (waiting) console.log('[chert] Connected to chert dev. Call your line on FaceTime.');
    waiting = false;
    const job = await response.json().catch(() => undefined);
    if (job?.type === 'join') void runCall(agent, proc, job, link);
    else if (job?.type === 'end') void calls.get(job.call_id)?.end('call ended');
  }
}

async function report(link, what, callId) {
  try {
    const response = await fetch(`${link.url}/v1/${what}`, { method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { authorization: `Bearer ${link.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ call_id: callId }) });
    await response.body?.cancel();
  } catch { /* chert dev declines the call on its own deadline */ }
}

/** One call: join its room with the call's token, tell chert dev, then run the agent's entry with a job context. */
async function runCall(agent, proc, job, link) {
  if (calls.has(job.call_id)) return;
  const room = new Room();
  const shutdownCallbacks = [];
  let ended = false;
  const end = async reason => {
    if (ended) return;
    ended = true; calls.delete(job.call_id);
    for (const callback of shutdownCallbacks) { try { await callback(reason); } catch (error) { console.error('[chert] shutdown callback failed', error); } }
    await room.disconnect().catch(() => {});
  };
  calls.set(job.call_id, { end });
  try { await room.connect(job.livekit_url, job.token, { autoSubscribe: false, dynacast: false }); }
  catch (error) {
    console.error('[chert] could not join the call\'s room', error);
    calls.delete(job.call_id);
    await report(link, 'failed', job.call_id);
    return;
  }
  await report(link, 'joined', job.call_id);
  // The caller's side of the call is the Mac's bridge participant: when it leaves, the call is over.
  room.on(RoomEvent.ParticipantDisconnected, participant => { if (participant.identity.startsWith('chert-bridge-')) void end('caller left'); });
  room.on(RoomEvent.Disconnected, () => void end('room closed'));

  let subscribed = false;
  const ctx = {
    room,
    proc,
    job: { id: job.call_id, metadata: JSON.stringify({ chert_call: job.call_id, media: job.media }), room: { name: job.room } },
    // Already connected; applies the subscription the entry asks for, as the LiveKit job context does.
    async connect(_e2ee, autoSubscribe = 0 /* AutoSubscribe.SUBSCRIBE_ALL */) {
      if (subscribed) return;
      subscribed = true;
      const kinds = autoSubscribe === 3 ? [TrackKind.KIND_AUDIO] : autoSubscribe === 2 ? [TrackKind.KIND_VIDEO] : autoSubscribe === 1 ? [] : undefined;
      const subscribe = publication => { if (!kinds || kinds.includes(publication.kind)) publication.setSubscribed(true); };
      room.remoteParticipants.forEach(participant => participant.trackPublications.forEach(subscribe));
      room.on(RoomEvent.TrackPublished, subscribe);
    },
    async waitForParticipant(identity) {
      const wanted = participant => (!identity || participant.identity === identity) && participant.info.kind !== ParticipantKind.AGENT;
      for (const participant of room.remoteParticipants.values()) if (wanted(participant)) return participant;
      return new Promise((resolve, reject) => {
        const joined = participant => { if (wanted(participant)) { clear(); resolve(participant); } };
        const gone = () => { clear(); reject(new Error('Room disconnected while waiting for participant')); };
        const clear = () => { room.off(RoomEvent.ParticipantConnected, joined); room.off(RoomEvent.Disconnected, gone); };
        room.on(RoomEvent.ParticipantConnected, joined);
        room.on(RoomEvent.Disconnected, gone);
      });
    },
    addShutdownCallback(callback) { shutdownCallbacks.push(callback); },
    shutdown(reason = '') { void end(reason); },
  };
  try { await agent.entry(ctx); }
  catch (error) { console.error('[chert] the agent failed on this call', error); await end('agent failed'); }
}
