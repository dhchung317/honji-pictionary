import { Submission } from "../shared/submission.js";
import { generateId, redis as kv, TTL_SECONDS } from "./redis.js";

const roomSubsKey = (roomId: string, roundId: string) =>
  `room:${roomId}:round:${roundId}:submissions`;

const submissionKey = (id: string) => `submission:${id}`;

export const submissionUniqKey = (
  roomId: string,
  roundId: string,
  playerId: string,
) => `room:${roomId}:round:${roundId}:submissionByPlayer:${playerId}`;

export async function createOrReplaceSubmission(
  roundId: string,
  input: Omit<Submission, "id" | "createdAt">,
) {
  const uniqKey = submissionUniqKey(input.roomId, roundId, input.playerId);

  const candidate = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const raw = await kv.eval<[string, number], string>(
    `
    local existing = redis.call("GET", KEYS[1])
    local sub = cjson.decode(ARGV[1])
    if existing then sub.id = existing end
    local sk = "submission:" .. sub.id
    local encoded = cjson.encode(sub)
    redis.call("SET", sk, encoded, "EX", ARGV[2])
    redis.call("SET", KEYS[1], sub.id, "EX", ARGV[2])
    if not existing then redis.call("RPUSH", KEYS[2], sub.id) end
    redis.call("EXPIRE", KEYS[2], ARGV[2])
    return encoded
  `,
    [uniqKey, roomSubsKey(input.roomId, roundId)],
    [JSON.stringify(candidate), TTL_SECONDS],
  );
  const sub: Submission = typeof raw === "string" ? JSON.parse(raw) : raw;

  return sub;
}

export async function listSubmissions(
  roomId: string,
  roundId: string,
): Promise<Submission[]> {
  const ids = (await kv.lrange(roomSubsKey(roomId, roundId), 0, -1)) ?? [];
  if (ids.length === 0) return [];

  const subs = await Promise.all(
    ids.map((id) => kv.get<Submission>(submissionKey(id))),
  );
  return subs.filter(Boolean) as Submission[];
}
