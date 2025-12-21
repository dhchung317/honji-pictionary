export type RoomStatus = "LOBBY" | "DRAWING" | "SCORING" | "DONE";

export interface Room {
  id: string;
  prompt: string;
  status: RoomStatus;
  createdAt: string;
  roundEndAt: string | null;
  drawingDurationMs: number;
  scoredAt: string | null;
  frozenPlayerIds: string[];
  rankedPlayerIds: string[] | null;
}