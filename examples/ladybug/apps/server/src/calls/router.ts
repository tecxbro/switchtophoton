import { Router } from "express";
import type { Request, Response } from "express";
import type { AccountStore } from "@ladybug/backend";
import type { ApiError, PreparedCall } from "@ladybug/shared";
import { accessProblem, currentUser, sendAuthError } from "../accounts.ts";
import type { SupportCommand } from "../support/service.ts";
import { SupportStream } from "../support/stream.ts";
import { CallService } from "./call-service.ts";

const idle = { phase: "idle", message: "Ready to call", bridgeReady: false } as const;
const finished = (phase: string) => ["idle", "ended", "error"].includes(phase);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Support calls for signed-in pets. The caller's account session authenticates
 * every request, and an admin has to turn calls on for the account first.
 */
export function createCallRouter(options: { accounts: AccountStore; service?: CallService; leaseMs?: number; now?: () => number }) {
  const router = Router();
  const support = new SupportStream(options.now ?? Date.now);
  const calls = options.service ?? new CallService();
  const now = options.now ?? Date.now;
  let owner: string | undefined, requestId: string | undefined;
  let prepared: Promise<PreparedCall> | undefined;
  let lastSeen = 0;
  const attempts = new Map<string, { at: number; count: number }>();
  router.use(async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const user = await currentUser(options.accounts, req);
    const problem = accessProblem(user);
    if (problem) return sendAuthError(res, problem);
    if (!user!.callsEnabled) {
      const body: ApiError = { error: "An admin hasn't turned on calls for this account" };
      res.status(403).json(body);
      return;
    }
    res.locals.callOwner = user!.id;
    next();
  });
  const route = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
    void handler(req, res).catch(() => { if (!res.headersSent) res.status(502).json({ error: "Call service unavailable" }); });
  };
  router.get("/support/stream", (req, res) => support.attach(req, res, res.locals.callOwner as string));
  router.get("/state", (_req, res) => {
    if (res.locals.callOwner !== owner) { res.json(idle); return; }
    lastSeen = now();
    res.json(calls.getState());
  });
  router.post("/prepare", route(async (req, res) => {
    const key = res.locals.callOwner as string;
    const id: unknown = req.body?.requestId;
    if (typeof id !== "string" || !uuid.test(id)) { res.status(400).json({ error: "Valid requestId required" }); return; }
    if (owner === key && requestId === id && prepared) { lastSeen = now(); res.json(await prepared); return; }
    if (!finished(calls.getState().phase)) { res.status(409).json({ error: "Line busy" }); return; }
    const limit = attempts.get(key);
    if (limit && now() - limit.at < 60_000 && limit.count >= 10) { res.status(429).json({ error: "Too many call attempts" }); return; }
    attempts.set(key, limit && now() - limit.at < 60_000 ? { ...limit, count: limit.count + 1 } : { at: now(), count: 1 });
    owner = key; requestId = id; lastSeen = now();
    prepared = calls.prepare();
    try { res.json(await prepared); }
    catch { prepared = undefined; res.status(503).json({ error: "Check server call configuration and LiveKit" }); }
  }));
  for (const action of ["dial", "end"] as const) {
    router.post(`/:id/${action}`, route(async (req, res) => {
      const id = String(req.params.id);
      if (owner !== res.locals.callOwner || calls.getState().id !== id) { res.status(404).json({ error: "Call not found" }); return; }
      lastSeen = now();
      if (action === "end" && finished(calls.getState().phase)) { res.json({ ok: true }); return; }
      await calls[action](id);
      res.json({ ok: true });
    }));
  }
  const checkLease = async () => {
    if (!finished(calls.getState().phase) && now() - lastSeen > (options.leaseMs ?? 30_000)) {
      await calls.endCurrent();
    }
  };
  const timer = setInterval(() => { void checkLease().catch(() => {}); }, 5000);
  timer.unref();
  const shutdown = async () => {
    clearInterval(timer);
    support.close();
    await calls.endCurrent();
    const deadline = Date.now() + 15_000;
    while (!finished(calls.getState().phase) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
  /** The account lost access to calls: drop its support stream and hang up its call. */
  const revoke = (userId: string) => {
    support.close(userId);
    if (owner === userId && !finished(calls.getState().phase)) {
      void calls.endCurrent().catch(() => console.error("[calls] could not end a revoked account's call"));
    }
  };
  return Object.assign(router, {
    shutdown,
    checkLease,
    revoke,
    deliverSupport: (command: SupportCommand) => (command.kind !== "support" || finished(calls.getState().phase)) && support.deliver(command),
  });
}

export type CallRouter = ReturnType<typeof createCallRouter>;
