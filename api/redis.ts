import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const TTL_SECONDS = 3600;

export const generateId = () => crypto.randomUUID();

const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 4;

export function generateRoomId(): string {
  return Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)],
  ).join("");
}

export async function touchKeys(keys: string[]) {
  await Promise.allSettled(keys.map((k) => redis.expire(k, TTL_SECONDS)));
}
