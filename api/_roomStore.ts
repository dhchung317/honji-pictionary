import { Redis } from "@upstash/redis";

export type RoomStatus = "LOBBY" | "DRAWING" | "SCORING" | "DONE";

export interface Room {
  id: string;
  prompt: string;
  status: RoomStatus;
  createdAt: string;
  roundEndAt: string | null;
  drawingDurationMs: number;
  scoredAt: string | null;
}

// Upstash Redis client (REST)
const kv = Redis.fromEnv()

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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
  };

  // Upstash will JSON-serialize this object
  await kv.set(roomKey(room.id), room, {ex: 3600});

  return room;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const raw = await kv.get<Room>(roomKey(id));
  return raw ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  await kv.set(roomKey(room.id), room);
}

export async function applyAutomaticPhase(room: Room): Promise<Room> {
  const now = Date.now();
  let updated = { ...room };

  if (updated.status === "DRAWING" && updated.roundEndAt) {
    const end = Date.parse(updated.roundEndAt);
    if (now >= end) {
      updated.status = "SCORING"; // or DONE directly, depending on flow
    }
  }

//   if (updated.status === "SCORING" && !updated.scoredAt) {
//     const scoredSubs = scoreSubmissionsForRoom(room.id);

//     // if there were no submissions, you can still mark DONE,
//     // or leave as SCORING; I'll mark DONE.
//     const scoredNow = new Date().toISOString();
//     updated = {
//       ...updated,
//       status: "DONE",
//       scoredAt: scoredSubs.length > 0 ? scoredNow : scoredNow,
//     };
//   }

  // inside your automatic phase logic
if (room.status === "DONE") {
  // keep it around for 10 minutes after completion
  await expireRoom(room.id, 600);
}

  return updated;
}

export async function expireRoom(id: string, seconds: number): Promise<void> {
  await kv.expire(roomKey(id), seconds);
}
