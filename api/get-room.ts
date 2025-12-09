import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyAutomaticPhase,
  getRoomById,
} from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const roomId = String(req.body?.roomId || "").trim();
  if (!roomId) {
    res.status(400).json({ error: "Room id is required" });
    return;
  }

  try {
    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // later: applyAutomaticPhase(room) here if you want
    res.status(200).json(room);
  } catch (err) {
    console.error("[get-room] error", err);
    res.status(500).json({ error: "Failed to get room" });
  }
}
