import { syncLobbyCountdown } from "./_lobbyReady.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import { deferJsonResponse } from "./_deferredResponse.js";
import { issueSession } from "./_session.js";
import { allowRequest } from "./_limits.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById } from "./_roomStore.js";
import { upsertPlayer } from "./_playerStore.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const roomId = String(req.body?.roomId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!roomId || !name)
    return res.status(400).json({ error: "roomId and name required" });

  if (name.length > 15 || !/^[A-Z2-9]{4}$/.test(roomId))
    return res
      .status(400)
      .json({ error: "Invalid room code or name (maximum 15 characters)" });
  if (!(await allowRequest(req, res, "join", 24, 60, roomId))) return;

  const release = await acquireRoomMutation(roomId);
  if (!release)
    return res
      .status(409)
      .json({ error: "Room update in progress. Try again." });
  const flush = deferJsonResponse(res);
  try {
    const room = await getRoomById(roomId);
    if (!room || room.closed)
      return res.status(404).json({ error: "Room not found" });
    if (room.status !== "LOBBY")
      return res.status(400).json({ error: "Game started, cannot join" });

    try {
      const player = await upsertPlayer(roomId, name);
      await syncLobbyCountdown(room);
      const sessionToken = await issueSession({
        role: "PLAYER",
        roomId,
        id: player.id,
      });
      res.status(200).json({ ...player, sessionToken });
    } catch (error) {
      if (error instanceof Error && error.message === "ROOM_FULL")
        return res
          .status(409)
          .json({ error: "Room is full (10 players maximum)" });
      res.status(503).json({ error: "Unable to join room" });
    }
  } finally {
    try {
      await release();
    } finally {
      flush();
    }
  }
}
