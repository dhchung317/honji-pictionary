import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
export async function acquireRoomMutation(roomId: string) {
  const key = `room:${roomId}:mutation-lock`;
  const owner = randomUUID();
  if (await redis.set(key, owner, { nx: true, ex: 180 }) !== "OK") return null;
  return async () => { await redis.eval(`if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("DEL",KEYS[1]) end; return 0`, [key], [owner]); };
}
