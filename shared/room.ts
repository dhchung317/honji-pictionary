export type RoomStatus =
  | "LOBBY"
  | "STARTING"
  | "DRAWING"
  | "SCORING"
  | "SCORING_FAILED"
  | "DONE";

export interface Room {
  id: string;
  hostId: string;
  status: RoomStatus;
  createdAt: string;
  currentRoundId: string | null;
  drawingDurationMs: number;
  promptHistory: string[]; // optional but recommended
  replayFromRoundId?: string;
  closed?: boolean;
  lobbyVersion?: number;
  autoStartAt?: string | null;
  theme: string | null; // optional: "animals", "food", etc.
}
