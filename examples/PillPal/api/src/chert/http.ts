/**
 * Live HTTP client for https://console.trychert.com/api/v1 (Bearer CHERT_MSG_TOKEN).
 * Retries 5xx only (never 4xx), with exponential backoff. Chert's "delivery outcome unknown"
 * codes (4103/4104) are 502 but must never be retried automatically (api/errors), so they are excluded.
 * Never logs request/response bodies, phones or the token.
 */
import { env } from "../env.js";

export const CHERT_BASE = "https://console.trychert.com/api/v1";

const MAX_ATTEMPTS = 3;
const NO_RETRY_CODES = new Set([4103, 4104]);

export class ChertError extends Error {
  constructor(
    public readonly method: string,
    public readonly path: string,
    public readonly status: number,
    public readonly code: number | string | undefined,
  ) {
    super(`chert ${method} ${path} → ${status}${code !== undefined ? ` (code ${code})` : ""}`);
    this.name = "ChertError";
  }
}

function headers(json: boolean): Record<string, string> {
  if (!env.CHERT_MSG_TOKEN) throw new Error("CHERT_MSG_TOKEN is not set");
  const h: Record<string, string> = { authorization: `Bearer ${env.CHERT_MSG_TOKEN}` };
  if (env.CHERT_TENANT) h["x-chert-tenant"] = env.CHERT_TENANT;
  if (json) h["content-type"] = "application/json";
  return h;
}

/** Path for logs: ids replaced so nothing identifying is printed. */
function safePath(path: string): string {
  return path.split("?")[0]!.replace(/\/[^/]*[0-9][^/]*(?=\/|$)/g, "/:id");
}

/** Chert errors are either the envelope {error:{code}} or the flat /send shape {code}. */
async function errorCode(res: Response): Promise<number | string | undefined> {
  try {
    const j = (await res.json()) as { code?: number | string; error?: { code?: number } | string };
    if (typeof j.error === "object" && j.error?.code !== undefined) return j.error.code;
    return j.code;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chertFetch(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: headers(body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${CHERT_BASE}${path}`, init);
    } catch (err) {
      // Network failure: the request may or may not have landed. Sends carry an idempotency_key.
      if (attempt >= MAX_ATTEMPTS) throw err;
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }
    if (res.ok) return res;
    const code = await errorCode(res);
    const retryable = res.status >= 500 && !NO_RETRY_CODES.has(Number(code));
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      const e = new ChertError(method, safePath(path), res.status, code);
      console.error(`[chert] ${e.message}`);
      throw e;
    }
    console.warn(`[chert] ${method} ${safePath(path)} → ${res.status}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
    await sleep(500 * 2 ** (attempt - 1));
  }
}

export async function chertJson<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await chertFetch(method, path, body);
  return (await res.json()) as T;
}

export function authHeaders(): Record<string, string> {
  return headers(false);
}
