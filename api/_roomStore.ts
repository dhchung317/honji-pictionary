import { Room } from "../shared/room.js";
import { generateRoomId, redis as kv, TTL_SECONDS } from "./redis.js";

const roomKey = (id: string) => `room:${id}`;

export async function createRoom(prompt: string): Promise<Room> {
  const now = new Date();
  const room: Room = {
    id: generateRoomId(),
    prompt,
    status: "LOBBY",
    createdAt: now.toISOString(),
    roundEndAt: null,
    drawingDurationMs: 60_000,
    scoredAt: null,
    frozenPlayerIds: [],
    rankedPlayerIds: null,
    roundId: 0,
  };

  // Upstash will JSON-serialize this object
  await kv.set(roomKey(room.id), room, { ex: TTL_SECONDS });

  return room;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const raw = await kv.get<Room>(roomKey(id));
  return raw ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  await kv.set(roomKey(room.id), room);
}

export async function expireRoom(id: string, seconds: number): Promise<void> {
  await kv.expire(roomKey(id), seconds);
}
