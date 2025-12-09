// src/lib/roomsApi.ts

export type RoomStatus = "LOBBY" | "DRAWING" | "SCORING" | "DONE";

export interface Room {
  id: string;
  prompt: string;
  status: RoomStatus;
  createdAt: string;
  roundEndAt: string | null;
  drawingDurationMs: number;
}

const STORAGE_KEY = "drawBattle.rooms";

function loadAllRooms(): Room[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Room[];
  } catch (e) {
    console.error("Failed to parse rooms from storage", e);
    return [];
  }
}

function saveAllRooms(rooms: Room[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(prompt: string): Promise<Room> {
  await new Promise((r) => setTimeout(r, 200));

  const rooms = loadAllRooms();
  const now = new Date();
  const createdAt = now.toISOString();

  const drawingDurationMs = 10_000;

  const room: Room = {
    id: generateRoomId(),
    prompt,
    status: "LOBBY", // starts in lobby
    createdAt,
    roundEndAt: null,
    drawingDurationMs,
  };

  rooms.push(room);
  saveAllRooms(rooms);

  console.log("[roomsApi] created room", room);
  return room;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  await new Promise((r) => setTimeout(r, 150));

  const rooms = loadAllRooms();
  const normalized = roomId.trim().toLowerCase();
  const idx = rooms.findIndex((r) => r.id.trim().toLowerCase() === normalized);
  if (idx === -1) {
    console.log("[roomsApi] getRoom", roomId, "-> not found");
    return null;
  }

  const stored = rooms[idx];
  const updated = applyAutomaticPhase(stored);

  if (
    updated.status !== stored.status ||
    updated.roundEndAt !== stored.roundEndAt
  ) {
    rooms[idx] = updated;
    saveAllRooms(rooms);
  }

  console.log("[roomsApi] getRoom", roomId, "->", updated);
  return updated;
}

export async function updateRoomStatus(
  roomId: string,
  status: RoomStatus,
  opts?: { roundEndAt?: string | null }
): Promise<Room | null> {
  await new Promise((r) => setTimeout(r, 150));

  const rooms = loadAllRooms();
  const normalized = roomId.trim().toLowerCase();
  const idx = rooms.findIndex((r) => r.id.trim().toLowerCase() === normalized);
  if (idx === -1) return null;

  const existing = rooms[idx];
  const updated: Room = {
    ...existing,
    status,
    roundEndAt: opts?.roundEndAt ?? existing.roundEndAt,
  };

  rooms[idx] = updated;
  saveAllRooms(rooms);

  console.log("[roomsApi] updateRoomStatus", roomId, "->", updated);
  return updated;
}

export async function startRound(roomId: string): Promise<Room | null> {
  await new Promise((r) => setTimeout(r, 150));

  const rooms = loadAllRooms();
  const normalized = roomId.trim().toLowerCase();
  const idx = rooms.findIndex(
    (r) => r.id.trim().toLowerCase() === normalized
  );
  if (idx === -1) return null;

  const existing = rooms[idx];
  const now = Date.now();

  // Only start if we're in LOBBY
  if (existing.status !== "LOBBY") return existing;

  const endTime = new Date(now + existing.drawingDurationMs).toISOString();

  const updated: Room = {
    ...existing,
    status: "DRAWING",
    roundEndAt: endTime,
  };

  rooms[idx] = updated;
  saveAllRooms(rooms);

  console.log("[roomsApi] startRound", roomId, "->", updated);
  return updated;
}

function applyAutomaticPhase(room: Room): Room {
  const now = Date.now();
  const updated = { ...room };

  if (updated.status === "DRAWING" && updated.roundEndAt) {
    const end = Date.parse(updated.roundEndAt);
    if (now >= end) {
      updated.status = "SCORING"; // or DONE directly, depending on flow
    }
  }

  // For now, we don't auto-progress SCORING → DONE,
  // but you could add that later.

  return updated;
}
