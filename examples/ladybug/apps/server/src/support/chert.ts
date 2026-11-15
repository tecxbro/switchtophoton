const endpoint = "https://app.trychert.com/api/v1/shared-messages";

export function readMessagingConfig(env = process.env) {
  const key = env.CHERT_API_KEY?.trim(), line = env.CHERT_LINE_ID?.trim();
  const project = env.CHERT_PROJECT_ID?.trim(), destination = env.EMERGENCY_NUMBER?.trim();
  if (!key || !line || !project || !destination) return null;
  if (!/^\+[1-9]\d{6,14}$/.test(destination)) throw new Error("Invalid messaging emergency number");
  return { key, line, project, destination };
}
export type MessagingConfig = NonNullable<ReturnType<typeof readMessagingConfig>>;
export type SendReceipt = { id: string; state: string };
export type SharedMessage = SendReceipt & {
  line_id: string;
  direction: "inbound" | "outbound";
  masked_recipient: string;
  created_at: string;
  text: string;
};

export class SendError extends Error {
  readonly transient: boolean;
  constructor(transient: boolean) { super("Chert message send failed"); this.transient = transient; }
}
const headers = (config: MessagingConfig) => ({
  Authorization: `Bearer ${config.key}`, "X-Chert-Project-Id": config.project,
});
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export async function sendMessage(config: MessagingConfig, id: string, url: string, request = fetch): Promise<SendReceipt> {
  let response: Response;
  try {
    response = await request(endpoint, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { ...headers(config), "Content-Type": "application/json", "Idempotency-Key": id },
      body: JSON.stringify({ line_id: config.line, recipient: config.destination,
        text: `Computerbug warning: The user is accessing a website that might not be trustworthy:\n${url}\n\nReply within 30 minutes:\nSUPPORT: Start or restart a remote FaceTime support call.\nKILL: Force-close Google Chrome on all connected computers on this account.\nSHUTDOWN: Shut down all connected computers on this account. Unsaved work may be lost.` }),
    });
  } catch { throw new SendError(true); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new SendError(response.status === 408 || response.status === 429 || response.status >= 500);
  }
  const body = object(await response.json().catch(() => null)), data = object(body?.data);
  // Keep the send id even while pending: observing it must never enqueue a new send.
  if (typeof data?.id !== "string" || !data.id || typeof data.state !== "string") throw new SendError(true);
  return { id: data.id, state: data.state };
}

export async function readMessages(config: MessagingConfig, request = fetch): Promise<SharedMessage[]> {
  const response = await request(endpoint, {
    headers: headers(config), redirect: "error", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error("Chert shared messages unavailable"); }
  const body = object(await response.json()), data = object(body?.data);
  if (!Array.isArray(data?.items) || data.items.length > 50) throw new Error("Invalid shared messages response");
  return data.items.map((value: unknown) => {
    const row = object(value);
    if (!row || typeof row.id !== "string" || !row.id || typeof row.line_id !== "string" ||
      !["inbound", "outbound"].includes(String(row.direction)) || typeof row.state !== "string" ||
      typeof row.masked_recipient !== "string" || typeof row.text !== "string" ||
      typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at))) {
      throw new Error("Invalid shared message");
    }
    return row as SharedMessage;
  });
}
