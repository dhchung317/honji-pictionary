import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorize } from "./_session.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import { deferJsonResponse } from "./_deferredResponse.js";
import { getRoomById } from "./_roomStore.js";
import { listPlayers, savePlayer } from "./_playerStore.js";
import { syncLobbyCountdown } from "./_lobbyReady.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const { roomId, playerId, ready, lobbyVersion } = req.body ?? {};
  if (
    typeof roomId !== "string" ||
    typeof playerId !== "string" ||
    typeof ready !== "boolean" ||
    !Number.isInteger(lobbyVersion)
  )
    return res.status(400).json({
      error: "Room, player, readiness and lobby version are required",
    });
  if (!(await authorize(req, res, { role: "PLAYER", roomId, id: playerId })))
    return;
  const rejectStarting = () =>
    res.status(409).json({
      code: "ROUND_STARTING",
      error: "The round is already starting.",
    });
  const release = await acquireRoomMutation(roomId);
  if (!release) {
    const snapshot = await getRoomById(roomId);
    if (snapshot && !snapshot.closed && snapshot.status === "STARTING")
      return rejectStarting();
    return res
      .status(409)
      .json({ error: "Room update in progress. Try again." });
  }
  const flush = deferJsonResponse(res);
  try {
    const room = await getRoomById(roomId);
    if (!room || room.closed)
      return res.status(404).json({ error: "Room closed or expired" });
    if (room.status === "STARTING") return rejectStarting();
    if (room.status !== "LOBBY" || (room.lobbyVersion ?? 0) !== lobbyVersion)
      return res.status(409).json({ error: "This lobby is no longer open." });
    const player = (await listPlayers(roomId)).find(
      (player) => player.id === playerId,
    );
    if (!player)
      return res
        .status(403)
        .json({ error: "Join this lobby before getting ready." });
    await savePlayer({ ...player, ready });
    const updated = await syncLobbyCountdown(room);
    return res
      .status(200)
      .json({ ready, autoStartAt: updated.autoStartAt ?? null });
  } finally {
    try {
      await release();
    } finally {
      flush();
    }
  }
}
