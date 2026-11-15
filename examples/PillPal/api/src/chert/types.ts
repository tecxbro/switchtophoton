/**
 * Chert Messaging API wire shapes (https://docs.trychert.com/api/*), Backend-internal.
 * These are Chert's types, not PillPal contracts, so they live here and not in @pillpal/shared.
 * Only the fields we read are typed; everything else passes through untouched.
 */

/** POST /messages/{id}/react — the six standard tapbacks (api/messages/react). */
export type ReactionKind = "love" | "like" | "dislike" | "laugh" | "emphasize" | "question";

/** POST /send `effect` values (api/sending, error 4098 allowed_effects). */
export type MessageEffect =
  | "celebration"
  | "balloons"
  | "confetti"
  | "fireball"
  | "heart"
  | "laser"
  | "lasers"
  | "shootingstar"
  | "sparkles"
  | "spotlight";

/** One-time location pin (api/locations). */
export type Place = { latitude: number; longitude: number; label?: string; address?: string };

export type Handle = { handle: string; service?: string; is_me?: boolean };

export type TextPart = { type: "text"; value: string };
export type MediaPart = {
  type: "media";
  attachment_id: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
};
export type MessagePart = TextPart | MediaPart | { type: string; [k: string]: unknown };

/** Webhook / SSE envelope (api/receiving-replies). */
export type ChertEnvelope<T extends string = string, D = unknown> = {
  event_id: string;
  event_type: T;
  created_at?: string;
  api_version?: string;
  webhook_version?: string;
  trace_id?: string;
  partner_id?: string;
  data: D;
};

export type MessageReceivedData = {
  chat?: { id: string; is_group?: boolean; handles?: Handle[]; owner_handle?: Handle };
  message: {
    id: string;
    direction?: "inbound" | "outbound";
    sender_handle?: Handle;
    parts?: MessagePart[];
    sent_at?: string;
    service?: string;
  };
};

/**
 * reaction.added / reaction.removed. `reaction.kind` is a standard kind ("love", …) or
 * "emoji" with an `emoji` value for custom reactions.
 */
export type ReactionData = {
  reaction: {
    id?: string;
    target_message_id: string;
    applied_at?: string;
    service?: string;
    reaction: { kind: string; emoji?: string };
  };
  sender_handle?: Handle;
  chat?: { id: string };
};

export type MessageReceivedEvent = ChertEnvelope<"message.received", MessageReceivedData>;
export type ReactionEvent = ChertEnvelope<"reaction.added" | "reaction.removed", ReactionData>;

/** GET /phone-numbers item (api/phone-numbers). */
export type PhoneLine = {
  id: string;
  phone_line_id: string;
  phone_number: string;
  service: string;
  is_active: boolean;
  capabilities: string[];
};
