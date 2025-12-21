import { Submission } from "../shared/submission.js";
import { generateId, redis as kv, touchKeys, TTL_SECONDS } from "./redis.js";

const roomSubsKey = (roomId: string) => `room:${roomId}:submissions`;
const submissionKey = (id: string) => `submission:${id}`;
export const submissionUniqKey = (roomId: string, playerId: string) =>
  `room:${roomId}:submissionByPlayer:${playerId}`;

export async function createOrReplaceSubmission(
  input: Omit<Submission, "id" | "createdAt">
) {
  const uniqKey = submissionUniqKey(input.roomId, input.playerId);

  // ensure 1 submission per player (replace)
  const existingId = await kv.get<string>(uniqKey);

  const id = existingId ?? generateId();
  const sub: Submission = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };

  const sk = submissionKey(id);
  const rsk = roomSubsKey(input.roomId);

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

export async function listSubmissions(roomId: string): Promise<Submission[]> {
  const ids = (await kv.lrange(roomSubsKey(roomId), 0, -1)) ?? [];
  if (ids.length === 0) return [];

  const subs = await Promise.all(
    ids.map((id) => kv.get<Submission>(submissionKey(id)))
  );
  return subs.filter(Boolean) as Submission[];
}
