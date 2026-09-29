import { Room } from "../shared/room.js";
import { generateRoomId, redis as kv, TTL_SECONDS } from "./redis.js";

const roomKey = (id: string) => `room:${id}`;

export async function createRoom(hostId: string): Promise<Room> {
  const now = new Date();
  const room: Room = {
    id: generateRoomId(),
    hostId,
    status: "LOBBY",
    createdAt: now.toISOString(),
    currentRoundId: null,
    drawingDurationMs: 180_000,
    promptHistory: [],
    theme: null,
  };

  // Upstash will JSON-serialize this object
  for (let attempt = 0; attempt < 10; attempt++) {
    room.id = generateRoomId();
    if (await kv.set(roomKey(room.id), room, { ex: TTL_SECONDS, nx: true }) === "OK") return room;
  }
  throw new Error("Unable to allocate a room code");

}

export async function getRoomById(id: string): Promise<Room | null> {
  const raw = await kv.get<Room>(roomKey(id));
  return raw ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  const saved = await kv.eval(`
    local ttl = redis.call("PTTL", KEYS[1])
    if ttl == -2 then return 0 end
    if ttl == -1 then ttl = tonumber(ARGV[2]) end
    redis.call("SET", KEYS[1], ARGV[1], "PX", math.max(ttl, 1))
    return 1
  `, [roomKey(room.id)], [JSON.stringify(room), TTL_SECONDS * 1000]);
  if (saved === 0) throw new Error("Room expired during update");
}

export async function expireRoom(id: string, seconds: number): Promise<void> {
  await kv.expire(roomKey(id), seconds);
}
