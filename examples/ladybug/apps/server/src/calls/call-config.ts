export function readCallConfig(env: Record<string, string | undefined> = process.env) {
  const required = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "CHERT_API_KEY", "CHERT_PROJECT_ID", "CHERT_LINE_ID", "EMERGENCY_NUMBER"] as const;
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`Configure ${key} in the server .env file before calling.`);
  }
  const url = new URL(env.LIVEKIT_URL!);
  if (url.protocol !== "wss:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) {
    throw new Error("LIVEKIT_URL must be a secure wss:// URL on port 443 without credentials or a fragment.");
  }
  if (!/^\+[1-9]\d{6,14}$/.test(env.EMERGENCY_NUMBER!)) {
    throw new Error("EMERGENCY_NUMBER must be an international phone number, for example +15551234567.");
  }
  return {
    url: url.toString(), key: env.LIVEKIT_API_KEY!, secret: env.LIVEKIT_API_SECRET!,
    chertKey: env.CHERT_API_KEY!, project: env.CHERT_PROJECT_ID!, line: env.CHERT_LINE_ID!,
    destination: env.EMERGENCY_NUMBER!,
  };
}
export type CallConfig = ReturnType<typeof readCallConfig>;
