import { RoundScore } from "../../shared/roundscore";

export async function getRoundScore(
  roomId: string,
  roundId: string | null,
): Promise<RoundScore> {
  const res = await fetch(
    `/api/get-round-score?roomId=${encodeURIComponent(roomId)}&roundId=${encodeURIComponent(roundId ?? '')}`,
  );

  if (!res.ok) {
    throw new Error("Failed to get round score");
  }

  return res.json();
}