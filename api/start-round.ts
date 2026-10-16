import { syncLobbyCountdown } from "./_lobbyReady.js";
import { deferJsonResponse } from "./_deferredResponse.js";
import { authorize } from "./_session.js";
import { allowRequest } from "./_limits.js";
import { acquireRoomMutation } from "./_mutationLock.js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { listPlayers } from "./_playerStore.js";
import { Room } from "../shared/room.js";
import { genPrompt } from "./_aiGeneratePrompt.js";
import { getRound, saveRound } from "./_roundStore.js";
import type { Round } from "../shared/round.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const roomId = String(req.body?.roomId || "").trim();

  if (!roomId) {
    return res.status(400).json({ error: "Room id is required" });
  }

  const release = await acquireRoomMutation(roomId);
  if (!release) {
    return res.status(409).json({ error: "Room update in progress" });
  }
  const flush = deferJsonResponse(res);
  try {
    const room = await getRoomById(roomId);

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!await authorize(req, res, { role: "HOST", roomId: room.id, id: room.hostId })) return;
    if (room.closed) return res.status(409).json({ error: "Room closed" });
    if (room.status !== "LOBBY" && room.status !== "SCORING_FAILED") return res.status(400).json({ error: "Round already started" });
    if (!await allowRequest(req, res, "start", 6, 3600, roomId)) return;
    if (!await allowRequest(req, res, "start-global", 100, 3600, "global")) return;

    if (room.status === "SCORING_FAILED" && room.currentRoundId) {
      const round = await getRound(room.id, room.currentRoundId);
      if (!round) return res.status(404).json({ error: "Round not found" });
      await saveRound({ ...round, status: "SCORING", scoringAttempts: 0, scoringRetryAt: 0 });
      const updated: Room = { ...room, status: "SCORING" };
      await saveRoom(updated);
      return res.status(200).json(updated);
    }

    if (room.status !== "LOBBY") {
      return res.status(400).json({ error: "Round already started" });
    }


    const entrants = await listPlayers(roomId);
    if (req.body?.autoStart === true) {
      const current = await syncLobbyCountdown(room);
      if ((room.lobbyVersion ?? 0) !== req.body.lobbyVersion || !current.autoStartAt || Date.parse(current.autoStartAt) > Date.now() || entrants.length === 0 || !entrants.every(player => player.ready === true)) {
        return res.status(409).json({ error: "Automatic start was cancelled or is not due yet." });
      }
    }
    if (entrants.length === 0) return res.status(409).json({ error: "Wait for at least one player to join." });
    const { prompt } = await genPrompt({ history: room.promptHistory });

    const players = await listPlayers(roomId);
    const frozenPlayerIds = players.map((p) => p.id);

    const roundId = crypto.randomUUID();
    const startedAt = new Date();
    const roundEndAt = new Date(startedAt.getTime() + room.drawingDurationMs);

    const round: Round = {
      id: roundId,
      roomId,
      status: "DRAWING",
      prompt,
      frozenPlayerIds,
      startedAt: startedAt.toISOString(),
      roundEndAt: roundEndAt.toISOString(),
      drawingDurationMs: room.drawingDurationMs,
      scoredAt: null,
    };

    await saveRound(round);
    const updated: Room = {
      ...room,
      currentRoundId: round.id,
      autoStartAt: null,
      status: "DRAWING",
      promptHistory: [...room.promptHistory, prompt],
    };

    await saveRoom(updated);
    res.status(200).json(updated);
  } catch (err) {
    console.error("[start-round] error", err);
    res.status(500).json({ error: "Failed to start round" });
  } finally {
    try { await release(); } finally { flush(); }
  }
}
