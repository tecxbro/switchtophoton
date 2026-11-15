import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { AccessToken, RoomServiceClient, TrackType } from "livekit-server-sdk";
import type { CallState, PreparedCall } from "@ladybug/shared";
import { readCallConfig } from "./call-config.ts";
import type { CallConfig } from "./call-config.ts";

type Rooms = Pick<RoomServiceClient, "createRoom" | "deleteRoom" | "listParticipants">;
type Session = {
  id: string; room: string; device: string; bridge: string; config: CallConfig; rooms: Rooms;
  canceled: boolean; preparing: boolean; dialing: boolean; createBody?: string; callId?: string;
  endAccepted: boolean; terminal: boolean; terminalMessage?: string; failed?: boolean;
  startedAt: number; cleaning?: boolean; timer?: ReturnType<typeof setTimeout>; ticking: boolean;
  cancellation: AbortController;
};
class ApiError extends Error {
  status: number;
  constructor(status: number, code: string) {
    super(`Chert request failed (${status}: ${code}). Check project access and line readiness.`);
    this.status = status;
  }
}
const terminalStatuses = new Set(["ended", "failed", "completed", "cancelled", "canceled", "rejected", "busy", "no_answer", "unanswered"]);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

export class CallService {
  private session?: Session;
  private state: CallState = { phase: "idle", message: "Ready to call", bridgeReady: false };
  private listeners = new Set<(state: CallState) => void>();
  private config: () => CallConfig;
  private makeRooms: (config: CallConfig) => Rooms;
  private request: typeof fetch;
  private mediaReadyTimeoutMs: number;
  private mediaReadyPollMs: number;

