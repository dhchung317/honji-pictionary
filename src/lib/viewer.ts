import type { Room } from "../../shared/room";

export type ViewerRole = "HOST" | "PLAYER" | "SPECTATOR";

export function getViewerRole(room: Room): ViewerRole {
  // A player tab may have been opened from the host tab. Its own joined
  // player identity takes precedence over any copied host identity.
  const playerId = sessionStorage.getItem(`playerId:${room.id}`);
  if (playerId) return "PLAYER";

  const hostId = sessionStorage.getItem("hostId");
  if (hostId && hostId === room.hostId) return "HOST";

  return "SPECTATOR";
}
