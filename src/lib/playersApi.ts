// src/lib/playersApi.ts

export interface Player {
  id: string;
  roomId: string;
  name: string;
  joinedAt: string;
}

const STORAGE_KEY = "drawBattle.players";

function loadAllPlayers(): Player[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Player[];
  } catch (e) {
    console.error("Failed to parse players from storage", e);
    return [];
  }
}

function saveAllPlayers(players: Player[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function genId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Register (or re-use) a player for this room + name.
 * Returns the player object.
 */
export async function registerPlayer(roomId: string, name: string): Promise<Player> {
  await new Promise((r) => setTimeout(r, 100));

  const trimmed = name.trim();
  const all = loadAllPlayers();

  // if same room + name already exists, reuse
  const existing =
    all.find(
      (p) =>
        p.roomId.trim().toLowerCase() === roomId.trim().toLowerCase() &&
        p.name.trim().toLowerCase() === trimmed.toLowerCase()
    ) ?? null;

  if (existing) {
    return existing;
  }

  const player: Player = {
    id: genId(),
    roomId,
    name: trimmed,
    joinedAt: new Date().toISOString(),
  };

  all.push(player);
  saveAllPlayers(all);

  console.log("[playersApi] registered player", player);
  return player;
}

export async function getPlayersByRoom(roomId: string): Promise<Player[]> {
  await new Promise((r) => setTimeout(r, 100));

  const all = loadAllPlayers();
  const normalized = roomId.trim().toLowerCase();
  const filtered = all.filter(
    (p) => p.roomId.trim().toLowerCase() === normalized
  );
  return filtered;
}