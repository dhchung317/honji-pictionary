import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorize } from "./_session.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import { deferJsonResponse } from "./_deferredResponse.js";
import { getRoomById } from "./_roomStore.js";
import { getPlayer, rejoinPlayer, savePlayer } from "./_playerStore.js";
import { getRound } from "./_roundStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { roomId, playerId, roundId } = req.body ?? {};
  if (![roomId, playerId, roundId].every(value => typeof value === "string" && value.length > 0)) return res.status(400).json({ error: "Room, player and round are required" });
  if (!await authorize(req, res, { role: "PLAYER", roomId, id: playerId })) return;
  const release = await acquireRoomMutation(roomId);
  if (!release) return res.status(409).json({ error: "Room update in progress. Try again." });
  const flush = deferJsonResponse(res);
  try {
    const room = await getRoomById(roomId);
    const player = await getPlayer(playerId);
    if (!room || room.closed) return res.status(404).json({ error: "The host has closed this room." });
    if (!player || player.roomId !== roomId) return res.status(403).json({ error: "Rejoin the room from home." });
    const pending = room.status === "DONE" && room.currentRoundId === roundId;
    const lobby = room.status === "LOBBY" && room.replayFromRoundId === roundId;
    if (!pending && !lobby) return res.status(409).json({ error: "The next round has already started or this replay is out of date." });
    const round = await getRound(roomId, roundId);
    if (round?.status !== "DONE" || !round.frozenPlayerIds.includes(playerId)) return res.status(403).json({ error: "You did not participate in this round." });
    const updated = { ...player, replayRoundId: roundId };
    if (lobby) await rejoinPlayer(updated);
    else await savePlayer(updated);
    return res.status(200).json({ waitingForHost: pending });
  } catch (error) {
    return res.status(error instanceof Error && error.message === "ROOM_FULL" ? 409 : 500).json({ error: error instanceof Error && error.message === "ROOM_FULL" ? "Room is full (10 players maximum)" : "Unable to replay. Try again." });
  } finally { try { await release(); } finally { flush(); } }
}
