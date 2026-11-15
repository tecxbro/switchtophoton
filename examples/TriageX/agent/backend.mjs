// TriageX backend client for the FaceTime agent (handoff Prompt 4). The backend is the authority:
// the agent sends card fields and the caller's explicit confirmation; the backend validates the
// card against the synthetic roster and records the confirmation exactly once.
//
// BACKEND_URL (default http://127.0.0.1:8000) and TRIAGEX_AGENT_TOKEN come from .env.local. The
// token goes only in the X-TriageX-Agent-Token header and is never logged.

export class BackendError extends Error {
  /** @param {string} code @param {string} message @param {number | null} status @param {any} body */
  constructor(code, message, status = null, body = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {{ baseUrl?: string, token?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 */
export function createBackend(opts = {}) {
  const baseUrl = (opts.baseUrl ?? process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const token = opts.token ?? process.env.TRIAGEX_AGENT_TOKEN ?? '';
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;

  async function call(method, path, body) {
    let res;
    try {
      res = await fetchImpl(`${baseUrl}/api/agent${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-triagex-agent-token': token },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new BackendError('unreachable', `TriageX backend unreachable: ${e?.name ?? e}`);
    }
    const json = await res.json().catch(() => null);
    if (res.ok) return json;
    const detail = json?.detail;
    throw new BackendError(`http_${res.status}`, typeof detail === 'string' ? detail : detail?.message ?? res.statusText, res.status, detail);
  }

  return {
    enabled: Boolean(token),
    /** The open staffing request, or null when there is none (404). */
    async activeRequest() {
      try {
        return await call('GET', '/active-request');
      } catch (e) {
        if (e instanceof BackendError && e.status === 404) return null;
        throw e;
      }
    },
    callEvent: (callId, event) => call('POST', '/call', { call_id: callId, event }),
    /** @param {string} callId @param {import('./card-reader.mjs').CardReading} r */
    cardCheck: (callId, r) => call('POST', '/card-check', {
      call_id: callId, card_id: r.card_id, name: r.name, role: r.role,
      availability: r.availability, confidence: r.confidence,
    }),
    /**
     * Records the confirmation. Returns the backend's answer; a refusal (409) is returned, not
     * thrown, so the agent can say why.
     */
    async confirm(callId, cardId) {
      try {
        return await call('POST', '/confirm', { call_id: callId, card_id: cardId, verbal_confirmation: 'I confirm' });
      } catch (e) {
        if (e instanceof BackendError && e.status === 409 && e.body && typeof e.body === 'object') return e.body;
        throw e;
      }
    },
  };
}

/**
 * True when what the caller said is a clear, unnegated "confirm" ("I confirm", "Yes, I confirm.",
 * "confirm"). Anything else, including "I don't confirm" or "can I confirm later?", is false.
 * @param {string} transcript
 */
export function isConfirmation(transcript) {
  if (typeof transcript !== 'string') return false;
  const t = transcript.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!/\bconfirm(ed)?\b/.test(t)) return false;
  if (/\b(don't|do not|not|never|can't|cannot|won't|will not|no|isn't|unable|later|maybe|if|how|what|should|can i|could i)\b/.test(t)) return false;
  return /^(yes |yeah |yep |ok |okay |sure )?(i |i do |i hereby )?confirm(ed)?( (it|that|the shift|yes|please))?$/.test(t);
}

/** The call id from chert dev's room metadata, falling back to the room name. */
export function callIdFor(room) {
  try {
    const id = JSON.parse(room?.metadata || '{}')?.chert_call;
    if (typeof id === 'string' && id) return id;
  } catch { /* not JSON */ }
  return room?.name || `call-${Date.now()}`;
}
