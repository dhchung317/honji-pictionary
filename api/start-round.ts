import { VercelRequest, VercelResponse } from "@vercel/node";
import { getRoomById, saveRoom } from "./_roomStore.js";
import { listPlayers } from "./_playerStore.js";
import { Room } from "../shared/room.js";
import { genPrompt } from "./_aiGeneratePrompt.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const roomId = String(req.body?.roomId || "").trim();
  if (!roomId) {
    res.status(400).json({ error: "Room id is required" });
    return;
  }

  try {
    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.status !== "LOBBY") {
      res.status(400).json({ error: "Round already started" });
      return;
    }

    const promptRes = await genPrompt({ history: room.promptHistory });

    const players = await listPlayers(roomId);
    const frozen = players.map((p) => p.id);

    const now = Date.now();
    const updated: Room = {
      ...room,
      status: "DRAWING",
      roundEndAt: new Date(now + room.drawingDurationMs).toISOString(),
      frozenPlayerIds: frozen,
      currentPrompt: promptRes.prompt,
      promptHistory: [...room.promptHistory, promptRes.prompt],
    };

    await saveRoom(updated);
    res.status(200).json(updated);
  } catch (err) {
    console.error("[start-round] error", err);
    res.status(500).json({ error: "Failed to start round" });
  }
}
