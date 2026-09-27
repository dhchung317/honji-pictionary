import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoundScore } from "./_roundScoreStore.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const roomId = String(req.query.roomId ?? "").trim();
  const roundId = String(req.query.roundId ?? "").trim();

  if (!roomId || !roundId) {
    return res.status(400).json({
      error: "roomId and roundId required",
    });
  }

  const score = await getRoundScore(roomId, roundId);

  if (!score) {
    return res.status(404).json({
      error: "Round score not found",
    });
  }

  return res.status(200).json(score);
}