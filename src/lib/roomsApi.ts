import { RoomState } from "../../shared/roomstate";

export async function createRoom() {
  const res = await fetch(`/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function getRoom(roomId: string): Promise<RoomState> {
  const res = await fetch(`/api/get-room?roomId=${encodeURIComponent(roomId)}`);

  if (!res.ok) {
    throw new Error("Failed to get room");
  }

  return res.json();
}

export async function startRound(roomId: string) {
  const res = await fetch(`/api/start-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function nextRound(roomId: string) {
  await fetch("/api/next-round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });
}

export async function quit(roomId: string) {
  await fetch("/api/quit-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });
}
