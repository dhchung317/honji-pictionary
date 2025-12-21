import { Player } from "../shared/player.js";
import { generateId, redis as kv, touchKeys, TTL_SECONDS } from "./redis.js";

const roomPlayersKey = (roomId: string) => `room:${roomId}:players`;
const playerKey = (playerId: string) => `player:${playerId}`;
const playerNameKey = (roomId: string, lowerName: string) =>
  `room:${roomId}:playerByName:${lowerName}`;

export async function upsertPlayer(
  roomId: string,
  name: string
): Promise<Player> {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const existingId = await kv.get<string>(playerNameKey(roomId, lower));
  if (existingId) {
    const existing = await kv.get<Player>(playerKey(existingId));
    if (existing) return existing;
  }
  const player: Player = {
    id: generateId(),
    roomId,
    name: trimmed,
    joinedAt: new Date().toISOString(),
  };

  const pk = playerKey(player.id);
  const rpk = roomPlayersKey(roomId);
  const pnk = playerNameKey(roomId, lower);

  await kv.set(pk, player, { ex: TTL_SECONDS });
  await kv.set(pnk, player.id, { ex: TTL_SECONDS });
  await kv.sadd(rpk, player.id);
  await kv.expire(rpk, TTL_SECONDS);

  await touchKeys([pk, rpk, pnk]);
  return player;
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  const ids = (await kv.smembers<string[]>(roomPlayersKey(roomId))) ?? [];
  if (ids.length === 0) return [];

  // Fetch players in parallel
  const players = await Promise.all(
    ids.map((id) => kv.get<Player>(playerKey(id)))
  );
  return players.filter((p): p is Player => p !== null);
}

// function loadAllPlayers(): Player[] {
//   if (typeof window === "undefined") return [];
//   try {
//     const raw = window.localStorage.getItem(STORAGE_KEY);
//     if (!raw) return [];
//     return JSON.parse(raw) as Player[];
//   } catch (e) {
//     console.error("Failed to parse players from storage", e);
//     return [];
//   }
// }

// function saveAllPlayers(players: Player[]) {
//   if (typeof window === "undefined") return;
//   window.localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
// }

// function genId() {
//   return Math.random().toString(36).substring(2, 10);
// }

// /**
//  * Register (or re-use) a player for this room + name.
//  * Returns the player object.
//  */
// export async function registerPlayer(
//   roomId: string,
//   name: string
// ): Promise<Player> {
//   await new Promise((r) => setTimeout(r, 100));

//   const trimmed = name.trim();
//   const all = loadAllPlayers();

//   // if same room + name already exists, reuse
//   const existing =
//     all.find(
//       (p) =>
//         p.roomId.trim().toLowerCase() === roomId.trim().toLowerCase() &&
//         p.name.trim().toLowerCase() === trimmed.toLowerCase()
//     ) ?? null;

//   if (existing) {
//     return existing;
//   }

//   const player: Player = {
//     id: genId(),
//     roomId,
//     name: trimmed,
//     joinedAt: new Date().toISOString(),
//   };

//   all.push(player);
//   saveAllPlayers(all);

//   console.log("[playersApi] registered player", player);
//   return player;
// }

// export async function getPlayersByRoom(roomId: string): Promise<Player[]> {
//   await new Promise((r) => setTimeout(r, 100));

//   const all = loadAllPlayers();
//   const normalized = roomId.trim().toLowerCase();
//   const filtered = all.filter(
//     (p) => p.roomId.trim().toLowerCase() === normalized
//   );
//   return filtered;
// }
