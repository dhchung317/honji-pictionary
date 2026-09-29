import { authorize } from "./_session.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById } from "./_roomStore.js";
import { createOrReplaceSubmission } from "./_submissionStore.js";
import { GRACE_MS } from "./shared.js";
import { getRound } from "./_roundStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const roomId = String(req.body?.roomId || "").trim();
  const playerId = String(req.body?.playerId || "").trim();
  const playerName = String(req.body?.playerName || "").trim();
  const imageUrl = String(req.body?.imageUrl || "");

  if (!roomId || !playerId || !playerName || !imageUrl) {
    return res
      .status(400)
      .json({ error: "roomId, playerId, playerName, imageUrl required" });
  }

  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if(!room.currentRoundId) return res.status(404).json({ error: "Round id not found" });
  const round = await getRound(room.id, room.currentRoundId);
  if(!round) return res.status(404).json({ error: "Round not found" });


  if (!round.frozenPlayerIds.includes(playerId))
    return res
      .status(400)
      .json({ error: "Cannot accept submission players outside round" });

  if (!await authorize(req, res, { role: "PLAYER", roomId, id: playerId })) return;

  const now = Date.now();
  const endAt = round.roundEndAt;
  if (!endAt) return res.status(400).json({ error: "" });
  const end = new Date(endAt).getTime();

  if (now > end + GRACE_MS) {
    return res.status(400).json({ error: "submission after end of round" });
  }

  const submission = await createOrReplaceSubmission(round.id, {
    roomId,
    playerId,
    playerName,
    imageUrl,
  });

  res.status(200).json(submission);
}
