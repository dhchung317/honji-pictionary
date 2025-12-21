import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const TTL_SECONDS = 3600;

export const generateId = () => crypto.randomUUID();

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function touchKeys(keys: string[]) {
  await Promise.allSettled(keys.map((k) => redis.expire(k, TTL_SECONDS)));
}
