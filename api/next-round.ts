import { deferJsonResponse } from "./_deferredResponse.js";
import { authorize } from "./_session.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { listPlayers, removePlayerFromRoster, savePlayer } from "./_playerStore.js";
import { Room } from "../shared/room.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const roomId = req.body?.roomId;
  if (!roomId) return res.status(400).json({ error: "roomId is required" });

  const release = await acquireRoomMutation(roomId);
  if (!release) return res.status(409).json({ error: "Room update in progress" });
  const flush = deferJsonResponse(res);
  try {
  const room = await getRoomById(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  if (!await authorize(req, res, { role: "HOST", roomId: room.id, id: room.hostId })) return;

  if (room.closed) return res.status(409).json({ error: "Room closed" });
  if (room.status === "LOBBY" && room.replayFromRoundId) return res.status(200).json(room);
  if (room.status !== "DONE" || !room.currentRoundId) {
    return res.status(409).json({ error: "Round not finished yet" });
  }

  const players = await listPlayers(roomId);
  for (const player of players) {
    if (player.replayRoundId !== room.currentRoundId) await removePlayerFromRoster(roomId, player.id);
    else await savePlayer(player);
  }

  const updated: Room = {
    ...room,
    status: "LOBBY",
    replayFromRoundId: room.currentRoundId,
  };

  await saveRoom(updated);
  return res.status(200).json(updated);
  } finally { try { await release(); } finally { flush(); } }
}
