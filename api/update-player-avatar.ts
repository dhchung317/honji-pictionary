import type { VercelRequest, VercelResponse } from "@vercel/node";

import { updatePlayerAvatar } from "./_playerStore.js";

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

  const player = await updatePlayerAvatar(playerId, avatarUrl);

  if (!player) {
    return res.status(404).json({
      error: "Player not found",
    });
  }

  return res.status(200).json(player);
}
