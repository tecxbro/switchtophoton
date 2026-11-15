import { createHash, randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import { normalizeUrl } from "../urls.ts";
import { readMessagingConfig, sendMessage, readMessages, SendError } from "./chert.ts";
import type { MessagingConfig, SharedMessage } from "./chert.ts";

const HOUR = 3_600_000, WINDOW = 1_800_000;
const POLL_INTERVAL_MS = 15_000;
const jobs = "support:shared:jobs";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const windows = (config: MessagingConfig) => `support:shared:windows:${hash(`${config.project}:${config.line}:${config.destination}`)}`;
export type SupportCommand = { id: string; accountId: string; kind: "support" | "browser-kill" | "device-shutdown"; sentAt: number; expiresAt: number };
type Job = { accountId: string; id: string; url: string; config: Pick<MessagingConfig, "destination" | "line" | "project">; created: number; attempts: number; messageId?: string };

/** Atomic reservation and outbox insertion; pending sends survive process restarts. */
const reserve = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'PX', ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[4], KEYS[2])
return 1`;
/** Deduplicate the message and resolve its newest eligible alert without changing it. */
const lookup = `
if not redis.call('SET', KEYS[2], '1', 'PX', ARGV[4], 'NX') then return false end
local entries = redis.call('LRANGE', KEYS[1], 0, -1)
for _, raw in ipairs(entries) do
 local w = cjson.decode(raw)
 if w.contact == ARGV[1] and tonumber(ARGV[2]) >= w.start and tonumber(ARGV[2]) <= w.finish and tonumber(ARGV[3]) >= w.start and tonumber(ARGV[3]) <= w.finish then
  if type(w.accountId) ~= 'string' or w.accountId == '' then return false end
  return cjson.encode(w)
 end
