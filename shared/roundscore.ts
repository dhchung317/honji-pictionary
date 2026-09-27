export interface PlayerScore {
  playerId: string;
  score: number;
  rank: number;
  note: string;
}

export interface RoundScore {
  roomId: string;
  roundId: string;
  scoredAt: string;
  results: PlayerScore[];
}
