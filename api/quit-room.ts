import { authorize } from "./_session.js";
// api/quit-room.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById, saveRoom, expireRoom } from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const roomId = String((req.body as any)?.roomId || "").trim();
  if (!roomId) return res.status(400).json({ error: "roomId is required" });

  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (!await authorize(req, res, { role: "HOST", roomId: room.id, id: room.hostId })) return;

  const updated = { ...room, status: "DONE" as const };
  await saveRoom(updated);

  await expireRoom(roomId, 60);

  return res.status(200).json({ ok: true });
}
