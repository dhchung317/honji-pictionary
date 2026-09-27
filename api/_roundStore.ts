import { Round } from "../shared/round";
import { redis, TTL_SECONDS } from "./redis";

const roundKey = (roomId: string, roundId: string) =>
  `room:${roomId}:round:${roundId}`;

export async function saveRound(round: Round) {
  await redis.set(
    roundKey(round.roomId, round.id),
    round,
    { ex: TTL_SECONDS },
  );
}

export async function getRound(
  roomId: string,
  roundId: string,
): Promise<Round | null> {
  return redis.get<Round>(
    roundKey(roomId, roundId),
  );
}