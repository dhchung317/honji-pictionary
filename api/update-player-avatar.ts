import { authorize } from "./_session.js";
import { allowRequest, validImageUrl } from "./_limits.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getPlayer, updatePlayerAvatar } from "./_playerStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const { playerId, avatarUrl } = req.body ?? {};

  if (
    typeof playerId !== "string" ||
    !playerId.trim() ||
    typeof avatarUrl !== "string" ||
    !avatarUrl.trim()
  ) {
    return res.status(400).json({
      error: "playerId and avatarUrl are required",
    });
  }

  const existing = await getPlayer(playerId);
  if (!existing) return res.status(404).json({ error: "Player not found" });
  if (!await authorize(req, res, { role: "PLAYER", roomId: existing.roomId, id: playerId })) return;
  if (!await allowRequest(req, res, "avatar", 6, 60, playerId)) return;
  if (!validImageUrl(avatarUrl, `room/${existing.roomId}/players/${playerId}/avatar-`)) return res.status(400).json({ error: "Invalid avatar image" });
  const player = await updatePlayerAvatar(playerId, avatarUrl);

  if (!player) {
    return res.status(404).json({
      error: "Player not found",
    });
  }

  return res.status(200).json(player);
}
