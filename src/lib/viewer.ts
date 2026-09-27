import type { Room } from "../../shared/room";

export type ViewerRole =
  | "HOST"
  | "PLAYER"
  | "SPECTATOR";

export function getViewerRole(
  room: Room,
): ViewerRole {
  const hostId = localStorage.getItem("hostId");

  if (hostId && hostId === room.hostId) {
    return "HOST";
  }

  const playerId = localStorage.getItem(
    `playerId:${room.id}`,
  );

  if (playerId) {
    return "PLAYER";
  }

  return "SPECTATOR";
}