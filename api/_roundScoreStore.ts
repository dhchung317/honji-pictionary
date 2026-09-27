import { redis, TTL_SECONDS } from "./redis.js";
import type { RoundScore } from "../shared/roundscore.js";

const roundScoreKey = (roomId: string, roundId: string) =>
  `room:${roomId}:round:${roundId}:score`;

export async function saveRoundScore(score: RoundScore) {
  const key = roundScoreKey(score.roomId, score.roundId);

  await redis.set(key, score, {
    ex: TTL_SECONDS,
  });
}

export async function getRoundScore(
  roomId: string,
  roundId: string,
): Promise<RoundScore | null> {
  return redis.get<RoundScore>(roundScoreKey(roomId, roundId));
}
