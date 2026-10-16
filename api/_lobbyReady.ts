import type { Room } from "../shared/room.js";
import { listPlayers } from "./_playerStore.js";
import { saveRoom } from "./_roomStore.js";

// Call only while holding the room mutation lock.
export async function syncLobbyCountdown(room: Room): Promise<Room> {
  if (room.status !== "LOBBY" || room.closed) return room;
  const players = await listPlayers(room.id);
  const everyoneReady = players.length > 0 && players.every(player => player.ready === true);
  const autoStartAt = everyoneReady ? room.autoStartAt ?? new Date(Date.now() + 5000).toISOString() : null;
  if (autoStartAt === room.autoStartAt) return room;
  const updated = { ...room, autoStartAt };
  await saveRoom(updated);
  return updated;
}
