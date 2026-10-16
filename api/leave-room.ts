import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorize } from "./_session.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import { deferJsonResponse } from "./_deferredResponse.js";
import { getRoomById } from "./_roomStore.js";
import { syncLobbyCountdown } from "./_lobbyReady.js";
import { getPlayer, leavePlayer } from "./_playerStore.js";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { roomId, playerId } = req.body ?? {};
  if (typeof roomId !== "string" || typeof playerId !== "string") return res.status(400).json({ error: "Room and player are required" });
  if (!await authorize(req, res, { role: "PLAYER", roomId, id: playerId })) return;
  const release = await acquireRoomMutation(roomId);
  if (!release) return res.status(409).json({ error: "Room update in progress. Try again." });
  const flush = deferJsonResponse(res);
  try {
    const player = await getPlayer(playerId);
    if (player && player.roomId === roomId) await leavePlayer(player);
    const room = await getRoomById(roomId);
    if (room) await syncLobbyCountdown(room);
    return res.status(200).json({ ok: true });
  } finally { try { await release(); } finally { flush(); } }
}
