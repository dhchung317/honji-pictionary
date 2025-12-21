export interface Submission {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  imageDataUrl: string; // for now (later: imageUrl)
  createdAt: string;
  rank?: number;
  score?: number;
}