end
return false`;

export class SupportService {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private polling = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private startedAt: number;
  private redis: Redis;
  private deliver: (command: SupportCommand) => boolean;
  private options: { config?: () => MessagingConfig | null; send?: typeof sendMessage; read?: typeof readMessages; now?: () => number };
  constructor(redis: Redis, deliver: (command: SupportCommand) => boolean,
    options: SupportService["options"] = {}) { this.redis = redis; this.deliver = deliver; this.options = options; this.startedAt = this.now(); }
  private now() { return (this.options.now ?? Date.now)(); }
  private config() { return (this.options.config ?? readMessagingConfig)(); }
  start() {
    this.timer = setInterval(() => { void this.drain().catch(() => console.error("[support] outbox unavailable")); }, 2000);
    this.timer.unref();
    this.pollTimer = setInterval(() => { void this.poll().catch(() => console.error("[support] shared-message polling unavailable")); }, POLL_INTERVAL_MS);
    this.pollTimer.unref();
    return this;
  }
  stop() { clearInterval(this.timer); clearInterval(this.pollTimer); }
  async notify(rawUrl: string, accountId: string) {
    const target = normalizeUrl(rawUrl), config = this.config();
    if (!target.ok || !config || !accountId) return;
    const job: Job = { accountId, id: randomUUID(), url: target.url, config: { destination: config.destination, line: config.line, project: config.project }, created: this.now(), attempts: 0 };
    await this.redis.eval(reserve, 3, `support:host:${hash(`${accountId}:${target.host}`)}`, `support:job:${job.id}`, jobs,
      job.id, JSON.stringify(job), HOUR, this.now());
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const config = this.config();
      if (!config) return;
      let messages: Promise<SharedMessage[]> | undefined;
      for (const key of await this.redis.zrangebyscore(jobs, "-inf", this.now(), "LIMIT", 0, 20)) {
        const lock = `${key}:lock`, token = randomUUID();
        if (!await this.redis.set(lock, token, "PX", 60_000, "NX")) continue;
        try {
          const raw = await this.redis.get(key);
          if (!raw) { await this.redis.zrem(jobs, key); continue; }
          const job = JSON.parse(raw) as Job;
          if (!job.accountId || job.config.destination !== config.destination || job.config.line !== config.line || job.config.project !== config.project) {
            await this.redis.zrem(jobs, key); continue;
          }
          try {
            let state: string;
            if (job.messageId) {
              messages ??= (this.options.read ?? readMessages)(config);
              state = (await messages).find((row) => row.id === job.messageId && row.line_id === config.line && row.direction === "outbound")?.state ?? "unknown";
            } else {
              const receipt = await (this.options.send ?? sendMessage)(config, job.id, job.url);
              job.messageId = receipt.id;
              state = receipt.state;
            }
            if (state === "cancelled" || state === "failed") throw new SendError(false);
            if (state !== "sent") {
              if (this.now() - job.created >= HOUR - 60_000) throw new SendError(false);
              await this.redis.set(key, JSON.stringify(job), "PX", Math.max(1, HOUR - (this.now() - job.created)));
              await this.redis.zadd(jobs, this.now() + POLL_INTERVAL_MS, key);
              continue;
            }
            const start = this.now();
            // Commit the successful send and its support window together.
            const tx = this.redis.multi();
            tx.lpush(windows(config), JSON.stringify({ id: job.id, accountId: job.accountId, contact: config.destination, start, finish: start + WINDOW }));
            tx.ltrim(windows(config), 0, 999);
            tx.pexpire(windows(config), HOUR);
            tx.del(key); tx.zrem(jobs, key);
            const result = await tx.exec();
            if (!result || result.some(([error]) => error)) throw new Error("Support state could not be saved");
          } catch (error) {
            if ((error instanceof SendError && !error.transient) || ++job.attempts >= 5 || this.now() - job.created > HOUR - 60_000) {
              await this.redis.zrem(jobs, key);
              console.error("[support] message could not be delivered");
            } else {
              await this.redis.set(key, JSON.stringify(job), "PX", Math.max(1, HOUR - (this.now() - job.created)));
              await this.redis.zadd(jobs, this.now() + Math.min(60_000, 2000 * 2 ** job.attempts), key);
            }
          }
        } finally {
          await this.redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, lock, token);
        }
      }
    } finally { this.running = false; }
  }
  async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const config = this.config();
      if (!config) return;
      const messages = await (this.options.read ?? readMessages)(config);
      const received = this.now();
      // Oldest first makes multiple replies deterministic when one poll sees both.
      for (const message of [...messages].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
        await this.reply(message, received);
      }
    } finally { this.polling = false; }
  }
  async reply(message: SharedMessage, received = this.now()) {
    const config = this.config();
    if (!config || message.line_id !== config.line || message.direction !== "inbound" ||
      message.state !== "received" || !["support", "kill", "shutdown"].includes(message.text.trim().toLowerCase())) return;
    const sent = Date.parse(message.created_at);
    // A server restart must not turn the provider's history into fresh requests.
    if (!Number.isFinite(sent) || sent <= this.startedAt || sent > received) return;
    const eventKey = `support:shared:event:${hash(`${config.project}:${config.line}:${message.id}`)}`;
    // Shared-line participants register with Chert first. The project owner
    // accepts the provider's masked last-four identity for this deployment.
    const sender = message.masked_recipient;
    const matches = sender === config.destination ||
      (/^•••\d{4}$/.test(sender) && sender.slice(-4) === config.destination.slice(-4));
    if (!matches) return;
    const raw = await this.redis.eval(lookup, 2, windows(config), eventKey, config.destination, sent, received, 7 * 24 * HOUR);
    // Deduplicate even when offline; a new reply is required after reconnecting.
    if (typeof raw === "string") {
      const window = JSON.parse(raw) as { accountId: string; finish: number };
      this.deliver({ id: randomUUID(), accountId: window.accountId, kind: message.text.trim().toLowerCase() === "shutdown" ? "device-shutdown" : message.text.trim().toLowerCase() === "kill" ? "browser-kill" : "support", sentAt: sent, expiresAt: window.finish });
    }
  }

}

let service: SupportService | undefined;
export function configureSupport(value: SupportService) { service = value; }
export function notifyUnsafeVisit(url: string, accountId: string) {
  void service?.notify(url, accountId).catch(() => console.error("[support] notification unavailable"));
}
