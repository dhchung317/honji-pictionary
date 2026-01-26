import { Player } from "../shared/player.js";
import { generateId, redis as kv, touchKeys, TTL_SECONDS } from "./redis.js";

const roomPlayersKey = (roomId: string) => `room:${roomId}:players`;
const playerKey = (playerId: string) => `player:${playerId}`;
const playerNameKey = (roomId: string, lowerName: string) =>
  `room:${roomId}:playerByName:${lowerName}`;

export async function upsertPlayer(
  roomId: string,
  name: string,
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
    ids.map((id) => kv.get<Player>(playerKey(id))),
  );
  return players.filter((p): p is Player => p !== null);
}