  constructor(options: { config?: () => CallConfig; rooms?: (config: CallConfig) => Rooms; fetch?: typeof fetch; mediaReadyTimeoutMs?: number; mediaReadyPollMs?: number } = {}) {
    this.config = options.config ?? readCallConfig;
    this.makeRooms = options.rooms ?? ((c) => new RoomServiceClient(c.url.replace(/^wss:/, "https:"), c.key, c.secret));
    this.request = options.fetch ?? fetch;
    this.mediaReadyTimeoutMs = options.mediaReadyTimeoutMs ?? 5000;
    this.mediaReadyPollMs = options.mediaReadyPollMs ?? 100;
  }
  getState = (): CallState => ({ ...this.state });
  subscribe(callback: (state: CallState) => void) {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }
  private update(phase: CallState["phase"], message: string, bridgeReady = false) {
    this.state = { id: this.session?.id, phase, message, bridgeReady };
    for (const listener of this.listeners) listener(this.getState());
  }
  async prepare(): Promise<PreparedCall> {
    if (this.session) throw new Error("A FaceTime call is already in progress or still cleaning up.");
    const config = this.config();
    const id = randomUUID();
    const s: Session = {
      id, room: `ladybug-${id}`, device: `device-${id}`, bridge: `chert-${id}`,
      config, rooms: this.makeRooms(config), canceled: false, preparing: true, dialing: false,
      endAccepted: false, terminal: false, startedAt: Date.now(), ticking: false,
      cancellation: new AbortController(),
    };
    this.session = s;
    this.update("preparing", "Preparing FaceTime…");
    try {
      await s.rooms.createRoom({ name: s.room, emptyTimeout: 60, maxParticipants: 2 });
      if (s.canceled) throw new Error("Call canceled.");
      const token = await this.token(s, s.device);
      if (s.canceled) throw new Error("Call canceled.");
      s.preparing = false;
      this.update("ready", "Connecting screen sharing and microphone…");
      this.schedule(s);
      return { id, url: config.url, token, bridgeIdentity: s.bridge };
    } catch (error) {
      s.preparing = false;
      s.terminal = true;
      s.failed = !s.canceled;
      s.terminalMessage = s.canceled ? "Call canceled" : "Could not prepare the LiveKit room. Check its URL and credentials.";
      await this.cleanup(s);
      // SDK errors can contain request data. Never forward them across IPC.
      if (s.canceled) throw new Error("Call canceled.", { cause: error });
      throw new Error(s.terminalMessage, { cause: error });
    }
  }
  private async token(s: Session, identity: string) {
    const token = new AccessToken(s.config.key, s.config.secret, { identity, ttl: 300 });
    token.addGrant({ room: s.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false });
    return token.toJwt();
  }
  async dial(id: string) {
    const s = this.require(id);
    if (s.canceled || s.terminal) throw new Error("Call canceled.");
    if (s.dialing || s.callId || s.createBody) return;
    s.dialing = true;
    try {
      this.update("ready", "Waiting for screen video and microphone to be ready…");
      await this.waitForMedia(s);
      if (s.canceled) return;
      const bridgeToken = await this.token(s, s.bridge);
      if (s.canceled) return;
      s.createBody = JSON.stringify({
        direction: "outbound", mode: "customer_managed", line_id: s.config.line,
        destination: s.config.destination, destination_type: "phone", media: { audio: true, video: true },
        livekit_url: s.config.url, participant_token: bridgeToken, remote_participant_identity: s.device,
      });
      this.update("dialing", "Calling…");
      await this.create(s);
    } catch (error) {
      if (!s.createBody) {
        // No outbound request was sent, so local termination is sufficient.
        s.terminal = true; s.failed = !s.canceled;
        s.terminalMessage = s.canceled ? "Call canceled" : error instanceof Error && error.message.startsWith("Screen video and") ? error.message : "Could not verify device media in LiveKit.";
        await this.cleanup(s);
        if (!s.canceled) throw new Error(s.terminalMessage, { cause: error });
        return;
      }
      this.update(s.canceled ? "ending" : "dialing", "Waiting for Chert; retrying the same call request…");
    } finally {
      s.dialing = false;
      if (this.session === s) {
        if (s.canceled && !s.createBody) { s.terminal = true; await this.cleanup(s); }
        else this.schedule(s);
      }
    }
  }
  private async waitForMedia(s: Session) {
    // publishTrack resolves on signaling acknowledgement. The room service can
    // briefly lag behind it, especially when video was published after audio.
    const deadline = Date.now() + this.mediaReadyTimeoutMs;
    while (!s.canceled) {
      const participants = await s.rooms.listParticipants(s.room);
      if (s.canceled) return;
      const device = participants.find((p) => p.identity === s.device);
      const audio = participants.flatMap((p) => p.tracks.filter((t) => t.type === TrackType.AUDIO && !t.muted));
      if (device && audio.length === 1 && device.tracks.some((t) => t.type === TrackType.AUDIO && !t.muted) && device.tracks.some((t) => t.type === TrackType.VIDEO && !t.muted)) return;
      if (Date.now() >= deadline) throw new Error("Screen video and exactly one microphone track must be published before dialing. LiveKit did not confirm both within five seconds; check screen sharing and try again.");
      await delay(this.mediaReadyPollMs, undefined, { signal: s.cancellation.signal });
    }
  }
  async end(id: string) {
    const s = this.require(id);
    s.canceled = true;
    s.cancellation.abort();
    this.update("ending", "Hanging up; waiting for cleanup…");
    if (!s.preparing && !s.dialing && !s.createBody) {
      s.terminal = true;
      await this.cleanup(s);
    } else this.schedule(s);
  }
  private require(id: string) {
    if (!this.session || this.session.id !== id) throw new Error("This call is no longer current.");
    return this.session;
  }
  private schedule(s: Session) {
    if (s.timer || this.session !== s) return;
    s.timer = setTimeout(() => { s.timer = undefined; void this.tick(s); }, 1000);
  }
  private async api(s: Session, path: string, method = "GET", body?: string, key?: string) {
    const response = await this.request(`https://facetime.trychert.com/api/v1/calls${path}`, {
      method, headers: {
        Authorization: `Bearer ${s.config.chertKey}`, "X-Chert-Project-Id": s.config.project,
        "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}),
      }, body, signal: AbortSignal.timeout(10_000),
    });
    const json: unknown = await response.json();
    if (!response.ok) {
      const code = object(object(json).error).code;
      // Whitelist characters and length; never expose arbitrary server error messages.
      throw new ApiError(response.status, typeof code === "string" && /^[a-z_]{1,60}$/.test(code) ? code : "request_failed");
    }
    return object(json).data;
  }
  private async create(s: Session) {
    try {
      const data = object(await this.api(s, "", "POST", s.createBody, `create-${s.id}`));
      if (typeof data.id !== "string" || !data.id) throw new Error("Missing call ID");
      s.callId = data.id;
    } catch (error) {
      // Definitive validation/auth/busy rejection cannot have allocated a call.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) {
        s.terminal = true; s.failed = true; s.terminalMessage = error.message;
        await this.cleanup(s);
        return;
      }
      throw error;
    }
  }
  // Exposed for deterministic lifecycle tests; production uses the one-second scheduler.
  async poll() { if (this.session) await this.tick(this.session); }
  private async tick(s: Session) {
    if (this.session !== s || s.ticking || s.preparing || s.dialing) { this.schedule(s); return; }
    s.ticking = true;
    try {
      if (s.terminal) { await this.cleanup(s); return; }
      if (!s.createBody) {
        if (Date.now() - s.startedAt > 120_000) { s.canceled = true; s.terminal = true; await this.cleanup(s); }
        return;
      }
      if (!s.callId) await this.create(s);
      if (s.terminal || !s.callId) return;
      const callPath = `/${encodeURIComponent(s.callId)}`;
      if (s.canceled && !s.endAccepted) {
        try {
          await this.api(s, `${callPath}/end`, "POST", "{}", `end-${s.id}`);
          s.endAccepted = true;
        } catch {
          // Even a rejected/lost end response must not block terminal observation.
          this.update("ending", "Hang-up pending; checking call status and retrying…");
        }
      }
      const [record, eventResult] = await Promise.allSettled([this.api(s, callPath), this.api(s, `${callPath}/events`)]);
      if (record.status === "rejected" && eventResult.status === "rejected") throw new Error("Status unavailable");
      const call = record.status === "fulfilled" ? object(record.value) : {};
      const eventData = eventResult.status === "fulfilled" ? eventResult.value : undefined;
      const events = Array.isArray(eventData) ? eventData : object(eventData).events;
      const types = Array.isArray(events) ? events.map((e) => { const v = object(e); return v.type ?? v.event_type; }) : [];
      if (terminalStatuses.has(String(call.status)) || types.includes("call.ended") || types.includes("call.failed")) {
        s.terminal = true;
        s.failed = call.status === "failed" || types.includes("call.failed");
        const reason = typeof call.terminal_reason === "string" ? call.terminal_reason : String(call.status ?? "ended");
        s.terminalMessage = /^[a-z_ -]{1,80}$/i.test(reason) ? `Call ended: ${reason.replaceAll("_", " ")}` : "Call ended";
        await this.cleanup(s);
      } else if (!s.canceled && types.includes("bridge_ready")) {
        this.update("active", "Connected", true);
      }
    } catch {
      this.update(s.canceled ? "ending" : this.state.phase, "Connection to Chert interrupted; retrying…", !s.canceled && this.state.bridgeReady);
    } finally {
      s.ticking = false;
      this.schedule(s);
    }
  }
  private async cleanup(s: Session) {
    if (this.session !== s || s.cleaning) return;
    s.cleaning = true;
    this.update("ending", "Releasing call resources…");
    try { await s.rooms.deleteRoom(s.room); }
    catch (error) {
      // A room that already disappeared is also clean.
      if (object(error).code !== "not_found" && object(error).status !== 404) {
        this.update("ending", "Waiting for LiveKit room cleanup; retrying…");
        this.schedule(s);
        return;
      }
    }
    finally { s.cleaning = false; }
    if (this.session !== s) return;
    if (s.timer) clearTimeout(s.timer);
    this.update(s.failed ? "error" : "ended", s.terminalMessage ?? "Call ended");
    this.session = undefined;
  }
  async endCurrent() { if (this.session) await this.end(this.session.id); }
}
