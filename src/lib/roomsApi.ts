import { Room } from "../../shared/room";

export async function createRoom() {
  const res = await fetch(`/api/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function getRoom(roomId: string): Promise<Room> {
  const res = await fetch(`/api/get-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error("Room id not found");
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
