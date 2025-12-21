import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById } from "./_roomStore.js";
import { createOrReplaceSubmission } from "./_submissionStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const roomId = String(req.body?.roomId || "").trim();
  const playerId = String(req.body?.playerId || "").trim();
  const playerName = String(req.body?.playerName || "").trim();
  const imageDataUrl = String(req.body?.imageDataUrl || "");

  if (!roomId || !playerId || !playerName || !imageDataUrl) {
    return res
      .status(400)
      .json({ error: "roomId, playerId, playerName, imageDataUrl required" });
  }

  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  // optional: reject submissions if not DRAWING
  if (room.status !== "DRAWING")
    return res.status(400).json({ error: "Round not accepting submissions" });
  if (!room.frozenPlayerIds.includes(playerId))
    return res
      .status(400)
      .json({ error: "Cannot accept submission players outside round" });

  const now = Date.now();
  const endAt = room.roundEndAt;
  if (!endAt) return res.status(400).json({ error: "" });
  const end = new Date(endAt).getTime();
  if (now > end)
    return res
      .status(400)
      .json({ error: "Cannot accept submission from late players" });

  const submission = await createOrReplaceSubmission({
    roomId,
    playerId,
    playerName,
    imageDataUrl,
  });

  res.status(200).json(submission);
}
