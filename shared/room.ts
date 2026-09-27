export type RoomStatus = "LOBBY" | "DRAWING" | "SCORING" | "DONE";

export interface Room {
  id: string;
  status: RoomStatus;
  createdAt: string;
  currentRoundId: string | null;
  drawingDurationMs: number;
  promptHistory: string[]; // optional but recommended
  theme: string | null; // optional: "animals", "food", etc.
}
