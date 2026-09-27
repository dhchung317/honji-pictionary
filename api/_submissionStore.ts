import { Submission } from "../shared/submission.js";
import { generateId, redis as kv, touchKeys, TTL_SECONDS } from "./redis.js";

const roomSubsKey = (roomId: string, roundId: string) =>
  `room:${roomId}:round:${roundId}:submissions`;

const submissionKey = (id: string) => `submission:${id}`;

export const submissionUniqKey = (
  roomId: string,
  roundId: string,
  playerId: string
) => `room:${roomId}:round:${roundId}:submissionByPlayer:${playerId}`;

export async function createOrReplaceSubmission(
  roundId: string,
  input: Omit<Submission, "id" | "createdAt">
) {
  const uniqKey = submissionUniqKey(input.roomId, roundId, input.playerId);

  // ensure 1 submission per player (replace)
  const existingId = await kv.get<string>(uniqKey);

  const id = existingId ?? generateId();
  const sub: Submission = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };

  const sk = submissionKey(id);
  const rsk = roomSubsKey(input.roomId, roundId);

  await kv.set(sk, sub, { ex: TTL_SECONDS });
  await kv.set(uniqKey, id, { ex: TTL_SECONDS });

  // track ids (if new)
  if (!existingId) {
    await kv.rpush(rsk, id);
  }
  await kv.expire(rsk, TTL_SECONDS);

  await touchKeys([sk, rsk, uniqKey]);
  return sub;
}

export async function listSubmissions(
  roomId: string,
  roundId: string
): Promise<Submission[]> {
  const ids = (await kv.lrange(roomSubsKey(roomId, roundId), 0, -1)) ?? [];
  if (ids.length === 0) return [];

  const subs = await Promise.all(
    ids.map((id) => kv.get<Submission>(submissionKey(id)))
  );
  return subs.filter(Boolean) as Submission[];
}
