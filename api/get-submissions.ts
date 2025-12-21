import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listSubmissions } from "./_submissionStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const roomId = String(req.query.roomId || "").trim();
  if (!roomId) return res.status(400).json({ error: "roomId required" });

  const subs = await listSubmissions(roomId);
  res.status(200).json(subs);
}
