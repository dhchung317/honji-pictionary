export type RoomStatus = "LOBBY" | "DRAWING" | "SCORING" | "DONE";

export interface Room {
  id: string;
  status: RoomStatus;
  createdAt: string;
  roundEndAt: string | null;
  drawingDurationMs: number;
  scoredAt: string | null;
  frozenPlayerIds: string[];
  rankedPlayerIds: string[] | null;
  roundId: number;
  scoreNotesByPlayerId?: Record<string, string> | null;
  scoreByPlayerId: Record<string, number> | null;
  currentPrompt: string | null;
  promptHistory: string[]; // optional but recommended
  theme: string | null; // optional: "animals", "food", etc.
}
