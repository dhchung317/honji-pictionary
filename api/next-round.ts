import { authorize } from "./_session.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { Room } from "../shared/room.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const roomId = req.body?.roomId;
  if (!roomId) return res.status(400).json({ error: "roomId is required" });

  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (!await authorize(req, res, { role: "HOST", roomId: room.id, id: room.hostId })) return;

  if (room.status !== "DONE") {
    return res.status(409).json({ error: "Round not finished yet" });
  }

  const updated: Room = {
    ...room,
    status: "LOBBY",
  };

  await saveRoom(updated);
  return res.status(200).json(updated);
}
