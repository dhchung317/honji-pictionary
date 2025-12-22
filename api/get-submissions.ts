import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listSubmissions } from "./_submissionStore.js";
import { getRoomById } from "./_roomStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const roomId = String(req.query.roomId || "").trim();
  if (!roomId) return res.status(400).json({ error: "roomId required" });

  const room = await getRoomById(roomId);
  const round = req.query.round ? Number(req.query.round) : room?.roundId;

  const subs = await listSubmissions(roomId, round!);
  res.status(200).json(subs);
}
