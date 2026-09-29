export type RoundStatus =
  | "DRAWING"
  | "SCORING"
  | "SCORING_FAILED"
  | "DONE";

export interface Round {
  id: string;
  roomId: string;
  status: RoundStatus;
  prompt: string;
  frozenPlayerIds: string[];
  startedAt: string;
  roundEndAt: string;
  drawingDurationMs: number;
  scoredAt: string | null;
  scoringAttempts?: number;
  scoringRetryAt?: number;
}