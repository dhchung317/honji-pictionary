export interface Player {
  id: string;
  roomId: string;
  name: string;
  joinedAt: string;
  avatarUrl?: string;
  replayRoundId?: string;
}
