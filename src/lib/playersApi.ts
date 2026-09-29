import { Player } from "../../shared/player";
/**
 * Register (or re-use) a player for this room + name.
 * Returns the player object.
 */
export async function registerPlayer(
  roomId: string,
  name: string,
): Promise<Player> {
  const res = await fetch("/api/join-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, name }),
  });
  if (!res.ok) throw new Error("Failed to join room");
  return res.json();
}

export async function getPlayersByRoom(roomId: string): Promise<Player[]> {
  const res = await fetch(
    `/api/get-players?roomId=${encodeURIComponent(roomId)}`,
  );
  if (!res.ok) throw new Error("Failed to get players");
  return res.json();
}

export async function updatePlayerAvatar(
  playerId: string,
  avatarUrl: string,
): Promise<Player> {
  const res = await fetch("/api/update-player-avatar", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playerId,
      avatarUrl,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to update player avatar");
  }

  return res.json();
}
