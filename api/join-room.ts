import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById } from "./_roomStore.js";
import { upsertPlayer } from "./_playerStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const roomId = String(req.body?.roomId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!roomId || !name)
    return res.status(400).json({ error: "roomId and name required" });

  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status !== "LOBBY")
    return res.status(400).json({ error: "Game started, cannot join" });

  const player = await upsertPlayer(roomId, name);
  res.status(200).json(player);
}
