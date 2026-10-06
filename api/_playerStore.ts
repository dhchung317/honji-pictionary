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

  let displayName = trimmed;
  let suffix = 2;

  while (
    await kv.get<string>(playerNameKey(roomId, displayName.toLowerCase()))
  ) {
    const suffixText = ` ${suffix}`;
    displayName = `${trimmed.slice(0, 15 - suffixText.length)}${suffixText}`;
    suffix++;
  }

  const player: Player = {
    id: generateId(),
    roomId,
    name: displayName,
    joinedAt: new Date().toISOString(),
  };

  const pk = playerKey(player.id);
  const rpk = roomPlayersKey(roomId);
  const pnk = playerNameKey(roomId, displayName.toLowerCase());

  const admitted = await kv.eval<[string, number], number>(`if redis.call("SCARD",KEYS[1]) >= 10 then return 0 end; redis.call("SADD",KEYS[1],ARGV[1]); redis.call("EXPIRE",KEYS[1],ARGV[2]); return 1`, [rpk], [player.id, TTL_SECONDS]);
  if (!admitted) throw new Error("ROOM_FULL");

  await kv.set(pk, player, {
    ex: TTL_SECONDS,
  });

  await kv.set(pnk, player.id, {
    ex: TTL_SECONDS,
  });

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
  return players
    .filter((p): p is Player => p !== null)
    .sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
    );
}

export async function updatePlayerAvatar(
  playerId: string,
  avatarUrl: string,
): Promise<Player | null> {
  const pk = playerKey(playerId);

  const player = await kv.get<Player>(pk);

  if (!player) {
    return null;
  }

  const updatedPlayer: Player = {
    ...player,
    avatarUrl,
  };

  await kv.set(pk, updatedPlayer, {
    ex: TTL_SECONDS,
  });

  await touchKeys([pk]);

  return updatedPlayer;
}

export async function getPlayer(id: string): Promise<Player | null> { return kv.get<Player>(playerKey(id)); }

// Inactive records keep the authenticated identity available for a late replay.
export async function savePlayer(player: Player): Promise<void> {
  await kv.set(playerKey(player.id), player, { ex: TTL_SECONDS });
}
export async function removePlayerFromRoster(roomId: string, playerId: string): Promise<void> {
  await kv.srem(roomPlayersKey(roomId), playerId);
}
export async function rejoinPlayer(player: Player): Promise<void> {
  const admitted = await kv.eval(`if redis.call("SISMEMBER",KEYS[1],ARGV[1]) == 1 then return 1 end; if redis.call("SCARD",KEYS[1]) >= 10 then return 0 end; redis.call("SADD",KEYS[1],ARGV[1]); redis.call("EXPIRE",KEYS[1],ARGV[2]); return 1`, [roomPlayersKey(player.roomId)], [player.id, TTL_SECONDS]);
  if (!admitted) throw new Error("ROOM_FULL");
  await savePlayer(player);
}
export async function leavePlayer(player: Player): Promise<void> {
  await removePlayerFromRoster(player.roomId, player.id);
  await kv.del(playerKey(player.id), playerNameKey(player.roomId, player.name.toLowerCase()));
}
