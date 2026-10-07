import { sessionHeaders } from "./session";
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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      typeof body?.error === "string" ? body.error : "Failed to join room",
    );
  }
  const player = await res.json();
  sessionStorage.setItem(`playerSession:${roomId}`, player.sessionToken);
  return player;
}

export async function getPlayersByRoom(roomId: string): Promise<Player[]> {
  const res = await fetch(
    `/api/get-players?roomId=${encodeURIComponent(roomId)}`,
  );
  if (!res.ok) throw new Error("Failed to get players");
  return res.json();
}

export async function updatePlayerAvatar(
  roomId: string,
  playerId: string,
  avatarUrl: string,
): Promise<Player> {
  const res = await fetch("/api/update-player-avatar", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders(roomId, "PLAYER"),
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

async function playerAction(
  roomId: string,
  action: "replay-player" | "leave-room",
  roundId?: string,
) {
  const playerId = sessionStorage.getItem(`playerId:${roomId}`);
  const res = await fetch(`/api/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders(roomId, "PLAYER"),
    },
    body: JSON.stringify({ roomId, playerId, roundId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Unable to update your room.");
  return body as { waitingForHost?: boolean };
}
export const replayPlayer = (roomId: string, roundId: string) =>
  playerAction(roomId, "replay-player", roundId);
export async function leaveRoom(roomId: string) {
  await playerAction(roomId, "leave-room");
  for (const key of [
    "playerId",
    "playerName",
    "playerSession",
    "submittedRound",
    "replayRound",
  ])
    sessionStorage.removeItem(`${key}:${roomId}`);
}

export class RoundStartingError extends Error {}

export async function setPlayerReady(
  roomId: string,
  ready: boolean,
  lobbyVersion: number,
) {
  const res = await fetch("/api/set-ready", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders(roomId, "PLAYER"),
    },
    body: JSON.stringify({
      roomId,
      playerId: sessionStorage.getItem(`playerId:${roomId}`),
      ready,
      lobbyVersion,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    if (body.code === "ROUND_STARTING") throw new RoundStartingError(body.error);
    throw new Error(body.error || "Unable to change readiness.");
  }
  return body as { ready: boolean; autoStartAt: string | null };
}
