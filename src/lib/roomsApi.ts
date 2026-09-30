import { sessionHeaders } from "./session";
import { RoomState } from "../../shared/roomstate";

export async function createRoom() {
  let hostId = sessionStorage.getItem("hostId");

  if (!hostId) {
    hostId = crypto.randomUUID();
    sessionStorage.setItem("hostId", hostId);
  }
  const res = await fetch(`/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostId,
    }),
  });
  if (!res.ok) throw new Error(res.statusText);
  const room = await res.json();
  sessionStorage.setItem(`hostSession:${room.id}`, room.sessionToken);
  return room;
}

export async function getRoom(roomId: string): Promise<RoomState> {
  const res = await fetch(`/api/get-room?roomId=${encodeURIComponent(roomId)}`);

  if (res.status === 404) {
    throw new Error("ROOM_NOT_FOUND");
  }

  if (!res.ok) {
    throw new Error("ROOM_LOAD_FAILED");
  }

  return res.json();
}

export async function startRound(roomId: string) {
  const res = await fetch(`/api/start-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(roomId, "HOST") },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function nextRound(roomId: string) {
  const res = await fetch("/api/next-round", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(roomId, "HOST") },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error("Host action failed");
}

export async function quit(roomId: string) {
  const res = await fetch("/api/quit-room", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(roomId, "HOST") },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error("Host action failed");
}
