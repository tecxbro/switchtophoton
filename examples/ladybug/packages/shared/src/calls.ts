export type CallPhase = "idle" | "preparing" | "ready" | "dialing" | "active" | "ending" | "ended" | "error";
export type CallState = {
  id?: string;
  phase: CallPhase;
  message: string;
  bridgeReady: boolean;
};
export type PreparedCall = { id: string; url: string; token: string; bridgeIdentity: string };
export type FaceTimeApi = {
  prepare: () => Promise<PreparedCall>;
  dial: (id: string) => Promise<void>;
  end: (id: string) => Promise<void>;
  getState: () => Promise<CallState>;
  onSupportRequest: (callback: () => void) => () => void;
  onState: (callback: (state: CallState) => void) => () => void;
};
